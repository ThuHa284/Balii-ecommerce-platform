/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
type CrawledProduct = {
  platform: string;
  source: string;
  keyword: string;
  name: string;
  price: number;
  imageUrl?: string;
  productUrl?: string;
};
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { MarketProduct } from './entities/market-product.entity';
import { WebsiteCrawlerAdapter } from './adapters/website-crawler.adapter';
import { ShopeePublicCrawlerAdapter } from './adapters/shopee-public-crawler.adapter';
import { TiktokPublicCrawlerAdapter } from './adapters/tiktok-public-crawler.adapter';
import { MarketAgentService } from './agent/market-agent.service';
import { SearchByImageDto } from './dto/search-by-image.dto';
import { SearchByKeywordDto } from './dto/search-by-keyword.dto';
import {
  ProductSearchResponse,
  ProductSearchResult,
} from './interfaces/product-search-result.interface';
import { SerpApiProductSearchAdapter } from './adapters/serpapi-product-search.adapter';
import {
  normalizeImagesResult,
  normalizeLensResult,
  normalizeProductLink,
  normalizeShoppingResult,
} from './utils/normalize-serpapi-result';
import { deduplicateResults } from './utils/deduplicate-results';
import { sha256 } from './utils/hash.util';
import { CloudinaryService } from './cloudinary.service';
import { RedisService } from '@app/redis';

type AdminRequestContext = {
  request: Request;
  userId?: string;
};

type SearchCachePayload = {
  keyword: string;
  imageUrl?: string;
  lensResponse?: Record<string, any>;
  shoppingResponse?: Record<string, any>;
  imagesResponse?: Record<string, any>;
};

@Injectable()
export class MarketAnalysisServiceService {
  private readonly logger = new Logger(MarketAnalysisServiceService.name);
  private readonly fallbackCache = new Map<
    string,
    { expiresAt: number; value: string }
  >();

