/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartClientService } from './clients/cart-client.service';
import { OrderSummary } from './order-service.types';

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
};

type OrderStatusPoint = {
  status: string;
  count: number;
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
  ) {}

  async createOrder(userId: string | undefined, dto: CreateOrderDto) {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    const cart = await this.cartClientService.getCheckoutCart(
      userId,
      dto.sessionId,
    );
    const pendingStatusId = await this.getOrderStatusId('pending');
    const shippingMethodId = await this.getDefaultShippingMethodId();
    const order = this.orderRepository.create({
      orderCode: this.generateOrderCode(),
      userId,
      statusId: pendingStatusId,
      subtotal: cart.subtotal,
      discountAmount: cart.discountAmount,
      shippingFee: cart.shippingFee,
      totalAmount: cart.totalAmount,
      shippingAddress: dto.shippingAddress,
      note: dto.customerNote ?? null,
      shippingMethodId,
      items: cart.items.map((item) =>
        this.orderItemRepository.create({
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku,
          variantLabel: item.variantLabel ?? null,
          thumbnailUrl: item.thumbnailUrl ?? null,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
        }),
      ),
    });

    const savedOrder = await this.orderRepository.save(order);
    await this.cartClientService.clearCart(userId, dto.sessionId);

    const response = await this.findMyOrderById(userId, savedOrder.id);
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
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const previousPaymentStatus = await this.getCurrentPaymentStatus(order.id);

    const nextStatusCode =
      status ??
      (paymentStatus === 'paid'
        ? 'confirmed'
        : paymentStatus === 'refunded'
          ? 'refunded'
          : paymentStatus === 'failed'
            ? 'pending'
            : undefined);

    if (nextStatusCode) {
      const nextStatusId = await this.getOrderStatusId(nextStatusCode);
      if (order.statusId !== nextStatusId) {
        const previousStatusId = order.statusId;
        order.statusId = nextStatusId;
        await this.orderRepository.save(order);
        await this.dataSource.query(
          `
          INSERT INTO order_service.order_status_logs (
            order_id,
            from_status_id,
            to_status_id,
            note
          )
          VALUES ($1, $2, $3, $4)
          `,
          [
            order.id,
            previousStatusId,
            nextStatusId,
            `Payment status updated to ${paymentStatus}`,
          ],
        );
      }
    }

    const response = await this.findMyOrderById(order.userId, order.id);

    if (paymentStatus === 'paid' && previousPaymentStatus !== 'paid') {
      void this.sendPaymentSuccessNotifications(response).catch((error) => {
        const message =
          error instanceof Error ? error.message : 'Unknown email error';
        this.logger.warn(
          `Unable to send payment success emails for order ${order.id}: ${message}`,
        );
      });
    }

    return response;
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
        sku: item.sku,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        lineTotal: Number(item.subtotal),
      })),
    };
  }

  private generateOrderCode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `BAL${timestamp}${random}`;
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

  private async getDefaultShippingMethodId(): Promise<number | null> {
    const result = await this.dataSource.query(
      `SELECT id FROM order_service.shipping_methods WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`,
    );

    return result.length ? Number(result[0].id) : null;
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
        <h2>Đơn hàng mới đã thanh toán - cần đóng gói</h2>
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
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(*)::int AS orders
        FROM order_service.orders o
        JOIN order_service.order_statuses os ON os.id = o.status_id
        WHERE os.code NOT IN ('cancelled', 'refunded')
          AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE)
        `,
      ),
      this.dataSource.query(
        `
        SELECT
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(*)::int AS orders
        FROM order_service.orders o
        JOIN order_service.order_statuses os ON os.id = o.status_id
        WHERE os.code NOT IN ('cancelled', 'refunded')
          AND DATE_TRUNC('month', o.created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        `,
      ),
      this.dataSource.query(
        `
        SELECT
          COALESCE((
            SELECT SUM(o.total_amount)
            FROM order_service.orders o
            JOIN order_service.order_statuses os ON os.id = o.status_id
            WHERE os.code NOT IN ('cancelled', 'refunded')
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
        COALESCE(SUM(o.total_amount), 0) AS revenue
      FROM months m
      LEFT JOIN order_service.orders o
        ON DATE_TRUNC('month', o.created_at) = m.month_start
      LEFT JOIN order_service.order_statuses os
        ON os.id = o.status_id
      WHERE os.code IS NULL OR os.code NOT IN ('cancelled', 'refunded')
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
        SUM(oi.subtotal) AS revenue
      FROM order_service.order_items oi
      JOIN order_service.orders o ON o.id = oi.order_id
      JOIN order_service.order_statuses os ON os.id = o.status_id
      LEFT JOIN product_service.product_variants pv ON pv.id = oi.variant_id
      LEFT JOIN product_service.products p ON p.id = pv.product_id
      WHERE os.code NOT IN ('cancelled', 'refunded')
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
      }) => ({
        productId: row.productId,
        productName: row.productName,
        thumbnail: row.thumbnail ?? '',
        quantitySold: Number(row.quantitySold ?? 0),
        revenue: Number(row.revenue ?? 0),
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
