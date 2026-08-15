import { ConfigService } from '@nestjs/config';
import { CatalogKnowledgeService } from './catalog-knowledge.service';
import { HybridRetrievalService } from './hybrid-retrieval.service';
import {
  KnowledgeSearchResult,
  ProductContext,
  RetrievedDocument,
} from './knowledge.types';
import {
  QdrantVectorStoreService,
  toQdrantPointId,
} from './qdrant-vector-store.service';

const product = (id: string, name: string): ProductContext => ({
  id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  description: `${name} mềm và thoáng`,
  price: 250000,
  salePrice: null,
  material: 'cotton',
  targetGender: 'unisex',
  recommendedAgeGroups: ['18_25'],
  thumbnail: '',
  variants: [
    {
      id: `variant-${id}`,
      sku: `SKU-${id}`,
      size: 'M',
      color: 'xanh',
      itemType: 'áo',
      price: 250000,
      stock: 10,
      attributeSummary: '',
    },
  ],
});

const document = (
  id: string,
  title: string,
  productId?: string,
): RetrievedDocument => ({
  id,
  type: productId ? 'product' : 'faq',
  title,
  content: `${title} content`,
  metadata: productId ? { productId, slug: title.toLowerCase() } : undefined,
});

describe('HybridRetrievalService', () => {
  const vectorSearch = jest.fn<
    Promise<KnowledgeSearchResult | null>,
    [string]
  >();
  const keywordSearch = jest.fn<Promise<KnowledgeSearchResult>, [string]>();
  let service: HybridRetrievalService;

  beforeEach(() => {
    jest.clearAllMocks();

    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const vectorStore = {
      search: vectorSearch,
    } as unknown as QdrantVectorStoreService;
    const catalog = {
      searchByKeyword: keywordSearch,
    } as unknown as CatalogKnowledgeService;

    service = new HybridRetrievalService(configService, vectorStore, catalog);
  });

  it('fuses vector and keyword rankings with RRF', async () => {
    const first = product('1', 'Bộ ngủ Cotton');
    const second = product('2', 'Đầm ngủ Lụa');

    vectorSearch.mockResolvedValue({
      documents: [
        document('product-1', first.name, first.id),
        document('faq-material', 'Tư vấn chất liệu'),
      ],
      suggestedProducts: [first],
      retrievalMode: 'vector',
    });
    keywordSearch.mockResolvedValue({
      documents: [
        document('product-2', second.name, second.id),
        document('product-1', first.name, first.id),
      ],
      suggestedProducts: [second, first],
      retrievalMode: 'keyword',
    });

    const result = await service.retrieve('đồ ngủ mềm thoáng');

    expect(result.retrievalMode).toBe('hybrid');
    expect(result.arms).toEqual({ vector: true, keyword: true });
    expect(result.documents.map((item) => item.id)).toEqual([
      'product-1',
      'product-2',
      'faq-material',
    ]);
    expect(result.suggestedProducts.map((item) => item.id)).toEqual(['1', '2']);
    expect(result.suggestedProducts[0].variants).toHaveLength(1);
  });

  it('degrades explicitly to keyword mode when the vector arm is unavailable', async () => {
    const first = product('1', 'Bộ ngủ Cotton');
    vectorSearch.mockResolvedValue(null);
    keywordSearch.mockResolvedValue({
      documents: [document('product-1', first.name, first.id)],
      suggestedProducts: [first],
      retrievalMode: 'keyword',
    });

    const result = await service.retrieve('cotton');

    expect(result.retrievalMode).toBe('keyword');
    expect(result.arms).toEqual({ vector: false, keyword: true });
  });

  it('reports none when both retrieval arms fail', async () => {
    vectorSearch.mockRejectedValue(new Error('Qdrant unavailable'));
    keywordSearch.mockRejectedValue(new Error('PostgreSQL unavailable'));

    const result = await service.retrieve('test');

    expect(result.retrievalMode).toBe('none');
    expect(result.arms).toEqual({ vector: false, keyword: false });
    expect(result.documents).toEqual([]);
  });
});

describe('toQdrantPointId', () => {
  it('creates a stable RFC 4122 UUID accepted by Qdrant', () => {
    const first = toQdrantPointId('faq-size');
    const repeated = toQdrantPointId('faq-size');
    const second = toQdrantPointId('product-123');

    expect(first).toBe(repeated);
    expect(first).not.toBe(second);
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
