/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { GatewayAuthContextMiddleware } from './gateway-auth-context.middleware';
import { RedisService } from '@app/redis';

describe('GatewayAuthContextMiddleware', () => {
  const verify = jest.fn();
  const redisGet = jest.fn().mockResolvedValue(null);
  const middleware = new GatewayAuthContextMiddleware(
    { verify } as unknown as JwtService,
    {
      get: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService,
    { get: redisGet } as unknown as RedisService,
  );

  beforeEach(() => {
    verify.mockReset();
    redisGet.mockReset();
    redisGet.mockResolvedValue(null);
  });

  function createResponse() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { response: { status } as unknown as Response, status, json };
  }

  it('removes client-supplied identity headers for anonymous requests', async () => {
    const request = {
      headers: {
        'x-user-id': 'forged-user',
        'x-user-role': 'SUPER_ADMIN',
        'x-internal-service-key': 'forged-key',
        'x-gateway-service-key': 'forged-gateway-key',
      },
    } as unknown as Request;
    const next = jest.fn();

    await middleware.use(request, createResponse().response, next);

    expect(request.headers['x-user-id']).toBeUndefined();
    expect(request.headers['x-user-role']).toBeUndefined();
    expect(request.headers['x-internal-service-key']).toBeUndefined();
    expect(request.headers['x-gateway-service-key']).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('replaces forged headers with verified JWT claims', async () => {
    verify.mockReturnValue({
      sub: 'verified-user',
      email: 'verified@example.com',
      role: 'CUSTOMER',
    });
    const request = {
      headers: {
        authorization: 'Bearer valid-token',
        'x-user-id': 'forged-user',
        'x-user-role': 'SUPER_ADMIN',
      },
    } as unknown as Request;
    const next = jest.fn();

    await middleware.use(request, createResponse().response, next);

    expect(request.headers['x-user-id']).toBe('verified-user');
    expect(request.headers['x-user-role']).toBe('CUSTOMER');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed authorization headers', async () => {
    const request = {
      headers: { authorization: 'Basic credentials' },
    } as unknown as Request;
    const next = jest.fn();
    const { response, status, json } = createResponse();

    await middleware.use(request, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      message: 'Invalid authorization header',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired JWTs', async () => {
    verify.mockImplementation(() => {
      throw new Error('expired');
    });
    const request = {
      headers: { authorization: 'Bearer expired-token' },
    } as unknown as Request;
    const next = jest.fn();
    const { response, status, json } = createResponse();

    await middleware.use(request, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      message: 'Invalid or expired access token',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an access token that was blacklisted on logout', async () => {
    verify.mockReturnValue({ sub: 'verified-user', role: 'CUSTOMER' });
    redisGet.mockResolvedValue('1');
    const request = {
      headers: { authorization: 'Bearer revoked-token' },
    } as unknown as Request;
    const next = jest.fn();
    const { response, status, json } = createResponse();

    await middleware.use(request, response, next);

    expect(redisGet).toHaveBeenCalledWith('blacklist:revoked-token');
    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      message: 'Access token has been revoked',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects tokens issued before the latest password change', async () => {
    verify.mockReturnValue({
      sub: 'verified-user',
      role: 'CUSTOMER',
      sessionIssuedAt: 1000,
    });
    redisGet.mockResolvedValueOnce(null).mockResolvedValueOnce('2000');
    const request = {
      headers: { authorization: 'Bearer old-token' },
    } as unknown as Request;
    const next = jest.fn();
    const { response, status } = createResponse();

    await middleware.use(request, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
