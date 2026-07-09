import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseModule } from '@app/database';
import { RedisModule } from '@app/redis';

import { MarketAnalysisAdminController } from './market-analysis.admin.controller';
import { MarketAnalysisServiceController } from './market-analysis-service.controller';
import { MarketAnalysisServiceService } from './market-analysis-service.service';

import { MarketProduct } from './entities/market-product.entity';
import { WebsiteCrawlerAdapter } from './adapters/website-crawler.adapter';
import { ShopeePublicCrawlerAdapter } from './adapters/shopee-public-crawler.adapter';
import { TiktokPublicCrawlerAdapter } from './adapters/tiktok-public-crawler.adapter';
import { MarketAgentService } from './agent/market-agent.service';
import { GoogleLensImageSearchAdapter } from './adapters/google-lens-image-search.adapter';
import { SerpApiProductSearchAdapter } from './adapters/serpapi-product-search.adapter';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    DatabaseModule,
    RedisModule,
    TypeOrmModule.forFeature([MarketProduct]),
  ],
  controllers: [MarketAnalysisServiceController, MarketAnalysisAdminController],
  providers: [
    MarketAnalysisServiceService,
    WebsiteCrawlerAdapter,
    ShopeePublicCrawlerAdapter,
    TiktokPublicCrawlerAdapter,
    MarketAgentService,
    GoogleLensImageSearchAdapter,
    SerpApiProductSearchAdapter,
    CloudinaryService,
  ],
})
export class MarketAnalysisServiceModule {}
