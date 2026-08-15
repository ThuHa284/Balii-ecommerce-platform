import { OrderServiceService } from './order-service.service';

describe('OrderServiceService return lifecycle', () => {
  const now = new Date('2026-07-19T08:00:00.000Z');
  const originalRefundSimulation =
    process.env.PAYMENT_REFUND_SIMULATION_ENABLED;

  beforeAll(() => {
    process.env.PAYMENT_REFUND_SIMULATION_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.PAYMENT_REFUND_SIMULATION_ENABLED = originalRefundSimulation;
  });

  function createService(current: {
    status: string;
    inventoryState: string;
    paymentStatus: string;
    paymentMethod: string;
    subtotal?: number;
    discountAmount?: number;
    grossAmount?: number;
    priorRefundedAmount?: number;
    refundPaymentId?: string | null;
    refundWorkflowStartedAt?: string | null;
  }) {
    const transactionQueries: string[] = [];
    const manager = {
      query: jest.fn(async (sql: string) => {
        transactionQueries.push(sql);
        if (sql.includes('previous_rr.approved_refund_amount')) {
          return [{ total: current.priorRefundedAmount ?? 0 }];
        }
        if (sql.includes('FROM order_service.return_request_items rri')) {
          return [
            {
              id: '66666666-6666-4666-8666-666666666666',
              orderItemId: '77777777-7777-4777-8777-777777777777',
              requestedQuantity: 1,
              grossAmount: current.grossAmount ?? 100000,
              variantId: '88888888-8888-4888-8888-888888888888',
            },
          ];
        }
        if (sql.includes('FROM order_service.return_requests rr')) {
          return [
            {
              id: '11111111-1111-4111-8111-111111111111',
              orderId: '22222222-2222-4222-8222-222222222222',
              userId: '33333333-3333-4333-8333-333333333333',
              reason: 'Sản phẩm không đúng mô tả',
              refundPaymentId: null,
              refundWorkflowStartedAt: null,
              subtotal: 100000,
              discountAmount: 0,
              ...current,
            },
          ];
        }
        return [];
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        async (callback: (transactionManager: typeof manager) => unknown) =>
          callback(manager),
      ),
      query: jest.fn(async (sql: string) => {
        if (sql.includes('FROM order_service.return_requests')) {
          return [
            {
              id: '11111111-1111-4111-8111-111111111111',
              orderId: '22222222-2222-4222-8222-222222222222',
              userId: '33333333-3333-4333-8333-333333333333',
              status: 'refund_pending',
              reason: 'Sản phẩm không đúng mô tả',
              imageUrls: [],
              refundMode: 'provider',
              refundStatus: 'processing',
              refundPaymentId: '44444444-4444-4444-8444-444444444444',
              createdAt: now,
              updatedAt: now,
            },
          ];
        }
        return [];
      }),
    };
    const paymentClient = {
      startReturnRefund: jest.fn().mockResolvedValue({
        paymentId: '44444444-4444-4444-8444-444444444444',
        refundId: null,
        reused: false,
        workflowStarted: true,
      }),
    };
    const service = new OrderServiceService(
      {} as never,
      {} as never,
      {} as never,
      dataSource as never,
      { get: jest.fn() } as never,
      {} as never,
      paymentClient as never,
    );

    return { service, transactionQueries, paymentClient };
  }

  it('restocks once and starts the provider refund after goods are received', async () => {
    const { service, transactionQueries, paymentClient } = createService({
      status: 'approved',
      inventoryState: 'committed',
      paymentStatus: 'paid',
      paymentMethod: 'vnpay',
    });

    const result = await service.receiveReturnRequest(
      '11111111-1111-4111-8111-111111111111',
      '55555555-5555-4555-8555-555555555555',
      {
        items: [
          {
            returnItemId: '66666666-6666-4666-8666-666666666666',
            disposition: 'restock',
          },
        ],
      },
    );

    expect(
      transactionQueries.filter((sql) =>
        sql.includes('SET stock_quantity = stock_quantity'),
      ),
    ).toHaveLength(1);
    expect(
      transactionQueries.some((sql) =>
        sql.includes("SET inventory_state = 'returned'"),
      ),
    ).toBe(false);
    expect(paymentClient.startReturnRefund).toHaveBeenCalledTimes(1);
    expect(paymentClient.startReturnRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100000 }),
    );
    expect(result.status).toBe('refund_pending');
  });

  it('does not restock or dispatch again after the refund was started', async () => {
    const { service, transactionQueries, paymentClient } = createService({
      status: 'refund_pending',
      inventoryState: 'returned',
      paymentStatus: 'paid',
      paymentMethod: 'vnpay',
      refundPaymentId: '44444444-4444-4444-8444-444444444444',
      refundWorkflowStartedAt: now.toISOString(),
    });

    await service.receiveReturnRequest(
      '11111111-1111-4111-8111-111111111111',
      '55555555-5555-4555-8555-555555555555',
      {
        items: [
          {
            returnItemId: '66666666-6666-4666-8666-666666666666',
            disposition: 'restock',
          },
        ],
      },
    );

    expect(
      transactionQueries.some((sql) =>
        sql.includes('SET stock_quantity = stock_quantity'),
      ),
    ).toBe(false);
    expect(paymentClient.startReturnRefund).not.toHaveBeenCalled();
  });

  it('does not restock damaged goods and allocates order discount to the refund', async () => {
    const { service, transactionQueries, paymentClient } = createService({
      status: 'approved',
      inventoryState: 'committed',
      paymentStatus: 'paid',
      paymentMethod: 'vnpay',
      subtotal: 200000,
      discountAmount: 20000,
    });

    await service.receiveReturnRequest(
      '11111111-1111-4111-8111-111111111111',
      '55555555-5555-4555-8555-555555555555',
      {
        items: [
          {
            returnItemId: '66666666-6666-4666-8666-666666666666',
            disposition: 'damaged',
          },
        ],
      },
    );

    expect(
      transactionQueries.some((sql) =>
        sql.includes('SET stock_quantity = stock_quantity'),
      ),
    ).toBe(false);
    expect(paymentClient.startReturnRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 90000 }),
    );
  });

  it('caps later partial returns at the remaining refundable merchandise total', async () => {
    const { service, paymentClient } = createService({
      status: 'approved',
      inventoryState: 'committed',
      paymentStatus: 'paid',
      paymentMethod: 'vnpay',
      subtotal: 3,
      discountAmount: 1,
      grossAmount: 1,
      priorRefundedAmount: 1.34,
    });

    await service.receiveReturnRequest(
      '11111111-1111-4111-8111-111111111111',
      '55555555-5555-4555-8555-555555555555',
      {
        items: [
          {
            returnItemId: '66666666-6666-4666-8666-666666666666',
            disposition: 'damaged',
          },
        ],
      },
    );

    expect(paymentClient.startReturnRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0.66 }),
    );
  });
});
