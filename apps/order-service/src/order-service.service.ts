/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartClientService } from './clients/cart-client.service';
import { CloudinaryService } from './cloudinary.service';
import { OrderSummary } from './order-service.types';
import { PaymentClientService } from './clients/payment-client.service';
import { validateUploadedImages } from '@app/common';

type OrderItemRow = {
  id: string;
  orderId: string;
  variantId: string;
  productId?: string | null;
  productName: string;
  productSlug?: string | null;
  sku: string;
  variantLabel?: string | null;
  thumbnailUrl?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  campaignDiscountType?: 'PERCENT' | 'AMOUNT' | 'GIFT' | null;
  campaignDiscountValue?: number | string | null;
  campaignBadgeText?: string | null;
  unitPrice: number | string;
  quantity: number;
  subtotal: number | string;
};

type OrderRow = {
  id: string;
  userId: string;
  orderCode: string;
  statusId: number;
  shippingAddress: Record<string, unknown>;
  subtotal: number | string;
  discountAmount: number | string;
  shippingFee: number | string;
  totalAmount: number | string;
  note?: string | null;
  shippingMethodId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  statusCode?: string;
  paymentStatusCode?: string;
  paymentMethodCode?: string;
  items: OrderItemRow[];
};

type AdminRecentOrder = {
  id: string;
  orderCode: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
};

type AdminOrderListItem = ReturnType<OrderServiceService['mapOrder']> & {
  customerName: string;
  customerEmail: string | null;
};

type CustomerContact = {
  fullName: string;
  email: string | null;
};

type RevenuePoint = {
  month: string;
  revenue: number;
};

type TopProductPoint = {
  productId: string;
  productName: string;
  thumbnail: string;
  quantitySold: number;
  revenue: number;
  campaignQuantitySold: number;
  campaignRevenue: number;
  campaignOrderCount: number;
};

type OrderStatusPoint = {
  status: string;
  count: number;
};

type ReturnRequestRow = {
  id: string;
  orderId: string;
  userId: string;
  status: string;
  reason: string;
  imageUrls: unknown;
  adminNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | string | null;
  receivedBy?: string | null;
  receivedAt?: Date | string | null;
  restockedAt?: Date | string | null;
  refundMode?: string | null;
  refundStatus?: string | null;
  refundPaymentId?: string | null;
  refundWorkflowStartedAt?: Date | string | null;
  completedAt?: Date | string | null;
  requestedRefundAmount?: number | string | null;
  approvedRefundAmount?: number | string | null;
  manualRefundAmount?: number | string | null;
  manualRefundReference?: string | null;
  manualRefundNote?: string | null;
  manualRefundEvidenceUrls?: unknown;
  manualRefundCompletedBy?: string | null;
  items?: ReturnRequestItemRow[];
  createdAt: Date | string;
  updatedAt: Date | string;
  orderCode?: string;
  customerName?: string | null;
  customerEmail?: string | null;
};

type ReturnRequestItemRow = {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  productName: string;
  sku: string;
  variantLabel?: string | null;
  thumbnailUrl?: string | null;
  requestedQuantity: number | string;
  acceptedQuantity?: number | string | null;
  disposition?: 'restock' | 'damaged' | 'rejected' | null;
  unitPrice: number | string;
  grossAmount: number | string;
  refundAmount: number | string;
};

type AdminDashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  orderGrowth: number;
  revenueByMonth: RevenuePoint[];
  recentOrders: AdminRecentOrder[];
};

type AdminAnalyticsStats = {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  monthlyRevenue: RevenuePoint[];
  topProducts: TopProductPoint[];
  orderStatusBreakdown: OrderStatusPoint[];
};

type ReturnRequestSummary = {
  id: string;
  orderId: string;
  userId: string;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'refund_pending'
    | 'refund_failed'
    | 'manual_refund_pending'
    | 'completed';
  reason: string;
  imageUrls: string[];
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  restockedAt: string | null;
  refundMode: 'provider' | 'manual' | null;
  refundStatus: string | null;
  refundPaymentId: string | null;
  refundWorkflowStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requestedRefundAmount: number;
  approvedRefundAmount: number | null;
  manualRefundAmount: number | null;
  manualRefundReference: string | null;
  manualRefundNote: string | null;
  manualRefundEvidenceUrls: string[];
  manualRefundCompletedBy: string | null;
  items: Array<{
    id: string;
    orderItemId: string;
    productName: string;
    sku: string;
    variantLabel: string | null;
    thumbnailUrl: string | null;
    requestedQuantity: number;
    acceptedQuantity: number | null;
    disposition: 'restock' | 'damaged' | 'rejected' | null;
    unitPrice: number;
    grossAmount: number;
    refundAmount: number;
  }>;
};

type AdminReturnRequestSummary = ReturnRequestSummary & {
  orderCode: string;
  customerName: string;
  customerEmail: string | null;
};

const APPROVED_RETURN_MESSAGE =
  'Yêu cầu trả hàng đã được chấp thuận. Đơn vị vận chuyển sẽ liên hệ và đến nhận sản phẩm trong thời gian sớm nhất. Vui lòng giữ điện thoại bên mình và đóng gói sản phẩm cẩn thận.';

@Injectable()
export class OrderServiceService {
  private readonly logger = new Logger(OrderServiceService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly cartClientService: CartClientService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly paymentClientService: PaymentClientService,
  ) {}

  async createOrder(userId: string | undefined, dto: CreateOrderDto) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const existingOrder = await this.findOrderByIdempotencyKey(
      userId,
      dto.idempotencyKey,
    );
    if (existingOrder) {
      return {
        ...(await this.findMyOrderById(userId, existingOrder.id)),
        paymentMethod: dto.paymentMethod,
        idempotentReplay: true,
      };
    }

