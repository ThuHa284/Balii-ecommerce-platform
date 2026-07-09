import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@app/common';
import { ProductServiceModule } from './product-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(ProductServiceModule);
  await app.listen(process.env.PRODUCT_SERVICE_PORT ?? 3002);
}
void bootstrap();
