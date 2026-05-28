import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '@app/database';

import { MarketAnalysisServiceController } from './market-analysis-service.controller';
import { MarketAnalysisServiceService } from './market-analysis-service.service';

import { MarketProduct } from './entities/market-product.entity';
import { WebsiteCrawlerAdapter } from './adapters/website-crawler.adapter';
import { ShopeePublicCrawlerAdapter } from './adapters/shopee-public-crawler.adapter';
import { TiktokPublicCrawlerAdapter } from './adapters/tiktok-public-crawler.adapter';
import { MarketAgentService } from './agent/market-agent.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([MarketProduct])],
  controllers: [MarketAnalysisServiceController],
  providers: [
    MarketAnalysisServiceService,
    WebsiteCrawlerAdapter,
    ShopeePublicCrawlerAdapter,
    TiktokPublicCrawlerAdapter,
    MarketAgentService,
  ],
})
export class MarketAnalysisServiceModule {}
