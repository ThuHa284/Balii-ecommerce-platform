import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderClientService } from './clients/order-client.service';

@Injectable()
export class RefundWorkflowService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderClientService: OrderClientService,
  ) {}

  /**
   * Kiểm tra điều kiện nghiệp vụ cốt lõi của refund trên payment:
   * payment phải đã paid và tổng số tiền refund đang giữ chỗ không vượt số đã thanh toán.
   */
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
    // Bước này chỉ chuẩn hóa input và lấy context cơ bản để Camunda truyền tiếp giữa các task.
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

    // Refund sau khi đơn đã đi xa trong fulfillment phải qua admin review thay vì auto-approve.
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
    // Có idempotency key thì ưu tiên theo key; nếu không có thì fallback theo payment + amount đang pending/refunded.
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
    // Reuse bản ghi refund cũ nếu cùng yêu cầu để workflow có thể retry an toàn.
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
    // Nếu workflow quyết định reject trước khi tạo refund record thì vẫn tạo bản ghi failed để audit đầy đủ.
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
}
