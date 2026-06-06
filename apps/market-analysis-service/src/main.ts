import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MarketAnalysisServiceModule } from './market-analysis-service.module';

async function bootstrap() {
  const app = await NestFactory.create(MarketAnalysisServiceModule);
  await app.listen(process.env.MARKET_ANALYSIS_SERVICE_PORT ?? 3011);
}
bootstrap();
