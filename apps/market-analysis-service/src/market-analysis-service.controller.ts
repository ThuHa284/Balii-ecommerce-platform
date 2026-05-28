import { Body, Controller, Get, Post } from '@nestjs/common';
import { MarketAnalysisServiceService } from './market-analysis-service.service';
import { Query } from '@nestjs/common';

@Controller('market-analysis')
export class MarketAnalysisServiceController {
  getHello(): any {
    throw new Error('Method not implemented.');
  }
  constructor(
    private readonly marketAnalysisService: MarketAnalysisServiceService,
  ) {}

  @Post('mock')
  createMockProduct() {
    return this.marketAnalysisService.createMockProduct();
  }

  @Get('products')
  findAll() {
    return this.marketAnalysisService.findAll();
  }

  @Post('crawl-online')
  crawlOnline(@Body() body: { keyword: string }) {
    return this.marketAnalysisService.crawlOnlineMarket(body.keyword);
  }

  @Post('crawl-shopee')
  crawlShopee(@Body() body: { keyword: string }) {
    return this.marketAnalysisService.crawlShopeePublic(body.keyword);
  }

  @Post('crawl-tiktok')
  crawlTiktok(@Body() body: { keyword: string }) {
    return this.marketAnalysisService.crawlTiktokPublic(body.keyword);
  }

  @Post('analyze')
  analyze(@Body() body: { keyword: string }) {
    return this.marketAnalysisService.analyzeByKeyword(body.keyword);
  }

  @Post('agent')
  async runAgent(@Body() body: { command: string }) {
    return this.marketAnalysisService.runAgentCommand(body.command);
  }

  @Get('products')
  getProducts(
    @Query('keyword') keyword?: string,
    @Query('platform') platform?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    return this.marketAnalysisService.getProducts({
      keyword,
      platform,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  }
}
