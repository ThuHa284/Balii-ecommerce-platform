import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Kafka,
  logLevel,
  type Consumer,
  type Producer,
  type SASLOptions,
} from 'kafkajs';

/**
 * KafkaDemoService — a side-by-side demonstration of the SAME business action
 * ("send an order notification") done two ways, so the difference between a
 * synchronous, tightly-coupled call and an asynchronous, Kafka-decoupled call
 * is visible in the admin UI:
 *
 *   • runSync()  — does the work inline. The HTTP caller is BLOCKED for the
 *                  whole processing time and is coupled to the downstream: if
 *                  the downstream is slow/down, the caller waits/fails.
 *
 *   • runAsync() — publishes an event to Kafka and returns immediately. A
 *                  separate consumer (below) processes it in the background.
 *                  The caller is NOT blocked and NOT coupled: if the consumer
 *                  is slow/down the message waits durably in the topic.
 *
 * This is demo-only tooling; it uses its own topic/consumer group and does not
 * touch the real payment outbox flow.
 */
@Injectable()
export class KafkaDemoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaDemoService.name);
  private readonly topic = process.env.KAFKA_DEMO_TOPIC || 'demo.notification';
  private readonly groupId =
    process.env.KAFKA_DEMO_GROUP_ID || 'payment-service-demo-consumer';
  private readonly syncDelayMs = Number(
    process.env.KAFKA_DEMO_SYNC_DELAY_MS || 2500,
  );
  private readonly consumerDelayMs = Number(
    process.env.KAFKA_DEMO_CONSUMER_DELAY_MS || 2500,
  );
  private readonly logCapacity = 50;

  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;

  // In-memory processing log for the UI. Newest first.
  private readonly processedLog: Array<{
    id: string;
    channel: 'kafka';
    recipient: string;
    message: string;
    publishedAt: string;
    processedAt: string;
    latencyMs: number;
  }> = [];

  async onModuleInit() {
    const brokers = this.readBrokers();
    if (!brokers.length) {
      this.logger.warn(
        'Kafka demo disabled: KAFKA_BROKERS is not set. The sync button still works; the async button will report Kafka as unavailable.',
      );
      return;
    }

    try {
      this.kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
        brokers,
        ssl: this.readKafkaSsl(),
        sasl: this.readKafkaSasl(),
        logLevel: this.readKafkaLogLevel(),
      });

      this.producer = this.kafka.producer({
        allowAutoTopicCreation: process.env.KAFKA_AUTO_CREATE_TOPICS === 'true',
      });
      await this.producer.connect();

      this.consumer = this.kafka.consumer({ groupId: this.groupId });
      await this.consumer.connect();
      await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
      await this.consumer.run({
        eachMessage: async ({ message }) => {
          await this.handleDemoMessage(message.value?.toString() ?? '{}');
        },
      });

      this.logger.log(
        `Kafka demo consumer running on topic "${this.topic}" (group "${this.groupId}").`,
      );
    } catch (error) {
      this.logger.warn(
        `Kafka demo could not connect. Async demo will be unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.kafka = null;
      this.producer = null;
      this.consumer = null;
    }
  }

  async onModuleDestroy() {
    try {
      await this.consumer?.disconnect();
    } catch {
      // ignore
    }
    try {
      await this.producer?.disconnect();
    } catch {
      // ignore
    }
  }

  isConnected() {
    return Boolean(this.producer && this.consumer);
  }

  /**
   * Synchronous path: caller is blocked while the "notification" is processed.
   */
  async runSync(input: { recipient: string; message: string }) {
    const startedAt = Date.now();
    // Simulate the downstream notification work happening inline.
    await this.delay(this.syncDelayMs);
    const elapsedMs = Date.now() - startedAt;

    return {
      mode: 'sync' as const,
      usesKafka: false,
      callerBlockedMs: elapsedMs,
      deliveredInline: true,
      note: 'Caller waited for the full downstream processing time. If the downstream were down, this call would have failed.',
      recipient: input.recipient,
      message: input.message,
    };
  }

  /**
   * Asynchronous path: publish an event to Kafka and return immediately. The
   * consumer processes it later; the caller does not wait for that.
   */
  async runAsync(input: { recipient: string; message: string }) {
    if (!this.producer) {
      return {
        mode: 'async' as const,
        usesKafka: true,
        published: false,
        note: 'Kafka is not connected (check KAFKA_BROKERS / that the broker is running).',
      };
    }

    const startedAt = Date.now();
    const eventId = `demo_${startedAt}_${Math.floor(startedAt % 100000)}`;
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: input.recipient,
          value: JSON.stringify({
            eventId,
            recipient: input.recipient,
            message: input.message,
            publishedAt: new Date(startedAt).toISOString(),
          }),
        },
      ],
    });
    const callerBlockedMs = Date.now() - startedAt;

    return {
      mode: 'async' as const,
      usesKafka: true,
      published: true,
      eventId,
      topic: this.topic,
      // Only the time to hand the event to Kafka — NOT the processing time.
      callerBlockedMs,
      note: 'Caller was released as soon as the event was published. A consumer processes it in the background (see the processing log).',
      recipient: input.recipient,
      message: input.message,
    };
  }

  getStatus() {
    return {
      connected: this.isConnected(),
      topic: this.topic,
      groupId: this.groupId,
      syncDelayMs: this.syncDelayMs,
      consumerDelayMs: this.consumerDelayMs,
      processedLog: this.processedLog.slice(0, 20),
    };
  }

  private async handleDemoMessage(raw: string) {
    let parsed: {
      eventId?: string;
      recipient?: string;
      message?: string;
      publishedAt?: string;
    };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    // Simulate the consumer doing the actual notification work.
    await this.delay(this.consumerDelayMs);

    const processedAt = new Date();
    const publishedAt = parsed.publishedAt
      ? new Date(parsed.publishedAt)
      : processedAt;

    this.processedLog.unshift({
      id: parsed.eventId ?? `demo_${processedAt.getTime()}`,
      channel: 'kafka',
      recipient: parsed.recipient ?? 'unknown',
      message: parsed.message ?? '',
      publishedAt: publishedAt.toISOString(),
      processedAt: processedAt.toISOString(),
      latencyMs: processedAt.getTime() - publishedAt.getTime(),
    });

    if (this.processedLog.length > this.logCapacity) {
      this.processedLog.length = this.logCapacity;
    }

    this.logger.log(
      `[Kafka demo] consumed event for ${parsed.recipient ?? 'unknown'} (${this.processedLog[0].latencyMs}ms after publish)`,
    );
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private readBrokers() {
    return (process.env.KAFKA_BROKERS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
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
      mechanism === 'plain' ||
      mechanism === 'scram-sha-256' ||
      mechanism === 'scram-sha-512'
    ) {
      return { mechanism, username, password } as SASLOptions;
    }

    return undefined;
  }

  private readKafkaLogLevel() {
    switch ((process.env.KAFKA_LOG_LEVEL || 'error').toLowerCase()) {
      case 'nothing':
        return logLevel.NOTHING;
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
}
