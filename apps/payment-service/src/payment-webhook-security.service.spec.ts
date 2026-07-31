import { createHmac } from 'crypto';

import { PaymentWebhookSecurityService } from './payment-webhook-security.service';

describe('PaymentWebhookSecurityService', () => {
  const originalEnv = { ...process.env };
  const service = new PaymentWebhookSecurityService();

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('always requires a signature in production even when bypass is enabled', () => {
    process.env.APP_ENV = 'production';
    process.env.PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS = 'true';
    process.env.PAYMENT_WEBHOOK_SHARED_SECRET = 'test-secret';

    expect(service.verifyGenericWebhookSignature('{}')).toBe(false);
  });

  it('allows the explicit bypass outside production', () => {
    process.env.APP_ENV = 'development';
    process.env.PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS = 'true';

    expect(service.verifyGenericWebhookSignature('{}')).toBe(true);
  });

  it('accepts a valid HMAC signature in production', () => {
    const payload = JSON.stringify({ orderId: 'order-1' });
    const secret = 'test-secret';
    process.env.APP_ENV = 'production';
    process.env.PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS = 'false';
    process.env.PAYMENT_WEBHOOK_SHARED_SECRET = secret;
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    expect(service.verifyGenericWebhookSignature(payload, signature)).toBe(
      true,
    );
  });
});
