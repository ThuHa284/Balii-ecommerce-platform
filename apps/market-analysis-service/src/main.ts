import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  getInternalCorsOrigins,
  loadEnv,
  trustedServiceMiddleware,
} from '@app/common';
import { MarketAnalysisServiceModule } from './market-analysis-service.module';

loadEnv();

async function bootstrap() {
  const app = await NestFactory.create(MarketAnalysisServiceModule);
  app.use(trustedServiceMiddleware);
  app.enableCors({ origin: getInternalCorsOrigins(), credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(process.env.MARKET_ANALYSIS_SERVICE_PORT ?? 3011);
}
void bootstrap();
