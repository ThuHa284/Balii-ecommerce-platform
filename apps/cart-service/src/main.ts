import { NestFactory } from '@nestjs/core';
import { CartServiceModule } from './cart-service.module';
import { ValidationPipe } from '@nestjs/common';
import { loadEnv } from '@app/common';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(CartServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors();

  await app.listen(process.env.CART_SERVICE_PORT ?? 3005);
  console.log(
    'Cart Service running on http://localhost:' +
      (process.env.CART_SERVICE_PORT ?? 3005),
  );
}

void bootstrap();
