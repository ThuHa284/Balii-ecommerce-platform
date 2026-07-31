import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  getInternalCorsOrigins,
  loadEnv,
  trustedServiceMiddleware,
} from '@app/common';
import { PaymentServiceModule } from './payment-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(PaymentServiceModule);
  app.use(trustedServiceMiddleware);
  app.enableCors({ origin: getInternalCorsOrigins(), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PAYMENT_SERVICE_PORT ?? 3005);
}
void bootstrap();
