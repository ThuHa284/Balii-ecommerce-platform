import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

function safeEqual(supplied: string | undefined, expected: string): boolean {
  if (!supplied || !expected) return false;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

function developmentCredential(): string {
  return process.env.NODE_ENV === 'production' ? '' : 'balii-local-internal';
}

/**
 * Downstream services trust identity headers only when the request came from
 * the API gateway or another authenticated service. This closes the direct
 * service-port header spoofing path.
 */
export function trustedServiceMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const gatewayCredential =
    process.env.GATEWAY_SERVICE_SECRET ||
    process.env.INTERNAL_SERVICE_SECRET ||
    developmentCredential();
  const internalCredential =
    process.env.INTERNAL_SERVICE_SECRET || developmentCredential();
  const gatewayHeader = request.headers['x-gateway-service-key'];
  const internalHeader = request.headers['x-internal-service-key'];
  const suppliedGateway = Array.isArray(gatewayHeader)
    ? gatewayHeader[0]
    : gatewayHeader;
  const suppliedInternal = Array.isArray(internalHeader)
    ? internalHeader[0]
    : internalHeader;

  if (
    safeEqual(suppliedGateway, gatewayCredential) ||
    safeEqual(suppliedInternal, internalCredential)
  ) {
    next();
    return;
  }

  response.status(401).json({
    message: 'Request must pass through the API gateway',
  });
}
