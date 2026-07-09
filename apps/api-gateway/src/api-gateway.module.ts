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

loadEnv();

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    JwtModule.register({}),
  ],
  controllers: [GatewayHealthController],
  providers: [
    ApiGatewayProxyMiddleware,
    GatewayAuthContextMiddleware,
    GatewayHealthService,
    GatewayRouteService,
  ],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(GatewayAuthContextMiddleware, ApiGatewayProxyMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
