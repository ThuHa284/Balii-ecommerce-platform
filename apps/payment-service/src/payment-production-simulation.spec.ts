jest.mock('uuid', () => ({
  validate: () => true,
}));
jest.mock('camunda-external-task-client-js', () => ({
  Client: class {},
  logger: () => undefined,
}));

import { PaymentServiceService } from './payment-service.service';
import { RefundOperationsService } from './refund-operations.service';

describe('Production payment simulation mode', () => {
  const originalEnv = {
    appEnv: process.env.APP_ENV,
    paymentSimulation: process.env.PAYMENT_SIMULATION_ENABLED,
    allowProduction: process.env.PAYMENT_SIMULATION_ALLOW_PRODUCTION,
    refundSimulation: process.env.PAYMENT_REFUND_SIMULATION_ENABLED,
    frontendUrl: process.env.FRONTEND_URL,
  };

  beforeEach(() => {
    process.env.APP_ENV = 'production';
    process.env.PAYMENT_SIMULATION_ENABLED = 'true';
    process.env.PAYMENT_SIMULATION_ALLOW_PRODUCTION = 'true';
    process.env.PAYMENT_REFUND_SIMULATION_ENABLED = 'true';
    process.env.FRONTEND_URL = 'https://shop.example.com';
  });

  afterAll(() => {
    restoreEnv('APP_ENV', originalEnv.appEnv);
    restoreEnv('PAYMENT_SIMULATION_ENABLED', originalEnv.paymentSimulation);
    restoreEnv(
      'PAYMENT_SIMULATION_ALLOW_PRODUCTION',
      originalEnv.allowProduction,
    );
    restoreEnv(
      'PAYMENT_REFUND_SIMULATION_ENABLED',
      originalEnv.refundSimulation,
    );
    restoreEnv('FRONTEND_URL', originalEnv.frontendUrl);
  });

  it('builds an internal demo URL without VNPay merchant credentials', () => {
    const service = new PaymentServiceService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const buildUrl = service as unknown as {
      buildVnpayPaymentUrl(input: {
        orderId: string;
        amount: number;
        providerRef: string;
      }): string;
    };

    expect(
      buildUrl.buildVnpayPaymentUrl({
        orderId: 'order-1',
        amount: 100000,
        providerRef: 'SIM_TEST',
      }),
    ).toBe(
      'https://shop.example.com/checkout/vnpay?simulation=true&paymentRef=SIM_TEST',
    );
  });

  it('marks production refund gateway calls as simulation', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const service = new RefundOperationsService(
      { query } as never,
      {} as never,
      {} as never,
    );

    const result = await service.callGatewayRefundApi({
      refundId: 'refund-1',
      paymentId: 'payment-1',
      method: 'vnpay',
    });

    expect(result.accepted).toBe(true);
    expect(result.gatewayMode).toBe('simulation');
    expect(result.providerRefundId).toMatch(/^RF_GATEWAY_/);
  });

  it('returns the existing paid payment when success simulation is repeated', async () => {
    const paymentRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'payment-1',
        userId: 'user-1',
        providerId: 4,
        statusId: 2,
      }),
    };
    const service = new PaymentServiceService(
      paymentRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const internals = service as unknown as {
      getProviderCode: (providerId: number) => Promise<string>;
      getPaymentStatusCode: (statusId: number) => Promise<string>;
      getPaymentDetail: (paymentId: string) => Promise<{ status: string }>;
    };
    jest.spyOn(internals, 'getProviderCode').mockResolvedValue('vnpay');
    jest.spyOn(internals, 'getPaymentStatusCode').mockResolvedValue('paid');
    jest
      .spyOn(internals, 'getPaymentDetail')
      .mockResolvedValue({ status: 'paid' });

    await expect(
      service.simulatePaymentSuccess('user-1', 'payment-1'),
    ).resolves.toEqual({ status: 'paid' });
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
