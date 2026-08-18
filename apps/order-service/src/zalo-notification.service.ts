import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ThreadType,
  type API,
  type Cookie,
  type Credentials,
  Zalo,
} from 'zca-js';

export type ZaloNewOrderNotification = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  totalAmount: number;
  adminUrl: string;
  items: Array<{
    productName: string;
    variantLabel?: string | null;
    quantity: number;
    lineTotal: number;
  }>;
};

const MAX_ZALO_MESSAGE_LENGTH = 1900;

@Injectable()
export class ZaloNotificationService {
  private readonly logger = new Logger(ZaloNotificationService.name);
  private apiPromise: Promise<API> | null = null;

  constructor(private readonly configService: ConfigService) {}

  isEnabled() {
    return (
      this.configService.get<string>('ZALO_NOTIFICATION_ENABLED') === 'true'
    );
  }

  async sendNewOrder(notification: ZaloNewOrderNotification) {
    if (!this.isEnabled()) return;

    const groupIds = this.getGroupIds();
    if (groupIds.length === 0) {
      this.logger.warn(
        'ZALO_GROUP_ID/ZALO_GROUP_IDS chưa cấu hình. Bỏ qua thông báo Zalo.',
      );
      return;
    }

    const message = buildZaloNewOrderMessage(notification);
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const api = await this.getApi();
        for (const groupId of groupIds) {
          await this.withTimeout(
            api.sendMessage({ msg: message }, groupId, ThreadType.Group),
          );
        }
        this.logger.log(
          `Đã gửi đơn ${notification.orderNumber} tới ${groupIds.length} nhóm Zalo.`,
        );
        return;
      } catch (error) {
        lastError = error;
        this.apiPromise = null;
        this.logger.warn(
          `Gửi Zalo lần ${attempt} thất bại cho đơn ${notification.orderNumber}: ${getErrorMessage(error)}`,
        );
      }
    }

    throw new Error(
      `Không thể gửi thông báo Zalo sau 2 lần thử: ${getErrorMessage(lastError)}`,
    );
  }

  private getGroupIds() {
    return [
      this.configService.get<string>('ZALO_GROUP_ID') || '',
      this.configService.get<string>('ZALO_GROUP_IDS') || '',
    ]
      .join(',')
      .split(',')
      .map((value) => value.trim())
      .filter(
        (value, index, values) =>
          Boolean(value) && values.indexOf(value) === index,
      );
  }

  private getApi() {
    if (!this.apiPromise) {
      this.apiPromise = this.login();
    }
    return this.apiPromise;
  }

  private async login() {
    const credentials = this.getCredentials();
    const zalo = new Zalo();
    return zalo.login(credentials);
  }

  private getCredentials(): Credentials {
    const imei = this.requireConfig('ZALO_IMEI');
    const userAgent = this.requireConfig('ZALO_USER_AGENT');
    const cookieBase64 = this.configService
      .get<string>('ZALO_COOKIE_BASE64')
      ?.trim();
    const cookieJson = this.configService
      .get<string>('ZALO_COOKIE_JSON')
      ?.trim();

    if (!cookieBase64 && !cookieJson) {
      throw new Error(
        'Thiếu ZALO_COOKIE_BASE64 hoặc ZALO_COOKIE_JSON trong biến môi trường.',
      );
    }

    const rawCookie = cookieBase64
      ? Buffer.from(cookieBase64, 'base64').toString('utf8')
      : cookieJson!;
    let cookie: Cookie[];
    try {
      const parsed = JSON.parse(rawCookie) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('cookie phải là một mảng không rỗng');
      }
      cookie = parsed as Cookie[];
    } catch (error) {
      throw new Error(`Cookie Zalo không hợp lệ: ${getErrorMessage(error)}`);
    }

    return { imei, userAgent, cookie };
  }

  private requireConfig(key: string) {
    const value = this.configService.get<string>(key)?.trim();
    if (!value) throw new Error(`Thiếu biến môi trường ${key}.`);
    return value;
  }

  private async withTimeout<T>(promise: Promise<T>) {
    const configured = Number(
      this.configService.get<string>('ZALO_NOTIFICATION_TIMEOUT_MS') || 10000,
    );
    const timeoutMs =
      Number.isFinite(configured) && configured >= 1000 ? configured : 10000;

    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error(`Zalo quá thời gian chờ ${timeoutMs}ms.`)),
            timeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}

export function buildZaloNewOrderMessage(
  notification: ZaloNewOrderNotification,
) {
  const itemLines = notification.items.slice(0, 10).map((item, index) => {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : '';
    return `${index + 1}. ${item.productName}${variant} × ${item.quantity} — ${formatCurrency(item.lineTotal)}`;
  });
  if (notification.items.length > 10) {
    itemLines.push(`… và ${notification.items.length - 10} sản phẩm khác`);
  }

  const message = [
    '🛍️ BALII — ĐƠN HÀNG MỚI',
    `Mã đơn: #${notification.orderNumber}`,
    `Khách hàng: ${notification.customerName}`,
    `Điện thoại: ${notification.customerPhone || 'Chưa có'}`,
    `Địa chỉ: ${notification.shippingAddress || 'Chưa có'}`,
    '',
    ...itemLines,
    '',
    `Thanh toán: ${notification.paymentMethod.toUpperCase()}`,
    `Tổng cộng: ${formatCurrency(notification.totalAmount)}`,
    `Xem đơn: ${notification.adminUrl}`,
  ].join('\n');

  return message.length <= MAX_ZALO_MESSAGE_LENGTH
    ? message
    : `${message.slice(0, MAX_ZALO_MESSAGE_LENGTH - 1)}…`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
