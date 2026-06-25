import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  KnowledgeDocument,
  KnowledgeSearchResult,
  ProductContext,
  RetrievedDocument,
} from './knowledge.types';

type ProductQueryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number | string;
  salePrice: number | string | null;
  material: string;
  targetGender: string;
  thumbnail: string;
  updatedAt: string;
};

type SearchableKnowledgeDocument = KnowledgeDocument & {
  tokens: string[];
};

const STATIC_KNOWLEDGE: KnowledgeDocument[] = [
  {
    id: 'faq-size',
    type: 'faq',
    title: 'Hướng dẫn chọn size',
    content:
      'Khi tư vấn size, hãy ưu tiên hỏi chiều cao, cân nặng và form mặc mong muốn. Nếu chưa đủ dữ liệu, hãy nhẹ nhàng gợi ý khách xem bảng size chi tiết tại trang sản phẩm trước khi đặt.',
  },
  {
    id: 'faq-material',
    type: 'faq',
    title: 'Tư vấn chất liệu',
    content:
      'Các câu hỏi về chất liệu nên tập trung vào độ mềm, độ thoáng, cảm giác khi mặc ngủ và mức độ phù hợp theo mùa. Không tự khẳng định các tính năng y khoa hoặc da liễu.',
  },
  {
    id: 'policy-order',
    type: 'policy',
    title: 'Chính sách đặt hàng',
    content:
      'Chatbot chỉ nên hỗ trợ tư vấn sản phẩm, tìm sản phẩm phù hợp, giải thích thông tin cơ bản và chuyển khách sang trang sản phẩm. Các vấn đề đơn hàng cụ thể cần điều hướng sang trang tài khoản hoặc bộ phận hỗ trợ.',
  },
  {
    id: 'policy-tone',
    type: 'policy',
    title: 'Nguyên tắc phản hồi',
    content:
      'Phản hồi ngắn gọn, thân thiện, dịu dàng và bằng tiếng Việt tự nhiên. Nếu thiếu dữ liệu, hãy nói rõ giới hạn một cách mềm mại và khuyến khích khách cung cấp thêm nhu cầu như chất liệu, mức giá, kiểu dáng hoặc mùa sử dụng.',
  },
];

@Injectable()
export class CatalogKnowledgeService {
  constructor(private readonly dataSource: DataSource) {}

  async searchByKeyword(query: string): Promise<KnowledgeSearchResult> {
    const products = await this.getRelevantProducts(query);
    const documents = this.buildSearchableKnowledgeDocuments(products);
    const queryTokens = this.tokenize(query);
    const rankedDocuments = documents
      .map((document) => ({
        document,
        score: this.scoreDocument(queryTokens, document.tokens),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return {
      documents: rankedDocuments.map(
        (entry) =>
          ({
            ...entry.document,
            score: entry.score,
          }) satisfies RetrievedDocument,
      ),
      suggestedProducts: products.slice(0, 3),
      retrievalMode: 'keyword',
    };
  }

  async getCorpusDocuments(): Promise<KnowledgeDocument[]> {
    const products = await this.getAllActiveProducts();
    return this.buildKnowledgeDocuments(products);
  }

  private buildSearchableKnowledgeDocuments(
    products: ProductContext[],
  ): SearchableKnowledgeDocument[] {
    return this.buildKnowledgeDocuments(products).map((document) => ({
      ...document,
      tokens: this.tokenize(`${document.title} ${document.content}`),
    }));
  }

  private buildKnowledgeDocuments(
    products: ProductContext[],
  ): KnowledgeDocument[] {
    const productDocs = products.map((product) => {
      const price = product.salePrice ?? product.price;
      const content =
        `${product.name}. ${product.description || 'Chưa có mô tả chi tiết.'} ` +
        `Chất liệu: ${product.material || 'chưa cập nhật'}. ` +
        `Giá hiện tại: ${price.toLocaleString('vi-VN')}đ. ` +
        `Đối tượng phù hợp: ${product.targetGender || 'unisex'}.`;

      return {
        id: `product-${product.id}`,
        type: 'product' as const,
        title: product.name,
        content,
        metadata: {
          productId: product.id,
          slug: product.slug,
          thumbnail: product.thumbnail,
          price,
          salePrice: product.salePrice,
        },
      };
    });

    return [...STATIC_KNOWLEDGE, ...productDocs];
  }

  private async getRelevantProducts(query: string): Promise<ProductContext[]> {
    const allProducts = await this.getAllActiveProducts();
    const queryTokens = this.tokenize(query);
    const scoredProducts = allProducts
      .map((product) => ({
        product,
        score: this.scoreDocument(
          queryTokens,
          this.tokenize(
            [
              product.name,
              product.slug,
              product.description,
              product.material,
              product.targetGender,
            ].join(' '),
          ),
        ),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scoredProducts.length > 0) {
      return scoredProducts.slice(0, 8).map((entry) => entry.product);
    }

    return allProducts.slice(0, 8);
  }

  private async getAllActiveProducts(): Promise<ProductContext[]> {
    const result: ProductQueryRow[] = await this.dataSource.query(`
      SELECT
        p.id,
        p.name,
        p.slug,
        COALESCE(p.description, '') AS description,
        COALESCE(p.base_price, 0) AS "basePrice",
        p.sale_price AS "salePrice",
        COALESCE(p.material, '') AS material,
        COALESCE(p.target_gender, 'unisex') AS "targetGender",
        p.updated_at AS "updatedAt",
        COALESCE(
          (
            SELECT img.url
            FROM product_service.product_images img
            WHERE img.product_id = p.id
            ORDER BY img.is_primary DESC, img.sort_order ASC
            LIMIT 1
          ),
          ''
        ) AS thumbnail
      FROM product_service.products p
      WHERE p.is_active = TRUE
      ORDER BY p.updated_at DESC
    `);

    return result.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: row.description ?? '',
      price: Number(row.basePrice ?? 0),
      salePrice: row.salePrice == null ? null : Number(row.salePrice),
      material: row.material ?? '',
      targetGender: row.targetGender ?? 'unisex',
      thumbnail: row.thumbnail ?? '',
      updatedAt: row.updatedAt,
    }));
  }

  private tokenize(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1);
  }

  private scoreDocument(queryTokens: string[], documentTokens: string[]) {
    if (!queryTokens.length || !documentTokens.length) {
      return 0;
    }

    const tokenSet = new Set(documentTokens);
    return queryTokens.reduce(
      (score, token) => score + (tokenSet.has(token) ? 1 : 0),
      0,
    );
  }
}
