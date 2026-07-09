import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

type ReconciliationPaymentRow = {
  id: string;
  orderId: string;
  userId: string;
  amount: number | string;
  currency: string;
  providerRef?: string | null;
  providerTransactionId?: string | null;
  expiresAt?: Date | null;
  method: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  reconciliationAttempt?: number | string | null;
};

@Injectable()
export class PaymentReconciliationService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Chỉ lấy 1 payment pending mỗi lần để worker đối soát tuần tự,
   * giảm khả năng hai tiến trình cùng thao tác trên một payment khi chưa có hàng đợi riêng.
   */
  async findPendingPaymentsForReconciliation() {
    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.user_id AS "userId",
        p.amount,
        p.currency,
        p.provider_ref AS "providerRef",
        p.provider_txn_id AS "providerTransactionId",
        p.expires_at AS "expiresAt",
        pp.code AS method,
        ps.code AS status,
        COALESCE(p.metadata, '{}'::jsonb) AS metadata,
        COALESCE((p.metadata ->> 'reconciliationAttempt')::int, 0) AS "reconciliationAttempt"
      FROM payment_service.payments p
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      WHERE ps.code = 'pending'
        AND pp.code <> 'cod'
      ORDER BY COALESCE(p.expires_at, p.created_at) ASC, p.created_at ASC
      LIMIT 1
      `,
    );

    if (!rows.length) {
      return {
        hasPendingPayments: false,
      };
    }

    const payment = rows[0] as ReconciliationPaymentRow;

    return {
      hasPendingPayments: true,
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      amount: Number(payment.amount),
      method: payment.method,
      providerRef: payment.providerRef ?? null,
      providerTxnId: payment.providerTransactionId ?? null,
      expiresAt: payment.expiresAt ?? null,
      reconciliationAttempt: Number(payment.reconciliationAttempt || 0),
      metadata: payment.metadata ?? {},
    };
  }

  async queryGatewayStatus(input: {
    paymentId: string;
    providerRef?: string;
    providerTxnId?: string;
  }) {
    // Bản local/dev suy luận kết quả từ metadata hoặc prefix mã giao dịch thay cho API provider thật.
    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.amount,
        p.provider_ref AS "providerRef",
        p.provider_txn_id AS "providerTransactionId",
        p.expires_at AS "expiresAt",
        pp.code AS method,
        ps.code AS status,
        COALESCE(p.metadata, '{}'::jsonb) AS metadata,
        COALESCE((p.metadata ->> 'reconciliationAttempt')::int, 0) AS "reconciliationAttempt"
      FROM payment_service.payments p
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      WHERE p.id = $1
      LIMIT 1
      `,
      [input.paymentId],
    );

    if (!rows.length) {
      throw new NotFoundException('Payment not found');
    }

    const payment = rows[0] as ReconciliationPaymentRow;
    const metadata = payment.metadata ?? {};
    const metadataGatewayResult = this.readMetadataString(
      metadata,
      'reconciliationGatewayResult',
    );
    const providerTxnId =
      input.providerTxnId ??
      payment.providerTransactionId ??
      input.providerRef ??
      payment.providerRef ??
      `recon_${payment.id}`;

    let gatewayResult = metadataGatewayResult?.toUpperCase() ?? 'UNKNOWN';

    if (!metadataGatewayResult) {
      if (
        payment.expiresAt &&
        new Date(payment.expiresAt).getTime() < Date.now()
      ) {
        gatewayResult = 'EXPIRED';
      } else if (
        providerTxnId.startsWith('paid_') ||
        providerTxnId.startsWith('success_')
      ) {
        gatewayResult = 'SUCCESS';
      } else if (
        providerTxnId.startsWith('failed_') ||
        providerTxnId.startsWith('cancel_')
      ) {
        gatewayResult = 'FAILED';
      }
    }

    return {
      gatewayResult,
      providerTxnId,
      tooManyAttempts:
        Number(payment.reconciliationAttempt || 0) >=
        Number(process.env.PAYMENT_RECONCILIATION_MAX_ATTEMPTS || 5),
    };
  }

  async increaseReconciliationAttempt(input: { paymentId: string }) {
    // Đếm số lần đối soát trong metadata để BPMN có thể dừng retry khi vượt ngưỡng cấu hình.
    const rows = await this.dataSource.query(
      `
      UPDATE payment_service.payments
      SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{reconciliationAttempt}',
            to_jsonb(COALESCE((metadata ->> 'reconciliationAttempt')::int, 0) + 1),
            true
          ),
          updated_at = NOW()
      WHERE id = $1
      RETURNING COALESCE((metadata ->> 'reconciliationAttempt')::int, 0) AS "reconciliationAttempt"
      `,
      [input.paymentId],
    );

    if (!rows.length) {
      throw new NotFoundException('Payment not found');
    }

    const reconciliationAttempt = Number(rows[0].reconciliationAttempt || 0);
    const tooManyAttempts =
      reconciliationAttempt >=
      Number(process.env.PAYMENT_RECONCILIATION_MAX_ATTEMPTS || 5);

    return {
      reconciliationAttempt,
      tooManyAttempts,
    };
  }

  private readMetadataString(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key];

    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
