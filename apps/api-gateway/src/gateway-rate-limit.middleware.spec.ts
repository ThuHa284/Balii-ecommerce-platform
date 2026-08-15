/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { RedisService } from '@app/redis';
import { Request, Response } from 'express';
import { GatewayRateLimitMiddleware } from './gateway-rate-limit.middleware';

describe('GatewayRateLimitMiddleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFailureMode = process.env.SECURITY_REDIS_FAILURE_MODE;
  const consumeRateLimit = jest.fn();
  const middleware = new GatewayRateLimitMiddleware({
    consumeRateLimit,
  } as unknown as RedisService);

  beforeEach(() => {
    consumeRateLimit.mockReset();
    delete process.env.SECURITY_REDIS_FAILURE_MODE;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFailureMode === undefined)
      delete process.env.SECURITY_REDIS_FAILURE_MODE;
    else process.env.SECURITY_REDIS_FAILURE_MODE = originalFailureMode;
  });

  it('blocks login attempts above the configured limit', async () => {
    consumeRateLimit.mockResolvedValue({
      current: 6,
      ttl: 120,
      allowed: false,
    });
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const setHeader = jest.fn();
    const next = jest.fn();

    await middleware.use(
      {
        path: '/auth/login',
        method: 'POST',
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request,
      { status, setHeader } as unknown as Response,
      next,
    );

    expect(consumeRateLimit).toHaveBeenCalledWith(
      'gateway:rate:login:127.0.0.1',
      5,
      900,
    );
    expect(status).toHaveBeenCalledWith(429);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', 120);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not rate limit unrelated read endpoints', async () => {
    const next = jest.fn();
    await middleware.use(
      {
        path: '/products',
        method: 'GET',
        headers: {},
      } as unknown as Request,
      {} as Response,
      next,
    );
    expect(consumeRateLimit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('fails closed on protected routes when Redis is unavailable in production', async () => {
    process.env.NODE_ENV = 'production';
    consumeRateLimit.mockRejectedValue(new Error('redis unavailable'));
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();

    await middleware.use(
      {
        path: '/auth/login',
        method: 'POST',
        ip: '127.0.0.1',
        headers: {},
      } as unknown as Request,
      { status, setHeader: jest.fn() } as unknown as Response,
      next,
    );

    expect(status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });
});
