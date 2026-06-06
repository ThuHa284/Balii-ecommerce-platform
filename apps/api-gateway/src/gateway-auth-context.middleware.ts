import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

@Injectable()
export class GatewayAuthContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: () => void) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authorization.slice(7).trim();
    if (!token) {
      next();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET') ?? 'secret',
      });

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
      // Keep invalid token handling in downstream auth service/guards.
    }

    next();
  }
}
