import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { loadEnv, trustedServiceMiddleware } from '@app/common';
import { UserServiceModule } from './user-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(UserServiceModule);
  app.use(trustedServiceMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.USER_SERVICE_PORT ?? 3001);
}

void bootstrap();
