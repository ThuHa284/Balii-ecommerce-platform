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
import { validate as isUuid } from 'uuid';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderClientService } from './clients/order-client.service';
import { PaymentOutboxPublisher } from './kafka';
import { PaymentWebhookSecurityService } from './payment-webhook-security.service';
import { RefundWorkflowService } from './refund-workflow.service';
import { RefundOperationsService } from './refund-operations.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';

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

type ExistingPaymentCandidateRow = {
  id: string;
  status: string;
  method: string;
  expiresAt?: Date | null;
};

type VnpayCallbackPayload = Record<string, string | undefined>;

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
    private readonly paymentWebhookSecurityService: PaymentWebhookSecurityService,
    private readonly refundWorkflowService: RefundWorkflowService,
    private readonly refundOperationsService: RefundOperationsService,
    private readonly paymentReconciliationService: PaymentReconciliationService,
  ) {}

  private normalizeUuid(value: string | null | undefined) {
    if (!value) {
      return null;
    }

    return isUuid(value) ? value : null;
  }

  /**
   * Luồng tạo payment đồng bộ từ API checkout.
   * Hàm này tạo bản ghi payment, chuẩn bị URL thanh toán theo provider
   * và cập nhật order sang trạng thái đang chờ thanh toán.
   */
  async createPayment(userId: string | undefined, dto: CreatePaymentDto) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const order = await this.orderClientService.getOrder(dto.orderId, userId);

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order has already been paid');
    }

    const reusablePayment = await this.findReusableCheckoutPayment({
      orderId: dto.orderId,
      userId,
      method: dto.method,
    });

    if (reusablePayment?.status === 'paid') {
      throw new BadRequestException('Order has already been paid');
    }

    if (
      reusablePayment?.status === 'pending' &&
      !this.isPaymentExpired(reusablePayment.expiresAt)
    ) {
      return this.getPaymentDetail(reusablePayment.id);
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

    const currentStatus = await this.getPaymentStatusCode(payment.statusId);
    if (currentStatus === 'paid') {
      return this.getPaymentDetail(payment.id);
    }

    if (currentStatus !== 'pending') {
      throw new BadRequestException(
        `Cannot mark payment as paid from status ${currentStatus}`,
      );
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

    const currentStatus = await this.getPaymentStatusCode(payment.statusId);
    if (currentStatus === 'failed') {
      return this.getPaymentDetail(payment.id);
    }

    if (currentStatus !== 'pending') {
      throw new BadRequestException(
        `Cannot mark payment as failed from status ${currentStatus}`,
      );
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

  async simulatePaymentSuccess(userId: string | undefined, paymentId: string) {
    if (process.env.PAYMENT_SIMULATION_ENABLED !== 'true') {
      throw new BadRequestException(
        'Tính năng giả lập thanh toán chưa được bật.',
      );
    }

    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    const providerCode = await this.getProviderCode(payment.providerId);

    if (providerCode !== 'vnpay') {
      throw new BadRequestException(
        'Chỉ hỗ trợ giả lập thành công cho thanh toán VNPay.',
      );
    }

    const currentStatus = await this.getPaymentStatusCode(payment.statusId);

    if (currentStatus !== 'pending') {
      throw new BadRequestException(
        'Chỉ có thể giả lập với giao dịch đang chờ thanh toán.',
      );
    }

    return this.completePayment(paymentId, `sandbox_vnpay_${Date.now()}`);
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

  private async getProviderCode(providerId: number) {
    const provider = await this.dataSource.query(
      `
      SELECT code
      FROM payment_service.payment_providers
      WHERE id = $1
      LIMIT 1
      `,
      [providerId],
    );

    return String(provider[0]?.code ?? '');
  }

  private async getPaymentStatusCode(statusId: number) {
    const status = await this.dataSource.query(
      `
      SELECT code
      FROM payment_service.payment_statuses
      WHERE id = $1
      LIMIT 1
      `,
      [statusId],
    );

    return String(status[0]?.code ?? '');
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

  private async findReusableCheckoutPayment(input: {
    orderId: string;
    userId: string;
    method: string;
  }) {
    const rows = await this.dataSource.query(
      `
      SELECT
        p.id,
        ps.code AS status,
        pp.code AS method,
        p.expires_at AS "expiresAt"
      FROM payment_service.payments p
      JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      WHERE p.order_id = $1
        AND p.user_id = $2
        AND pp.code = $3
        AND ps.code IN ('pending', 'paid')
      ORDER BY p.created_at DESC
      LIMIT 1
      `,
      [input.orderId, input.userId, input.method],
    );

    if (!rows.length) {
      return null;
    }

    return rows[0] as ExistingPaymentCandidateRow;
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
    const normalizedOrderId = this.normalizeUuid(input.orderId);
    const rows = await this.dataSource.query(
      `
    SELECT id
    FROM payment_service.payments
    WHERE ($1::uuid IS NOT NULL AND order_id = $1::uuid)
      OR ($2::varchar IS NOT NULL AND idempotency_key = $2)
    ORDER BY created_at DESC
    LIMIT 1
    `,
      [normalizedOrderId, input.idempotencyKey ?? null],
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
    const normalizedOrderId = this.normalizeUuid(input.orderId);
    const existedRows = await this.dataSource.query(
      `
    SELECT
      p.id,
      p.merchant_txn_id AS "merchantTxnId",
      ps.code AS status
    FROM payment_service.payments p
    JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
    WHERE ($1::uuid IS NOT NULL AND p.order_id = $1::uuid)
      OR ($2::varchar IS NOT NULL AND p.idempotency_key = $2)
    ORDER BY p.created_at DESC
    LIMIT 1
    `,
      [normalizedOrderId, input.idempotencyKey ?? null],
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

  /**
   * Worker Camunda gọi hàm này để sinh URL redirect theo provider.
   * COD không cần URL; provider online cần URL ổn định để frontend điều hướng.
   */
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

  /**
   * Xác thực callback từ gateway ở mức nghiệp vụ chung.
   * Kết quả trả về sẽ được workflow dùng để rẽ nhánh trước khi ghi transaction.
   */
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

    const signatureValid =
      input.provider === 'vnpay'
        ? this.paymentWebhookSecurityService.verifyVnpaySignature(
            typeof payload === 'object' && payload !== null
              ? (payload as VnpayCallbackPayload)
              : {},
          )
        : this.paymentWebhookSecurityService.verifyGenericWebhookSignature(
            input.rawPayload,
            input.signature,
          );

    return {
      signatureValid,
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

  /**
   * Transaction trung tâm cho callback thanh toán:
   * khóa payment, lưu webhook chống trùng, cập nhật trạng thái payment
   * và sinh outbox event để các service khác đồng bộ bất đồng bộ.
   */
  async persistPaymentResultTransaction(input: {
    paymentId: string;
    orderId: string;
    rawPayload: string;
    providerTxnId?: string;
    paymentResult: string;
  }) {
    const payloadHash = this.hashPayload(input.rawPayload);
    const result = await this.dataSource.transaction(async (manager) => {
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
          orderId: String(payment.orderId),
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
        orderId: String(payment.orderId),
      };
    });

    if (!result.alreadyProcessed) {
      if (result.paymentFinalStatus === 'paid') {
        await this.orderClientService.updateOrderPayment(
          result.orderId,
          'paid',
          'confirmed',
        );
      } else {
        await this.orderClientService.updateOrderPayment(
          result.orderId,
          'failed',
          'pending',
        );
      }
    }

    return result;
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
    const result = await this.dataSource.transaction(async (manager) => {
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

      return {
        expired: true,
        outboxEventId: outboxRows[0].id,
      };
    });

    await this.orderClientService.updateOrderPayment(
      input.orderId,
      'failed',
      'pending',
    );

    return result;
  }

  async findPendingPaymentsForReconciliation() {
    return this.paymentReconciliationService.findPendingPaymentsForReconciliation();
  }

  /**
   * Reconciliation local ưu tiên đọc metadata đã lưu thay vì gọi gateway thật.
   * Cách này giúp mô phỏng đối soát end-to-end trước khi tích hợp API provider chính thức.
   */
  async queryGatewayStatus(input: {
    paymentId: string;
    providerRef?: string;
    providerTxnId?: string;
  }) {
    return this.paymentReconciliationService.queryGatewayStatus(input);
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
    return this.paymentReconciliationService.increaseReconciliationAttempt(
      input,
    );
  }

  async validateRefundCondition(input: {
    paymentId: string;
    amount: number;
    reason: string;
  }) {
    return this.refundWorkflowService.validateRefundCondition(input);
  }

  /**
   * Kiểm tra dữ liệu đầu vào tối thiểu cho refund workflow.
   * Các luật sâu hơn như số tiền còn được hoàn hay trạng thái đơn
   * được tách sang các step riêng để Camunda dễ quan sát và retry.
   */
  async validateRefundRequest(input: {
    paymentId: string;
    amount: number;
    reason: string;
  }) {
    return this.refundWorkflowService.validateRefundRequest(input);
  }

  async checkRefundPaymentStatus(input: {
    paymentId: string;
    amount: number;
    reason: string;
  }) {
    return this.refundWorkflowService.checkRefundPaymentStatus(input);
  }

  async checkRefundOrderFulfillmentStatus(input: {
    orderId: string;
    userId: string;
    paymentStatus: string;
    refundAllowed: boolean;
    amount: number;
    refundableAmount: number;
  }) {
    return this.refundWorkflowService.checkRefundOrderFulfillmentStatus(input);
  }

  async checkRefundIdempotency(input: {
    paymentId: string;
    amount: number;
    idempotencyKey?: string;
  }) {
    return this.refundWorkflowService.checkRefundIdempotency(input);
  }

  /**
   * Tạo bản ghi refund làm anchor cho toàn bộ workflow hoàn tiền:
   * webhook refund, retry count và outbox event đều bám vào record này.
   */
  async createRefundRecord(input: {
    paymentId: string;
    amount: number;
    reason: string;
    idempotencyKey?: string;
  }) {
    return this.refundWorkflowService.createRefundRecord(input);
  }

  /**
   * Nhánh reject có thể đến trước hoặc sau khi refund record đã tồn tại.
   * Vì vậy hàm này vừa hỗ trợ update record cũ, vừa có thể tạo bản ghi reject tối thiểu.
   */
  async updateRefundRejected(input: {
    paymentId: string;
    amount: number;
    reason: string;
    refundId?: string;
    idempotencyKey?: string;
    rejectionReason?: string;
    adminNote?: string;
  }) {
    return this.refundWorkflowService.updateRefundRejected(input);
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
    return this.refundOperationsService.createExchangeRequest(input);
  }

  async updateOrderInventoryForExchange(input: {
    orderId: string;
    paymentId: string;
    exchangeRequestId?: string;
    userId?: string;
  }) {
    return this.refundOperationsService.updateOrderInventoryForExchange(input);
  }

  /**
   * Stub gateway refund cho local/dev.
   * Hiện tại chỉ đánh dấu REQUESTED và gán providerRefundId để workflow chạy hết vòng đời.
   */
  async callGatewayRefundApi(input: {
    refundId: string;
    paymentId: string;
    method?: string;
    providerRefundId?: string;
  }) {
    return this.refundOperationsService.callGatewayRefundApi(input);
  }

  /**
   * Refund callback cũng phải transactional:
   * khóa refund, lưu webhook, cập nhật refund/payment state và phát sinh outbox event.
   * Payment chỉ chuyển sang refunded khi số tiền hoàn đã đủ toàn phần.
   */
  async persistRefundResultTransaction(input: {
    refundId: string;
    paymentId: string;
    rawPayload: string;
    providerRefundId?: string;
    refundResult: string;
  }) {
    return this.refundOperationsService.persistRefundResultTransaction(input);
  }

  async increaseRefundRetryCount(input: { refundId: string }) {
    return this.refundOperationsService.increaseRefundRetryCount(input);
  }

  async notifyCustomerRefundCompleted(input: { refundId: string }) {
    return this.refundOperationsService.notifyCustomerRefundCompleted(input);
  }

  async notifyCustomerRefundRejected(input: {
    refundId: string;
    paymentId?: string;
    orderId?: string;
    userId?: string;
    rejectionReason?: string;
  }) {
    return this.refundOperationsService.notifyCustomerRefundRejected(input);
  }

  async notifyCustomerExchangeCreated(input: {
    exchangeRequestId: string;
    paymentId?: string;
    orderId?: string;
    userId?: string;
  }) {
    return this.refundOperationsService.notifyCustomerExchangeCreated(input);
  }

  async getAdminRefunds(): Promise<AdminRefundSummary[]> {
    return this.refundOperationsService.getAdminRefunds();
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

  /**
   * VNPay ký trên query string đã sort key.
   * Các lỗi format amount, timestamp hoặc encoding là nguyên nhân phổ biến làm sai chữ ký.
   */
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

  /**
   * Callback VNPay đồng bộ:
   * verify chữ ký, đối chiếu số tiền, persist kết quả thanh toán
   * rồi mới lấy order để dựng redirect URL về frontend.
   */
  private async processVnpayCallback(query: VnpayCallbackPayload) {
    const secureHash = query.vnp_SecureHash;
    const providerRef = query.vnp_TxnRef;

    if (!secureHash || !providerRef) {
      throw new BadRequestException('Missing VNPay callback parameters');
    }

    if (!this.paymentWebhookSecurityService.verifyVnpaySignature(query)) {
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

  private isPaymentExpired(expiresAt?: Date | string | null) {
    if (!expiresAt) {
      return false;
    }

    return new Date(expiresAt).getTime() <= Date.now();
  }
}
