import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ROUTE_TARGETS, RouteTarget } from './gateway.constants';

@Injectable()
export class GatewayRouteService {
  constructor(private readonly configService: ConfigService) {}

  getRoutes(): RouteTarget[] {
    return ROUTE_TARGETS;
  }

  resolveTarget(path: string): string | null {
    const match = ROUTE_TARGETS.find(
      ({ prefix }) => path === prefix || path.startsWith(`${prefix}/`),
    );

    if (!match) {
      return null;
    }

    const explicitUrl = this.configService.get<string>(match.targetEnv);
    if (explicitUrl) {
      return explicitUrl.replace(/\/$/, '');
    }

    const fallbackUrl = this.buildFallbackUrl(match.targetEnv);
    if (fallbackUrl) {
      return fallbackUrl;
    }

    throw new ServiceUnavailableException(
      `Missing upstream configuration for ${match.targetEnv}`,
    );
  }

  describeRoutes() {
    return ROUTE_TARGETS.map(({ prefix, targetEnv }) => ({
      prefix,
      targetEnv,
      targetUrl:
        this.configService.get<string>(targetEnv) ??
        this.buildFallbackUrl(targetEnv) ??
        null,
    }));
  }

  private buildFallbackUrl(targetEnv: string): string | null {
    const envToPortKey: Record<string, string> = {
      USER_SERVICE_URL: 'USER_SERVICE_PORT',
      PRODUCT_SERVICE_URL: 'PRODUCT_SERVICE_PORT',
      CART_SERVICE_URL: 'CART_SERVICE_PORT',
      ORDER_SERVICE_URL: 'ORDER_SERVICE_PORT',
      PAYMENT_SERVICE_URL: 'PAYMENT_SERVICE_PORT',
      VOUCHER_SERVICE_URL: 'VOUCHER_SERVICE_PORT',
      TRYON_SERVICE_URL: 'TRYON_SERVICE_PORT',
      CHATBOT_SERVICE_URL: 'CHATBOT_SERVICE_PORT',
      MARKET_ANALYSIS_SERVICE_URL: 'MARKET_ANALYSIS_SERVICE_PORT',
    };
    const defaultPorts: Record<string, string> = {
      USER_SERVICE_PORT: '3001',
      PRODUCT_SERVICE_PORT: '3002',
      CART_SERVICE_PORT: '3003',
      ORDER_SERVICE_PORT: '3004',
      PAYMENT_SERVICE_PORT: '3005',
      VOUCHER_SERVICE_PORT: '3007',
      TRYON_SERVICE_PORT: '3010',
      CHATBOT_SERVICE_PORT: '3012',
      MARKET_ANALYSIS_SERVICE_PORT: '3011',
    };

    const portKey = envToPortKey[targetEnv];
    const port = portKey
      ? this.configService.get<string>(portKey) || defaultPorts[portKey]
      : null;

    return port ? `http://localhost:${port}` : null;
  }
}
