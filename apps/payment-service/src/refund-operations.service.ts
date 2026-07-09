import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { OrderClientService } from './clients/order-client.service';
import { PaymentOutboxPublisher } from './kafka';

type RefundWorkflowRow = {
  id: string;
  paymentId: string;
  orderId: string;
  userId: string;
  method: string;
  paymentAmount: number | string;
  refundAmount: number | string;
  refundStatus: string;
  providerRefundId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  retryCount?: number | string | null;
};

type AdminRefundRow = {
  id: string;
  paymentId: string;
  orderId: string;
  userId: string;
  paymentAmount: number | string;
  refundAmount: number | string;
  paymentStatus: string;
  refundStatus: string;
  provider: string;
  providerRefundId?: string | null;
  reason?: string | null;
  failureReason?: string | null;
  createdAt: Date | string;
  refundedAt?: Date | string | null;
  metadata?: Record<string, unknown> | null;
};

type AdminRefundSummary = {
  id: string;
  paymentId: string;
  orderId: string;
  userId: string;
  paymentAmount: number;
  refundAmount: number;
  paymentStatus: string;
  refundStatus: string;
  provider: string;
  providerRefundId: string | null;
  reason: string | null;
  failureReason: string | null;
  createdAt: Date | string;
  refundedAt: Date | string | null;
  gatewayStatus: string | null;
  workflowResolution: string | null;
  retryCount: number;
};

