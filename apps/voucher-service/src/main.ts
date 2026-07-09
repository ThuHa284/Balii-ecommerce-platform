import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@app/common';
import { VoucherServiceModule } from './voucher-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(VoucherServiceModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.VOUCHER_SERVICE_PORT ?? 3008);
}

void bootstrap();