    const cart = await this.cartClientService.getCheckoutCart(
      userId,
      dto.sessionId,
    );
    const pendingStatusId = await this.getOrderStatusId('pending');
    const shippingMethod = await this.getDefaultShippingMethod();
    const checkoutItems = [...cart.items, ...(cart.promotionItems ?? [])];
    const cartSubtotal = this.roundMoney(cart.subtotal);
    const freeShippingMinimum = Number(
      this.configService.get<string>('FREE_SHIPPING_MIN_AMOUNT') ?? 500000,
    );
    if (!Number.isFinite(freeShippingMinimum) || freeShippingMinimum < 0) {
      throw new ServiceUnavailableException(
        'Cấu hình miễn phí vận chuyển không hợp lệ.',
      );
    }
    const shippingFee =
      cartSubtotal >= freeShippingMinimum
        ? 0
        : this.roundMoney(shippingMethod.baseFee);
    let savedOrder: Order;
    try {
      savedOrder = await this.dataSource.transaction(async (manager) => {
        const replay = await manager.getRepository(Order).findOne({
          where: {
            userId,
            checkoutIdempotencyKey: dto.idempotencyKey,
          },
        });
        if (replay) {
          return replay;
        }

        const shippingAddress = await this.resolveShippingAddressInTransaction(
          manager,
          dto.shippingAddress,
        );

        const voucher = dto.voucherCode
          ? await this.validateVoucherForCheckout(
              manager,
              dto.voucherCode,
              userId,
              cartSubtotal,
            )
          : null;

        await this.setInventoryAuditContext(manager, {
          eventType: 'order_reserved',
          referenceType: 'checkout',
          referenceId: dto.idempotencyKey,
          actorId: userId,
        });

        for (const item of checkoutItems) {
          const reservedRows = await manager.query(
            `
            UPDATE product_service.product_variants
            SET reserved_quantity = reserved_quantity + $2
            WHERE id = $1
              AND is_active = TRUE
              AND stock_quantity - reserved_quantity >= $2
            RETURNING id
            `,
            [item.variantId, item.quantity],
          );

          if (!reservedRows.length) {
            throw new BadRequestException(
              `Sản phẩm ${item.productName} không còn đủ tồn kho.`,
            );
          }
        }

        const orderRepo = manager.getRepository(Order);
        const itemRepo = manager.getRepository(OrderItem);
        const order = orderRepo.create({
          orderCode: this.generateOrderCode(),
          userId,
          statusId: pendingStatusId,
          checkoutIdempotencyKey: dto.idempotencyKey,
          inventoryState: 'reserved',
          voucherId: voucher?.id ?? null,
          subtotal: cartSubtotal,
          discountAmount: this.roundMoney(voucher?.discountAmount ?? 0),
          shippingFee,
          totalAmount: this.roundMoney(
            Math.max(
              0,
              cartSubtotal - (voucher?.discountAmount ?? 0) + shippingFee,
            ),
          ),
          shippingAddress,
          note: dto.customerNote ?? null,
          shippingMethodId: shippingMethod.id,
          items: checkoutItems.map((item) =>
            itemRepo.create({
              variantId: item.variantId,
              productName: item.productName,
              sku: item.sku,
              variantLabel: item.variantLabel ?? null,
              thumbnailUrl: item.thumbnailUrl ?? null,
              campaignId: item.campaignId ?? null,
              campaignName: item.campaignName ?? null,
              campaignDiscountType: item.campaignDiscountType ?? null,
              campaignDiscountValue: item.campaignDiscountValue ?? null,
              campaignBadgeText: item.campaignBadgeText ?? null,
              unitPrice: this.roundMoney(item.unitPrice),
              quantity: item.quantity,
              subtotal: this.roundMoney(item.subtotal),
            }),
          ),
        });

        const saved = await orderRepo.save(order);

        if (voucher) {
          await manager.query(
            `
            UPDATE voucher_service.vouchers
            SET used_count = used_count + 1
            WHERE id = $1
            `,
            [voucher.id],
          );
          await manager.query(
            `
            INSERT INTO voucher_service.voucher_usages (
              voucher_id, user_id, order_id, discount_applied
            )
            VALUES ($1, $2, $3, $4)
            `,
            [voucher.id, userId, saved.id, voucher.discountAmount],
          );
        }

        return saved;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const replay = await this.findOrderByIdempotencyKey(
          userId,
          dto.idempotencyKey,
        );
        if (replay) {
          return {
            ...(await this.findMyOrderById(userId, replay.id)),
            paymentMethod: dto.paymentMethod,
            idempotentReplay: true,
          };
        }
      }
      throw error;
    }
    try {
      const cartCleared = await this.cartClientService.clearCart(
        userId,
        dto.sessionId,
        cart.updatedAt,
      );
      if (!cartCleared) {
        this.logger.log(
          `Cart changed after snapshot for order ${savedOrder.id}; newer cart contents were preserved.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown cart error';
      this.logger.warn(
        `Order ${savedOrder.id} was created but the cart could not be cleared: ${message}`,
      );
    }

    const response = await this.findMyOrderById(userId, savedOrder.id);
    void this.sendOrderCreatedNotifications(response).catch((error) => {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';
      this.logger.warn(
        `Unable to send order created emails for order ${savedOrder.id}: ${message}`,
      );
    });

    return {
      ...response,
      paymentMethod: dto.paymentMethod,
    };
  }

  async findMyOrders(userId: string | undefined) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        o.id,
        o.user_id AS "userId",
        o.order_code AS "orderCode",
        o.status_id AS "statusId",
        o.shipping_address AS "shippingAddress",
        o.subtotal,
        o.discount_amount AS "discountAmount",
        o.shipping_fee AS "shippingFee",
        o.total_amount AS "totalAmount",
        o.note,
        o.shipping_method_id AS "shippingMethodId",
        o.created_at AS "createdAt",
        o.updated_at AS "updatedAt",
        os.code AS "statusCode",
        COALESCE(ps.code, 'pending') AS "paymentStatusCode",
        COALESCE(pp.code, 'cod') AS "paymentMethodCode"
      FROM order_service.orders o
      JOIN order_service.order_statuses os ON os.id = o.status_id
      LEFT JOIN LATERAL (
        SELECT p.*
        FROM payment_service.payments p
        WHERE p.order_id = o.id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) p ON TRUE
      LEFT JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      LEFT JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      `,
      [userId],
    );

    const orders = await Promise.all(
      rows.map((row: OrderRow) => this.loadOrderAggregate(row)),
    );
    return orders.map((order) => this.mapOrder(order));
  }

  async findMyOrderById(userId: string | undefined, orderId: string) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        o.id,
        o.user_id AS "userId",
        o.order_code AS "orderCode",
        o.status_id AS "statusId",
        o.shipping_address AS "shippingAddress",
        o.subtotal,
        o.discount_amount AS "discountAmount",
        o.shipping_fee AS "shippingFee",
        o.total_amount AS "totalAmount",
        o.note,
        o.shipping_method_id AS "shippingMethodId",
        o.created_at AS "createdAt",
        o.updated_at AS "updatedAt",
        os.code AS "statusCode",
        COALESCE(ps.code, 'pending') AS "paymentStatusCode",
        COALESCE(pp.code, 'cod') AS "paymentMethodCode"
      FROM order_service.orders o
      JOIN order_service.order_statuses os ON os.id = o.status_id
      LEFT JOIN LATERAL (
        SELECT p.*
        FROM payment_service.payments p
        WHERE p.order_id = o.id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) p ON TRUE
      LEFT JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      LEFT JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      WHERE o.id = $1 AND o.user_id = $2
      LIMIT 1
      `,
      [orderId, userId],
    );

    if (!rows.length) {
      throw new NotFoundException('Order not found');
    }

    const order = await this.loadOrderAggregate(rows[0] as OrderRow);
    return this.mapOrder(order);
  }

  async updatePaymentStatus(
    orderId: string,
    paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded',
    status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded',
  ) {
    const transition = await this.dataSource.transaction(async (manager) => {
      const orderRows = await manager.query(
        `
        SELECT
          o.id,
          o.user_id AS "userId",
          o.status_id AS "statusId",
          o.inventory_state AS "inventoryState",
          os.code AS "statusCode"
        FROM order_service.orders o
        JOIN order_service.order_statuses os ON os.id = o.status_id
        WHERE o.id = $1
        FOR UPDATE OF o
        `,
        [orderId],
      );

      if (!orderRows.length) {
        throw new NotFoundException('Order not found');
      }

      const order = orderRows[0] as {
        id: string;
        userId: string;
        statusId: number;
        inventoryState: string;
        statusCode: string;
      };
      let nextStatusCode: string | null = null;

      if (paymentStatus === 'paid') {
        if (['cancelled', 'refunded'].includes(order.statusCode)) {
          throw new ConflictException(
            `Không thể thanh toán đơn hàng đang ở trạng thái ${order.statusCode}.`,
          );
        }
        if (order.statusCode === 'pending') {
          await this.transitionInventoryInTransaction(
            manager,
            order.id,
            'committed',
          );
          nextStatusCode = 'confirmed';
        } else if (order.inventoryState !== 'committed') {
          throw new ConflictException(
            'Đơn hàng không còn giữ tồn kho hợp lệ để xác nhận thanh toán.',
          );
        }
      } else if (paymentStatus === 'failed') {
        if (order.statusCode === 'pending') {
          const settledRows = await manager.query(
            `
            SELECT 1
            FROM payment_service.payments p
            JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
            WHERE p.order_id = $1
              AND ps.code IN ('paid', 'partially_refunded', 'refunded')
            LIMIT 1
            `,
            [order.id],
          );
          if (!settledRows.length) {
            await this.transitionInventoryInTransaction(
              manager,
              order.id,
              'released',
            );
            await this.releaseVoucherUsageInTransaction(manager, order.id);
            await this.cancelPendingPaymentsInTransaction(manager, order.id);
            nextStatusCode = 'cancelled';
          }
        }
      } else if (paymentStatus === 'refunded') {
        if (
          !['cancelled', 'delivered', 'refunded'].includes(order.statusCode)
        ) {
          throw new ConflictException(
            `Không thể hoàn tất hoàn tiền khi đơn hàng đang ở trạng thái ${order.statusCode}.`,
          );
        }
        nextStatusCode = 'refunded';
      }

      if (status && nextStatusCode && status !== nextStatusCode) {
        throw new BadRequestException(
          `Trạng thái đơn ${status} không khớp với trạng thái thanh toán ${paymentStatus}.`,
        );
      }

      let statusChanged = false;
      if (nextStatusCode && nextStatusCode !== order.statusCode) {
        const statusRows = await manager.query(
          `SELECT id FROM order_service.order_statuses WHERE code = $1 LIMIT 1`,
          [nextStatusCode],
        );
        if (!statusRows.length) {
          throw new NotFoundException(
            `Order status ${nextStatusCode} not found`,
          );
        }
        const nextStatusId = Number(statusRows[0].id);
        await manager.query(
          `UPDATE order_service.orders SET status_id = $2, updated_at = NOW() WHERE id = $1`,
          [order.id, nextStatusId],
        );
        await manager.query(
          `
          INSERT INTO order_service.order_status_logs (
            order_id, from_status_id, to_status_id, note
          ) VALUES ($1, $2, $3, $4)
          `,
          [
            order.id,
            order.statusId,
            nextStatusId,
            `Payment status updated to ${paymentStatus}`,
          ],
        );
        statusChanged = true;
      }

      if (paymentStatus === 'refunded') {
        await manager.query(
          `
          UPDATE order_service.return_requests
          SET status = 'completed',
              refund_status = 'completed',
              completed_at = COALESCE(completed_at, NOW()),
              updated_at = NOW()
          WHERE order_id = $1
            AND status IN ('refund_pending', 'refund_failed')
          `,
          [orderId],
        );
      }

      return { userId: order.userId, statusChanged };
    });

    const response = await this.findMyOrderById(transition.userId, orderId);

    if (paymentStatus === 'paid' && transition.statusChanged) {
      void this.sendPaymentSuccessNotifications(response).catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Unknown email error';
        this.logger.warn(
          `Unable to send payment success emails for order ${orderId}: ${message}`,
        );
      });
    }

    return response;
  }

  async updateReturnRefundResult(
    returnRequestId: string,
    result: 'completed' | 'failed',
  ): Promise<ReturnRequestSummary> {
    if (!['completed', 'failed'].includes(result)) {
      throw new BadRequestException('Kết quả hoàn tiền không hợp lệ.');
    }

    await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `
        SELECT
          rr.status,
          rr.order_id AS "orderId",
          o.status_id AS "statusId",
          o.subtotal,
          o.discount_amount AS "discountAmount"
        FROM order_service.return_requests rr
        JOIN order_service.orders o ON o.id = rr.order_id
        WHERE rr.id = $1
        FOR UPDATE OF rr, o
        `,
        [returnRequestId],
      );
      if (!rows.length) {
        throw new NotFoundException('Return request not found');
      }
      if (rows[0].status === 'completed') {
        return;
      }
      if (!['refund_pending', 'refund_failed'].includes(rows[0].status)) {
        throw new BadRequestException(
          'Yêu cầu trả hàng không ở trạng thái chờ kết quả hoàn tiền.',
        );
      }

      if (result === 'failed') {
        await manager.query(
          `
          UPDATE order_service.return_requests
          SET status = 'refund_failed',
              refund_status = 'provider_failed',
              updated_at = NOW()
          WHERE id = $1
          `,
          [returnRequestId],
        );
        return;
      }

      await manager.query(
        `
        UPDATE order_service.return_requests
        SET status = 'completed',
            refund_status = 'completed',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        `,
        [returnRequestId],
      );

      const totals = await manager.query(
        `
        SELECT COALESCE(SUM(approved_refund_amount), 0) AS total
        FROM order_service.return_requests
        WHERE order_id = $1
          AND status = 'completed'
          AND refund_status IN ('completed', 'manual_completed')
        `,
        [rows[0].orderId],
      );
      const merchandiseTotal = this.roundMoney(
        Math.max(
          Number(rows[0].subtotal) - Number(rows[0].discountAmount || 0),
          0,
        ),
      );
      if (Number(totals[0]?.total || 0) < merchandiseTotal) {
        return;
      }

      const statusRows = await manager.query(
        `SELECT id FROM order_service.order_statuses WHERE code = 'refunded' LIMIT 1`,
      );
      if (!statusRows.length) {
        throw new NotFoundException('Order status refunded not found');
      }
      const refundedStatusId = Number(statusRows[0].id);
      await manager.query(
        `UPDATE order_service.orders SET status_id = $2, updated_at = NOW() WHERE id = $1`,
        [rows[0].orderId, refundedStatusId],
      );
      if (Number(rows[0].statusId) !== refundedStatusId) {
        await manager.query(
          `
          INSERT INTO order_service.order_status_logs (
            order_id, from_status_id, to_status_id, note
          ) VALUES ($1, $2, $3, $4)
          `,
          [
            rows[0].orderId,
            rows[0].statusId,
            refundedStatusId,
            `Provider refund completed for return ${returnRequestId}`,
          ],
        );
      }
    });

    return this.getReturnRequestById(returnRequestId);
  }

  async updateOrderStatus(
    orderId: string,
    status:
      | 'pending'
      | 'confirmed'
      | 'processing'
      | 'shipping'
      | 'delivered'
      | 'cancelled',
    note?: string,
  ) {
    const userId = await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `
        SELECT
          o.id,
          o.user_id AS "userId",
          o.status_id AS "statusId",
          os.code AS "statusCode"
        FROM order_service.orders o
        JOIN order_service.order_statuses os ON os.id = o.status_id
        WHERE o.id = $1
        FOR UPDATE OF o
        `,
        [orderId],
      );

      if (!rows.length) {
        throw new NotFoundException('Order not found');
      }

      const order = rows[0] as {
        id: string;
        userId: string;
        statusId: number;
        statusCode: string;
      };
      if (order.statusCode === status) {
        return order.userId;
      }

      const allowedTransitions: Record<string, string[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['processing', 'cancelled'],
        processing: ['shipping', 'cancelled'],
        shipping: ['delivered'],
        delivered: [],
        cancelled: [],
        refunded: [],
      };

      if (!(allowedTransitions[order.statusCode] ?? []).includes(status)) {
        throw new BadRequestException(
          `Không thể chuyển đơn từ ${order.statusCode} sang ${status}.`,
        );
      }

      const paymentRows = await manager.query(
        `
        SELECT ps.code AS status, pp.code AS method
        FROM payment_service.payments p
        JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
        JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
        WHERE p.order_id = $1
        ORDER BY p.created_at DESC
        `,
        [order.id],
      );
      const hasSettledPayment = paymentRows.some(
        (payment: { status: string }) =>
          ['paid', 'partially_refunded', 'refunded'].includes(payment.status),
      );

      if (status === 'confirmed') {
        const latestPayment = paymentRows[0] as
          | { status: string; method: string }
          | undefined;
        if (
          !latestPayment ||
          (latestPayment.method !== 'cod' && latestPayment.status !== 'paid')
        ) {
          throw new ConflictException(
            'Chỉ có thể xác nhận đơn COD hoặc đơn thanh toán trực tuyến đã thành công.',
          );
        }
        await this.transitionInventoryInTransaction(
          manager,
          order.id,
          'committed',
        );
      } else if (status === 'cancelled') {
        if (hasSettledPayment) {
          throw new ConflictException(
            'Đơn đã thu tiền phải đi qua quy trình hoàn tiền trước khi hủy.',
          );
        }
        await this.transitionInventoryInTransaction(
          manager,
          order.id,
          'released',
        );
        await this.releaseVoucherUsageInTransaction(manager, order.id);
        await this.cancelPendingPaymentsInTransaction(manager, order.id);
      }

      const statusRows = await manager.query(
        `SELECT id FROM order_service.order_statuses WHERE code = $1 LIMIT 1`,
        [status],
      );
      if (!statusRows.length) {
        throw new NotFoundException(`Order status ${status} not found`);
      }
      const nextStatusId = Number(statusRows[0].id);
      await manager.query(
        `UPDATE order_service.orders SET status_id = $2, updated_at = NOW() WHERE id = $1`,
        [order.id, nextStatusId],
      );
      await manager.query(
        `
        INSERT INTO order_service.order_status_logs (
          order_id, from_status_id, to_status_id, note
        ) VALUES ($1, $2, $3, $4)
        `,
        [
          order.id,
          order.statusId,
          nextStatusId,
          note ?? `Status updated to ${status}`,
        ],
      );

      return order.userId;
    });

    return this.findMyOrderById(userId, orderId);
  }

  async createReturnRequest(
    userId: string | undefined,
    orderId: string,
    input: {
      reason: string;
      items: string;
    },
    images: Express.Multer.File[],
  ): Promise<ReturnRequestSummary> {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const selectedItems = this.parseReturnItems(input.items);

    if (!images.length) {
      throw new BadRequestException(
        'Vui lòng gửi ít nhất 1 ảnh minh chứng cho yêu cầu trả hàng.',
      );
    }

    validateUploadedImages(images, {
      maxBytes: 5 * 1024 * 1024,
      fieldName: 'ảnh minh chứng trả hàng',
    });
    const uploadedImages = await this.uploadReturnRequestImages(
      orderId,
      userId,
      images,
    );
    const uploadedImageUrls = uploadedImages.map((image) => image.url);
    const returnWindowDays = this.getReturnWindowDays();

    let returnRequestId: string;
    try {
      returnRequestId = await this.dataSource.transaction(async (manager) => {
        const orderRows = await manager.query(
          `
          SELECT
            o.id,
            o.subtotal,
            o.discount_amount AS "discountAmount"
          FROM order_service.orders o
          JOIN order_service.order_statuses os ON os.id = o.status_id
          WHERE o.id = $1
            AND o.user_id = $2
            AND os.code = 'delivered'
            AND COALESCE(
              (
                SELECT MAX(osl.created_at)
                FROM order_service.order_status_logs osl
                JOIN order_service.order_statuses delivered_status
                  ON delivered_status.id = osl.to_status_id
                WHERE osl.order_id = o.id
                  AND delivered_status.code = 'delivered'
              ),
              o.updated_at
            ) >= NOW() - ($3 * INTERVAL '1 day')
          LIMIT 1
          FOR UPDATE OF o
          `,
          [orderId, userId, returnWindowDays],
        );

        if (!orderRows.length) {
          throw new BadRequestException(
            `Chỉ có thể yêu cầu trả hàng trong ${returnWindowDays} ngày sau khi giao thành công.`,
          );
        }

        const activeRows = await manager.query(
          `
          SELECT id
          FROM order_service.return_requests
          WHERE order_id = $1
            AND status NOT IN ('rejected', 'completed')
          LIMIT 1
          `,
          [orderId],
        );
        if (activeRows.length) {
          throw new BadRequestException(
            'Đơn hàng này đang có yêu cầu trả hàng đang xử lý.',
          );
        }

        const orderItems: Array<{
          id: string;
          unitPrice: number | string;
          quantity: number | string;
          previousQuantity: number | string;
          campaignId: string | null;
          campaignDiscountType: string | null;
        }> = await manager.query(
          `
          SELECT
            oi.id,
            oi.unit_price AS "unitPrice",
            oi.quantity,
            oi.campaign_id AS "campaignId",
            oi.campaign_discount_type AS "campaignDiscountType",
            COALESCE(previous.quantity, 0)::int AS "previousQuantity"
          FROM order_service.order_items oi
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(
              CASE
                WHEN rr.status = 'rejected' THEN 0
                WHEN rr.status IN ('pending', 'approved') THEN rri.requested_quantity
                ELSE COALESCE(rri.accepted_quantity, rri.requested_quantity)
              END
            ), 0) AS quantity
            FROM order_service.return_request_items rri
            JOIN order_service.return_requests rr
              ON rr.id = rri.return_request_id
            WHERE rri.order_item_id = oi.id
          ) previous ON TRUE
          WHERE oi.order_id = $1
          ORDER BY oi.created_at, oi.id
          `,
          [orderId],
        );

        const selectedById = new Map(
          selectedItems.map((item) => [item.orderItemId, item.quantity]),
        );
        const knownIds = new Set(orderItems.map((item) => item.id));
        if ([...selectedById.keys()].some((id) => !knownIds.has(id))) {
          throw new BadRequestException(
            'Danh sách sản phẩm trả không thuộc đơn hàng này.',
          );
        }

        for (const item of orderItems) {
          const requested = selectedById.get(item.id) ?? 0;
          const available =
            Number(item.quantity) - Number(item.previousQuantity || 0);
          if (requested > available) {
            throw new BadRequestException(
              'Số lượng trả vượt quá số lượng còn có thể trả.',
            );
          }
        }

        const giftCampaignIds = new Set(
          orderItems
            .filter((item) => item.campaignDiscountType === 'GIFT')
            .map((item) => item.campaignId)
            .filter((id): id is string => Boolean(id)),
        );
        for (const campaignId of giftCampaignIds) {
          const returnsWholeCampaign = orderItems
            .filter((item) => item.campaignId === campaignId)
            .every(
              (item) =>
                (selectedById.get(item.id) ?? 0) ===
                Number(item.quantity) - Number(item.previousQuantity || 0),
            );
          if (!returnsWholeCampaign) {
            throw new BadRequestException(
              'Phải trả toàn bộ sản phẩm còn lại thuộc combo quà tặng đã chọn; các sản phẩm ngoài combo không bị ảnh hưởng.',
            );
          }
        }

        const subtotal = Number(orderRows[0].subtotal);
        const discountAmount = Number(orderRows[0].discountAmount || 0);
        const selectedRows = orderItems.filter((item) =>
          selectedById.has(item.id),
        );
        const gross = selectedRows.reduce(
          (sum, item) =>
            sum + Number(item.unitPrice) * (selectedById.get(item.id) ?? 0),
          0,
        );
        const requestedRefundAmount = this.calculateReturnRefund(
          gross,
          subtotal,
          discountAmount,
        );

        const inserted = await manager.query(
          `
          INSERT INTO order_service.return_requests (
            order_id, user_id, reason, image_urls,
            requested_refund_amount, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), NOW())
          RETURNING id
          `,
          [
            orderId,
            userId,
            input.reason.trim(),
            JSON.stringify(uploadedImageUrls),
            requestedRefundAmount,
          ],
        );
        const id = String(inserted[0].id);

        for (const item of selectedRows) {
          const quantity = selectedById.get(item.id) ?? 0;
          const grossAmount = this.roundMoney(
            Number(item.unitPrice) * quantity,
          );
          await manager.query(
            `
            INSERT INTO order_service.return_request_items (
              return_request_id, order_item_id, requested_quantity,
              unit_price, gross_amount, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `,
            [id, item.id, quantity, Number(item.unitPrice), grossAmount],
          );
        }

        return id;
      });
    } catch (error) {
      await this.deleteCloudinaryImages(uploadedImages);
      throw error;
    }

    const request = await this.getReturnRequestById(returnRequestId);

    void this.sendNewReturnRequestNotification(request).catch((error) => {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';
      this.logger.warn(
        `Unable to send return request notification ${request.id}: ${message}`,
      );
    });

    return request;
  }

  async findMyReturnRequests(
    userId: string | undefined,
    orderId: string,
  ): Promise<ReturnRequestSummary[]> {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        id,
        order_id AS "orderId",
        user_id AS "userId",
        status,
        reason,
        image_urls AS "imageUrls",
        admin_note AS "adminNote",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt",
        received_by AS "receivedBy",
        received_at AS "receivedAt",
        restocked_at AS "restockedAt",
        refund_mode AS "refundMode",
        refund_status AS "refundStatus",
        refund_payment_id AS "refundPaymentId",
        refund_workflow_started_at AS "refundWorkflowStartedAt",
        completed_at AS "completedAt",
        requested_refund_amount AS "requestedRefundAmount",
        approved_refund_amount AS "approvedRefundAmount",
        manual_refund_amount AS "manualRefundAmount",
        manual_refund_reference AS "manualRefundReference",
        manual_refund_note AS "manualRefundNote",
        manual_refund_evidence_urls AS "manualRefundEvidenceUrls",
        manual_refund_completed_by AS "manualRefundCompletedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM order_service.return_requests
      WHERE order_id = $1 AND user_id = $2
      ORDER BY created_at DESC
      `,
      [orderId, userId],
    );

    return this.mapReturnRequests(rows as ReturnRequestRow[]);
  }

  async findAdminReturnRequests(
    orderId: string,
  ): Promise<ReturnRequestSummary[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        id,
        order_id AS "orderId",
        user_id AS "userId",
        status,
        reason,
        image_urls AS "imageUrls",
        admin_note AS "adminNote",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt",
        received_by AS "receivedBy",
        received_at AS "receivedAt",
        restocked_at AS "restockedAt",
        refund_mode AS "refundMode",
        refund_status AS "refundStatus",
        refund_payment_id AS "refundPaymentId",
        refund_workflow_started_at AS "refundWorkflowStartedAt",
        completed_at AS "completedAt",
        requested_refund_amount AS "requestedRefundAmount",
        approved_refund_amount AS "approvedRefundAmount",
        manual_refund_amount AS "manualRefundAmount",
        manual_refund_reference AS "manualRefundReference",
        manual_refund_note AS "manualRefundNote",
        manual_refund_evidence_urls AS "manualRefundEvidenceUrls",
        manual_refund_completed_by AS "manualRefundCompletedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM order_service.return_requests
      WHERE order_id = $1
      ORDER BY created_at DESC
      `,
      [orderId],
    );

    return this.mapReturnRequests(rows as ReturnRequestRow[]);
  }

  async findAllAdminReturnRequests(
    status?: string,
  ): Promise<AdminReturnRequestSummary[]> {
    const normalizedStatus = status?.trim().toLowerCase() || null;

    if (
      normalizedStatus &&
      ![
        'pending',
        'approved',
        'rejected',
        'refund_pending',
        'refund_failed',
        'manual_refund_pending',
        'completed',
      ].includes(normalizedStatus)
    ) {
      throw new BadRequestException(
        'Trạng thái yêu cầu trả hàng không hợp lệ.',
      );
    }

    const rows = await this.dataSource.query(
      `
      SELECT
        rr.id,
        rr.order_id AS "orderId",
        rr.user_id AS "userId",
        rr.status,
        rr.reason,
        rr.image_urls AS "imageUrls",
        rr.admin_note AS "adminNote",
        rr.reviewed_by AS "reviewedBy",
        rr.reviewed_at AS "reviewedAt",
        rr.received_by AS "receivedBy",
        rr.received_at AS "receivedAt",
        rr.restocked_at AS "restockedAt",
        rr.refund_mode AS "refundMode",
        rr.refund_status AS "refundStatus",
        rr.refund_payment_id AS "refundPaymentId",
        rr.refund_workflow_started_at AS "refundWorkflowStartedAt",
        rr.completed_at AS "completedAt",
        rr.requested_refund_amount AS "requestedRefundAmount",
        rr.approved_refund_amount AS "approvedRefundAmount",
        rr.manual_refund_amount AS "manualRefundAmount",
        rr.manual_refund_reference AS "manualRefundReference",
        rr.manual_refund_note AS "manualRefundNote",
        rr.manual_refund_evidence_urls AS "manualRefundEvidenceUrls",
        rr.manual_refund_completed_by AS "manualRefundCompletedBy",
        rr.created_at AS "createdAt",
        rr.updated_at AS "updatedAt",
        o.order_code AS "orderCode",
        COALESCE(
          u.full_name,
          o.shipping_address ->> 'recipientName',
          'Khách hàng'
        ) AS "customerName",
        u.email AS "customerEmail"
      FROM order_service.return_requests rr
      JOIN order_service.orders o ON o.id = rr.order_id
      LEFT JOIN user_service.users u ON u.id = rr.user_id
      WHERE ($1::text IS NULL OR rr.status = $1)
      ORDER BY rr.created_at DESC
      `,
      [normalizedStatus],
    );

    const requests = await this.mapReturnRequests(rows as ReturnRequestRow[]);
    return requests.map((request, index) => ({
      ...request,
      orderCode: (rows[index] as ReturnRequestRow).orderCode ?? request.orderId,
      customerName:
        (rows[index] as ReturnRequestRow).customerName ?? 'Khách hàng',
      customerEmail: (rows[index] as ReturnRequestRow).customerEmail ?? null,
    }));
  }

  async reviewReturnRequest(
    returnRequestId: string,
    reviewedBy: string | undefined,
    input: {
      status: 'approved' | 'rejected';
      adminNote?: string;
    },
  ): Promise<ReturnRequestSummary> {
    if (!reviewedBy) {
      throw new BadRequestException('Missing x-user-id');
    }

    const note = input.adminNote?.trim() ?? '';
    if (input.status === 'rejected' && !note) {
      throw new BadRequestException(
        'Vui lòng nhập lý do từ chối để thông báo cho khách hàng.',
      );
    }

    const currentRows = await this.dataSource.query(
      `
      SELECT status
      FROM order_service.return_requests
      WHERE id = $1
      LIMIT 1
      `,
      [returnRequestId],
    );

    if (!currentRows.length) {
      throw new NotFoundException('Return request not found');
    }

    if (currentRows[0].status !== 'pending') {
      throw new BadRequestException('Yêu cầu trả hàng này đã được xử lý.');
    }

    const customerMessage =
      input.status === 'approved' ? note || APPROVED_RETURN_MESSAGE : note;

    const rows = await this.dataSource.query(
      `
      UPDATE order_service.return_requests
      SET status = $1,
          admin_note = $2,
          reviewed_by = $3,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = $4 AND status = 'pending'
      RETURNING
        id,
        order_id AS "orderId",
        user_id AS "userId",
        status,
        reason,
        image_urls AS "imageUrls",
        admin_note AS "adminNote",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt",
        received_by AS "receivedBy",
        received_at AS "receivedAt",
        restocked_at AS "restockedAt",
        refund_mode AS "refundMode",
        refund_status AS "refundStatus",
        refund_payment_id AS "refundPaymentId",
        refund_workflow_started_at AS "refundWorkflowStartedAt",
        completed_at AS "completedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      `,
      [input.status, customerMessage, reviewedBy, returnRequestId],
    );

    const updatedRow = Array.isArray(rows[0]) ? rows[0][0] : rows[0];

    if (!updatedRow) {
      throw new NotFoundException('Return request not found');
    }

    const request = await this.getReturnRequestById(returnRequestId);

    void this.sendReturnRequestReviewedNotification(request).catch((error) => {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';
      this.logger.warn(
        `Unable to send reviewed return notification ${request.id}: ${message}`,
      );
    });

    return request;
  }

  async receiveReturnRequest(
    returnRequestId: string,
    receivedBy: string | undefined,
    input: {
      items: Array<{
        returnItemId: string;
        disposition: 'restock' | 'damaged' | 'rejected';
      }>;
    },
  ): Promise<ReturnRequestSummary> {
    if (!receivedBy) {
      throw new BadRequestException('Missing x-user-id');
    }

    const dispatch = await this.dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `
        SELECT
          rr.id,
          rr.order_id AS "orderId",
          rr.user_id AS "userId",
          rr.status,
          rr.reason,
          rr.refund_payment_id AS "refundPaymentId",
          rr.refund_workflow_started_at AS "refundWorkflowStartedAt",
          o.inventory_state AS "inventoryState",
          o.subtotal,
          o.discount_amount AS "discountAmount",
          COALESCE(ps.code, 'unpaid') AS "paymentStatus",
          COALESCE(pp.code, 'cod') AS "paymentMethod"
        FROM order_service.return_requests rr
        JOIN order_service.orders o ON o.id = rr.order_id
        LEFT JOIN LATERAL (
          SELECT payment.*
          FROM payment_service.payments payment
          WHERE payment.order_id = o.id
          ORDER BY payment.created_at DESC
          LIMIT 1
        ) p ON TRUE
        LEFT JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
        LEFT JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
        WHERE rr.id = $1
        FOR UPDATE OF rr, o
        `,
        [returnRequestId],
      );

      if (!rows.length) {
        throw new NotFoundException('Return request not found');
      }

      const current = rows[0] as {
        id: string;
        orderId: string;
        userId: string;
        status: string;
        reason: string;
        refundPaymentId: string | null;
        refundWorkflowStartedAt: Date | string | null;
        inventoryState: string;
        paymentStatus: string;
        paymentMethod: string;
        subtotal: number | string;
        discountAmount: number | string;
      };

      if (
        ['completed', 'refund_pending', 'manual_refund_pending'].includes(
          current.status,
        )
      ) {
        return null;
      }

      if (current.status === 'refund_failed') {
        await manager.query(
          `
          UPDATE order_service.return_requests
          SET status = 'manual_refund_pending',
              refund_mode = 'manual',
              refund_status = 'awaiting_manual_confirmation',
              updated_at = NOW()
          WHERE id = $1
          `,
          [returnRequestId],
        );
        return null;
      }

      if (current.status !== 'approved') {
        throw new BadRequestException(
          'Chỉ có thể nhận lại hàng sau khi yêu cầu đã được duyệt.',
        );
      }

      if (!['committed', 'returned'].includes(current.inventoryState)) {
        throw new BadRequestException(
          'Tồn kho đơn hàng không ở trạng thái có thể nhập lại.',
        );
      }

      const returnItems: Array<{
        id: string;
        orderItemId: string;
        requestedQuantity: number | string;
        grossAmount: number | string;
        variantId: string;
      }> = await manager.query(
        `
        SELECT
          rri.id,
          rri.order_item_id AS "orderItemId",
          rri.requested_quantity AS "requestedQuantity",
          rri.gross_amount AS "grossAmount",
          oi.variant_id AS "variantId"
        FROM order_service.return_request_items rri
        JOIN order_service.order_items oi ON oi.id = rri.order_item_id
        WHERE rri.return_request_id = $1
        ORDER BY rri.created_at, rri.id
        FOR UPDATE OF rri
        `,
        [returnRequestId],
      );

      const dispositionById = new Map(
        input.items.map((item) => [item.returnItemId, item.disposition]),
      );
      if (
        dispositionById.size !== input.items.length ||
        dispositionById.size !== returnItems.length ||
        returnItems.some((item) => !dispositionById.has(item.id))
      ) {
        throw new BadRequestException(
          'Phải phân loại chính xác một lần cho từng sản phẩm được trả.',
        );
      }

      const acceptedItems = returnItems.filter(
        (item) => dispositionById.get(item.id) !== 'rejected',
      );
      const acceptedGross = acceptedItems.reduce(
        (sum, item) => sum + Number(item.grossAmount),
        0,
      );
      const merchandiseTotal = this.roundMoney(
        Math.max(
          Number(current.subtotal) - Number(current.discountAmount || 0),
          0,
        ),
      );
      const priorRefundRows: Array<{ total: number | string }> =
        await manager.query(
          `
          SELECT COALESCE(SUM(previous_rr.approved_refund_amount), 0) AS total
          FROM order_service.return_requests previous_rr
          WHERE previous_rr.order_id = $1
            AND previous_rr.id <> $2
            AND previous_rr.status = 'completed'
            AND previous_rr.refund_status IN ('completed', 'manual_completed')
          `,
          [current.orderId, returnRequestId],
        );
      const remainingRefundableAmount = this.roundMoney(
        Math.max(merchandiseTotal - Number(priorRefundRows[0]?.total || 0), 0),
      );
      const approvedRefundAmount = Math.min(
        this.calculateReturnRefund(
          acceptedGross,
          Number(current.subtotal),
          Number(current.discountAmount || 0),
        ),
        remainingRefundableAmount,
      );
      const discountRatio =
        Number(current.subtotal) > 0
          ? Math.min(
              Math.max(
                Number(current.discountAmount || 0) / Number(current.subtotal),
                0,
              ),
              1,
            )
          : 0;
      const itemRefundAmounts = this.allocateReturnItemRefunds(
        acceptedItems,
        approvedRefundAmount,
        discountRatio,
      );

      for (const item of returnItems) {
        const disposition = dispositionById.get(item.id)!;
        const acceptedQuantity =
          disposition === 'rejected' ? 0 : Number(item.requestedQuantity);
        const refundAmount =
          disposition === 'rejected'
            ? 0
            : (itemRefundAmounts.get(item.id) ?? 0);

        await manager.query(
          `
          UPDATE order_service.return_request_items
          SET accepted_quantity = $2,
              disposition = $3,
              refund_amount = $4,
              updated_at = NOW()
          WHERE id = $1
          `,
          [item.id, acceptedQuantity, disposition, refundAmount],
        );

        if (disposition === 'restock') {
          await this.setInventoryAuditContext(manager, {
            eventType: 'return_restocked',
            referenceType: 'return_request',
            referenceId: returnRequestId,
            actorId: receivedBy,
          });
          await manager.query(
            `
            UPDATE product_service.product_variants
            SET stock_quantity = stock_quantity + $2
            WHERE id = $1
            `,
            [item.variantId, acceptedQuantity],
          );
        }
      }

      const hasRestockedItem = returnItems.some(
        (item) => dispositionById.get(item.id) === 'restock',
      );

      if (approvedRefundAmount <= 0) {
        await manager.query(
          `
          UPDATE order_service.return_requests
          SET status = 'completed',
              received_by = $2,
              received_at = NOW(),
              restocked_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
              approved_refund_amount = 0,
              refund_status = 'not_eligible',
              completed_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
          `,
          [returnRequestId, receivedBy, hasRestockedItem],
        );
        return null;
      }

      // Không tự động gọi cổng hoàn tiền cho tới khi adapter thật được cấu
      // hình. Chế độ mô phỏng chỉ được phép ở local/test; production luôn đi
      // qua bước xác nhận hoàn tiền thủ công để không ghi nhận khống.
      const providerRefund =
        process.env.PAYMENT_REFUND_SIMULATION_ENABLED === 'true' &&
        ((process.env.APP_ENV || process.env.NODE_ENV) !== 'production' ||
          process.env.PAYMENT_SIMULATION_ALLOW_PRODUCTION === 'true') &&
        ['paid', 'partially_refunded'].includes(current.paymentStatus) &&
        current.paymentMethod !== 'cod';
      const nextStatus = providerRefund
        ? 'refund_pending'
        : 'manual_refund_pending';

      await manager.query(
        `
        UPDATE order_service.return_requests
        SET status = $2,
            received_by = COALESCE(received_by, $3),
            received_at = COALESCE(received_at, NOW()),
            restocked_at = CASE
              WHEN $5 THEN COALESCE(restocked_at, NOW())
              ELSE restocked_at
            END,
            approved_refund_amount = $6,
            refund_mode = $4,
            refund_status = CASE
              WHEN $4 = 'provider' THEN 'dispatching'
              ELSE 'awaiting_manual_confirmation'
            END,
            updated_at = NOW()
        WHERE id = $1
        `,
        [
          returnRequestId,
          nextStatus,
          receivedBy,
          providerRefund ? 'provider' : 'manual',
          hasRestockedItem,
          approvedRefundAmount,
        ],
      );

      if (
        !providerRefund ||
        current.refundPaymentId ||
        current.refundWorkflowStartedAt
      ) {
        return null;
      }

      return {
        returnRequestId,
        orderId: current.orderId,
        userId: current.userId,
        amount: approvedRefundAmount,
        reason: `Hoàn tiền cho yêu cầu trả hàng ${returnRequestId}: ${current.reason}`,
      };
    });

    if (dispatch) {
      try {
        const result =
          await this.paymentClientService.startReturnRefund(dispatch);
        await this.dataSource.query(
          `
          UPDATE order_service.return_requests
          SET status = 'refund_pending',
              refund_status = $2,
              refund_payment_id = $3,
              refund_workflow_started_at = COALESCE(
                refund_workflow_started_at,
                NOW()
              ),
              updated_at = NOW()
          WHERE id = $1 AND status <> 'completed'
          `,
          [
            returnRequestId,
            result.reused ? 'processing_reused' : 'processing',
            result.paymentId,
          ],
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Refund dispatch failed';
        this.logger.error(
          `Unable to start refund for return ${returnRequestId}: ${message}`,
        );
        await this.dataSource.query(
          `
          UPDATE order_service.return_requests
          SET status = 'refund_failed',
              refund_status = 'dispatch_failed',
              updated_at = NOW()
          WHERE id = $1 AND status <> 'completed'
          `,
          [returnRequestId],
        );
      }
    }

    return this.getReturnRequestById(returnRequestId);
  }

  async completeManualReturnRefund(
    returnRequestId: string,
    completedBy: string | undefined,
    input: {
      amount: number;
      transactionReference: string;
      note?: string;
    },
    evidenceImages: Express.Multer.File[],
  ): Promise<ReturnRequestSummary> {
    if (!completedBy) {
      throw new BadRequestException('Missing x-user-id');
    }

    if (!evidenceImages.length) {
      throw new BadRequestException(
        'Phải tải lên ít nhất một ảnh biên lai hoàn tiền.',
      );
    }
    validateUploadedImages(evidenceImages, {
      maxBytes: 5 * 1024 * 1024,
      fieldName: 'ảnh biên lai hoàn tiền',
    });
    const evidenceAssets = await this.uploadManualRefundEvidence(
      returnRequestId,
      completedBy,
      evidenceImages,
    );

    let evidencePersisted = false;
    try {
      evidencePersisted = await this.dataSource.transaction(async (manager) => {
        const rows = await manager.query(
          `
        SELECT
          rr.status,
          rr.order_id AS "orderId",
          rr.approved_refund_amount AS "approvedRefundAmount",
          o.status_id AS "statusId",
          o.subtotal,
          o.discount_amount AS "discountAmount"
        FROM order_service.return_requests rr
        JOIN order_service.orders o ON o.id = rr.order_id
        WHERE rr.id = $1
        FOR UPDATE OF rr, o
        `,
          [returnRequestId],
        );

        if (!rows.length) {
          throw new NotFoundException('Return request not found');
        }

        if (rows[0].status === 'completed') {
          return false;
        }

        if (rows[0].status !== 'manual_refund_pending') {
          throw new BadRequestException(
            'Yêu cầu này không chờ xác nhận hoàn tiền thủ công.',
          );
        }

        const duplicateReferenceRows = await manager.query(
          `
        SELECT id
        FROM order_service.return_requests
        WHERE LOWER(manual_refund_reference) = LOWER($1)
          AND id <> $2
        LIMIT 1
        `,
          [input.transactionReference.trim(), returnRequestId],
        );
        if (duplicateReferenceRows.length) {
          throw new BadRequestException(
            'Mã giao dịch hoàn tiền đã được sử dụng cho yêu cầu khác.',
          );
        }

        const approvedRefundAmount = this.roundMoney(
          Number(rows[0].approvedRefundAmount || 0),
        );
        const confirmedAmount = this.roundMoney(Number(input.amount));
        if (
          !Number.isFinite(confirmedAmount) ||
          confirmedAmount !== approvedRefundAmount
        ) {
          throw new BadRequestException(
            `Số tiền xác nhận phải đúng bằng ${approvedRefundAmount}.`,
          );
        }

        const refundedStatusRows = await manager.query(
          `SELECT id FROM order_service.order_statuses WHERE code = 'refunded' LIMIT 1`,
        );
        if (!refundedStatusRows.length) {
          throw new NotFoundException('Order status refunded not found');
        }

        const refundedStatusId = Number(refundedStatusRows[0].id);
        await manager.query(
          `
        UPDATE order_service.return_requests
        SET status = 'completed',
            refund_status = 'manual_completed',
            manual_refund_amount = $2,
            manual_refund_reference = $3,
            manual_refund_note = $4,
            manual_refund_evidence_urls = $5::jsonb,
            manual_refund_completed_by = $6,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        `,
          [
            returnRequestId,
            confirmedAmount,
            input.transactionReference.trim(),
            input.note?.trim() || null,
            JSON.stringify(evidenceAssets.map((asset) => asset.url)),
            completedBy,
          ],
        );

        const refundTotals = await manager.query(
          `
        SELECT COALESCE(SUM(
          CASE
            WHEN refund_status = 'manual_completed'
              THEN COALESCE(manual_refund_amount, 0)
            WHEN refund_status = 'completed'
              THEN COALESCE(approved_refund_amount, 0)
            ELSE 0
          END
        ), 0) AS total
        FROM order_service.return_requests
        WHERE order_id = $1 AND status = 'completed'
        `,
          [rows[0].orderId],
        );
        const refundableMerchandiseTotal = this.roundMoney(
          Math.max(
            Number(rows[0].subtotal) - Number(rows[0].discountAmount || 0),
            0,
          ),
        );
        const fullyRefunded =
          Number(refundTotals[0]?.total || 0) >= refundableMerchandiseTotal;

        if (fullyRefunded) {
          await manager.query(
            `UPDATE order_service.orders SET status_id = $2, updated_at = NOW() WHERE id = $1`,
            [rows[0].orderId, refundedStatusId],
          );
        }

        if (fullyRefunded && Number(rows[0].statusId) !== refundedStatusId) {
          await manager.query(
            `
          INSERT INTO order_service.order_status_logs (
            order_id, from_status_id, to_status_id, note
          ) VALUES ($1, $2, $3, $4)
          `,
            [
              rows[0].orderId,
              rows[0].statusId,
              refundedStatusId,
              `Manual return refund confirmed by ${completedBy}`,
            ],
          );
        }
        return true;
      });
    } catch (error) {
      await this.deleteCloudinaryImages(evidenceAssets);
      throw error;
    }

    if (!evidencePersisted) {
      await this.deleteCloudinaryImages(evidenceAssets);
    }

    return this.getReturnRequestById(returnRequestId);
  }

  async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const [summary, monthlyRevenue, recentOrders] = await Promise.all([
      this.getAdminSummary(),
      this.getMonthlyRevenue(),
      this.getRecentOrders(),
    ]);

    return {
      ...summary,
      revenueByMonth: monthlyRevenue,
      recentOrders,
    };
  }

  async getAdminAnalyticsStats(): Promise<AdminAnalyticsStats> {
    const [summary, monthlyRevenue, topProducts, orderStatusBreakdown] =
      await Promise.all([
        this.getAdminSummary(),
        this.getMonthlyRevenue(),
        this.getTopProducts(),
        this.getOrderStatusBreakdown(),
      ]);

    return {
      ...summary,
      averageOrderValue:
        summary.totalOrders > 0
          ? summary.totalRevenue / summary.totalOrders
          : 0,
      monthlyRevenue,
      topProducts,
      orderStatusBreakdown,
    };
  }

  async findAdminOrders(): Promise<AdminOrderListItem[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        o.id,
        o.user_id AS "userId",
        o.order_code AS "orderCode",
        o.status_id AS "statusId",
        o.shipping_address AS "shippingAddress",
        o.subtotal,
        o.discount_amount AS "discountAmount",
        o.shipping_fee AS "shippingFee",
        o.total_amount AS "totalAmount",
        o.note,
        o.shipping_method_id AS "shippingMethodId",
        o.created_at AS "createdAt",
        o.updated_at AS "updatedAt",
        os.code AS "statusCode",
        COALESCE(ps.code, 'pending') AS "paymentStatusCode",
        COALESCE(pp.code, 'cod') AS "paymentMethodCode",
        u.full_name AS "customerName",
        u.email AS "customerEmail"
      FROM order_service.orders o
      JOIN order_service.order_statuses os ON os.id = o.status_id
      LEFT JOIN user_service.users u ON u.id = o.user_id
      LEFT JOIN LATERAL (
        SELECT p.*
        FROM payment_service.payments p
        WHERE p.order_id = o.id
        ORDER BY p.created_at DESC
        LIMIT 1
      ) p ON TRUE
      LEFT JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      LEFT JOIN payment_service.payment_providers pp ON pp.id = p.provider_id
      ORDER BY o.created_at DESC
      `,
    );

    const orders = await Promise.all(
      rows.map(
        (
          row: OrderRow & {
            customerName?: string | null;
            customerEmail?: string | null;
          },
        ) => this.loadOrderAggregate(row),
      ),
    );

    return orders.map(
      (
        order: OrderRow & {
          customerName?: string | null;
          customerEmail?: string | null;
        },
      ) => ({
        ...this.mapOrder(order),
        customerName:
          order.customerName ||
          safeString(order.shippingAddress?.recipientName) ||
          'Khách hàng',
        customerEmail: order.customerEmail ?? null,
      }),
    );
  }

  private mapOrder(order: OrderRow): OrderSummary & {
    userId: string;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      productSlug?: string | null;
      thumbnailUrl?: string | null;
      variantLabel?: string | null;
      campaignId?: string | null;
      campaignName?: string | null;
      campaignDiscountType?: 'PERCENT' | 'AMOUNT' | 'GIFT' | null;
      campaignDiscountValue?: number | null;
      campaignBadgeText?: string | null;
      sku: string;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }>;
  } {
    return {
      id: order.id,
      userId: order.userId,
      orderNumber: order.orderCode,
      status: order.statusCode ?? 'pending',
      paymentStatus: order.paymentStatusCode ?? 'pending',
      paymentMethod: order.paymentMethodCode ?? 'cod',
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      totalAmount: Number(order.totalAmount),
      customerNote: order.note ?? null,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId ?? item.variantId,
        productName: item.productName,
        productSlug: item.productSlug ?? null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        variantLabel: item.variantLabel ?? null,
        campaignId: item.campaignId ?? null,
        campaignName: item.campaignName ?? null,
        campaignDiscountType: item.campaignDiscountType ?? null,
        campaignDiscountValue:
          item.campaignDiscountValue != null
            ? Number(item.campaignDiscountValue)
            : null,
        campaignBadgeText: item.campaignBadgeText ?? null,
        sku: item.sku,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        lineTotal: Number(item.subtotal),
      })),
    };
  }

  private mapReturnRequest(row: ReturnRequestRow): ReturnRequestSummary {
    const imageUrls = Array.isArray(row.imageUrls)
      ? row.imageUrls.map((item) => String(item))
      : typeof row.imageUrls === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(row.imageUrls) as unknown[];
              return Array.isArray(parsed)
                ? parsed.map((item) => String(item))
                : [];
            } catch {
              return [];
            }
          })()
        : [];
    const manualRefundEvidenceUrls = this.parseStringArray(
      row.manualRefundEvidenceUrls,
    );

    return {
      id: row.id,
      orderId: row.orderId,
      userId: row.userId,
      status: row.status as ReturnRequestSummary['status'],
      reason: row.reason,
      imageUrls,
      adminNote: row.adminNote ?? null,
      reviewedBy: row.reviewedBy ?? null,
      reviewedAt: row.reviewedAt
        ? new Date(row.reviewedAt).toISOString()
        : null,
      receivedBy: row.receivedBy ?? null,
      receivedAt: row.receivedAt
        ? new Date(row.receivedAt).toISOString()
        : null,
      restockedAt: row.restockedAt
        ? new Date(row.restockedAt).toISOString()
        : null,
      refundMode:
        row.refundMode === 'provider' || row.refundMode === 'manual'
          ? row.refundMode
          : null,
      refundStatus: row.refundStatus ?? null,
      refundPaymentId: row.refundPaymentId ?? null,
      refundWorkflowStartedAt: row.refundWorkflowStartedAt
        ? new Date(row.refundWorkflowStartedAt).toISOString()
        : null,
      completedAt: row.completedAt
        ? new Date(row.completedAt).toISOString()
        : null,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      requestedRefundAmount: Number(row.requestedRefundAmount || 0),
      approvedRefundAmount:
        row.approvedRefundAmount == null
          ? null
          : Number(row.approvedRefundAmount),
      manualRefundAmount:
        row.manualRefundAmount == null ? null : Number(row.manualRefundAmount),
      manualRefundReference: row.manualRefundReference ?? null,
      manualRefundNote: row.manualRefundNote ?? null,
      manualRefundEvidenceUrls,
      manualRefundCompletedBy: row.manualRefundCompletedBy ?? null,
      items: (row.items ?? []).map((item) => ({
        id: item.id,
        orderItemId: item.orderItemId,
        productName: item.productName,
        sku: item.sku,
        variantLabel: item.variantLabel ?? null,
        thumbnailUrl: item.thumbnailUrl ?? null,
        requestedQuantity: Number(item.requestedQuantity),
        acceptedQuantity:
          item.acceptedQuantity == null ? null : Number(item.acceptedQuantity),
        disposition: item.disposition ?? null,
        unitPrice: Number(item.unitPrice),
        grossAmount: Number(item.grossAmount),
        refundAmount: Number(item.refundAmount),
      })),
    };
  }

  private async mapReturnRequests(
    rows: ReturnRequestRow[],
  ): Promise<ReturnRequestSummary[]> {
    if (!rows.length) {
      return [];
    }

    const items: ReturnRequestItemRow[] = await this.dataSource.query(
      `
      SELECT
        rri.id,
        rri.return_request_id AS "returnRequestId",
        rri.order_item_id AS "orderItemId",
        oi.product_name AS "productName",
        oi.sku,
        oi.variant_label AS "variantLabel",
        oi.thumbnail_url AS "thumbnailUrl",
        rri.requested_quantity AS "requestedQuantity",
        rri.accepted_quantity AS "acceptedQuantity",
        rri.disposition,
        rri.unit_price AS "unitPrice",
        rri.gross_amount AS "grossAmount",
        rri.refund_amount AS "refundAmount"
      FROM order_service.return_request_items rri
      JOIN order_service.order_items oi ON oi.id = rri.order_item_id
      WHERE rri.return_request_id = ANY($1::uuid[])
      ORDER BY rri.created_at, rri.id
      `,
      [rows.map((row) => row.id)],
    );

    const itemsByRequest = new Map<string, ReturnRequestItemRow[]>();
    for (const item of items) {
      const current = itemsByRequest.get(item.returnRequestId) ?? [];
      current.push(item);
      itemsByRequest.set(item.returnRequestId, current);
    }

    return rows.map((row) =>
      this.mapReturnRequest({
        ...row,
        items: itemsByRequest.get(row.id) ?? [],
      }),
    );
  }

  private async getReturnRequestById(
    returnRequestId: string,
  ): Promise<ReturnRequestSummary> {
    const rows = await this.dataSource.query(
      `
      SELECT
        id,
        order_id AS "orderId",
        user_id AS "userId",
        status,
        reason,
        image_urls AS "imageUrls",
        admin_note AS "adminNote",
        reviewed_by AS "reviewedBy",
        reviewed_at AS "reviewedAt",
        received_by AS "receivedBy",
        received_at AS "receivedAt",
        restocked_at AS "restockedAt",
        refund_mode AS "refundMode",
        refund_status AS "refundStatus",
        refund_payment_id AS "refundPaymentId",
        refund_workflow_started_at AS "refundWorkflowStartedAt",
        completed_at AS "completedAt",
        requested_refund_amount AS "requestedRefundAmount",
        approved_refund_amount AS "approvedRefundAmount",
        manual_refund_amount AS "manualRefundAmount",
        manual_refund_reference AS "manualRefundReference",
        manual_refund_note AS "manualRefundNote",
        manual_refund_evidence_urls AS "manualRefundEvidenceUrls",
        manual_refund_completed_by AS "manualRefundCompletedBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM order_service.return_requests
      WHERE id = $1
      LIMIT 1
      `,
      [returnRequestId],
    );

    if (!rows.length) {
      throw new NotFoundException('Return request not found');
    }

    return (await this.mapReturnRequests(rows as ReturnRequestRow[]))[0];
  }

  private parseReturnItems(value: string): Array<{
    orderItemId: string;
    quantity: number;
  }> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('Danh sách sản phẩm trả không hợp lệ.');
    }

    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 100) {
      throw new BadRequestException(
        'Vui lòng chọn ít nhất một sản phẩm cần trả.',
      );
    }

    const result = parsed.map((item) => {
      const candidate = item as Record<string, unknown>;
      const orderItemId =
        typeof candidate.orderItemId === 'string'
          ? candidate.orderItemId.trim()
          : '';
      const quantity = Number(candidate.quantity);
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          orderItemId,
        ) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw new BadRequestException(
          'Mã sản phẩm hoặc số lượng trả không hợp lệ.',
        );
      }
      return { orderItemId, quantity };
    });

    if (
      new Set(result.map((item) => item.orderItemId)).size !== result.length
    ) {
      throw new BadRequestException('Sản phẩm trả bị trùng lặp.');
    }
    return result;
  }

  private calculateReturnRefund(
    grossAmount: number,
    orderSubtotal: number,
    orderDiscount: number,
  ): number {
    if (grossAmount <= 0) {
      return 0;
    }
    const allocatedDiscount =
      orderSubtotal > 0
        ? grossAmount * Math.min(Math.max(orderDiscount / orderSubtotal, 0), 1)
        : 0;
    return this.roundMoney(Math.max(grossAmount - allocatedDiscount, 0));
  }

  private allocateReturnItemRefunds(
    items: Array<{ id: string; grossAmount: number | string }>,
    approvedRefundAmount: number,
    discountRatio: number,
  ): Map<string, number> {
    const allocations = new Map<string, number>();
    let allocated = 0;

    items.forEach((item, index) => {
      const remaining = this.roundMoney(
        Math.max(approvedRefundAmount - allocated, 0),
      );
      const amount =
        index === items.length - 1
          ? remaining
          : Math.min(
              this.roundMoney(Number(item.grossAmount) * (1 - discountRatio)),
              remaining,
            );
      allocations.set(item.id, amount);
      allocated = this.roundMoney(allocated + amount);
    });

    return allocations;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private parseStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    if (typeof value !== 'string') {
      return [];
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  private async uploadReturnRequestImages(
    orderId: string,
    userId: string,
    images: Express.Multer.File[],
  ): Promise<Array<{ url: string; publicId: string }>> {
    if (!images.length) {
      return [];
    }

    const folder =
      this.configService.get<string>('CLOUDINARY_RETURN_FOLDER') ||
      'balii/returns';

    const uploadedImages: Array<{ url: string; publicId: string }> = [];
    try {
      for (const [index, image] of images.entries()) {
        const publicId = `${userId}_${orderId}_${Date.now()}_${index + 1}`;
        const uploaded = await this.cloudinaryService.uploadBuffer(
          image.buffer,
          folder,
          publicId,
        );
        uploadedImages.push(uploaded);
      }

      return uploadedImages;
    } catch (error) {
      await this.deleteCloudinaryImages(uploadedImages);
      throw error;
    }
  }

  private async uploadManualRefundEvidence(
    returnRequestId: string,
    completedBy: string,
    images: Express.Multer.File[],
  ): Promise<Array<{ url: string; publicId: string }>> {
    const folder = `${
      this.configService.get<string>('CLOUDINARY_RETURN_FOLDER') ||
      'balii/returns'
    }/refund-evidence`;
    const uploadedImages: Array<{ url: string; publicId: string }> = [];
    try {
      for (const [index, image] of images.entries()) {
        uploadedImages.push(
          await this.cloudinaryService.uploadBuffer(
            image.buffer,
            folder,
            `${completedBy}_${returnRequestId}_${Date.now()}_${index + 1}`,
          ),
        );
      }
      return uploadedImages;
    } catch (error) {
      await this.deleteCloudinaryImages(uploadedImages);
      throw error;
    }
  }

  private async deleteCloudinaryImages(
    images: Array<{ publicId: string }>,
  ): Promise<void> {
    await Promise.allSettled(
      images.map((image) => this.cloudinaryService.deleteImage(image.publicId)),
    );
  }

  private getReturnWindowDays(): number {
    const configured = Number(this.configService.get('RETURN_WINDOW_DAYS'));
    return Number.isInteger(configured) && configured >= 1 && configured <= 365
      ? configured
      : 7;
  }

  private generateOrderCode(): string {
    return `BAL${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`;
  }

  private async findOrderByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { userId, checkoutIdempotencyKey: idempotencyKey },
    });
  }

  private async validateVoucherForCheckout(
    manager: EntityManager,
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<{ id: string; discountAmount: number }> {
    const rows = await manager.query(
      `
      SELECT
        v.id,
        v.discount_value AS "discountValue",
        v.max_discount_amount AS "maxDiscountAmount",
        v.min_order_amount AS "minOrderAmount",
        v.usage_limit AS "usageLimit",
        v.used_count AS "usedCount",
        v.user_limit_per_user AS "userLimitPerUser",
        v.starts_at AS "startsAt",
        v.expires_at AS "expiresAt",
        v.is_active AS "isActive",
        vt.code AS "typeCode"
      FROM voucher_service.vouchers v
      JOIN voucher_service.voucher_types vt ON vt.id = v.type_id
      WHERE UPPER(v.code) = UPPER($1)
      LIMIT 1
      FOR UPDATE OF v
      `,
      [code.trim()],
    );

    if (!rows.length) {
      throw new BadRequestException('Mã giảm giá không tồn tại.');
    }

    const voucher = rows[0] as Record<string, unknown>;
    const now = Date.now();
    if (
      voucher.isActive !== true ||
      new Date(String(voucher.startsAt)).getTime() > now ||
      new Date(String(voucher.expiresAt)).getTime() < now
    ) {
      throw new BadRequestException(
        'Mã giảm giá chưa có hiệu lực hoặc đã hết hạn.',
      );
    }

    if (
      voucher.usageLimit != null &&
      Number(voucher.usedCount) >= Number(voucher.usageLimit)
    ) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng.');
    }

    if (orderAmount < Number(voucher.minOrderAmount)) {
      throw new BadRequestException(
        'Đơn hàng chưa đạt giá trị tối thiểu của mã.',
      );
    }

    const usageRows = await manager.query(
      `
      SELECT COUNT(*)::int AS total
      FROM voucher_service.voucher_usages
      WHERE voucher_id = $1 AND user_id = $2
      `,
      [voucher.id, userId],
    );
    if (Number(usageRows[0]?.total ?? 0) >= Number(voucher.userLimitPerUser)) {
      throw new BadRequestException(
        'Bạn đã dùng hết lượt của mã giảm giá này.',
      );
    }

    const discountValue = Number(voucher.discountValue);
    let discountAmount =
      String(voucher.typeCode).toLowerCase() === 'percent'
        ? (orderAmount * discountValue) / 100
        : discountValue;
    if (voucher.maxDiscountAmount != null) {
      discountAmount = Math.min(
        discountAmount,
        Number(voucher.maxDiscountAmount),
      );
    }

    return {
      id: String(voucher.id),
      discountAmount: this.roundMoney(
        Math.max(0, Math.min(orderAmount, discountAmount)),
      ),
    };
  }

  private async resolveShippingAddressInTransaction(
    manager: EntityManager,
    address: {
      recipientName: string;
      phone: string;
      provinceId: number;
      districtId: number;
      wardId: number;
      streetAddress: string;
    },
  ): Promise<Record<string, unknown>> {
    const rows = await manager.query(
      `
      SELECT
        province.name AS "provinceName",
        district.name AS "districtName",
        ward.name AS "wardName"
      FROM user_service.wards ward
      JOIN user_service.districts district ON district.id = ward.district_id
      JOIN user_service.provinces province ON province.id = district.province_id
      WHERE ward.id = $1
        AND district.id = $2
        AND province.id = $3
      LIMIT 1
      `,
      [address.wardId, address.districtId, address.provinceId],
    );
    if (!rows.length) {
      throw new BadRequestException(
        'Địa chỉ giao hàng có tỉnh, quận/huyện hoặc phường/xã không hợp lệ.',
      );
    }

    return {
      ...address,
      province: rows[0].provinceName,
      district: rows[0].districtName,
      ward: rows[0].wardName,
    };
  }

  private async getOrderStatusCode(statusId: number): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT code FROM order_service.order_statuses WHERE id = $1 LIMIT 1`,
      [statusId],
    );

    if (!rows.length) {
      throw new NotFoundException(`Order status ${statusId} not found`);
    }

    return String(rows[0].code);
  }

  private async transitionInventoryInTransaction(
    manager: EntityManager,
    orderId: string,
    target: 'committed' | 'released',
  ): Promise<void> {
    const orderRows = await manager.query(
      `
      SELECT inventory_state AS "inventoryState"
      FROM order_service.orders
      WHERE id = $1
      FOR UPDATE
      `,
      [orderId],
    );

    if (!orderRows.length) {
      throw new NotFoundException('Order not found');
    }

    const currentState = String(orderRows[0].inventoryState);
    if (currentState === target) {
      return;
    }
    if (target === 'committed' && currentState !== 'reserved') {
      throw new ConflictException(
        `Không thể chuyển tồn kho từ ${currentState} sang committed.`,
      );
    }
    if (
      target === 'released' &&
      !['reserved', 'committed'].includes(currentState)
    ) {
      throw new ConflictException(
        `Không thể chuyển tồn kho từ ${currentState} sang released.`,
      );
    }

    const itemRows: Array<{ variantId: string; quantity: number }> =
      await manager.query(
        `
        SELECT variant_id AS "variantId", SUM(quantity)::int AS quantity
        FROM order_service.order_items
        WHERE order_id = $1
        GROUP BY variant_id
        `,
        [orderId],
      );

    await this.setInventoryAuditContext(manager, {
      eventType:
        target === 'committed'
          ? 'order_committed'
          : currentState === 'committed'
            ? 'order_cancelled_restocked'
            : 'order_released',
      referenceType: 'order',
      referenceId: orderId,
    });

    for (const item of itemRows) {
      const rows =
        target === 'committed'
          ? await manager.query(
              `
              UPDATE product_service.product_variants
              SET stock_quantity = stock_quantity - $2,
                  reserved_quantity = reserved_quantity - $2
              WHERE id = $1
                AND stock_quantity >= $2
                AND reserved_quantity >= $2
              RETURNING id
              `,
              [item.variantId, item.quantity],
            )
          : currentState === 'reserved'
            ? await manager.query(
                `
                UPDATE product_service.product_variants
                SET reserved_quantity = reserved_quantity - $2
                WHERE id = $1 AND reserved_quantity >= $2
                RETURNING id
                `,
                [item.variantId, item.quantity],
              )
            : await manager.query(
                `
                UPDATE product_service.product_variants
                SET stock_quantity = stock_quantity + $2
                WHERE id = $1
                RETURNING id
                `,
                [item.variantId, item.quantity],
              );

      if (!rows.length) {
        throw new BadRequestException(
          `Tồn kho của biến thể ${item.variantId} không nhất quán.`,
        );
      }
    }

    await manager.query(
      `
      UPDATE order_service.orders
      SET inventory_state = $2, updated_at = NOW()
      WHERE id = $1
      `,
      [orderId, target],
    );
  }

  private async releaseVoucherUsageInTransaction(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    const usages: Array<{ voucherId: string }> = await manager.query(
      `
      DELETE FROM voucher_service.voucher_usages
      WHERE order_id = $1
      RETURNING voucher_id AS "voucherId"
      `,
      [orderId],
    );

    for (const usage of usages) {
      await manager.query(
        `
        UPDATE voucher_service.vouchers
        SET used_count = GREATEST(used_count - 1, 0)
        WHERE id = $1
        `,
        [usage.voucherId],
      );
    }
  }

  private async cancelPendingPaymentsInTransaction(
    manager: EntityManager,
    orderId: string,
  ): Promise<void> {
    await manager.query(
      `
      UPDATE payment_service.payments p
      SET status_id = cancelled.id,
          failure_reason = COALESCE(p.failure_reason, 'Order cancelled'),
          updated_at = NOW()
      FROM payment_service.payment_statuses current_status,
           payment_service.payment_statuses cancelled
      WHERE p.order_id = $1
        AND current_status.id = p.status_id
        AND current_status.code = 'pending'
        AND cancelled.code = 'cancelled'
      `,
      [orderId],
    );
  }

  private async setInventoryAuditContext(
    manager: EntityManager,
    context: {
      eventType: string;
      referenceType: string;
      referenceId: string;
      actorId?: string;
    },
  ): Promise<void> {
    await manager.query(
      `
      SELECT
        set_config('app.inventory_event_type', $1, TRUE),
        set_config('app.inventory_reference_type', $2, TRUE),
        set_config('app.inventory_reference_id', $3, TRUE),
        set_config('app.inventory_actor_id', $4, TRUE)
      `,
      [
        context.eventType,
        context.referenceType,
        context.referenceId,
        context.actorId ?? '',
      ],
    );
  }

  private async getOrderStatusId(code: string): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT id FROM order_service.order_statuses WHERE code = $1 LIMIT 1`,
      [code],
    );

    if (!result.length) {
      throw new NotFoundException(`Order status ${code} not found`);
    }

    return Number(result[0].id);
  }

  private async getDefaultShippingMethod(): Promise<{
    id: number;
    baseFee: number;
  }> {
    const result = await this.dataSource.query(
      `SELECT id, base_fee AS "baseFee"
       FROM order_service.shipping_methods
       WHERE is_active = TRUE
       ORDER BY id ASC
       LIMIT 1`,
    );

    if (!result.length) {
      throw new ServiceUnavailableException(
        'Chưa có phương thức vận chuyển đang hoạt động.',
      );
    }

    const id = Number(result[0].id);
    const baseFee = Number(result[0].baseFee);
    if (!Number.isInteger(id) || !Number.isFinite(baseFee) || baseFee < 0) {
      throw new ServiceUnavailableException(
        'Cấu hình phương thức vận chuyển không hợp lệ.',
      );
    }

    return { id, baseFee };
  }

  private async getCurrentPaymentStatus(
    orderId: string,
  ): Promise<string | null> {
    const rows = await this.dataSource.query(
      `
      SELECT COALESCE(ps.code, 'pending') AS status
      FROM payment_service.payments p
      LEFT JOIN payment_service.payment_statuses ps ON ps.id = p.status_id
      WHERE p.order_id = $1
      ORDER BY p.created_at DESC
      LIMIT 1
      `,
      [orderId],
    );

    return rows.length ? String(rows[0].status) : null;
  }

  private async loadOrderAggregate(row: OrderRow): Promise<OrderRow> {
    const items = await this.dataSource.query(
      `
      SELECT
        oi.id,
        oi.order_id AS "orderId",
        oi.variant_id AS "variantId",
        pv.product_id AS "productId",
        oi.product_name AS "productName",
        p.slug AS "productSlug",
        oi.sku,
        oi.variant_label AS "variantLabel",
        oi.thumbnail_url AS "thumbnailUrl",
        oi.campaign_id AS "campaignId",
        oi.campaign_name AS "campaignName",
        oi.campaign_discount_type AS "campaignDiscountType",
        oi.campaign_discount_value AS "campaignDiscountValue",
        oi.campaign_badge_text AS "campaignBadgeText",
        oi.unit_price AS "unitPrice",
        oi.quantity,
        oi.subtotal
      FROM order_service.order_items oi
      LEFT JOIN product_service.product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN product_service.products p ON p.id = pv.product_id
      WHERE oi.order_id = $1
      ORDER BY oi.id ASC
      `,
      [row.id],
    );

    return {
      ...row,
      items: items as OrderItemRow[],
    };
  }

  private async loadCustomerContact(userId: string): Promise<CustomerContact> {
    const rows = await this.dataSource.query(
      `
      SELECT full_name AS "fullName", email
      FROM user_service.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    const fallbackName = String(
      rows[0]?.fullName ?? rows[0]?.email ?? 'Khách hàng',
    );

    return {
      fullName: fallbackName,
      email: rows[0]?.email ? String(rows[0].email) : null,
    };
  }

  private isMailEnabled() {
    return Boolean(
      this.configService.get<string>('MAIL_HOST') &&
      this.configService.get<string>('MAIL_PORT') &&
      this.configService.get<string>('MAIL_USER') &&
      this.configService.get<string>('MAIL_PASS'),
    );
  }

  private createMailerTransport() {
    return nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: Number(this.configService.get<string>('MAIL_PORT')),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  private formatCurrency(value: number) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private buildShippingAddressText(shippingAddress: Record<string, unknown>) {
    return [
      shippingAddress.streetAddress,
      shippingAddress.ward,
      shippingAddress.district,
      shippingAddress.province,
    ]
      .filter(Boolean)
      .map((item) => String(item))
      .join(', ');
  }

  private buildInvoiceHtml(
    order: ReturnType<OrderServiceService['mapOrder']>,
    customerName: string,
  ) {
    const shippingAddress = this.buildShippingAddressText(
      order.shippingAddress,
    );
    const rows = order.items
      .map(
        (item) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.productName}<br /><span style="color:#64748b;font-size:12px;">${item.variantLabel ?? ''}</span></td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${this.formatCurrency(item.unitPrice)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${this.formatCurrency(item.lineTotal)}</td>
          </tr>
        `,
      )
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Balii Sleepwear - Hóa đơn thanh toán</h2>
        <p>Xin chào ${customerName}, đơn hàng <strong>#${order.orderNumber}</strong> đã được thanh toán thành công.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 6px;"><strong>Người nhận:</strong> ${safeString(order.shippingAddress.recipientName) || customerName}</p>
          <p style="margin:0 0 6px;"><strong>Số điện thoại:</strong> ${safeString(order.shippingAddress.phone)}</p>
          <p style="margin:0;"><strong>Địa chỉ:</strong> ${shippingAddress}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:10px;text-align:left;">Sản phẩm</th>
              <th style="padding:10px;text-align:center;">SL</th>
              <th style="padding:10px;text-align:right;">Đơn giá</th>
              <th style="padding:10px;text-align:right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;display:flex;justify-content:flex-end;">
          <div style="min-width:280px;">
            <p style="display:flex;justify-content:space-between;"><span>Tạm tính</span><strong>${this.formatCurrency(order.subtotal)}</strong></p>
            <p style="display:flex;justify-content:space-between;"><span>Giảm giá</span><strong>${this.formatCurrency(order.discountAmount)}</strong></p>
            <p style="display:flex;justify-content:space-between;"><span>Phí vận chuyển</span><strong>${this.formatCurrency(order.shippingFee)}</strong></p>
            <p style="display:flex;justify-content:space-between;font-size:18px;"><span>Tổng thanh toán</span><strong>${this.formatCurrency(order.totalAmount)}</strong></p>
          </div>
        </div>
        <p style="margin-top:24px;color:#475569;">Balii sẽ sớm chuẩn bị và đóng gói đơn hàng của bạn.</p>
      </div>
    `;
  }

  private buildAdminOrderHtml(
    order: ReturnType<OrderServiceService['mapOrder']>,
    customerName: string,
    customerEmail: string | null,
    headline = 'Đơn hàng mới cần xử lý',
  ) {
    const shippingAddress = this.buildShippingAddressText(
      order.shippingAddress,
    );
    const itemList = order.items
      .map(
        (item) =>
          `<li>${item.productName} - ${item.variantLabel ?? ''} - SL ${item.quantity}</li>`,
      )
      .join('');

    return `
      <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#0f172a;">
        <h2>${headline}</h2>
        <p><strong>Mã đơn:</strong> #${order.orderNumber}</p>
        <p><strong>Khách hàng:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail ?? 'Không có'}</p>
        <p><strong>SĐT:</strong> ${safeString(order.shippingAddress.phone)}</p>
        <p><strong>Địa chỉ giao hàng:</strong> ${shippingAddress}</p>
        <p><strong>Tổng thanh toán:</strong> ${this.formatCurrency(order.totalAmount)}</p>
        <p><strong>Phương thức thanh toán:</strong> ${order.paymentMethod}</p>
        <h3>Danh sách sản phẩm</h3>
        <ul>${itemList}</ul>
        ${
          order.customerNote
            ? `<p><strong>Ghi chú khách hàng:</strong> ${order.customerNote}</p>`
            : ''
        }
      </div>
    `;
  }

  private buildOrderCreatedHtml(
    order: ReturnType<OrderServiceService['mapOrder']>,
    customerName: string,
  ) {
    const shippingAddress = this.buildShippingAddressText(
      order.shippingAddress,
    );

    return `
      <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#0f172a;">
        <h2 style="margin-bottom:8px;">Balii Sleepwear - Đặt hàng thành công</h2>
        <p>Xin chào ${customerName}, Balii đã ghi nhận đơn hàng <strong>#${order.orderNumber}</strong> của bạn.</p>
        <p>Trạng thái hiện tại: <strong>${order.status}</strong>. Hệ thống sẽ tiếp tục cập nhật khi đơn được xác nhận và giao hàng.</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 6px;"><strong>Người nhận:</strong> ${safeString(order.shippingAddress.recipientName) || customerName}</p>
          <p style="margin:0 0 6px;"><strong>Số điện thoại:</strong> ${safeString(order.shippingAddress.phone)}</p>
          <p style="margin:0;"><strong>Địa chỉ:</strong> ${shippingAddress}</p>
        </div>
        <p><strong>Tổng thanh toán:</strong> ${this.formatCurrency(order.totalAmount)}</p>
        <p><strong>Phương thức thanh toán:</strong> ${order.paymentMethod}</p>
      </div>
    `;
  }

  private async sendOrderCreatedNotifications(
    order: ReturnType<OrderServiceService['mapOrder']>,
  ) {
    if (!this.isMailEnabled()) {
      this.logger.warn(
        `MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS chưa cấu hình. Bỏ qua gửi mail cho đơn ${order.id}.`,
      );
      return;
    }

    const transporter = this.createMailerTransport();
    const customer = await this.loadCustomerContact(order.userId);
    const from =
      this.configService.get<string>('MAIL_FROM') || 'no-reply@balii.com';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const customerHtml = this.buildOrderCreatedHtml(order, customer.fullName);
    const adminRecipients = (
      this.configService.get<string>('ADMIN_ORDER_EMAILS') || ''
    )
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (customer.email) {
      await transporter.sendMail({
        from,
        to: customer.email,
        subject: `Đặt hàng thành công #${order.orderNumber}`,
        html: `
          ${customerHtml}
          <p style="font-family:Arial,sans-serif;color:#475569;margin-top:24px;">
            Bạn có thể theo dõi đơn hàng tại:
            <a href="${frontendUrl}/account/orders/${order.id}">${frontendUrl}/account/orders/${order.id}</a>
          </p>
        `,
      });
    }

    if (adminRecipients.length > 0) {
      await transporter.sendMail({
        from,
        to: adminRecipients.join(', '),
        subject: `Đơn hàng mới #${order.orderNumber}`,
        html: this.buildAdminOrderHtml(
          order,
          customer.fullName,
          customer.email,
          'Đơn hàng mới cần xác nhận',
        ),
      });
    }
  }

  private async sendPaymentSuccessNotifications(
    order: ReturnType<OrderServiceService['mapOrder']>,
  ) {
    if (!this.isMailEnabled()) {
      this.logger.warn(
        `MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS chưa cấu hình. Bỏ qua gửi mail cho đơn ${order.id}.`,
      );
      return;
    }

    const transporter = this.createMailerTransport();
    const customer = await this.loadCustomerContact(order.userId);
    const from =
      this.configService.get<string>('MAIL_FROM') || 'no-reply@balii.com';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const invoiceHtml = this.buildInvoiceHtml(order, customer.fullName);
    const adminRecipients = (
      this.configService.get<string>('ADMIN_ORDER_EMAILS') || ''
    )
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (customer.email) {
      await transporter.sendMail({
        from,
        to: customer.email,
        subject: `Thanh toán thành công cho đơn #${order.orderNumber}`,
        html: `
          ${invoiceHtml}
          <p style="font-family:Arial,sans-serif;color:#475569;margin-top:24px;">
            Bạn có thể theo dõi đơn hàng tại:
            <a href="${frontendUrl}/account/orders/${order.id}">${frontendUrl}/account/orders/${order.id}</a>
          </p>
        `,
        attachments: [
          {
            filename: `hoa-don-${order.orderNumber}.html`,
            content: invoiceHtml,
            contentType: 'text/html; charset=utf-8',
          },
        ],
      });
    }

    if (adminRecipients.length > 0) {
      await transporter.sendMail({
        from,
        to: adminRecipients.join(', '),
        subject: `Đơn mới cần đóng gói #${order.orderNumber}`,
        html: this.buildAdminOrderHtml(
          order,
          customer.fullName,
          customer.email,
        ),
      });
    }
  }

  private async sendNewReturnRequestNotification(
    request: ReturnRequestSummary,
  ) {
    if (!this.isMailEnabled()) {
      return;
    }

    const adminRecipients = (
      this.configService.get<string>('ADMIN_ORDER_EMAILS') || ''
    )
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!adminRecipients.length) {
      return;
    }

    const order = await this.findMyOrderById(request.userId, request.orderId);
    const customer = await this.loadCustomerContact(request.userId);
    const transporter = this.createMailerTransport();
    const from =
      this.configService.get<string>('MAIL_FROM') || 'no-reply@balii.com';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const evidenceLinks = request.imageUrls
      .map(
        (url, index) =>
          `<li><a href="${url}">Ảnh minh chứng ${index + 1}</a></li>`,
      )
      .join('');

    await transporter.sendMail({
      from,
      to: adminRecipients.join(', '),
      subject: `Yêu cầu trả hàng mới #${order.orderNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#0f172a;">
          <h2>Yêu cầu trả hàng cần kiểm tra</h2>
          <p><strong>Mã đơn:</strong> #${order.orderNumber}</p>
          <p><strong>Khách hàng:</strong> ${customer.fullName}</p>
          <p><strong>Lý do:</strong> ${request.reason}</p>
          <p><strong>Ảnh minh chứng:</strong></p>
          <ul>${evidenceLinks}</ul>
          <p><a href="${frontendUrl}/admin/orders">Mở trang quản lý đơn hàng</a></p>
        </div>
      `,
    });
  }

  private async sendReturnRequestReviewedNotification(
    request: ReturnRequestSummary,
  ) {
    if (!this.isMailEnabled()) {
      return;
    }

    const customer = await this.loadCustomerContact(request.userId);
    if (!customer.email) {
      return;
    }

    const order = await this.findMyOrderById(request.userId, request.orderId);
    const transporter = this.createMailerTransport();
    const from =
      this.configService.get<string>('MAIL_FROM') || 'no-reply@balii.com';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const isApproved = request.status === 'approved';

    await transporter.sendMail({
      from,
      to: customer.email,
      subject: `${isApproved ? 'Đã chấp thuận' : 'Cập nhật'} yêu cầu trả hàng #${order.orderNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#0f172a;">
          <h2>${isApproved ? 'Yêu cầu trả hàng đã được chấp thuận' : 'Yêu cầu trả hàng chưa được chấp thuận'}</h2>
          <p>Xin chào ${customer.fullName},</p>
          <p>${request.adminNote ?? ''}</p>
          <p><strong>Mã đơn:</strong> #${order.orderNumber}</p>
          <p><a href="${frontendUrl}/account/orders/${order.id}">Xem chi tiết yêu cầu trả hàng</a></p>
        </div>
      `,
    });
  }

  private async getAdminSummary(): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    revenueGrowth: number;
    orderGrowth: number;
  }> {
    const [currentMonth, previousMonth, totals] = await Promise.all([
      this.dataSource.query(
        `
        SELECT
          COALESCE(SUM(GREATEST(
            o.total_amount
            - COALESCE((
              SELECT SUM(payment.refunded_amount)
              FROM payment_service.payments payment
              WHERE payment.order_id = o.id
            ), 0)
            - COALESCE((
              SELECT SUM(rr.manual_refund_amount)
              FROM order_service.return_requests rr
              WHERE rr.order_id = o.id
                AND rr.refund_status = 'manual_completed'
            ), 0),
            0
          )), 0) AS revenue,
          COUNT(*)::int AS orders
        FROM order_service.orders o
        JOIN order_service.order_statuses os ON os.id = o.status_id
        WHERE NOT EXISTS (
            SELECT 1 FROM payment_service.payments simulated
            WHERE simulated.order_id = o.id AND simulated.is_simulated = TRUE
          )
          AND (
            os.code = 'delivered'
            OR EXISTS (
              SELECT 1
              FROM payment_service.payments pay
              JOIN payment_service.payment_statuses ps ON ps.id = pay.status_id
              WHERE pay.order_id = o.id AND ps.code = 'paid'
            )
          )
          AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        `,
      ),
      this.dataSource.query(
        `
        SELECT
          COALESCE(SUM(GREATEST(
            o.total_amount
            - COALESCE((
              SELECT SUM(payment.refunded_amount)
              FROM payment_service.payments payment
              WHERE payment.order_id = o.id
            ), 0)
            - COALESCE((
              SELECT SUM(rr.manual_refund_amount)
              FROM order_service.return_requests rr
              WHERE rr.order_id = o.id
                AND rr.refund_status = 'manual_completed'
            ), 0),
            0
          )), 0) AS revenue,
          COUNT(*)::int AS orders
        FROM order_service.orders o
        JOIN order_service.order_statuses os ON os.id = o.status_id
        WHERE NOT EXISTS (
            SELECT 1 FROM payment_service.payments simulated
            WHERE simulated.order_id = o.id AND simulated.is_simulated = TRUE
          )
          AND (
            os.code = 'delivered'
            OR EXISTS (
              SELECT 1
              FROM payment_service.payments pay
              JOIN payment_service.payment_statuses ps ON ps.id = pay.status_id
              WHERE pay.order_id = o.id AND ps.code = 'paid'
            )
          )
          AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        `,
      ),
      this.dataSource.query(
        `
        SELECT
          COALESCE((
            SELECT SUM(GREATEST(
              o.total_amount
              - COALESCE((
                SELECT SUM(payment.refunded_amount)
                FROM payment_service.payments payment
                WHERE payment.order_id = o.id
              ), 0)
              - COALESCE((
                SELECT SUM(rr.manual_refund_amount)
                FROM order_service.return_requests rr
                WHERE rr.order_id = o.id
                  AND rr.refund_status = 'manual_completed'
              ), 0),
              0
            ))
            FROM order_service.orders o
            JOIN order_service.order_statuses os ON os.id = o.status_id
            WHERE NOT EXISTS (
                SELECT 1 FROM payment_service.payments simulated
                WHERE simulated.order_id = o.id AND simulated.is_simulated = TRUE
              )
              AND (os.code = 'delivered'
              OR EXISTS (
                SELECT 1
                FROM payment_service.payments pay
                JOIN payment_service.payment_statuses ps ON ps.id = pay.status_id
                WHERE pay.order_id = o.id AND ps.code = 'paid'
              ))
          ), 0) AS "totalRevenue",
          COALESCE((
            SELECT COUNT(*)
            FROM order_service.orders
          ), 0)::int AS "totalOrders",
          COALESCE((
            SELECT COUNT(*)
            FROM user_service.users u
            JOIN user_service.roles r ON r.id = u.role_id
            WHERE UPPER(r.name) = 'CUSTOMER'
          ), 0)::int AS "totalCustomers",
          COALESCE((
            SELECT COUNT(*)
            FROM product_service.products p
            WHERE p.is_active = TRUE
          ), 0)::int AS "totalProducts"
        `,
      ),
    ]);

    const currentRevenue = Number(currentMonth[0]?.revenue ?? 0);
    const previousRevenue = Number(previousMonth[0]?.revenue ?? 0);
    const currentOrders = Number(currentMonth[0]?.orders ?? 0);
    const previousOrders = Number(previousMonth[0]?.orders ?? 0);
    const totalRow = totals[0] ?? {};

    return {
      totalRevenue: Number(totalRow.totalRevenue ?? 0),
      totalOrders: Number(totalRow.totalOrders ?? 0),
      totalCustomers: Number(totalRow.totalCustomers ?? 0),
      totalProducts: Number(totalRow.totalProducts ?? 0),
      revenueGrowth: this.calculateGrowth(currentRevenue, previousRevenue),
      orderGrowth: this.calculateGrowth(currentOrders, previousOrders),
    };
  }

  private async getMonthlyRevenue(): Promise<RevenuePoint[]> {
    const rows = await this.dataSource.query(
      `
      WITH months AS (
        SELECT generate_series(
          DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months',
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS month_start
      )
      SELECT
        EXTRACT(MONTH FROM m.month_start)::int AS month,
        COALESCE(SUM(
          CASE
            WHEN NOT EXISTS (
                SELECT 1 FROM payment_service.payments simulated
                WHERE simulated.order_id = o.id AND simulated.is_simulated = TRUE
              ) AND (os.code = 'delivered'
              OR EXISTS (
                SELECT 1
                FROM payment_service.payments pay
                JOIN payment_service.payment_statuses ps ON ps.id = pay.status_id
                WHERE pay.order_id = o.id AND ps.code = 'paid'
              ))
            THEN GREATEST(
              o.total_amount
              - COALESCE((
                SELECT SUM(payment.refunded_amount)
                FROM payment_service.payments payment
                WHERE payment.order_id = o.id
              ), 0)
              - COALESCE((
                SELECT SUM(rr.manual_refund_amount)
                FROM order_service.return_requests rr
                WHERE rr.order_id = o.id
                  AND rr.refund_status = 'manual_completed'
              ), 0),
              0
            )
            ELSE 0
          END
        ), 0) AS revenue
      FROM months m
      LEFT JOIN order_service.orders o
        ON DATE_TRUNC('month', o.created_at) = m.month_start
      LEFT JOIN order_service.order_statuses os
        ON os.id = o.status_id
      GROUP BY m.month_start
      ORDER BY m.month_start ASC
      `,
    );

    return rows.map((row: { month: number; revenue: number | string }) => ({
      month: `T${row.month}`,
      revenue: Number(row.revenue ?? 0),
    }));
  }

  private async getRecentOrders(): Promise<AdminRecentOrder[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        o.id,
        o.order_code AS "orderCode",
        COALESCE(u.full_name, o.shipping_address ->> 'recipientName', 'Khách hàng') AS "customerName",
        o.total_amount AS total,
        os.code AS status,
        o.created_at AS "createdAt"
      FROM order_service.orders o
      JOIN order_service.order_statuses os ON os.id = o.status_id
      LEFT JOIN user_service.users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 5
      `,
    );

    return rows.map(
      (row: {
        id: string;
        orderCode: string;
        customerName: string;
        total: number | string;
        status: string;
        createdAt: Date | string;
      }) => ({
        id: row.id,
        orderCode: row.orderCode,
        customerName: row.customerName,
        total: Number(row.total ?? 0),
        status: row.status,
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : String(row.createdAt),
      }),
    );
  }

  private async getTopProducts(): Promise<TopProductPoint[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        COALESCE(p.id, oi.variant_id) AS "productId",
        COALESCE(p.name, oi.product_name) AS "productName",
        COALESCE(
          (
            SELECT img.url
            FROM product_service.product_images img
            WHERE img.product_id = p.id
            ORDER BY img.is_primary DESC, img.sort_order ASC
            LIMIT 1
          ),
          oi.thumbnail_url,
          ''
        ) AS thumbnail,
        SUM(oi.quantity)::int AS "quantitySold",
        SUM(GREATEST(
          oi.subtotal - COALESCE((
            SELECT SUM(rri.refund_amount)
            FROM order_service.return_request_items rri
            JOIN order_service.return_requests rr
              ON rr.id = rri.return_request_id
            WHERE rri.order_item_id = oi.id
              AND rr.status = 'completed'
              AND rr.refund_status IN ('completed', 'manual_completed')
          ), 0),
          0
        )) AS revenue,
        SUM(
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM product_service.campaigns c
              WHERE p.id = ANY(c.product_ids)
                AND o.created_at >= c.start_at
                AND o.created_at <= c.end_at
            )
            THEN oi.quantity
            ELSE 0
          END
        )::int AS "campaignQuantitySold",
        SUM(
          CASE
            WHEN EXISTS (
              SELECT 1
              FROM product_service.campaigns c
              WHERE p.id = ANY(c.product_ids)
                AND o.created_at >= c.start_at
                AND o.created_at <= c.end_at
            )
            THEN GREATEST(
              oi.subtotal - COALESCE((
                SELECT SUM(rri.refund_amount)
                FROM order_service.return_request_items rri
                JOIN order_service.return_requests rr
                  ON rr.id = rri.return_request_id
                WHERE rri.order_item_id = oi.id
                  AND rr.status = 'completed'
                  AND rr.refund_status IN ('completed', 'manual_completed')
              ), 0),
              0
            )
            ELSE 0
          END
        ) AS "campaignRevenue",
        COUNT(DISTINCT CASE
          WHEN EXISTS (
            SELECT 1
            FROM product_service.campaigns c
            WHERE p.id = ANY(c.product_ids)
              AND o.created_at >= c.start_at
              AND o.created_at <= c.end_at
          )
          THEN o.id
          ELSE NULL
        END)::int AS "campaignOrderCount"
      FROM order_service.order_items oi
      JOIN order_service.orders o ON o.id = oi.order_id
      JOIN order_service.order_statuses os ON os.id = o.status_id
      LEFT JOIN product_service.product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN product_service.products p ON p.id = pv.product_id
      WHERE NOT EXISTS (
          SELECT 1 FROM payment_service.payments simulated
          WHERE simulated.order_id = o.id AND simulated.is_simulated = TRUE
        )
        AND (os.code = 'delivered'
        OR EXISTS (
          SELECT 1
          FROM payment_service.payments pay
          JOIN payment_service.payment_statuses ps ON ps.id = pay.status_id
          WHERE pay.order_id = o.id AND ps.code = 'paid'
        ))
      GROUP BY p.id, p.name, oi.variant_id, oi.product_name, oi.thumbnail_url
      ORDER BY "quantitySold" DESC, revenue DESC
      LIMIT 5
      `,
    );

    return rows.map(
      (row: {
        productId: string;
        productName: string;
        thumbnail: string;
        quantitySold: number;
        revenue: number | string;
        campaignQuantitySold: number;
        campaignRevenue: number | string;
        campaignOrderCount: number;
      }) => ({
        productId: row.productId,
        productName: row.productName,
        thumbnail: row.thumbnail ?? '',
        quantitySold: Number(row.quantitySold ?? 0),
        revenue: Number(row.revenue ?? 0),
        campaignQuantitySold: Number(row.campaignQuantitySold ?? 0),
        campaignRevenue: Number(row.campaignRevenue ?? 0),
        campaignOrderCount: Number(row.campaignOrderCount ?? 0),
      }),
    );
  }

  private async getOrderStatusBreakdown(): Promise<OrderStatusPoint[]> {
    const rows = await this.dataSource.query(
      `
      SELECT
        os.code AS status,
        COUNT(*)::int AS count
      FROM order_service.orders o
      JOIN order_service.order_statuses os ON os.id = o.status_id
      GROUP BY os.code
      ORDER BY count DESC
      `,
    );

    return rows.map((row: { status: string; count: number }) => ({
      status: row.status,
      count: Number(row.count ?? 0),
    }));
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
  }
}
function safeString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}
