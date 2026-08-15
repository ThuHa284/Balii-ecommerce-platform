import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { loadEnv, trustedServiceMiddleware } from '@app/common';
import { ProductServiceModule } from './product-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(ProductServiceModule);
  app.use(trustedServiceMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PRODUCT_SERVICE_PORT ?? 3002);
}
void bootstrap();
