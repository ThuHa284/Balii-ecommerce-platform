/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NextFunction, Request, Response } from 'express';
import { trustedServiceMiddleware } from '@app/common';

describe('trustedServiceMiddleware', () => {
  const originalInternalSecret = process.env.INTERNAL_SERVICE_SECRET;
  const originalGatewaySecret = process.env.GATEWAY_SERVICE_SECRET;

  beforeEach(() => {
    process.env.INTERNAL_SERVICE_SECRET = 'internal-test-secret';
    process.env.GATEWAY_SERVICE_SECRET = 'gateway-test-secret';
  });

  afterAll(() => {
    process.env.INTERNAL_SERVICE_SECRET = originalInternalSecret;
    process.env.GATEWAY_SERVICE_SECRET = originalGatewaySecret;
  });

  function responseMock() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { response: { status } as unknown as Response, status, json };
  }

  it('accepts a request signed by the gateway', () => {
    const request = {
      headers: { 'x-gateway-service-key': 'gateway-test-secret' },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;

    trustedServiceMiddleware(request, responseMock().response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('accepts an authenticated service-to-service request', () => {
    const request = {
      headers: { 'x-internal-service-key': 'internal-test-secret' },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;

    trustedServiceMiddleware(request, responseMock().response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects direct requests with forged identity headers', () => {
    const request = {
      headers: {
        'x-user-id': 'victim',
        'x-user-role': 'SUPER_ADMIN',
      },
    } as unknown as Request;
    const next = jest.fn() as NextFunction;
    const { response, status, json } = responseMock();

    trustedServiceMiddleware(request, response, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({
      message: 'Request must pass through the API gateway',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
