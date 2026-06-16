import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { VoucherServiceModule } from './voucher-service.module';

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

bootstrap();
