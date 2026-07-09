import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, logLevel, type Producer, type SASLOptions } from 'kafkajs';
import { DataSource } from 'typeorm';

type OutboxEventRow = {
  id: string;
  eventId?: string | null;
  aggregateType: string;
  aggregateId: string;
  type: string;
  payload: Record<string, unknown>;
  retryCount?: number | string | null;
};

type OutboxPublishMessage = {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

type PreparedKafkaEvent = {
  topic: string;
  key: string;
  value: string;
  headers: Record<string, string>;
};

@Injectable()
export class PaymentOutboxPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentOutboxPublisher.name);
  private readonly maxBatchSize = Number(
    process.env.PAYMENT_OUTBOX_BATCH_SIZE || 20,
  );
  private readonly retryDelayMs = Number(
    process.env.PAYMENT_OUTBOX_RETRY_DELAY_MS || 30000,
  );
  private readonly processingLeaseMs = Number(
    process.env.PAYMENT_OUTBOX_PROCESSING_LEASE_MS || 60000,
  );
  private readonly maxRetryCount = Number(
    process.env.PAYMENT_OUTBOX_MAX_RETRY || 10,
  );
  private producer: Producer | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private isPublishing = false;

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.bootstrapKafkaProducer();

    const pollIntervalMs = Number(
      process.env.PAYMENT_OUTBOX_POLL_INTERVAL_MS || 15000,
    );

    if (pollIntervalMs > 0) {
      this.pollTimer = setInterval(() => {
        void this.publishPendingEvents();
      }, pollIntervalMs);
      this.pollTimer.unref?.();
    }
  }

  async onModuleDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
  }

  async publishPendingEvents(limit = this.maxBatchSize) {
    if (this.isPublishing) {
      return {
        published: 0,
        claimed: 0,
        skipped: true,
        reason: 'publisher_busy',
      };
    }

    if (!this.producer) {
      return {
        published: 0,
        claimed: 0,
        skipped: true,
        reason: 'kafka_unavailable',
      };
    }

    this.isPublishing = true;

    try {
      const events = await this.claimPendingEvents(limit);

      if (!events.length) {
        return {
          published: 0,
          claimed: 0,
          skipped: false,
          attemptedIds: [],
          failed: [],
        };
      }

      let published = 0;
      const attemptedIds: string[] = [];
      const failed: Array<{ eventId: string; error: string }> = [];

      this.logger.log(
        `Claimed ${events.length} outbox event(s): ${events.map((event) => event.id).join(', ')}`,
      );

      for (const event of events) {
        try {
          attemptedIds.push(event.id);
          const kafkaEvent = this.prepareKafkaEvent(event);
          this.logger.log(
            `Publishing outbox event ${event.id} to topic ${kafkaEvent.topic}`,
          );

          await this.producer.send({
            topic: kafkaEvent.topic,
            messages: [
              {
                key: kafkaEvent.key,
                value: kafkaEvent.value,
                headers: kafkaEvent.headers,
              },
            ],
          });

          published += 1;
          await this.markPublished(event.id);
          this.logger.log(`Published outbox event ${event.id}`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          failed.push({
            eventId: event.id,
            error: errorMessage,
          });
          this.logger.error(
            `Failed to publish outbox event ${event.id}: ${errorMessage}`,
          );
          await this.markPublishFailed(event.id, event.retryCount, error);
        }
      }

      return {
        published,
        claimed: events.length,
        skipped: false,
        attemptedIds,
        failed,
      };
    } finally {
      this.isPublishing = false;
    }
  }

  private async bootstrapKafkaProducer() {
    const brokers = (process.env.KAFKA_BROKERS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!brokers.length) {
      this.logger.warn(
        'Kafka chưa được bật vì thiếu biến môi trường KAFKA_BROKERS.',
      );
      return;
    }

    try {
      const kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
        brokers,
        ssl: this.readKafkaSsl(),
        sasl: this.readKafkaSasl(),
        logLevel: this.readKafkaLogLevel(),
      });

      this.producer = kafka.producer({
        allowAutoTopicCreation: process.env.KAFKA_AUTO_CREATE_TOPICS === 'true',
      });
      await this.producer.connect();
      this.logger.log(`Kafka producer đã kết nối tới ${brokers.join(', ')}`);
    } catch (error) {
      this.producer = null;
      this.logger.warn(
        `Không khởi tạo được Kafka producer. Event sẽ tiếp tục nằm trong outbox. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async claimPendingEvents(limit: number): Promise<OutboxEventRow[]> {
    return this.dataSource.transaction(async (manager) => {
      const rawResult = await manager.query(
        `
        WITH next_events AS (
          SELECT id
          FROM payment_service.outbox_events
          WHERE (
              status IN ('PENDING', 'FAILED')
              OR (
                status = 'PROCESSING'
                AND next_retry_at IS NOT NULL
                AND next_retry_at <= NOW()
              )
            )
            AND COALESCE(retry_count, 0) < $1
            AND (
              status = 'PROCESSING'
              OR next_retry_at IS NULL
              OR next_retry_at <= NOW()
            )
          ORDER BY created_at ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE payment_service.outbox_events oe
        SET status = 'PROCESSING',
            next_retry_at = NOW() + ($3 * INTERVAL '1 millisecond')
        FROM next_events ne
        WHERE oe.id = ne.id
        RETURNING
          oe.id,
          oe.event_id AS "eventId",
          oe.aggregate_type AS "aggregateType",
          oe.aggregate_id AS "aggregateId",
          oe.type,
          oe.payload,
          oe.retry_count AS "retryCount"
        `,
        [this.maxRetryCount, limit, this.processingLeaseMs],
      );

      const rows = this.unwrapQueryRows(rawResult);

      return rows.map((row) => this.normalizeClaimedRow(row));
    });
  }

  private async markPublished(eventId: string) {
    await this.dataSource.query(
      `
      UPDATE payment_service.outbox_events
      SET status = 'PUBLISHED',
          published_at = NOW(),
          next_retry_at = NULL,
          last_error = NULL
      WHERE id = $1
      `,
      [eventId],
    );
  }

  private async markPublishFailed(
    eventId: string,
    retryCount: number | string | null | undefined,
    error: unknown,
  ) {
    const nextRetryCount = Number(retryCount || 0) + 1;
    const nextStatus =
      nextRetryCount >= this.maxRetryCount ? 'FAILED' : 'PENDING';
    const lastError = error instanceof Error ? error.message : String(error);

    await this.dataSource.query(
      `
      UPDATE payment_service.outbox_events
      SET status = $1,
          retry_count = COALESCE(retry_count, 0) + 1,
          next_retry_at = NOW() + ($2 * INTERVAL '1 millisecond'),
          last_error = $3
      WHERE id = $4
      `,
      [nextStatus, this.retryDelayMs, lastError, eventId],
    );
  }

  private buildMessage(event: OutboxEventRow): OutboxPublishMessage {
    return {
      eventId: this.requireString(event.eventId || event.id, 'eventId'),
      eventType: this.requireString(event.type, 'eventType'),
      aggregateType: this.requireString(event.aggregateType, 'aggregateType'),
      aggregateId: this.requireString(event.aggregateId, 'aggregateId'),
      occurredAt: new Date().toISOString(),
      payload: event.payload || {},
    };
  }

  private prepareKafkaEvent(event: OutboxEventRow): PreparedKafkaEvent {
    const message = this.buildMessage(event);
    const topic = this.requireString(
      this.resolveTopic(message.eventType),
      'topic',
    );

    return {
      topic,
      key: this.requireString(message.aggregateId, 'key'),
      value: JSON.stringify(message),
      headers: {
        aggregateId: this.requireString(
          message.aggregateId,
          'header.aggregateId',
        ),
        aggregateType: this.requireString(
          message.aggregateType,
          'header.aggregateType',
        ),
        eventId: this.requireString(message.eventId, 'header.eventId'),
        eventType: this.requireString(message.eventType, 'header.eventType'),
      },
    };
  }

  private resolveTopic(eventType: string) {
    const topicPrefix = process.env.KAFKA_TOPIC_PREFIX?.trim();

    return topicPrefix ? `${topicPrefix}.${eventType}` : eventType;
  }

  private readKafkaSsl() {
    return process.env.KAFKA_SSL === 'true';
  }

  private readKafkaSasl(): SASLOptions | undefined {
    const mechanism = process.env.KAFKA_SASL_MECHANISM;
    const username = process.env.KAFKA_SASL_USERNAME;
    const password = process.env.KAFKA_SASL_PASSWORD;

    if (!mechanism || !username || !password) {
      return undefined;
    }

    if (
      mechanism !== 'plain' &&
      mechanism !== 'scram-sha-256' &&
      mechanism !== 'scram-sha-512'
    ) {
      this.logger.warn(
        `Bỏ qua cấu hình SASL vì cơ chế ${mechanism} không được hỗ trợ.`,
      );
      return undefined;
    }

    return {
      mechanism,
      username,
      password,
    };
  }

  private readKafkaLogLevel() {
    const value = process.env.KAFKA_LOG_LEVEL?.toLowerCase();

    switch (value) {
      case 'nothing':
        return logLevel.NOTHING;
      case 'error':
        return logLevel.ERROR;
      case 'warn':
        return logLevel.WARN;
      case 'info':
        return logLevel.INFO;
      case 'debug':
        return logLevel.DEBUG;
      default:
        return logLevel.ERROR;
    }
  }

  private requireString(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim().length) {
      throw new Error(`Invalid outbox ${field}`);
    }

    return value;
  }

  private normalizeClaimedRow(row: Record<string, unknown>): OutboxEventRow {
    return {
      id: this.readRowString(row, 'id'),
      eventId: this.readRowOptionalString(row, 'eventId', 'eventid'),
      aggregateType: this.readRowString(row, 'aggregateType', 'aggregatetype'),
      aggregateId: this.readRowString(row, 'aggregateId', 'aggregateid'),
      type: this.readRowString(row, 'type'),
      payload: this.readRowPayload(row, 'payload'),
      retryCount: this.readRowNumberLike(row, 'retryCount', 'retrycount'),
    };
  }

  private readRowString(row: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    throw new Error(
      `Unable to read raw row string for keys: ${keys.join(', ')}`,
    );
  }

  private readRowOptionalString(
    row: Record<string, unknown>,
    ...keys: string[]
  ) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private readRowPayload(row: Record<string, unknown>, key: string) {
    const value = row[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {};
  }

  private readRowNumberLike(
    row: Record<string, unknown>,
    ...keys: string[]
  ): number | string | null | undefined {
    for (const key of keys) {
      const value = row[key];
      if (
        typeof value === 'number' ||
        typeof value === 'string' ||
        value == null
      ) {
        return value;
      }
    }

    return undefined;
  }

  private unwrapQueryRows(rawResult: unknown): Record<string, unknown>[] {
    if (Array.isArray(rawResult)) {
      if (!rawResult.length) {
        return [];
      }

      if (this.isRowArray(rawResult)) {
        return rawResult;
      }

      const firstItem = rawResult[0];
      if (Array.isArray(firstItem) && this.isRowArray(firstItem)) {
        return firstItem;
      }
    }

    return [];
  }

  private isRowArray(value: unknown): value is Record<string, unknown>[] {
    return (
      Array.isArray(value) &&
      value.every(
        (item) =>
          item != null && typeof item === 'object' && !Array.isArray(item),
      )
    );
  }
}
