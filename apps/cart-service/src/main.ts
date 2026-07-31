import { NestFactory } from '@nestjs/core';
import { CartServiceModule } from './cart-service.module';
import { ValidationPipe } from '@nestjs/common';
import {
  getInternalCorsOrigins,
  loadEnv,
  trustedServiceMiddleware,
} from '@app/common';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(CartServiceModule);
  app.use(trustedServiceMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: getInternalCorsOrigins(), credentials: true });

  await app.listen(process.env.CART_SERVICE_PORT ?? 3005);
  console.log(
    'Cart Service running on http://localhost:' +
      (process.env.CART_SERVICE_PORT ?? 3005),
  );
}

void bootstrap();
