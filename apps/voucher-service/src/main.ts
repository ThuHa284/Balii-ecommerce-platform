import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  getInternalCorsOrigins,
  loadEnv,
  trustedServiceMiddleware,
} from '@app/common';
import { VoucherServiceModule } from './voucher-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(VoucherServiceModule);
  app.use(trustedServiceMiddleware);

  app.enableCors({ origin: getInternalCorsOrigins(), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.VOUCHER_SERVICE_PORT ?? 3008);
}

void bootstrap();