@Injectable()
export class RefundOperationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderClientService: OrderClientService,
    private readonly paymentOutboxPublisher: PaymentOutboxPublisher,
  ) {}

  /**
   * Exchange hiện được biểu diễn bằng outbox event để order service xử lý tồn kho/đơn hàng.
   * Payment service không tự sửa inventory nhằm tránh xuyên biên giới bounded context.
   */
  async createExchangeRequest(input: {
    paymentId: string;
    amount: number;
    reason: string;
    orderId?: string;
    userId?: string;
    approvedRefundAmount?: number;
    adminNote?: string;
  }) {
    const exchangeRequestId = `EX_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    await this.dataSource.query(
      `
      INSERT INTO payment_service.outbox_events (
        aggregate_type,
        aggregate_id,
        type,
        payload,
        status,
        created_at
      )
      VALUES (
        'exchange',
        $1,
        'order.exchange.requested',
        $2::jsonb,
        'PENDING',
        NOW()
      )
      `,
      [
        input.orderId ?? input.paymentId,
        JSON.stringify({
          exchangeRequestId,
          paymentId: input.paymentId,
          orderId: input.orderId ?? null,
          userId: input.userId ?? null,
          requestedAmount: Number(input.amount),
          approvedRefundAmount:
            input.approvedRefundAmount != null
              ? Number(input.approvedRefundAmount)
              : null,
          reason: input.reason,
          adminNote: input.adminNote ?? null,
        }),
      ],
    );

    return {
      exchangeRequestId,
      created: true,
    };
  }

  async updateOrderInventoryForExchange(input: {
    orderId: string;
    paymentId: string;
    exchangeRequestId?: string;
    userId?: string;
  }) {
    await this.dataSource.query(
      `
      INSERT INTO payment_service.outbox_events (
        aggregate_type,
        aggregate_id,
        type,
        payload,
        status,
        created_at
      )
      VALUES (
        'exchange',
        $1,
        'order.exchange.inventory-sync.requested',
        $2::jsonb,
        'PENDING',
        NOW()
      )
      `,
      [
        input.orderId,
        JSON.stringify({
          orderId: input.orderId,
          paymentId: input.paymentId,
          exchangeRequestId: input.exchangeRequestId ?? null,
          userId: input.userId ?? null,
        }),
      ],
    );

    return {
      updated: true,
      orderId: input.orderId,
    };
  }

  async callGatewayRefundApi(input: {
    refundId: string;
    paymentId: string;
    method?: string;
    providerRefundId?: string;
  }) {
    // Stub này giữ shape giống gateway thật để sau này thay adapter không phải đổi BPMN variables.
    const providerRefundId =
      input.providerRefundId ??
      `RF_GATEWAY_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    await this.dataSource.query(
      `
      UPDATE payment_service.refunds
      SET provider_refund_id = COALESCE(provider_refund_id, $1),
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{gatewayStatus}',
            to_jsonb($2::text),
            true
          ),
          updated_at = NOW()
      WHERE id = $3
      `,
      [providerRefundId, 'REQUESTED', input.refundId],
    );

    return {
      accepted: true,
      providerRefundId,
      gatewayMode:
        input.method && ['vnpay', 'momo'].includes(input.method)
          ? 'provider'
          : 'sandbox',
    };
  }

  async persistRefundResultTransaction(input: {
    refundId: string;
    paymentId: string;
    rawPayload: string;
    providerRefundId?: string;
    refundResult: string;
  }) {
    /**
     * Toàn bộ ghi nhận webhook refund phải đi trong một transaction:
     * 1. Khóa refund.
     * 2. Lưu webhook để chống replay/double-process.
     * 3. Cập nhật refund/payment state.
     * 4. Sinh outbox event.
     *
     * Việc gọi order service được đưa ra ngoài transaction để tránh giữ lock DB khi có I/O mạng.
     */
    const payloadHash = this.hashPayload(input.rawPayload);
    const result = await this.dataSource.transaction(async (manager) => {
      const refundRows = await manager.query(
        `
        SELECT
          r.id,
          r.payment_id AS "paymentId",
          r.amount AS "refundAmount",
          r.reason,
          r.provider_refund_id AS "providerRefundId",
          p.order_id AS "orderId",
          p.user_id AS "userId",
          p.amount AS "paymentAmount",
          ps.code AS "paymentStatus"
        FROM payment_service.refunds r
        JOIN payment_service.payments p ON p.id = r.payment_id
        JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
        WHERE r.id = $1
        FOR UPDATE
        `,
        [input.refundId],
      );

      if (!refundRows.length) {
        throw new NotFoundException('Refund not found');
      }

      const refund = refundRows[0] as RefundWorkflowRow & {
        paymentStatus: string;
      };

      await manager.query(
        `
        INSERT INTO payment_service.payment_webhooks (
          payment_id,
          raw_payload,
          signature_valid,
          processed_at,
          received_at,
          provider_txn_id,
          event_type,
          processing_status,
          payload_hash
        )
        VALUES ($1, $2::jsonb, TRUE, NOW(), NOW(), $3, $4, 'PROCESSED', $5)
        ON CONFLICT DO NOTHING
        `,
        [
          input.paymentId,
          this.normalizeJsonPayload(input.rawPayload),
          input.providerRefundId ?? refund.providerRefundId ?? null,
          `refund.${input.refundResult.toLowerCase()}`,
          payloadHash,
        ],
      );

      if (input.refundResult === 'SUCCESS') {
        const refundedStatusId = await this.getPaymentStatusId('refunded');
        const refundStatusId = await this.getPaymentStatusId('refunded');

        await manager.query(
          `
          UPDATE payment_service.refunds
          SET status_id = $1,
              provider_refund_id = COALESCE($2, provider_refund_id),
              refunded_at = NOW(),
              failure_reason = NULL,
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{gatewayStatus}',
                to_jsonb($3::text),
                true
              ),
              updated_at = NOW()
          WHERE id = $4
          `,
          [
            refundStatusId,
            input.providerRefundId ?? null,
            'SUCCESS',
            input.refundId,
          ],
        );

        const refundAmount = Number(refund.refundAmount);
        const paymentAmount = Number(refund.paymentAmount);
        const fullyRefunded = refundAmount >= paymentAmount;

        if (fullyRefunded) {
          await manager.query(
            `
            UPDATE payment_service.payments
            SET status_id = $1,
                updated_at = NOW()
            WHERE id = $2
            `,
            [refundedStatusId, input.paymentId],
          );
        }

        const outboxRows = await manager.query(
          `
          INSERT INTO payment_service.outbox_events (
            aggregate_type,
            aggregate_id,
            type,
            payload,
            status,
            created_at
          )
          VALUES (
            'refund',
            $1,
            'payment.refund.completed',
            $2::jsonb,
            'PENDING',
            NOW()
          )
          RETURNING id
          `,
          [
            input.refundId,
            JSON.stringify({
              refundId: input.refundId,
              paymentId: input.paymentId,
              orderId: refund.orderId,
              userId: refund.userId,
              amount: refundAmount,
              providerRefundId:
                input.providerRefundId ?? refund.providerRefundId ?? null,
              fullyRefunded,
              reason: refund.reason ?? null,
            }),
          ],
        );

        return {
          refundStatus: 'SUCCESS',
          outboxEventId: outboxRows[0].id as string,
          fullyRefunded,
          orderId: refund.orderId,
        };
      }

      const failedStatusId = await this.getPaymentStatusId('failed');

      await manager.query(
        `
        UPDATE payment_service.refunds
        SET status_id = $1,
            provider_refund_id = COALESCE($2, provider_refund_id),
            failure_reason = $3,
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{gatewayStatus}',
              to_jsonb($4::text),
              true
            ),
            updated_at = NOW()
        WHERE id = $5
        `,
        [
          failedStatusId,
          input.providerRefundId ?? null,
          `Refund result ${input.refundResult}`,
          input.refundResult,
          input.refundId,
        ],
      );

      const outboxRows = await manager.query(
        `
        INSERT INTO payment_service.outbox_events (
          aggregate_type,
          aggregate_id,
          type,
          payload,
          status,
          created_at
        )
        VALUES (
          'refund',
          $1,
          'payment.refund.failed',
          $2::jsonb,
          'PENDING',
          NOW()
        )
        RETURNING id
        `,
        [
          input.refundId,
          JSON.stringify({
            refundId: input.refundId,
            paymentId: input.paymentId,
            orderId: refund.orderId,
            userId: refund.userId,
            providerRefundId:
              input.providerRefundId ?? refund.providerRefundId ?? null,
            refundResult: input.refundResult,
          }),
        ],
      );

      return {
        refundStatus: input.refundResult,
        outboxEventId: outboxRows[0].id as string,
        fullyRefunded: false,
        orderId: refund.orderId,
      };
    });

    if (result.fullyRefunded) {
      await this.orderClientService.updateOrderPayment(
        result.orderId,
        'refunded',
        'refunded',
      );
    }

    return {
      refundStatus: result.refundStatus,
      outboxEventId: result.outboxEventId,
      fullyRefunded: result.fullyRefunded,
    };
  }

  async increaseRefundRetryCount(input: { refundId: string }) {
    const rows = await this.dataSource.query(
      `
      UPDATE payment_service.refunds
      SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{retryCount}',
            to_jsonb(COALESCE((metadata ->> 'retryCount')::int, 0) + 1),
            true
          ),
          updated_at = NOW()
      WHERE id = $1
      RETURNING COALESCE((metadata ->> 'retryCount')::int, 0) AS "retryCount"
      `,
      [input.refundId],
    );

    if (!rows.length) {
      throw new NotFoundException('Refund not found');
    }

    const retryCount = Number(rows[0].retryCount || 0);
    const maxRetryCount = Number(process.env.REFUND_MAX_RETRY_COUNT || 3);

    return {
      retryCount,
      refundRetryAllowed: retryCount < maxRetryCount,
    };
  }

  async notifyCustomerRefundCompleted(input: { refundId: string }) {
    // Notification cũng đi qua outbox để retry được và không làm fail transaction nghiệp vụ chính.
    const rows = await this.dataSource.query(
      `
      SELECT
        r.id,
        r.payment_id AS "paymentId",
        r.amount AS "refundAmount",
        r.reason,
        r.provider_refund_id AS "providerRefundId",
        p.order_id AS "orderId",
        p.user_id AS "userId"
      FROM payment_service.refunds r
      JOIN payment_service.payments p ON p.id = r.payment_id
      WHERE r.id = $1
      LIMIT 1
      `,
      [input.refundId],
    );

    if (!rows.length) {
      throw new NotFoundException('Refund not found');
    }

    const refund = rows[0] as RefundWorkflowRow;

    await this.dataSource.query(
      `
      INSERT INTO payment_service.outbox_events (
        aggregate_type,
        aggregate_id,
        type,
        payload,
        status,
        created_at
      )
      VALUES (
        'notification',
        $1,
        'notification.refund.completed',
        $2::jsonb,
        'PENDING',
        NOW()
      )
      `,
      [
        refund.id,
        JSON.stringify({
          refundId: refund.id,
          paymentId: refund.paymentId,
          orderId: refund.orderId,
          userId: refund.userId,
          amount: Number(refund.refundAmount),
          reason: refund.reason ?? null,
          providerRefundId: refund.providerRefundId ?? null,
        }),
      ],
    );

    await this.paymentOutboxPublisher.publishPendingEvents();

    return {
      notified: true,
      refundId: refund.id,
    };
  }

  async notifyCustomerRefundRejected(input: {
    refundId: string;
    paymentId?: string;
    orderId?: string;
    userId?: string;
    rejectionReason?: string;
  }) {
    await this.dataSource.query(
      `
      INSERT INTO payment_service.outbox_events (
        aggregate_type,
        aggregate_id,
        type,
        payload,
        status,
        created_at
      )
      VALUES (
        'notification',
        $1,
        'notification.refund.rejected',
        $2::jsonb,
        'PENDING',
        NOW()
      )
      `,
      [
        input.refundId,
        JSON.stringify({
          refundId: input.refundId,
          paymentId: input.paymentId ?? null,
          orderId: input.orderId ?? null,
          userId: input.userId ?? null,
          rejectionReason: input.rejectionReason ?? 'Refund request rejected',
        }),
      ],
    );

    await this.paymentOutboxPublisher.publishPendingEvents();

    return {
      notified: true,
      refundId: input.refundId,
    };
  }

  async notifyCustomerExchangeCreated(input: {
    exchangeRequestId: string;
    paymentId?: string;
    orderId?: string;
    userId?: string;
  }) {
    await this.dataSource.query(
      `
      INSERT INTO payment_service.outbox_events (
        aggregate_type,
        aggregate_id,
        type,
        payload,
        status,
        created_at
      )
      VALUES (
        'notification',
        $1,
        'notification.exchange.created',
        $2::jsonb,
        'PENDING',
        NOW()
      )
      `,
      [
        input.exchangeRequestId,
        JSON.stringify({
          exchangeRequestId: input.exchangeRequestId,
          paymentId: input.paymentId ?? null,
          orderId: input.orderId ?? null,
          userId: input.userId ?? null,
        }),
      ],
    );

    await this.paymentOutboxPublisher.publishPendingEvents();

    return {
      notified: true,
      exchangeRequestId: input.exchangeRequestId,
    };
  }

  async getAdminRefunds(): Promise<AdminRefundSummary[]> {
    // Read-model cho trang admin: flatten dữ liệu payment/refund và metadata để UI không phải tự ghép nhiều nguồn.
    const rows = await this.dataSource.query(
      `
      SELECT
        r.id,
        r.payment_id AS "paymentId",
        p.order_id AS "orderId",
        p.user_id AS "userId",
        p.amount AS "paymentAmount",
        r.amount AS "refundAmount",
        pps.code AS "paymentStatus",
        prs.code AS "refundStatus",
        pp.code AS provider,
        r.provider_refund_id AS "providerRefundId",
        r.reason,
        r.failure_reason AS "failureReason",
        r.created_at AS "createdAt",
        r.refunded_at AS "refundedAt",
        r.metadata
      FROM payment_service.refunds r
      JOIN payment_service.payments p ON p.id = r.payment_id
      JOIN payment_service.payment_statuses prs ON prs.id = r.status_id
      JOIN payment_service.payment_statuses pps ON pps.id = p.status_id
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      ORDER BY r.created_at DESC
      `,
    );

    return rows.map((row: AdminRefundRow) => {
      const metadata =
        row.metadata && typeof row.metadata === 'object' ? row.metadata : {};

      return {
        id: row.id,
        paymentId: row.paymentId,
        orderId: row.orderId,
        userId: row.userId,
        paymentAmount: Number(row.paymentAmount),
        refundAmount: Number(row.refundAmount),
        paymentStatus: row.paymentStatus,
        refundStatus: row.refundStatus,
        provider: row.provider,
        providerRefundId: row.providerRefundId ?? null,
        reason: row.reason ?? null,
        failureReason: row.failureReason ?? null,
        createdAt: row.createdAt,
        refundedAt: row.refundedAt ?? null,
        gatewayStatus: this.readMetadataString(metadata, 'gatewayStatus'),
        workflowResolution: this.readMetadataString(
          metadata,
          'workflowResolution',
        ),
        retryCount: Number(metadata.retryCount ?? 0),
      };
    });
  }

  private async getPaymentStatusId(code: string): Promise<number> {
    const rows = await this.dataSource.query(
      `
      SELECT id
      FROM payment_service.payment_statuses
      WHERE code = $1
      LIMIT 1
      `,
      [code],
    );

    if (!rows.length) {
      throw new NotFoundException(`Payment status ${code} not found`);
    }

    return Number(rows[0].id);
  }

  private hashPayload(rawPayload: string): string {
    const normalized =
      typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);

    return createHash('sha256').update(normalized).digest('hex');
  }

  private normalizeJsonPayload(rawPayload: string): string {
    if (!rawPayload) {
      return '{}';
    }

    if (typeof rawPayload !== 'string') {
      return JSON.stringify(rawPayload);
    }

    try {
      return JSON.stringify(JSON.parse(rawPayload));
    } catch {
      return JSON.stringify({
        raw: rawPayload,
      });
    }
  }

  private readMetadataString(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key];

    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
