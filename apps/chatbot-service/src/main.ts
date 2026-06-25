import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ChatbotServiceModule } from './chatbot-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ChatbotServiceModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.CHATBOT_SERVICE_PORT || 3012);
  await app.listen(port);

  console.log(`Chatbot Service running on http://localhost:${port}`);
}

void bootstrap();