  constructor(
    @InjectRepository(MarketProduct)
    private readonly marketProductRepo: Repository<MarketProduct>,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly serpApiAdapter: SerpApiProductSearchAdapter,
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

  async searchSimilarProductsByImage(
    dto: SearchByImageDto,
    context: AdminRequestContext,
    imageFile?: Express.Multer.File,
  ): Promise<ProductSearchResponse> {
    await this.enforceRateLimit(context);

    if (!imageFile && !dto.imageUrl) {
      throw new BadRequestException('image hoặc imageUrl là bắt buộc');
    }

    let imageUrl = dto.imageUrl?.trim();
    if (imageFile) {
      imageUrl = await this.uploadImageAndGetUrl(imageFile);
    }

    if (!imageUrl || !this.isValidHttpUrl(imageUrl)) {
      throw new BadRequestException('imageUrl phải là URL hợp lệ');
    }

    const requestedKeyword = this.normalizeKeyword(dto.keyword);
    const cacheKey = `serpapi:image:${sha256(imageUrl)}:${sha256(requestedKeyword ?? '')}`;
    const cachedPayload = await this.getCachedPayload(cacheKey);

    if (cachedPayload) {
      return this.buildResponseFromPayload(
        cachedPayload,
        dto.limit,
        dto.saveResults,
      );
    }

    const lensResponse = await this.serpApiAdapter.searchByLens(imageUrl);
    const lensResults = this.extractLensResults(lensResponse);
    const keyword = this.buildKeyword(requestedKeyword, lensResults);

    const shoppingResponse = keyword
      ? await this.serpApiAdapter.searchByShopping(keyword)
      : undefined;
    const shoppingResults = this.extractShoppingResults(shoppingResponse);

    const shouldSearchImages =
      lensResults.length + shoppingResults.length < Math.min(dto.limit, 10);

    const imagesResponse =
      keyword && shouldSearchImages
        ? await this.serpApiAdapter.searchByImages(keyword)
        : undefined;

    const payload: SearchCachePayload = {
      keyword,
      imageUrl,
      lensResponse,
      shoppingResponse,
      imagesResponse,
    };

    await this.setCachedPayload(cacheKey, payload);

    return this.buildResponseFromPayload(payload, dto.limit, dto.saveResults);
  }

  async searchProductsByKeyword(
    dto: SearchByKeywordDto,
    context: AdminRequestContext,
  ): Promise<ProductSearchResponse> {
    await this.enforceRateLimit(context);

    const keyword = this.normalizeKeyword(dto.keyword);
    if (!keyword) {
      throw new BadRequestException('keyword là bắt buộc');
    }

    const cacheKey = `serpapi:keyword:${sha256(keyword)}`;
    const cachedPayload = await this.getCachedPayload(cacheKey);

    if (cachedPayload) {
      return this.buildResponseFromPayload(
        cachedPayload,
        dto.limit,
        dto.saveResults,
      );
    }

    const shoppingResponse =
      await this.serpApiAdapter.searchByShopping(keyword);
    const shoppingResults = this.extractShoppingResults(shoppingResponse);
    const imagesResponse =
      shoppingResults.length < Math.min(dto.limit, 10)
        ? await this.serpApiAdapter.searchByImages(keyword)
        : undefined;

    const payload: SearchCachePayload = {
      keyword,
      shoppingResponse,
      imagesResponse,
    };

    await this.setCachedPayload(cacheKey, payload);

    return this.buildResponseFromPayload(payload, dto.limit, dto.saveResults);
  }

  private async uploadImageAndGetUrl(
    imageFile: Express.Multer.File,
  ): Promise<string> {
    const uploaded = await this.cloudinaryService.uploadBuffer(
      imageFile.buffer,
      'balii/market-analysis',
      `search-${Date.now()}`,
    );

    return uploaded.url;
  }

  private extractLensResults(
    response?: Record<string, any>,
  ): ProductSearchResult[] {
    if (!response) {
      return [];
    }

    const rawItems = [
      ...(Array.isArray(response.visual_matches)
        ? response.visual_matches
        : []),
      ...(Array.isArray(response.products) ? response.products : []),
      ...(Array.isArray(response.exact_matches) ? response.exact_matches : []),
      ...(response.knowledge_graph ? [response.knowledge_graph] : []),
    ];

    return rawItems
      .map((item) => normalizeLensResult(item as Record<string, unknown>))
      .filter((item): item is ProductSearchResult => Boolean(item));
  }

  private extractShoppingResults(
    response?: Record<string, any>,
  ): ProductSearchResult[] {
    if (!response || !Array.isArray(response.shopping_results)) {
      return [];
    }

    return response.shopping_results
      .map((item: unknown) =>
        normalizeShoppingResult(item as Record<string, unknown>),
      )
      .filter((item): item is ProductSearchResult => Boolean(item));
  }

  private extractImagesResults(
    response?: Record<string, any>,
  ): ProductSearchResult[] {
    if (!response || !Array.isArray(response.images_results)) {
      return [];
    }

    return response.images_results
      .map((item: unknown) =>
        normalizeImagesResult(item as Record<string, unknown>),
      )
      .filter((item): item is ProductSearchResult => Boolean(item));
  }

  private buildKeyword(
    requestedKeyword: string | null,
    lensResults: ProductSearchResult[],
  ): string {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'with',
      'from',
      'shop',
      'store',
      'women',
      'woman',
      'men',
      'man',
      'image',
      'photo',
      'official',
      'product',
      'fashion',
      'sale',
      'best',
      'new',
    ]);

