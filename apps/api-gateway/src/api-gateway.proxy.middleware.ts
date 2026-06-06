import {
  Injectable,
  Logger,
  NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import { GATEWAY_TIMEOUT_MS } from './gateway.constants';
import { GatewayRouteService } from './gateway-route.service';

@Injectable()
export class ApiGatewayProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiGatewayProxyMiddleware.name);
  private static readonly blockedResponseHeaders = new Set([
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-headers',
    'access-control-allow-methods',
    'access-control-expose-headers',
    'access-control-max-age',
    'access-control-request-headers',
    'access-control-request-method',
    'vary',
  ]);

  constructor(private readonly gatewayRouteService: GatewayRouteService) {}

  use(req: Request, res: Response, next: () => void) {
    if (req.path.startsWith('/health')) {
      next();
      return;
    }

    const target = this.gatewayRouteService.resolveTarget(req.path);
    if (!target) {
      next();
      return;
    }

    const targetUrl = new URL(`${target}${req.originalUrl}`);
    const transport = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
    const shouldStream = this.shouldStreamRequest(req);
    const payload = shouldStream ? null : this.serializeBody(req);

    const proxyReq = transport(
      targetUrl,
      {
        method: req.method,
        headers: this.buildHeaders(req, targetUrl, payload),
        timeout: GATEWAY_TIMEOUT_MS,
      },
      (proxyRes) => {
        res.status(proxyRes.statusCode ?? 502);

        Object.entries(proxyRes.headers).forEach(([key, value]) => {
          if (ApiGatewayProxyMiddleware.blockedResponseHeaders.has(key.toLowerCase())) {
            return;
          }

          if (value !== undefined) {
            res.setHeader(key, value);
          }
        });

        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (error: Error) => {
      this.logger.error(`Proxy ${req.method} ${req.originalUrl} failed`, error.stack);

      if (!res.headersSent) {
        const status = new ServiceUnavailableException({
          message: 'Upstream service is unavailable',
          path: req.originalUrl,
        });
        res.status(status.getStatus()).json(status.getResponse());
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();

      if (!res.headersSent) {
        res.status(504).json({
          message: 'Upstream service timeout',
          path: req.originalUrl,
        });
      }
    });

    if (shouldStream) {
      req.pipe(proxyReq);
      return;
    }

    if (payload) {
      proxyReq.write(payload);
    }

    proxyReq.end();
  }

  private buildHeaders(
    req: Request,
    targetUrl: URL,
    payload: string | null,
  ): Record<string, string> {
    const headers = Object.entries(req.headers).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value === undefined) {
          return acc;
        }

        if (Array.isArray(value)) {
          acc[key] = value.join(', ');
          return acc;
        }

        if (
          [
            'host',
            'connection',
            'content-length',
            'transfer-encoding',
          ].includes(key)
        ) {
          return acc;
        }

        acc[key] = value;
        return acc;
      },
      {},
    );

    headers.host = targetUrl.host;
    headers['x-forwarded-host'] = req.headers.host ?? '';
    headers['x-forwarded-proto'] = req.protocol;
    headers['x-forwarded-for'] = req.ip ?? '';
    headers['x-request-id'] = this.getRequestId(req);
    if (payload != null) {
      headers['content-length'] = Buffer.byteLength(payload).toString();
    }

    return headers;
  }

  private shouldStreamRequest(req: Request): boolean {
    const contentType = req.headers['content-type'] ?? '';

    if (
      typeof contentType === 'string' &&
      contentType.includes('multipart/form-data')
    ) {
      return true;
    }

    return (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      req.body == null
    );
  }

  private serializeBody(req: Request): string | null {
    if (req.body == null) {
      return null;
    }

    if (typeof req.body === 'string') {
      return req.body;
    }

    const contentType = req.headers['content-type'] ?? '';

    if (
      typeof contentType === 'string' &&
      contentType.includes('application/x-www-form-urlencoded')
    ) {
      return new URLSearchParams(req.body as Record<string, string>).toString();
    }

    return JSON.stringify(req.body);
  }

  private getRequestId(req: Request): string {
    const requestId = req.headers['x-request-id'];

    if (Array.isArray(requestId)) {
      return requestId[0] ?? crypto.randomUUID();
    }

    return requestId ?? crypto.randomUUID();
  }
}
