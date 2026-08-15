import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  getInternalCorsOrigins,
  loadEnv,
  trustedServiceMiddleware,
} from '@app/common';
import { VirtualTryonServiceModule } from './virtual-tryon-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(VirtualTryonServiceModule);
  app.use(trustedServiceMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: getInternalCorsOrigins(), credentials: true });

  const port = process.env.TRYON_SERVICE_PORT || 3010;
  await app.listen(port);

  console.log(`Virtual Try-on Service running on http://localhost:${port}`);
}

void bootstrap();