    const tokenScores = new Map<string, number>();
    for (const result of lensResults.slice(0, 8)) {
      const content = `${result.title} ${result.snippet ?? ''}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ');

      for (const token of content.split(/\s+/)) {
        if (token.length < 3 || stopWords.has(token)) {
          continue;
        }

        tokenScores.set(token, (tokenScores.get(token) ?? 0) + 1);
      }
    }

    const rankedTokens = [...tokenScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([token]) => token);

    if (requestedKeyword && rankedTokens.length) {
      return `${requestedKeyword} ${rankedTokens.join(' ')}`.trim();
    }

    if (requestedKeyword) {
      return requestedKeyword;
    }

    if (rankedTokens.length) {
      return rankedTokens.join(' ');
    }

    const fallbackTitle = lensResults.find((item) => item.title)?.title?.trim();
    return fallbackTitle ?? '';
  }

  private async buildResponseFromPayload(
    payload: SearchCachePayload,
    limit: number,
    saveResults: boolean,
  ): Promise<ProductSearchResponse> {
    const merged = deduplicateResults([
      ...this.extractLensResults(payload.lensResponse),
      ...this.extractShoppingResults(payload.shoppingResponse),
      ...this.extractImagesResults(payload.imagesResponse),
    ])
      .filter((item) => item.title)
      .filter((item) => this.isAllowedResult(item))
      .sort((a, b) => this.compareResults(a, b))
      .slice(0, Math.min(limit, 20));

    const results = saveResults
      ? await Promise.all(
          merged.map((item) => this.saveResult(item, payload.keyword)),
        )
      : merged.map((item) => ({ ...item, isSaved: false }));

    return {
      success: true,
      keyword: payload.keyword,
      imageUrl: payload.imageUrl,
      total: results.length,
      results,
    };
  }

  private compareResults(
    a: ProductSearchResult,
    b: ProductSearchResult,
  ): number {
    return (
      (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0) ||
      Number(Boolean(b.extractedPrice)) - Number(Boolean(a.extractedPrice)) ||
      Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) ||
      Number(Boolean(b.link)) - Number(Boolean(a.link))
    );
  }

  private async saveResult(
    result: ProductSearchResult,
    keyword: string,
  ): Promise<ProductSearchResult> {
    if (!result.title || !result.link) {
      return {
        ...result,
        isSaved: false,
      };
    }

    const normalizedLink = normalizeProductLink(result.link);
    if (!normalizedLink) {
      return {
        ...result,
        isSaved: false,
      };
    }

    const platform = this.mapPlatform(result.engine);
    const existing = await this.marketProductRepo.findOne({
      where: {
        productUrl: normalizedLink,
      },
    });

    const entity = existing ?? this.marketProductRepo.create();
    entity.platform = platform;
    entity.externalId = sha256(normalizedLink);
    entity.keyword = keyword;
    entity.name = result.title;
    entity.price = result.extractedPrice ?? null;
    entity.originalPrice = null;
    entity.soldCount = null;
    entity.rating = result.rating ?? null;
    entity.shopName = result.source ?? null;
    entity.imageUrl = result.imageUrl ?? null;
    entity.productUrl = normalizedLink;
    entity.rawData = result.rawData ?? null;
    entity.crawledAt = new Date();

    await this.marketProductRepo.save(entity);

    return {
      ...result,
      link: normalizedLink,
      isSaved: true,
    };
  }

  private mapPlatform(engine: ProductSearchResult['engine']): string {
    switch (engine) {
      case 'google_lens':
        return 'serpapi_google_lens';
      case 'google_images':
        return 'serpapi_google_images';
      case 'google_shopping':
      default:
        return 'serpapi_google_shopping';
    }
  }

  private async enforceRateLimit(context: AdminRequestContext): Promise<void> {
    const limit = Number(
      this.configService.get<string>('SERPAPI_RATE_LIMIT_PER_HOUR') ?? '20',
    );
    const identifier =
      context.userId?.trim() ||
      this.getClientIp(context.request) ||
      'anonymous';
    const key = `serpapi:rate:${sha256(identifier)}`;

    let count: number | null = null;
    try {
      count = await this.redisService.incr(key);
      if (count === 1) {
        await this.redisService.expire(key, 3600);
      }
    } catch (error) {
      this.logger.warn(`Redis rate limit fallback for ${identifier}`);
      count = await this.incrementFallbackCounter(key, 3600);
    }

    if ((count ?? 0) > limit) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }

    return request.ip ?? '';
  }

  private async getCachedPayload(
    key: string,
  ): Promise<SearchCachePayload | null> {
    try {
      const value = await this.redisService.get(key);
      if (!value) {
        return this.getFallbackCacheValue(key);
      }

      return JSON.parse(value) as SearchCachePayload;
    } catch (error) {
      this.logger.warn(`Redis cache read failed for ${key}`);
      return this.getFallbackCacheValue(key);
    }
  }

  private async setCachedPayload(
    key: string,
    payload: SearchCachePayload,
  ): Promise<void> {
    const ttl = Number(
      this.configService.get<string>('SERPAPI_CACHE_TTL_SECONDS') ?? '86400',
    );
    const serialized = JSON.stringify(payload);

    try {
      await this.redisService.set(key, serialized, ttl);
    } catch (error) {
      this.logger.warn(`Redis cache write failed for ${key}`);
      this.fallbackCache.set(key, {
        value: serialized,
        expiresAt: Date.now() + ttl * 1000,
      });
    }
  }

  private getFallbackCacheValue(key: string): SearchCachePayload | null {
    const cached = this.fallbackCache.get(key);
    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      this.fallbackCache.delete(key);
      return null;
    }

    return JSON.parse(cached.value) as SearchCachePayload;
  }

  private async incrementFallbackCounter(
    key: string,
    ttlSeconds: number,
  ): Promise<number> {
    const cached = this.fallbackCache.get(key);
    const now = Date.now();

    let nextValue = 1;
    if (cached && cached.expiresAt > now) {
      nextValue = Number(cached.value) + 1;
    }

    this.fallbackCache.set(key, {
      value: String(nextValue),
      expiresAt: now + ttlSeconds * 1000,
    });

    return nextValue;
  }

  private normalizeKeyword(keyword?: string): string | null {
    const normalized = keyword?.trim();
    return normalized ? normalized : null;
  }

  private isAllowedResult(result: ProductSearchResult): boolean {
    if (this.matchesBlockedUrlPrefix(result.link)) {
      return false;
    }

    if (this.matchesBlockedSourceKeyword(result)) {
      return false;
    }

    if (this.matchesAllowedUrlPrefix(result.link)) {
      return true;
    }

    if (this.matchesAllowedSourceKeyword(result)) {
      return true;
    }

    const link = result.link;
    const allowedDomains = this.getAllowedDomains();
    if (!allowedDomains.length) {
      return true;
    }

    if (!link) {
      return false;
    }

    try {
      const hostname = new URL(link).hostname.toLowerCase();
      return allowedDomains.some(
        (allowedDomain) =>
          hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`),
      );
    } catch {
      return false;
    }
  }

  private getAllowedDomains(): string[] {
    const rawValue =
      this.configService.get<string>('SERPAPI_ALLOWED_DOMAINS') ?? '';

    return rawValue
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  private matchesAllowedUrlPrefix(link: string | null): boolean {
    if (!link) {
      return false;
    }

    const prefixes = this.getAllowedUrlPrefixes();
    if (!prefixes.length) {
      return false;
    }

    return prefixes.some((prefix) => link.startsWith(prefix));
  }

  private getAllowedUrlPrefixes(): string[] {
    const rawValue =
      this.configService.get<string>('SERPAPI_ALLOWED_URL_PREFIXES') ?? '';

    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private matchesBlockedUrlPrefix(link: string | null): boolean {
    if (!link) {
      return false;
    }

    const prefixes = this.getBlockedUrlPrefixes();
    if (!prefixes.length) {
      return false;
    }

    return prefixes.some((prefix) => link.startsWith(prefix));
  }

  private getBlockedUrlPrefixes(): string[] {
    const rawValue =
      this.configService.get<string>('SERPAPI_BLOCKED_URL_PREFIXES') ?? '';

    return rawValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private matchesAllowedSourceKeyword(result: ProductSearchResult): boolean {
    const keywords = this.getAllowedSourceKeywords();
    if (!keywords.length) {
      return false;
    }

    const haystacks = [result.source, result.title, result.link]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    return haystacks.some((value) =>
      keywords.some((keyword) => value.includes(keyword)),
    );
  }

  private getAllowedSourceKeywords(): string[] {
    const rawValue =
      this.configService.get<string>('SERPAPI_ALLOWED_SOURCE_KEYWORDS') ?? '';

    return rawValue
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  private matchesBlockedSourceKeyword(result: ProductSearchResult): boolean {
    const keywords = this.getBlockedSourceKeywords();
    if (!keywords.length) {
      return false;
    }

    const haystacks = [result.source, result.title, result.link]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    return haystacks.some((value) =>
      keywords.some((keyword) => value.includes(keyword)),
    );
  }

  private getBlockedSourceKeywords(): string[] {
    const rawValue =
      this.configService.get<string>('SERPAPI_BLOCKED_SOURCE_KEYWORDS') ?? '';

    return rawValue
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }
}
