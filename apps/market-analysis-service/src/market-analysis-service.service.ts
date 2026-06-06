/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
type CrawledProduct = {
  platform: string;
  source: string;
  keyword: string;
  name: string;
  price: number;
  imageUrl?: string;
  productUrl?: string;
};
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketProduct } from './entities/market-product.entity';
import { WebsiteCrawlerAdapter } from './adapters/website-crawler.adapter';
import { ShopeePublicCrawlerAdapter } from './adapters/shopee-public-crawler.adapter';
import { TiktokPublicCrawlerAdapter } from './adapters/tiktok-public-crawler.adapter';
import { MarketAgentService } from './agent/market-agent.service';

@Injectable()
export class MarketAnalysisServiceService {
  constructor(
    @InjectRepository(MarketProduct)
    private readonly marketProductRepo: Repository<MarketProduct>,
    private readonly websiteCrawler: WebsiteCrawlerAdapter,
    private readonly shopeePublicCrawler: ShopeePublicCrawlerAdapter,
    private readonly tiktokPublicCrawler: TiktokPublicCrawlerAdapter,
    private readonly marketAgent: MarketAgentService,
  ) {}

  async createMockProduct() {
    const product = this.marketProductRepo.create({
      platform: 'tiktok_shop',
      keyword: 'đồ ngủ nữ',
      name: 'Bộ pijama lụa nữ',
      price: 299000,
      shopName: 'Demo TikTok Shop',
      imageUrl: 'https://example.com/image.jpg',
      productUrl: 'https://example.com/product',
    });

    return this.marketProductRepo.save(product);
  }

  async findAll() {
    return this.marketProductRepo.find({
      order: {
        id: 'DESC',
      },
    });
  }

  async crawlOnlineMarket(keyword: string, sources = ['canifa', 'sunfly']) {
    const allProducts: CrawledProduct[] = [];

    if (sources.includes('canifa')) {
      allProducts.push(...(await this.websiteCrawler.crawlCanifa(keyword)));
    }

    if (sources.includes('sunfly')) {
      allProducts.push(...(await this.websiteCrawler.crawlSunfly(keyword)));
    }

    // TikTok chỉ phân tích từ DB nếu không crawl live được
    // if (sources.includes('tiktok_shop')) { ... }

    const entities = allProducts.map((item) =>
      this.marketProductRepo.create({
        platform: item.source,
        keyword: item.keyword,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
      }),
    );

    return this.marketProductRepo.save(entities);
  }

  async crawlShopeePublic(keyword: string) {
    const products = await this.shopeePublicCrawler.searchSleepwear(keyword);

    const entities = products.map((item) =>
      this.marketProductRepo.create({
        platform: item.platform,
        keyword: item.keyword,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
      }),
    );

    return this.marketProductRepo.save(entities);
  }
  async crawlTiktokPublic(keyword: string) {
    const products = await this.tiktokPublicCrawler.searchSleepwear(keyword);

    const entities = products.map((item) =>
      this.marketProductRepo.create({
        platform: item.platform,
        keyword: item.keyword,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
      }),
    );

    return this.marketProductRepo.save(entities);
  }

  async analyzeByKeyword(keyword: string) {
    const products = await this.marketProductRepo.find({
      where: { keyword },
    });

    const prices = products
      .map((p) => Number(p.price))
      .filter((price) => price > 0);

    if (prices.length === 0) {
      return {
        keyword,
        totalProducts: 0,
        message: 'Chưa có dữ liệu để phân tích',
      };
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(
      prices.reduce((sum, price) => sum + price, 0) / prices.length,
    );

    return {
      keyword,
      totalProducts: prices.length,
      minPrice,
      maxPrice,
      avgPrice,
      suggestion: `Giá thị trường trung bình khoảng ${avgPrice.toLocaleString('vi-VN')}đ`,
    };
  }

  async runAgentCommand(command: string) {
    const parsed = await this.marketAgent.parseCommand(command);

    const keyword = parsed.keyword || 'đồ mặc nhà nữ';
    const sources = parsed.sources?.length
      ? parsed.sources
      : ['canifa', 'sunfly', 'shopee', 'tiktok_shop_public'];

    if (parsed.action === 'analyze_price') {
      const analysis = await this.advancedAnalyze(keyword, sources);
      const aiInsight = await this.marketAgent.generateInsight(analysis);

      return { parsed, analysis, aiInsight };
    }

    if (parsed.action === 'crawl_and_analyze') {
      await this.crawlOnlineMarket(keyword, sources);

      const analysis = await this.advancedAnalyze(keyword, sources);
      const aiInsight = await this.marketAgent.generateInsight(analysis);

      return { parsed, analysis, aiInsight };
    }

    if (parsed.action === 'crawl_online') {
      const products = await this.crawlOnlineMarket(keyword, sources);

      return {
        parsed,
        totalProducts: products.length,
        products,
      };
    }

    if (parsed.action === 'get_products') {
      const products = await this.getProducts({
        keyword,
        platform: sources[0],
        minPrice: parsed.minPrice ?? undefined,
        maxPrice: parsed.maxPrice ?? undefined,
      });

      return { parsed, products };
    }

    return {
      message: 'Không hiểu lệnh hoặc action chưa được hỗ trợ',
      parsed,
    };
  }

  async advancedAnalyze(keyword: string, sources?: string[]) {
    const qb = this.marketProductRepo.createQueryBuilder('product');

    qb.where('product.keyword ILIKE :keyword', {
      keyword: `%${keyword}%`,
    });

    if (sources?.length) {
      qb.andWhere('product.platform IN (:...sources)', { sources });
    }

    const products = await qb.getMany();

    if (!products.length) {
      return {
        keyword,
        sources,
        totalProducts: 0,
        message: 'Không có dữ liệu phù hợp để phân tích',
      };
    }

    const prices = products.map((p) => Number(p.price)).filter((p) => p > 0);

    const avgPrice = Math.round(
      prices.reduce((sum, price) => sum + price, 0) / prices.length,
    );

    const sorted = [...products].sort(
      (a, b) => Number(a.price) - Number(b.price),
    );

    return {
      keyword,
      sources,
      totalProducts: products.length,
      marketInsight: {
        averagePrice: avgPrice,
        recommendedSellPrice: Math.round(avgPrice * 0.95),
        cheapestProduct: sorted[0],
        mostExpensiveProduct: sorted[sorted.length - 1],
      },
    };
  }

  async getProducts(query: {
    keyword?: string;
    platform?: string;
    minPrice?: number;
    maxPrice?: number;
  }) {
    const qb = this.marketProductRepo.createQueryBuilder('product');

    if (query.keyword) {
      qb.andWhere('product.keyword ILIKE :keyword', {
        keyword: `%${query.keyword}%`,
      });
    }

    if (query.platform) {
      qb.andWhere('product.platform = :platform', {
        platform: query.platform,
      });
    }

    if (query.minPrice) {
      qb.andWhere('product.price >= :minPrice', {
        minPrice: query.minPrice,
      });
    }

    if (query.maxPrice) {
      qb.andWhere('product.price <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }

    qb.orderBy('product.price', 'ASC');

    return qb.getMany();
  }
}
