import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  getInternalCorsOrigins,
  loadEnv,
  trustedServiceMiddleware,
} from '@app/common';
import { OrderServiceModule } from './order-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);
  app.use(trustedServiceMiddleware);
  app.enableCors({ origin: getInternalCorsOrigins(), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.ORDER_SERVICE_PORT ?? 3004);
}
void bootstrap();
