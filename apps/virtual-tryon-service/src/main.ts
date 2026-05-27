import { NestFactory } from '@nestjs/core';
import { VirtualTryonServiceModule } from './virtual-tryon-service.module';

async function bootstrap() {
  const app = await NestFactory.create(VirtualTryonServiceModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
