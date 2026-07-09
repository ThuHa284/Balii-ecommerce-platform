import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { loadEnv } from '@app/common';
import { OrderServiceModule } from './order-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(process.env.ORDER_SERVICE_PORT ?? 3004);
}
void bootstrap();
