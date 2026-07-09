import { NestFactory } from '@nestjs/core';
import { loadEnv } from '@app/common';
import { UserServiceModule } from './user-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);
  await app.listen(process.env.USER_SERVICE_PORT ?? 3001);
}

void bootstrap();
