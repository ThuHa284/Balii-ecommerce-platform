import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

type VnpayCallbackPayload = Record<string, string | undefined>;

@Injectable()
export class PaymentWebhookSecurityService {
  /**
   * Generic webhook chỉ được nhận từ các provider dùng shared-secret nội bộ.
   * VNPay có cơ chế ký riêng nên bị tách sang endpoint dedicated để tránh trộn logic.
   */
  validateGenericWebhookRequest(input: {
    provider: string;
    flow: 'payment' | 'refund';
    businessKey?: string;
    rawPayload: unknown;
    signature?: string;
  }) {
    if (input.provider === 'vnpay') {
      throw new BadRequestException(
        'VNPay must use the dedicated /payments/vnpay/return or /payments/vnpay/ipn endpoints',
      );
    }

    if (!input.businessKey?.trim()) {
      throw new BadRequestException(
        input.flow === 'payment' ? 'Missing orderId' : 'Missing paymentId',
      );
    }

    const rawPayload = JSON.stringify(input.rawPayload ?? {});
    if (!this.isTrustedGenericWebhook(rawPayload, input.signature)) {
      throw new BadRequestException('Untrusted webhook signature');
    }

    return true;
  }

  verifyGenericWebhookSignature(
    rawPayload: string,
    signature?: string,
  ): boolean {
    return this.isTrustedGenericWebhook(rawPayload, signature);
  }

  verifyVnpaySignature(query: VnpayCallbackPayload) {
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

    if (!incomingHash) {
      return false;
    }

    const expectedBuffer = Buffer.from(expectedHash, 'utf-8');
    const incomingBuffer = Buffer.from(incomingHash.toLowerCase(), 'utf-8');

    if (expectedBuffer.length !== incomingBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, incomingBuffer);
  }

  private isTrustedGenericWebhook(
    rawPayload: string,
    signature?: string,
  ): boolean {
    // Cho phép bỏ verify chỉ khi môi trường local/dev bật cờ rõ ràng.
    if (process.env.PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS === 'true') {
      return true;
    }

    const secret = process.env.PAYMENT_WEBHOOK_SHARED_SECRET;
    if (!secret || !signature) {
      return false;
    }

    const expected = createHmac('sha256', secret)
      .update(Buffer.from(rawPayload, 'utf-8'))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'utf-8');
    const signatureBuffer = Buffer.from(signature, 'utf-8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  private buildSortedQuery(input: Record<string, string>) {
    // VNPay yêu cầu sort key trước khi HMAC, đồng thời thay space bằng dấu +.
    return Object.keys(input)
      .sort()
      .map(
        (key) =>
          `${key}=${encodeURIComponent(input[key]).replace(/%20/g, '+')}`,
      )
      .join('&');
  }
}
