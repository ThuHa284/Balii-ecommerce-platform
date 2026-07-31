import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { getSecuritySecret } from '@app/common';
import { RedisService } from '@app/redis';

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  sessionIssuedAt?: number;
};

@Injectable()
export class GatewayAuthContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GatewayAuthContextMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async use(req: Request, _res: Response, next: () => void) {
    // Identity headers are gateway-owned. Never trust values supplied by a
    // browser or another public client.
    delete req.headers['x-user-id'];
    delete req.headers['x-user-email'];
    delete req.headers['x-user-role'];
    delete req.headers['x-internal-service-key'];
    delete req.headers['x-gateway-service-key'];

    const authorization = req.headers.authorization;
    if (!authorization) {
      next();
      return;
    }

    if (!authorization.startsWith('Bearer ')) {
      _res.status(401).json({ message: 'Invalid authorization header' });
      return;
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      _res.status(401).json({ message: 'Missing access token' });
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret:
          this.configService.get<string>('JWT_SECRET') ||
          getSecuritySecret('JWT_SECRET', 'secret'),
      });

      try {
        const [blacklisted, validAfterValue] = await Promise.all([
          this.redis.get(`blacklist:${token}`),
          payload.sub
            ? this.redis.get(`tokens_valid_after:${payload.sub}`)
            : Promise.resolve(null),
        ]);
        const validAfter = Number(validAfterValue || 0);
        const issuedAt = Number(payload.sessionIssuedAt || 0);
        if (blacklisted === '1' || (validAfter > 0 && issuedAt <= validAfter)) {
          _res.status(401).json({ message: 'Access token has been revoked' });
          return;
        }
      } catch (error) {
        const failClosed =
          process.env.SECURITY_REDIS_FAILURE_MODE === 'closed' ||
          ((process.env.APP_ENV || process.env.NODE_ENV) === 'production' &&
            process.env.SECURITY_REDIS_FAILURE_MODE !== 'open');
        this.logger.warn(
          `Unable to check token blacklist; JWT validation used: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
        if (failClosed) {
          _res.status(503).json({
            message: 'Dịch vụ xác thực đang tạm thời không khả dụng.',
          });
          return;
        }
      }

      if (payload.sub) {
        req.headers['x-user-id'] = payload.sub;
      }

      if (payload.email) {
        req.headers['x-user-email'] = payload.email;
      }

      if (payload.role) {
        req.headers['x-user-role'] = payload.role;
      }
    } catch {
      _res.status(401).json({ message: 'Invalid or expired access token' });
      return;
    }

    next();
  }
}
