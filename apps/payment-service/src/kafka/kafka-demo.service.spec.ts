import { KafkaDemoService } from './kafka-demo.service';

describe('KafkaDemoService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      KAFKA_BROKERS: '',
      KAFKA_DEMO_SYNC_DELAY_MS: '1',
      KAFKA_DEMO_CONSUMER_DELAY_MS: '1',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('keeps the synchronous demo available when Kafka is offline', async () => {
    const service = new KafkaDemoService();

    await service.onModuleInit();
    const result = await service.runSync({
      recipient: 'demo@balii.vn',
      message: 'Đơn hàng đã được xác nhận.',
    });

    expect(result).toMatchObject({
      mode: 'sync',
      usesKafka: false,
      deliveredInline: true,
      recipient: 'demo@balii.vn',
    });
    expect(result.callerBlockedMs).toBeGreaterThanOrEqual(0);
    expect(service.getStatus()).toMatchObject({
      connected: false,
      topic: 'demo.notification',
      processedLog: [],
    });
  });

  it('reports a clear degraded result for the async demo without a broker', async () => {
    const service = new KafkaDemoService();

    const result = await service.runAsync({
      recipient: 'demo@balii.vn',
      message: 'Đơn hàng đã được xác nhận.',
    });

    expect(result).toMatchObject({
      mode: 'async',
      usesKafka: true,
      published: false,
    });
    expect(result.note).toContain('Kafka is not connected');
  });
});
