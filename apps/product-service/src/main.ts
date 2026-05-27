import { NestFactory } from '@nestjs/core';
import { ProductServiceModule } from './product-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ProductServiceModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
