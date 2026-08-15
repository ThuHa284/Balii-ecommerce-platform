import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { loadEnv } from '@app/common';
import { ApiGatewayProxyMiddleware } from './api-gateway.proxy.middleware';
import { GatewayAuthContextMiddleware } from './gateway-auth-context.middleware';
import { GatewayHealthController } from './gateway-health.controller';
import { GatewayHealthService } from './gateway-health.service';
import { GatewayRouteService } from './gateway-route.service';
import { RedisModule } from '@app/redis';
import { GatewayRateLimitMiddleware } from './gateway-rate-limit.middleware';

loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    JwtModule.register({}),
    RedisModule,
  ],
  controllers: [GatewayHealthController],
  providers: [
    ApiGatewayProxyMiddleware,
    GatewayAuthContextMiddleware,
    GatewayRateLimitMiddleware,
    GatewayHealthService,
    GatewayRouteService,
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        GatewayAuthContextMiddleware,
        GatewayRateLimitMiddleware,
        ApiGatewayProxyMiddleware,
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
