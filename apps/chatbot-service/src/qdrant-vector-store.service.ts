import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CatalogKnowledgeService } from './catalog-knowledge.service';
import { EmbeddingService } from './embedding.service';
import {
  KnowledgeDocument,
  KnowledgeSearchResult,
  ProductContext,
  RetrievedDocument,
} from './knowledge.types';

type QdrantCollectionResponse = {
  result?: {
    config?: {
      params?: {
        vectors?:
          | {
              size?: number;
              distance?: string;
            }
          | Record<
              string,
              {
                size?: number;
                distance?: string;
              }
            >;
      };
    };
  };
};

type QdrantPoint = {
  id: string | number;
  score?: number;
  payload?: Record<string, unknown>;
};

type QdrantQueryResponse = {
  result?:
    | {
        points?: QdrantPoint[];
      }
    | QdrantPoint[];
};

@Injectable()
export class QdrantVectorStoreService {
  private readonly logger = new Logger(QdrantVectorStoreService.name);
  private readonly client: AxiosInstance;
  private readonly collectionName: string;
  private readonly scoreThreshold: number;
  private syncPromise: Promise<void> | null = null;
  private syncedSignature: string | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly catalogKnowledgeService: CatalogKnowledgeService,
    private readonly embeddingService: EmbeddingService,
  ) {
    const qdrantUrl =
      this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    const qdrantApiKey = this.configService.get<string>('QDRANT_API_KEY');

    this.collectionName =
      this.configService.get<string>('CHATBOT_QDRANT_COLLECTION') ||
      'balii_chatbot_knowledge';
    this.scoreThreshold = Number(
      this.configService.get<string>('CHATBOT_QDRANT_SCORE_THRESHOLD') || 0.55,
    );

    this.client = axios.create({
      baseURL: qdrantUrl,
      timeout: 30000,
      headers: qdrantApiKey ? { 'api-key': qdrantApiKey } : undefined,
    });
  }

  isEnabled() {
    return this.embeddingService.isEnabled();
  }

  async reindex() {
    this.syncedSignature = null;
    await this.ensureSynced();
  }

  async search(query: string): Promise<KnowledgeSearchResult | null> {
    if (!this.embeddingService.isEnabled()) {
      this.embeddingService.logDisabledReason();
      return null;
    }

    try {
      await this.ensureSynced();
      const queryVector = await this.embeddingService.embedQuery(query);

      if (!queryVector) {
        return null;
      }

      const response = await this.client.post<QdrantQueryResponse>(
        `/collections/${this.collectionName}/points/query`,
        {
          query: queryVector,
          limit: 6,
          with_payload: true,
          score_threshold: this.scoreThreshold,
        },
      );

      const documents = this.extractPoints(response.data)
        .map((point) => this.mapPointToDocument(point))
        .filter((document): document is RetrievedDocument => Boolean(document));

      return {
        documents,
        suggestedProducts: this.extractSuggestedProducts(documents),
        retrievalMode: 'vector',
      };
    } catch (error) {
      this.logger.warn(
        `Vector retrieval failed, falling back to keyword retrieval: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async ensureSynced() {
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.performSync().finally(() => {
      this.syncPromise = null;
    });

    return this.syncPromise;
  }

  private async performSync() {
    const documents = await this.catalogKnowledgeService.getCorpusDocuments();
    const signature = this.computeSignature(documents);

    if (signature === this.syncedSignature) {
      return;
    }

    const vectors = await this.embeddingService.embedDocuments(documents);
    if (!vectors?.length) {
      throw new Error('Embedding generation returned no vectors.');
    }

    const vectorSize = vectors[0]?.length;
    if (!vectorSize) {
      throw new Error('Unable to determine embedding vector size.');
    }

    await this.ensureCollection(vectorSize);

    for (const batch of this.chunk(documents, vectors, 32)) {
      await this.client.put(`/collections/${this.collectionName}/points`, {
        points: batch.map((item) => ({
          id: item.document.id,
          vector: item.vector,
          payload: {
            id: item.document.id,
            type: item.document.type,
            title: item.document.title,
            content: item.document.content,
            ...item.document.metadata,
          },
        })),
      });
    }

    this.syncedSignature = signature;
  }

  private async ensureCollection(vectorSize: number) {
    try {
      const response = await this.client.get<QdrantCollectionResponse>(
        `/collections/${this.collectionName}`,
      );
      const existingSize = this.extractVectorSize(response.data);

      if (existingSize === vectorSize) {
        return;
      }

      await this.client.delete(`/collections/${this.collectionName}`);
    } catch (error) {
      if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
        throw error;
      }
    }

    await this.client.put(`/collections/${this.collectionName}`, {
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    });
  }

  private extractVectorSize(response: QdrantCollectionResponse) {
    const vectors = response.result?.config?.params?.vectors;

    if (!vectors) {
      return null;
    }

    if ('size' in vectors && typeof vectors.size === 'number') {
      return vectors.size;
    }

    const firstVector = Object.values(vectors).find(
      (value): value is { size?: number; distance?: string } =>
        typeof value === 'object' && value !== null,
    );
    return firstVector?.size ?? null;
  }

  private extractPoints(response: QdrantQueryResponse) {
    if (Array.isArray(response.result)) {
      return response.result;
    }

    return response.result?.points ?? [];
  }

  private mapPointToDocument(point: QdrantPoint): RetrievedDocument | null {
    const payload = point.payload;
    if (!payload) {
      return null;
    }

    const title = this.asString(payload.title);
    const content = this.asString(payload.content);
    const type = this.asString(payload.type);

    if (!title || !content || !this.isDocumentType(type)) {
      return null;
    }

    return {
      id: this.asString(payload.id) || String(point.id),
      title,
      content,
      type,
      metadata: {
        productId: this.asNullableString(payload.productId),
        slug: this.asNullableString(payload.slug),
        thumbnail: this.asNullableString(payload.thumbnail),
        price: this.asNullableNumber(payload.price),
        salePrice: this.asNullableNumber(payload.salePrice),
      },
      score: point.score,
    };
  }

  private extractSuggestedProducts(documents: RetrievedDocument[]) {
    const seen = new Set<string>();
    const suggestedProducts: ProductContext[] = [];

    for (const document of documents) {
      if (document.type !== 'product') {
        continue;
      }

      const productId = document.metadata?.productId;
      const slug = document.metadata?.slug;

      if (
        typeof productId !== 'string' ||
        typeof slug !== 'string' ||
        seen.has(productId)
      ) {
        continue;
      }

      suggestedProducts.push({
        id: productId,
        name: document.title,
        slug,
        description: document.content,
        price:
          typeof document.metadata?.price === 'number'
            ? document.metadata.price
            : 0,
        salePrice:
          typeof document.metadata?.salePrice === 'number'
            ? document.metadata.salePrice
            : null,
        material: '',
        targetGender: '',
        thumbnail:
          typeof document.metadata?.thumbnail === 'string'
            ? document.metadata.thumbnail
            : '',
      });
      seen.add(productId);
    }

    return suggestedProducts.slice(0, 3);
  }

  private computeSignature(documents: KnowledgeDocument[]) {
    const input = documents
      .map(
        (document) =>
          `${document.id}|${document.title}|${document.content}|${JSON.stringify(document.metadata ?? {})}`,
      )
      .join('\n');

    return createHash('sha1').update(input).digest('hex');
  }

  private chunk(
    documents: KnowledgeDocument[],
    vectors: number[][],
    size: number,
  ) {
    const chunks: Array<
      Array<{ document: KnowledgeDocument; vector: number[] }>
    > = [];

    for (let index = 0; index < documents.length; index += size) {
      chunks.push(
        documents.slice(index, index + size).map((document, offset) => ({
          document,
          vector: vectors[index + offset],
        })),
      );
    }

    return chunks;
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value : '';
  }

  private asNullableString(value: unknown) {
    return typeof value === 'string' ? value : null;
  }

  private asNullableNumber(value: unknown) {
    return typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : null;
  }

  private isDocumentType(value: string): value is KnowledgeDocument['type'] {
    return value === 'faq' || value === 'policy' || value === 'product';
  }
}
