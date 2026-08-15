import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const incoming = request.headers['x-internal-service-key'];
    const supplied = Array.isArray(incoming) ? incoming[0] : incoming;
    const expected =
      process.env.INTERNAL_SERVICE_SECRET ||
      (process.env.NODE_ENV === 'production' ? '' : 'balii-local-internal');

    if (!supplied || !expected) {
      throw new UnauthorizedException(
        'Internal service authentication required',
      );
    }

    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid internal service credential');
    }

    return true;
  }
}
