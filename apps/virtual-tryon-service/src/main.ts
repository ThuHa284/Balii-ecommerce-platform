import { NestFactory } from '@nestjs/core';
import { VirtualTryonServiceModule } from './virtual-tryon-service.module';

async function bootstrap() {
  const app = await NestFactory.create(VirtualTryonServiceModule);

  app.enableCors();

  const port = process.env.TRYON_SERVICE_PORT || 3010;
  await app.listen(port);

  console.log(`Virtual Try-on Service running on http://localhost:${port}`);
}

bootstrap();
