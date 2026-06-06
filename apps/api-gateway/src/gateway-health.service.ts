import { Injectable } from '@nestjs/common';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { URL } from 'url';
import { GATEWAY_TIMEOUT_MS } from './gateway.constants';
import { GatewayRouteService } from './gateway-route.service';

@Injectable()
export class GatewayHealthService {
  constructor(private readonly gatewayRouteService: GatewayRouteService) {}

  getLiveness() {
    return {
      service: 'api-gateway',
      status: 'ok',
      routes: this.gatewayRouteService.describeRoutes(),
    };
  }

  async getReadiness() {
    const routes = this.gatewayRouteService.describeRoutes();
    const upstreams = await Promise.all(
      routes.map(async ({ prefix, targetEnv, targetUrl }) => ({
        prefix,
        targetEnv,
        targetUrl,
        ...(targetUrl
          ? await this.pingUpstream(targetUrl)
          : { reachable: false, statusCode: null }),
      })),
    );

    const status = upstreams.every((item) => item.reachable) ? 'ok' : 'degraded';

    return {
      service: 'api-gateway',
      status,
      upstreams,
    };
  }

  private pingUpstream(
    rawUrl: string,
  ): Promise<{ reachable: boolean; statusCode: number | null }> {
    return new Promise((resolve) => {
      const url = new URL(rawUrl);
      const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;

      const req = transport(
        url,
        { method: 'GET', timeout: GATEWAY_TIMEOUT_MS },
        (res) => {
          resolve({
            reachable: (res.statusCode ?? 0) < 500,
            statusCode: res.statusCode ?? null,
          });
          res.resume();
        },
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({ reachable: false, statusCode: null });
      });

      req.on('error', () => {
        resolve({ reachable: false, statusCode: null });
      });

      req.end();
    });
  }
}
