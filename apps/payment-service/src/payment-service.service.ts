/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderClientService } from './clients/order-client.service';
import { PaymentOutboxPublisher } from './kafka';

type PaymentRow = {
  id: string;
  orderId: string;
  userId: string;
  providerId: number;
  statusId: number;
  amount: number | string;
  currency: string;
  providerTransactionId?: string | null;
  providerRef?: string | null;
  paymentUrl?: string | null;
  paidAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  method?: string;
  status?: string;
};

type VnpayCallbackPayload = Record<string, string | undefined>;

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
export class PaymentServiceService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly orderClientService: OrderClientService,
    private readonly dataSource: DataSource,
    private readonly paymentOutboxPublisher: PaymentOutboxPublisher,
  ) {}

  async createPayment(userId: string | undefined, dto: CreatePaymentDto) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const order = await this.orderClientService.getOrder(dto.orderId, userId);

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order has already been paid');
    }

    const providerId = await this.getProviderId(dto.method);
    const pendingStatusId = await this.getPaymentStatusId('pending');
    const providerRef = this.generatePaymentCode();
    const isOfflinePayment = dto.method === 'cod';
    const payment = this.paymentRepository.create({
      orderId: dto.orderId,
      userId,
      providerId,
      statusId: pendingStatusId,
      amount: order.totalAmount,
      currency: 'VND',
      providerRef,
      paymentUrl: null,
      expiresAt: isOfflinePayment
        ? null
        : new Date(Date.now() + 15 * 60 * 1000),
    });

    const savedPayment = await this.paymentRepository.save(payment);

    if (!isOfflinePayment && dto.method === 'vnpay') {
      savedPayment.paymentUrl = this.buildVnpayPaymentUrl({
        id: savedPayment.id,
        orderId: savedPayment.orderId,
        amount: savedPayment.amount,
        providerRef: savedPayment.providerRef,
      });
      await this.paymentRepository.save(savedPayment);
    } else if (!isOfflinePayment) {
      savedPayment.paymentUrl = dto.returnUrl ?? null;
      await this.paymentRepository.save(savedPayment);
    }

    await this.orderClientService.updateOrderPayment(dto.orderId, 'pending');

    return this.getPaymentDetail(savedPayment.id);
  }

  async findMyPayments(userId: string | undefined) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.user_id AS "userId",
        p.provider_id AS "providerId",
        p.status_id AS "statusId",
        p.amount,
        p.currency,
        p.provider_txn_id AS "providerTransactionId",
        p.provider_ref AS "providerRef",
        p.payment_url AS "paymentUrl",
        p.paid_at AS "paidAt",
        p.expires_at AS "expiresAt",
        p.created_at AS "createdAt",
        pp.code AS method,
        ps.code AS status
      FROM payment_service.payments p
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
      `,
      [userId],
    );

    return rows.map((row: PaymentRow) => this.mapPayment(row));
  }

  async findPaymentDetail(userId: string | undefined, paymentId: string) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const payment = await this.getPaymentDetail(paymentId);

    if (payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async completePayment(paymentId: string, providerTransactionId?: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.statusId = await this.getPaymentStatusId('paid');
    payment.providerTransactionId =
      providerTransactionId ?? `mock_${Date.now().toString()}`;
    payment.paidAt = new Date();

    const savedPayment = await this.paymentRepository.save(payment);
    await this.orderClientService.updateOrderPayment(
      payment.orderId,
      'paid',
      'confirmed',
    );

    return this.getPaymentDetail(savedPayment.id);
  }

  async failPayment(paymentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    payment.statusId = await this.getPaymentStatusId('failed');
    const savedPayment = await this.paymentRepository.save(payment);
    await this.orderClientService.updateOrderPayment(
      payment.orderId,
      'failed',
      'pending',
    );

    return this.getPaymentDetail(savedPayment.id);
  }

  async handleVnpayReturn(query: VnpayCallbackPayload) {
    try {
      const handled = await this.processVnpayCallback(query);
      const redirectUrl = new URL(this.getPublicReturnUrl());

      redirectUrl.searchParams.set('orderId', handled.orderId);
      redirectUrl.searchParams.set('orderCode', handled.orderCode);
      redirectUrl.searchParams.set('paymentStatus', handled.paymentStatus);
      redirectUrl.searchParams.set('checkoutMode', 'online');

      if (handled.message) {
        redirectUrl.searchParams.set('message', handled.message);
      }

      return redirectUrl.toString();
    } catch (error) {
      const redirectUrl = new URL(this.getPublicReturnUrl());
      redirectUrl.searchParams.set('paymentStatus', 'failed');
      redirectUrl.searchParams.set('checkoutMode', 'online');
      redirectUrl.searchParams.set(
        'message',
        error instanceof Error ? error.message : 'VNPay callback failed',
      );
      return redirectUrl.toString();
    }
  }

  async handleVnpayIpn(query: VnpayCallbackPayload) {
    try {
      await this.processVnpayCallback(query);

      return {
        RspCode: '00',
        Message: 'Confirm Success',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        return {
          RspCode: '97',
          Message: error.message,
        };
      }

      if (error instanceof NotFoundException) {
        return {
          RspCode: '01',
          Message: error.message,
        };
      }

      return {
        RspCode: '99',
        Message: 'Unknown error',
      };
    }
  }

  private mapPayment(payment: PaymentRow) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      method: payment.method ?? 'cod',
      status: payment.status ?? 'pending',
      amount: Number(payment.amount),
      currency: payment.currency,
      paymentUrl: payment.paymentUrl ?? null,
      providerRef: payment.providerRef ?? null,
      providerTransactionId: payment.providerTransactionId ?? null,
      paidAt: payment.paidAt ?? null,
      expiresAt: payment.expiresAt ?? null,
      createdAt: payment.createdAt,
      paymentCode: payment.providerRef ?? null,
      transactionId:
        payment.providerTransactionId ?? payment.providerRef ?? payment.id,
    };
  }

  private async getPaymentDetail(paymentId: string) {
    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.user_id AS "userId",
        p.provider_id AS "providerId",
        p.status_id AS "statusId",
        p.amount,
        p.currency,
        p.provider_txn_id AS "providerTransactionId",
        p.provider_ref AS "providerRef",
        p.payment_url AS "paymentUrl",
        p.paid_at AS "paidAt",
        p.expires_at AS "expiresAt",
        p.created_at AS "createdAt",
        pp.code AS method,
        ps.code AS status
      FROM payment_service.payments p
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      WHERE p.id = $1
      LIMIT 1
      `,
      [paymentId],
    );

    if (!rows.length) {
      throw new NotFoundException('Payment not found');
    }

    return this.mapPayment(rows[0] as PaymentRow);
  }

  private async getPaymentByProviderRef(providerRef: string) {
    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.user_id AS "userId",
        p.provider_id AS "providerId",
        p.status_id AS "statusId",
        p.amount,
        p.currency,
        p.provider_txn_id AS "providerTransactionId",
        p.provider_ref AS "providerRef",
        p.payment_url AS "paymentUrl",
        p.paid_at AS "paidAt",
        p.expires_at AS "expiresAt",
        p.created_at AS "createdAt",
        pp.code AS method,
        ps.code AS status
      FROM payment_service.payments p
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      WHERE p.provider_ref = $1
      LIMIT 1
      `,
      [providerRef],
    );

    if (!rows.length) {
      throw new NotFoundException('Payment not found');
    }

    return rows[0] as PaymentRow;
  }

  private async getProviderId(code: string): Promise<number> {
    const rows = await this.dataSource.query(
      `
      SELECT id
      FROM payment_service.payment_providers
      WHERE code = $1 AND is_active = TRUE
      LIMIT 1
      `,
      [code],
    );

    if (!rows.length) {
      throw new NotFoundException(`Payment provider ${code} not found`);
    }

    return Number(rows[0].id);
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

  async validatePaymentRequest(input: {
    orderId: string;
    userId: string;
    amount: number;
    method: string;
  }) {
    if (!input.orderId) {
      throw new BadRequestException('Missing orderId');
    }

    if (!input.userId) {
      throw new BadRequestException('Missing userId');
    }

    if (!input.amount || Number(input.amount) <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    if (!input.method) {
      throw new BadRequestException('Missing payment method');
    }

    await this.getProviderId(input.method);

    return true;
  }

  async checkIdempotency(input: { orderId: string; idempotencyKey?: string }) {
    const rows = await this.dataSource.query(
      `
    SELECT id
    FROM payment_service.payments
    WHERE order_id = $1
      OR ($2::varchar IS NOT NULL AND idempotency_key = $2)
    ORDER BY created_at DESC
    LIMIT 1
    `,
      [input.orderId, input.idempotencyKey ?? null],
    );

    if (!rows.length) {
      return {
        exists: false,
        paymentId: null,
      };
    }

    return {
      exists: true,
      paymentId: rows[0].id,
    };
  }

  async createOrReusePayment(input: {
    orderId: string;
    userId: string;
    amount: number;
    method: string;
    idempotencyKey?: string;
  }) {
    const existedRows = await this.dataSource.query(
      `
    SELECT
      p.id,
      p.merchant_txn_id AS "merchantTxnId",
      ps.code AS status
    FROM payment_service.payments p
    JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
    WHERE p.order_id = $1
      OR ($2::varchar IS NOT NULL AND p.idempotency_key = $2)
    ORDER BY p.created_at DESC
    LIMIT 1
    `,
      [input.orderId, input.idempotencyKey ?? null],
    );

    if (existedRows.length) {
      const existed = existedRows[0] as {
        id: string;
        merchantTxnId: string;
        status: string;
      };

      if (['pending', 'paid'].includes(existed.status)) {
        return {
          id: existed.id,
          merchantTxnId: existed.merchantTxnId,
          reused: true,
        };
      }
    }

    const providerId = await this.getProviderId(input.method);
    const pendingStatusId = await this.getPaymentStatusId('pending');
    const merchantTxnId = `BALII_${input.orderId}_${Date.now()}`;
    const providerRef = this.generatePaymentCode();

    const rows = await this.dataSource.query(
      `
    INSERT INTO payment_service.payments (
      order_id,
      user_id,
      provider_id,
      status_id,
      amount,
      currency,
      provider_ref,
      payment_url,
      expires_at,
      idempotency_key,
      merchant_txn_id,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, 'VND', $6, NULL,
      NOW() + INTERVAL '15 minutes',
      $7, $8, $9::jsonb, NOW(), NOW()
    )
    RETURNING id, merchant_txn_id AS "merchantTxnId"
    `,
      [
        input.orderId,
        input.userId,
        providerId,
        pendingStatusId,
        input.amount,
        providerRef,
        input.idempotencyKey ?? null,
        merchantTxnId,
        JSON.stringify({
          method: input.method,
          source: 'camunda-payment-workflow',
        }),
      ],
    );

    await this.orderClientService.updateOrderPayment(input.orderId, 'pending');

    return {
      id: rows[0].id,
      merchantTxnId: rows[0].merchantTxnId,
      reused: false,
    };
  }

  async generateProviderPaymentUrl(input: {
    paymentId: string;
    method: string;
  }) {
    const payment = await this.getPaymentDetail(input.paymentId);

    /**
     * Bản hiện tại tạo payment URL nội bộ/sandbox.
     * Khi tích hợp VNPay/MoMo thật thì thay đoạn này bằng hàm build URL theo provider.
     */
    const paymentUrl =
      input.method === 'cod'
        ? null
        : input.method === 'vnpay'
          ? this.buildVnpayPaymentUrl({
              id: payment.id,
              orderId: payment.orderId,
              amount: payment.amount,
              providerRef: payment.providerRef,
            })
          : `http://localhost:4000/payments/sandbox-pay/${input.paymentId}`;

    await this.dataSource.query(
      `
    UPDATE payment_service.payments
    SET payment_url = $1,
        updated_at = NOW()
    WHERE id = $2
    `,
      [paymentUrl, input.paymentId],
    );

    return {
      paymentUrl,
      providerRef: payment.providerRef,
    };
  }

  async verifyGatewaySignature(input: {
    provider: string;
    rawPayload: string;
    signature?: string;
  }) {
    /**
     * Hiện tại xử lý theo sandbox/local.
     * Khi dùng VNPay/MoMo thật thì verify HMAC ở đây.
     */
    let payload: any = {};

    try {
      payload =
        typeof input.rawPayload === 'string'
          ? JSON.parse(input.rawPayload)
          : input.rawPayload;
    } catch {
      payload = {};
    }

    const paymentResult =
      payload.status === 'SUCCESS' || payload.paymentResult === 'SUCCESS'
        ? 'SUCCESS'
        : payload.status === 'FAILED' || payload.paymentResult === 'FAILED'
          ? 'FAILED'
          : 'UNKNOWN';

    return {
      signatureValid: true,
      providerTxnId: payload.providerTxnId ?? `TXN_${Date.now()}`,
      paymentResult,
      gatewayAmount: payload.amount ? Number(payload.amount) : null,
    };
  }

  async checkDuplicateCallback(rawPayload: string) {
    const payloadHash = this.hashPayload(rawPayload);

    const rows = await this.dataSource.query(
      `
    SELECT id
    FROM payment_service.payment_webhooks
    WHERE payload_hash = $1
    LIMIT 1
    `,
      [payloadHash],
    );

    return {
      duplicate: rows.length > 0,
      payloadHash,
    };
  }

  async persistPaymentResultTransaction(input: {
    paymentId: string;
    orderId: string;
    rawPayload: string;
    providerTxnId?: string;
    paymentResult: string;
  }) {
    const payloadHash = this.hashPayload(input.rawPayload);

    return this.dataSource.transaction(async (manager) => {
      const paymentRows = await manager.query(
        `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.amount,
        ps.code AS status
      FROM payment_service.payments p
      JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      WHERE p.id = $1
      FOR UPDATE
      `,
        [input.paymentId],
      );

      if (!paymentRows.length) {
        throw new NotFoundException('Payment not found');
      }

      const payment = paymentRows[0];

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
          input.providerTxnId ?? null,
          input.paymentResult,
          payloadHash,
        ],
      );

      if (payment.status === 'paid') {
        return {
          paymentFinalStatus: 'paid',
          outboxEventId: null,
          alreadyProcessed: true,
        };
      }

      const finalStatusCode =
        input.paymentResult === 'SUCCESS'
          ? 'paid'
          : input.paymentResult === 'FAILED'
            ? 'failed'
            : 'failed';

      const statusId = await this.getPaymentStatusId(finalStatusCode);

      await manager.query(
        `
      UPDATE payment_service.payments
      SET status_id = $1,
          provider_txn_id = $2,
          paid_at = CASE WHEN $3 = 'paid' THEN NOW() ELSE paid_at END,
          failure_reason = CASE WHEN $3 <> 'paid' THEN $4 ELSE NULL END,
          updated_at = NOW()
      WHERE id = $5
      `,
        [
          statusId,
          input.providerTxnId ?? null,
          finalStatusCode,
          input.paymentResult === 'UNKNOWN' ? 'Unknown gateway result' : null,
          input.paymentId,
        ],
      );

      const eventType =
        finalStatusCode === 'paid' ? 'payment.success' : 'payment.failed';

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
        'payment',
        $1,
        $2,
        $3::jsonb,
        'PENDING',
        NOW()
      )
      RETURNING id
      `,
        [
          input.paymentId,
          eventType,
          JSON.stringify({
            paymentId: input.paymentId,
            orderId: payment.orderId,
            amount: Number(payment.amount),
            providerTxnId: input.providerTxnId ?? null,
            status: finalStatusCode,
          }),
        ],
      );

      if (finalStatusCode === 'paid') {
        await this.orderClientService.updateOrderPayment(
          String(payment.orderId),
          'paid',
          'confirmed',
        );
      } else {
        await this.orderClientService.updateOrderPayment(
          String(payment.orderId),
          'failed',
          'pending',
        );
      }

      return {
        paymentFinalStatus: finalStatusCode,
        outboxEventId: outboxRows[0].id,
        alreadyProcessed: false,
      };
    });
  }

  async signalOutboxPublisher() {
    /**
     * Sau này chỗ này có thể wake up Outbox Publisher.
     * Hiện tại để no-op vì publisher sẽ chạy riêng bằng interval/cron.
     */
    return this.paymentOutboxPublisher.publishPendingEvents();
  }

  async correlatePaymentSuccessToOrder(input: {
    orderId: string;
    paymentId: string;
  }) {
    /**
     * Hiện tại đã update Order Service trong persistPaymentResultTransaction.
     * Sau này nếu Order Workflow cũng chạy trong Camunda thì gọi message correlation tại đây.
     */
    return {
      correlated: true,
      orderId: input.orderId,
      paymentId: input.paymentId,
    };
  }

  async cancelOrReleaseOrder(input: { orderId: string; paymentId?: string }) {
    await this.orderClientService.updateOrderPayment(
      input.orderId,
      'failed',
      'pending',
    );

    return {
      cancelled: true,
      orderId: input.orderId,
      paymentId: input.paymentId ?? null,
    };
  }

  async saveInvalidWebhook(rawPayload: string) {
    const payloadHash = this.hashPayload(rawPayload);

    await this.dataSource.query(
      `
    INSERT INTO payment_service.payment_webhooks (
      payment_id,
      raw_payload,
      signature_valid,
      processed_at,
      received_at,
      event_type,
      processing_status,
      error_message,
      payload_hash
    )
    VALUES (
      NULL,
      $1::jsonb,
      FALSE,
      NOW(),
      NOW(),
      'INVALID_SIGNATURE',
      'FAILED',
      'Invalid payment callback signature',
      $2
    )
    ON CONFLICT DO NOTHING
    `,
      [this.normalizeJsonPayload(rawPayload), payloadHash],
    );

    return true;
  }

  async markReviewRequired(input: { paymentId?: string; reason: string }) {
    if (!input.paymentId) {
      return {
        reviewRequired: true,
        reason: input.reason,
      };
    }

    await this.dataSource.query(
      `
    UPDATE payment_service.payments
    SET failure_reason = $1,
        updated_at = NOW()
    WHERE id = $2
    `,
      [input.reason, input.paymentId],
    );

    return {
      reviewRequired: true,
      paymentId: input.paymentId,
      reason: input.reason,
    };
  }

  async markExpiredTransaction(input: { paymentId: string; orderId: string }) {
    return this.dataSource.transaction(async (manager) => {
      const failedStatusId = await this.getPaymentStatusId('failed');

      await manager.query(
        `
      UPDATE payment_service.payments
      SET status_id = $1,
          failure_reason = 'Payment timeout',
          updated_at = NOW()
      WHERE id = $2
      `,
        [failedStatusId, input.paymentId],
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
        'payment',
        $1,
        'payment.expired',
        $2::jsonb,
        'PENDING',
        NOW()
      )
      RETURNING id
      `,
        [
          input.paymentId,
          JSON.stringify({
            paymentId: input.paymentId,
            orderId: input.orderId,
            status: 'expired',
          }),
        ],
      );

      await this.orderClientService.updateOrderPayment(
        input.orderId,
        'failed',
        'pending',
      );

      return {
        expired: true,
        outboxEventId: outboxRows[0].id,
      };
    });
  }

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

  async persistReconciledSuccess(input: {
    paymentId: string;
    orderId: string;
    providerTxnId?: string;
  }) {
    return this.persistPaymentResultTransaction({
      paymentId: input.paymentId,
      orderId: input.orderId,
      providerTxnId: input.providerTxnId,
      paymentResult: 'SUCCESS',
      rawPayload: JSON.stringify({
        source: 'reconciliation',
        gatewayResult: 'SUCCESS',
        providerTxnId: input.providerTxnId ?? null,
      }),
    });
  }

  async persistReconciledFailed(input: {
    paymentId: string;
    orderId: string;
    gatewayResult: string;
    providerTxnId?: string;
  }) {
    if (input.gatewayResult === 'EXPIRED') {
      return this.markExpiredTransaction({
        paymentId: input.paymentId,
        orderId: input.orderId,
      });
    }

    return this.persistPaymentResultTransaction({
      paymentId: input.paymentId,
      orderId: input.orderId,
      providerTxnId: input.providerTxnId,
      paymentResult: 'FAILED',
      rawPayload: JSON.stringify({
        source: 'reconciliation',
        gatewayResult: input.gatewayResult,
        providerTxnId: input.providerTxnId ?? null,
      }),
    });
  }

  async increaseReconciliationAttempt(input: { paymentId: string }) {
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

  async validateRefundCondition(input: {
    paymentId: string;
    amount: number;
    reason: string;
  }) {
    if (!input.paymentId) {
      throw new BadRequestException('Missing paymentId');
    }

    if (!input.reason?.trim()) {
      throw new BadRequestException('Missing refund reason');
    }

    if (!input.amount || Number(input.amount) <= 0) {
      throw new BadRequestException('Invalid refund amount');
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.user_id AS "userId",
        p.amount AS "paymentAmount",
        pp.code AS method,
        ps.code AS status,
        COALESCE((
          SELECT SUM(r.amount)
          FROM payment_service.refunds r
          JOIN payment_service.payment_statuses rs ON rs.id = r.status_id
          WHERE r.payment_id = p.id
            AND rs.code IN ('pending', 'refunded')
        ), 0) AS "reservedRefundAmount"
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

    const payment = rows[0] as {
      id: string;
      orderId: string;
      userId: string;
      paymentAmount: number | string;
      method: string;
      status: string;
      reservedRefundAmount: number | string;
    };

    const paymentAmount = Number(payment.paymentAmount);
    const reservedRefundAmount = Number(payment.reservedRefundAmount || 0);
    const refundableAmount = Math.max(paymentAmount - reservedRefundAmount, 0);
    const refundAllowed =
      payment.status === 'paid' && Number(input.amount) <= refundableAmount;

    return {
      refundAllowed,
      paymentId: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      method: payment.method,
      paymentStatus: payment.status,
      refundableAmount,
      reason:
        payment.status !== 'paid'
          ? 'Only paid payments can be refunded'
          : Number(input.amount) > refundableAmount
            ? 'Refund amount exceeds refundable balance'
            : null,
    };
  }

  async validateRefundRequest(input: {
    paymentId: string;
    amount: number;
    reason: string;
  }) {
    if (!input.paymentId) {
      throw new BadRequestException('Missing paymentId');
    }

    if (!input.reason?.trim()) {
      throw new BadRequestException('Missing refund reason');
    }

    if (!input.amount || Number(input.amount) <= 0) {
      throw new BadRequestException('Invalid refund amount');
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.order_id AS "orderId",
        p.user_id AS "userId",
        pp.code AS method
      FROM payment_service.payments p
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      WHERE p.id = $1
      LIMIT 1
      `,
      [input.paymentId],
    );

    if (!rows.length) {
      throw new NotFoundException('Payment not found');
    }

    return {
      valid: true,
      paymentId: rows[0].id as string,
      orderId: rows[0].orderId as string,
      userId: rows[0].userId as string,
      method: rows[0].method as string,
      amount: Number(input.amount),
      reason: input.reason.trim(),
    };
  }

  async checkRefundPaymentStatus(input: {
    paymentId: string;
    amount: number;
    reason: string;
  }) {
    const result = await this.validateRefundCondition(input);

    return {
      ...result,
      amount: Number(input.amount),
    };
  }

  async checkRefundOrderFulfillmentStatus(input: {
    orderId: string;
    userId: string;
    paymentStatus: string;
    refundAllowed: boolean;
    amount: number;
    refundableAmount: number;
  }) {
    if (!input.orderId) {
      throw new BadRequestException('Missing orderId');
    }

    if (!input.userId) {
      throw new BadRequestException('Missing userId');
    }

    if (input.paymentStatus !== 'paid' || !input.refundAllowed) {
      return {
        refundRoute: 'REJECT',
        orderStatus: null,
        routeReason:
          input.paymentStatus !== 'paid'
            ? 'Payment is not eligible for refund'
            : 'Refund amount exceeds refundable balance',
      };
    }

    const order = await this.orderClientService.getOrder(
      input.orderId,
      input.userId,
    );

    const orderStatus = order.status;

    if (['cancelled', 'refunded'].includes(orderStatus)) {
      return {
        refundRoute: 'REJECT',
        orderStatus,
        routeReason: `Order is already ${orderStatus}`,
      };
    }

    if (orderStatus === 'pending') {
      return {
        refundRoute: 'AUTO_REFUND',
        orderStatus,
        routeReason: null,
      };
    }

    if (
      ['confirmed', 'processing', 'shipping', 'delivered'].includes(orderStatus)
    ) {
      return {
        refundRoute: 'ADMIN_REVIEW',
        orderStatus,
        routeReason: `Order status ${orderStatus} requires admin review`,
      };
    }

    return {
      refundRoute: 'ADMIN_REVIEW',
      orderStatus,
      routeReason: 'Refund request requires manual review',
    };
  }

  async checkRefundIdempotency(input: {
    paymentId: string;
    amount: number;
    idempotencyKey?: string;
  }) {
    const rows = await this.dataSource.query(
      `
      SELECT
        r.id,
        r.provider_refund_id AS "providerRefundId",
        ps.code AS status
      FROM payment_service.refunds r
      JOIN payment_service.payment_statuses ps ON ps.id = r.status_id
      WHERE r.payment_id = $1
        AND (
          ($2::varchar IS NOT NULL AND r.idempotency_key = $2)
          OR ($2::varchar IS NULL AND r.amount = $3 AND ps.code IN ('pending', 'refunded'))
        )
      ORDER BY r.created_at DESC
      LIMIT 1
      `,
      [input.paymentId, input.idempotencyKey ?? null, input.amount],
    );

    if (!rows.length) {
      return {
        exists: false,
        refundId: null,
        providerRefundId: null,
      };
    }

    return {
      exists: true,
      refundId: rows[0].id as string,
      providerRefundId: (rows[0].providerRefundId as string | null) ?? null,
      status: rows[0].status as string,
    };
  }

  async createRefundRecord(input: {
    paymentId: string;
    amount: number;
    reason: string;
    idempotencyKey?: string;
  }) {
    const existing = await this.checkRefundIdempotency({
      paymentId: input.paymentId,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
    });

    if (existing.exists && existing.refundId) {
      return {
        refundId: existing.refundId,
        providerRefundId: existing.providerRefundId,
        reused: true,
      };
    }

    const pendingStatusId = await this.getPaymentStatusId('pending');
    const providerRefundId = `RF_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const rows = await this.dataSource.query(
      `
      INSERT INTO payment_service.refunds (
        payment_id,
        amount,
        status_id,
        reason,
        provider_refund_id,
        idempotency_key,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW()
      )
      RETURNING id, provider_refund_id AS "providerRefundId"
      `,
      [
        input.paymentId,
        input.amount,
        pendingStatusId,
        input.reason,
        providerRefundId,
        input.idempotencyKey ?? null,
        JSON.stringify({
          retryCount: 0,
          gatewayStatus: 'REQUESTED',
        }),
      ],
    );

    return {
      refundId: rows[0].id as string,
      providerRefundId: rows[0].providerRefundId as string,
      reused: false,
    };
  }

  async updateRefundRejected(input: {
    paymentId: string;
    amount: number;
    reason: string;
    refundId?: string;
    idempotencyKey?: string;
    rejectionReason?: string;
    adminNote?: string;
  }) {
    const failedStatusId = await this.getPaymentStatusId('failed');
    const rejectionReason =
      input.rejectionReason?.trim() ||
      input.adminNote?.trim() ||
      'Refund request rejected';

    let refundId = input.refundId;

    if (!refundId) {
      const existing = await this.checkRefundIdempotency({
        paymentId: input.paymentId,
        amount: Number(input.amount),
        idempotencyKey: input.idempotencyKey,
      });

      if (existing.refundId) {
        refundId = existing.refundId;
      }
    }

    if (refundId) {
      await this.dataSource.query(
        `
        UPDATE payment_service.refunds
        SET status_id = $1,
            failure_reason = $2,
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
        WHERE id = $4
        `,
        [
          failedStatusId,
          rejectionReason,
          JSON.stringify({
            workflowResolution: 'REJECTED',
            adminNote: input.adminNote ?? null,
          }),
          refundId,
        ],
      );
    } else {
      const rows = await this.dataSource.query(
        `
        INSERT INTO payment_service.refunds (
          payment_id,
          amount,
          status_id,
          reason,
          idempotency_key,
          failure_reason,
          metadata,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
        RETURNING id
        `,
        [
          input.paymentId,
          Number(input.amount),
          failedStatusId,
          input.reason,
          input.idempotencyKey ?? null,
          rejectionReason,
          JSON.stringify({
            workflowResolution: 'REJECTED',
            adminNote: input.adminNote ?? null,
          }),
        ],
      );

      refundId = rows[0].id as string;
    }

    return {
      refundId,
      rejectionReason,
      rejected: true,
    };
  }

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
    const payloadHash = this.hashPayload(input.rawPayload);

    return this.dataSource.transaction(async (manager) => {
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

        if (fullyRefunded) {
          await this.orderClientService.updateOrderPayment(
            refund.orderId,
            'refunded',
            'refunded',
          );
        }

        return {
          refundStatus: 'SUCCESS',
          outboxEventId: outboxRows[0].id as string,
          fullyRefunded,
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
      };
    });
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

  private buildVnpayPaymentUrl(payment: {
    id: string;
    orderId: string;
    amount: number | string;
    providerRef?: string | null;
  }) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const paymentUrl = process.env.VNPAY_PAYMENT_URL;
    const returnUrl = this.getVnpayReturnUrl();

    if (!tmnCode || !hashSecret || !paymentUrl || !returnUrl) {
      throw new BadRequestException('VNPay environment is not configured');
    }

    const txnRef = payment.providerRef ?? this.generatePaymentCode();
    const params: Record<string, string> = {
      vnp_Amount: Math.round(Number(payment.amount) * 100).toString(),
      vnp_Command: 'pay',
      vnp_CreateDate: this.formatVnpayDate(new Date()),
      vnp_CurrCode: 'VND',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${payment.orderId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TmnCode: tmnCode,
      vnp_TxnRef: txnRef,
      vnp_Version: '2.1.0',
    };

    const signData = this.buildSortedQuery(params);
    const secureHash = createHmac('sha512', hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return `${paymentUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  }

  private async processVnpayCallback(query: VnpayCallbackPayload) {
    const secureHash = query.vnp_SecureHash;
    const providerRef = query.vnp_TxnRef;

    if (!secureHash || !providerRef) {
      throw new BadRequestException('Missing VNPay callback parameters');
    }

    if (!this.verifyVnpaySignature(query)) {
      await this.saveInvalidWebhook(JSON.stringify(query));
      throw new BadRequestException('Invalid VNPay signature');
    }

    const payment = await this.getPaymentByProviderRef(providerRef);
    const gatewayAmount = Number(query.vnp_Amount ?? 0);
    const expectedAmount = Math.round(Number(payment.amount) * 100);

    if (gatewayAmount !== expectedAmount) {
      await this.markReviewRequired({
        paymentId: payment.id,
        reason: 'VNPay callback amount mismatch',
      });
      throw new BadRequestException('VNPay amount mismatch');
    }

    const paymentResult =
      query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00'
        ? 'SUCCESS'
        : 'FAILED';

    await this.persistPaymentResultTransaction({
      paymentId: payment.id,
      orderId: payment.orderId,
      rawPayload: JSON.stringify(query),
      providerTxnId: query.vnp_TransactionNo ?? providerRef,
      paymentResult,
    });

    const order = await this.orderClientService.getOrder(
      payment.orderId,
      payment.userId,
    );

    return {
      orderId: payment.orderId,
      orderCode: order.orderNumber ?? payment.orderId,
      paymentStatus: paymentResult === 'SUCCESS' ? 'paid' : 'failed',
      message: query.vnp_ResponseCode ?? '',
    };
  }

  private verifyVnpaySignature(query: VnpayCallbackPayload) {
    const hashSecret = process.env.VNPAY_HASH_SECRET;

    if (!hashSecret) {
      throw new BadRequestException('Missing VNPAY_HASH_SECRET');
    }

    const incomingHash = query.vnp_SecureHash;
    const filtered = Object.entries(query).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (
          value != null &&
          key !== 'vnp_SecureHash' &&
          key !== 'vnp_SecureHashType'
        ) {
          acc[key] = value;
        }

        return acc;
      },
      {},
    );

    const signData = this.buildSortedQuery(filtered);
    const expectedHash = createHmac('sha512', hashSecret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return expectedHash === incomingHash;
  }

  private buildSortedQuery(input: Record<string, string>) {
    return Object.keys(input)
      .sort()
      .map(
        (key) =>
          `${key}=${encodeURIComponent(input[key]).replace(/%20/g, '+')}`,
      )
      .join('&');
  }

  private formatVnpayDate(date: Date) {
    return [
      date.getFullYear(),
      (date.getMonth() + 1).toString().padStart(2, '0'),
      date.getDate().toString().padStart(2, '0'),
      date.getHours().toString().padStart(2, '0'),
      date.getMinutes().toString().padStart(2, '0'),
      date.getSeconds().toString().padStart(2, '0'),
    ].join('');
  }

  private getPublicReturnUrl() {
    return (
      process.env.PAYMENT_PUBLIC_RETURN_URL ||
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/checkout/success`
    );
  }

  private getVnpayReturnUrl() {
    return (
      process.env.VNPAY_RETURN_URL ||
      `${process.env.API_GATEWAY_PUBLIC_URL || 'http://localhost:4000'}/payments/vnpay/return`
    );
  }

  private generatePaymentCode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `PAY${timestamp}${random}`;
  }

  private readMetadataString(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key];

    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }
}
