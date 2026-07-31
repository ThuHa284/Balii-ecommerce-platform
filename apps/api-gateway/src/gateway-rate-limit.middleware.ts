import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { Request, Response } from 'express';

type RateRule = { name: string; limit: number; windowSeconds: number };

@Injectable()
export class GatewayRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GatewayRateLimitMiddleware.name);

  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: () => void) {
    const rule = this.getRule(req);
    if (!rule) {
      next();
      return;
    }

    const identity = String(req.headers['x-user-id'] || req.ip || 'unknown');
    const key = `gateway:rate:${rule.name}:${identity}`;
    try {
      const result = await this.redis.consumeRateLimit(
        key,
        rule.limit,
        rule.windowSeconds,
      );
      res.setHeader('X-RateLimit-Limit', rule.limit);
      res.setHeader(
        'X-RateLimit-Remaining',
        Math.max(rule.limit - result.current, 0),
      );
      if (!result.allowed) {
        res.setHeader('Retry-After', result.ttl);
        res.status(429).json({
          message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
          retryAfterSeconds: result.ttl,
        });
        return;
      }
    } catch (error) {
      const failClosed =
        process.env.SECURITY_REDIS_FAILURE_MODE === 'closed' ||
        ((process.env.APP_ENV || process.env.NODE_ENV) === 'production' &&
          process.env.SECURITY_REDIS_FAILURE_MODE !== 'open');
      this.logger.warn(
        `Redis rate limit unavailable; request ${failClosed ? 'blocked' : 'allowed'}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      if (failClosed) {
        res.status(503).json({
          message: 'Dịch vụ bảo vệ đang tạm thời không khả dụng.',
        });
        return;
      }
    }

    next();
  }

  private getRule(req: Request): RateRule | null {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();
    if (method === 'POST' && path === '/auth/login') {
      return { name: 'login', limit: 5, windowSeconds: 15 * 60 };
    }
    if (
      method === 'POST' &&
      ['/auth/forgot-password', '/auth/resend-verification'].includes(path)
    ) {
      return { name: 'auth-email', limit: 3, windowSeconds: 15 * 60 };
    }
    if (method === 'POST' && path === '/auth/register') {
      return { name: 'register', limit: 5, windowSeconds: 60 * 60 };
    }
    if (method === 'POST' && path === '/auth/reset-password') {
      return { name: 'reset-password', limit: 5, windowSeconds: 15 * 60 };
    }
    if (method === 'POST' && path === '/auth/refresh') {
      return { name: 'refresh', limit: 30, windowSeconds: 60 };
    }
    if (method === 'POST' && path.startsWith('/try-on')) {
      return { name: 'try-on', limit: 10, windowSeconds: 60 * 60 };
    }
    if (
      method === 'POST' &&
      (path.startsWith('/chatbot/chat') ||
        path.startsWith('/chatbot/recommendations'))
    ) {
      return { name: 'chatbot', limit: 30, windowSeconds: 60 };
    }
    if (method === 'POST' && path === '/payments') {
      return { name: 'payments', limit: 10, windowSeconds: 60 };
    }
    if (
      ['POST', 'PATCH', 'DELETE'].includes(method) &&
      path.startsWith('/cart')
    ) {
      return { name: 'cart-mutation', limit: 120, windowSeconds: 60 };
    }
    return null;
  }
}
