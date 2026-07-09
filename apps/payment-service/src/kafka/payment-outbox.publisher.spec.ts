import { PaymentOutboxPublisher } from './payment-outbox.publisher';

type QueryManager = {
  query: jest.Mock;
};

type MockDataSource = {
  transaction: jest.Mock;
  query: jest.Mock;
};

describe('PaymentOutboxPublisher', () => {
  const originalEnv = {
    KAFKA_TOPIC_PREFIX: process.env.KAFKA_TOPIC_PREFIX,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.KAFKA_TOPIC_PREFIX = 'e2e';
  });

  afterAll(() => {
    process.env.KAFKA_TOPIC_PREFIX = originalEnv.KAFKA_TOPIC_PREFIX;
  });

  function createPublisherWithMocks() {
    const manager: QueryManager = {
      query: jest.fn(),
    };

    const dataSource: MockDataSource = {
      transaction: jest.fn(
        async (callback: (manager: QueryManager) => unknown) =>
          callback(manager),
      ),
      query: jest.fn(),
    };

    const publisher = new PaymentOutboxPublisher(dataSource as any);

    return {
      publisher,
      manager,
      dataSource,
    };
  }

  it('publishes a claimed outbox event and marks it as published', async () => {
    const { publisher, manager, dataSource } = createPublisherWithMocks();
    const send = jest.fn().mockResolvedValue(undefined);

    (publisher as any).producer = {
      send,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    manager.query.mockResolvedValue([
      [
        {
          id: 'outbox-1',
          eventId: 'event-1',
          aggregateType: 'payment',
          aggregateId: 'payment-1',
          type: 'payment.success',
          payload: {
            orderId: 'order-1',
          },
          retryCount: 0,
        },
      ],
    ]);
    dataSource.query.mockResolvedValue(undefined);

    const result = await publisher.publishPendingEvents();

    expect(result).toEqual({
      published: 1,
      claimed: 1,
      skipped: false,
      attemptedIds: ['outbox-1'],
      failed: [],
    });
    expect(send).toHaveBeenCalledWith({
      topic: 'e2e.payment.success',
      messages: [
        {
          key: 'payment-1',
          value: expect.any(String),
          headers: {
            aggregateId: 'payment-1',
            aggregateType: 'payment',
            eventId: 'event-1',
            eventType: 'payment.success',
          },
        },
      ],
    });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'PUBLISHED'"),
      ['outbox-1'],
    );
  });

  it('marks an event for retry when Kafka publish fails', async () => {
    const { publisher, manager, dataSource } = createPublisherWithMocks();
    const send = jest.fn().mockRejectedValue(new Error('Kafka send failed'));

    (publisher as any).producer = {
      send,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    manager.query.mockResolvedValue([
      [
        {
          id: 'outbox-2',
          eventId: 'event-2',
          aggregateType: 'payment',
          aggregateId: 'payment-2',
          type: 'payment.failed',
          payload: {
            orderId: 'order-2',
          },
          retryCount: 0,
        },
      ],
    ]);
    dataSource.query.mockResolvedValue(undefined);

    const result = await publisher.publishPendingEvents();

    expect(result).toEqual({
      published: 0,
      claimed: 1,
      skipped: false,
      attemptedIds: ['outbox-2'],
      failed: [
        {
          eventId: 'outbox-2',
          error: 'Kafka send failed',
        },
      ],
    });
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('SET status = $1'),
      ['PENDING', 30000, 'Kafka send failed', 'outbox-2'],
    );
  });

  it('returns kafka_unavailable when producer has not been initialized', async () => {
    const { publisher } = createPublisherWithMocks();

    const result = await publisher.publishPendingEvents();

    expect(result).toEqual({
      published: 0,
      claimed: 0,
      skipped: true,
      reason: 'kafka_unavailable',
    });
  });

  it('supports flat query results from TypeORM manager.query', async () => {
    const { publisher, manager, dataSource } = createPublisherWithMocks();
    const send = jest.fn().mockResolvedValue(undefined);

    (publisher as any).producer = {
      send,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    manager.query.mockResolvedValue([
      {
        id: 'outbox-3',
        eventId: 'event-3',
        aggregateType: 'refund',
        aggregateId: 'refund-1',
        type: 'payment.refund.completed',
        payload: {
          refundId: 'refund-1',
        },
        retryCount: 1,
      },
    ]);
    dataSource.query.mockResolvedValue(undefined);

    const result = await publisher.publishPendingEvents();

    expect(result.published).toBe(1);
    expect(result.attemptedIds).toEqual(['outbox-3']);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'e2e.payment.refund.completed',
      }),
    );
  });
});
