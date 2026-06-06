import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OrderClientService } from './clients/order-client.service';

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

@Injectable()
export class PaymentServiceService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly orderClientService: OrderClientService,
    private readonly dataSource: DataSource,
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
      paymentUrl: isOfflinePayment ? null : dto.returnUrl ?? null,
      expiresAt: isOfflinePayment
        ? null
        : new Date(Date.now() + 15 * 60 * 1000),
    });

    const savedPayment = await this.paymentRepository.save(payment);
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

  private generatePaymentCode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `PAY${timestamp}${random}`;
  }
}
