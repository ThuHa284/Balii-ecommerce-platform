import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogKnowledgeService } from './catalog-knowledge.service';
import { QdrantVectorStoreService } from './qdrant-vector-store.service';
import {
  HybridSearchResult,
  KnowledgeSearchResult,
  ProductContext,
  RetrievedDocument,
} from './knowledge.types';

/**
 * Hybrid RAG retrieval.
 *
 * Runs the two retrieval arms in parallel and fuses their rankings:
 *   1. Dense/semantic arm  — Qdrant vector similarity over Gemini embeddings.
 *   2. Lexical/DB arm      — keyword scoring over the live PostgreSQL catalog
 *                            (CatalogKnowledgeService, i.e. "RAG on the DB").
 *
 * Results are combined with Reciprocal Rank Fusion (RRF), which is robust when
 * the two arms produce scores on different scales (cosine similarity vs token
 * overlap). If only one arm succeeds we return that arm's result; if both fail
 * (e.g. Gemini key invalid AND DB empty) we return an empty 'none' result.
 *
 * RRF score for a document d: sum over each arm of 1 / (k + rank_d), where rank
 * is 1-based within that arm's ordering. k dampens the weight of low ranks.
 */
@Injectable()
export class HybridRetrievalService {
  private readonly logger = new Logger(HybridRetrievalService.name);
  private readonly rrfK: number;
  private readonly maxDocuments: number;
  private readonly maxProducts: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly qdrantVectorStoreService: QdrantVectorStoreService,
    private readonly catalogKnowledgeService: CatalogKnowledgeService,
  ) {
    this.rrfK = Number(
      this.configService.get<string>('CHATBOT_HYBRID_RRF_K') || 60,
    );
    this.maxDocuments = Number(
      this.configService.get<string>('CHATBOT_HYBRID_MAX_DOCS') || 6,
    );
    this.maxProducts = Number(
      this.configService.get<string>('CHATBOT_HYBRID_MAX_PRODUCTS') || 3,
    );
  }

  async retrieve(query: string): Promise<HybridSearchResult> {
    const [vectorResult, keywordResult] = await Promise.all([
      this.safeVectorSearch(query),
      this.safeKeywordSearch(query),
    ]);

    const arms = {
      vector: Boolean(vectorResult?.documents.length),
      keyword: Boolean(keywordResult?.documents.length),
    };

    // Both arms produced results -> fuse with RRF.
    if (vectorResult && keywordResult && arms.vector && arms.keyword) {
      const fusedDocuments = this.fuse([
        vectorResult.documents,
        keywordResult.documents,
      ]).slice(0, this.maxDocuments);

      const suggestedProducts = this.buildSuggestedProducts(fusedDocuments, [
        ...keywordResult.suggestedProducts,
        ...vectorResult.suggestedProducts,
      ]);

      this.logger.debug(
        `Hybrid retrieval: vector=${vectorResult.documents.length} keyword=${keywordResult.documents.length} fused=${fusedDocuments.length}`,
      );

      return {
        documents: fusedDocuments,
        suggestedProducts,
        retrievalMode: 'hybrid',
        arms,
      };
    }

    // Only one arm is usable -> return it as-is (preserving its own mode).
    const single = vectorResult ?? keywordResult;
    if (single && single.documents.length) {
      return { ...single, arms };
    }

    // Nothing worked. Still return whatever suggested products a degraded
    // keyword arm may have found (it can return products with no doc matches).
    if (keywordResult) {
      return { ...keywordResult, arms };
    }

    return {
      documents: [],
      suggestedProducts: [],
      retrievalMode: 'none',
      arms,
    };
  }

  private async safeVectorSearch(
    query: string,
  ): Promise<KnowledgeSearchResult | null> {
    try {
      return await this.qdrantVectorStoreService.search(query);
    } catch (error) {
      this.logger.warn(
        `Vector arm threw unexpectedly: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async safeKeywordSearch(
    query: string,
  ): Promise<KnowledgeSearchResult | null> {
    try {
      return await this.catalogKnowledgeService.searchByKeyword(query);
    } catch (error) {
      this.logger.error(
        `Keyword/DB arm failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private fuse(rankings: RetrievedDocument[][]): RetrievedDocument[] {
    const fused = new Map<
      string,
      { document: RetrievedDocument; score: number }
    >();

    for (const ranking of rankings) {
      ranking.forEach((document, index) => {
        const rank = index + 1;
        const contribution = 1 / (this.rrfK + rank);
        const existing = fused.get(document.id);

        if (existing) {
          existing.score += contribution;
          // Keep the richer document (the one that already carries product
          // metadata) so downstream product extraction stays intact.
          if (
            !existing.document.metadata?.productId &&
            document.metadata?.productId
          ) {
            existing.document = document;
          }
        } else {
          fused.set(document.id, { document, score: contribution });
        }
      });
    }

    return [...fused.values()]
      .sort((a, b) => b.score - a.score)
      .map((entry) => ({ ...entry.document, score: entry.score }));
  }

  /**
   * Order suggested products by the fused document ranking, but enrich each
   * with the fullest ProductContext we have (the keyword/DB arm carries full
   * variant data; the vector arm only has flattened payload metadata).
   */
  private buildSuggestedProducts(
    fusedDocuments: RetrievedDocument[],
    candidates: ProductContext[],
  ): ProductContext[] {
    const byId = new Map<string, ProductContext>();
    for (const product of candidates) {
      if (!byId.has(product.id)) {
        byId.set(product.id, product);
      }
    }

    const ordered: ProductContext[] = [];
    const seen = new Set<string>();

    for (const document of fusedDocuments) {
      if (document.type !== 'product') {
        continue;
      }
      const productId = document.metadata?.productId;
      if (typeof productId !== 'string' || seen.has(productId)) {
        continue;
      }

      const enriched = byId.get(productId);
      if (enriched) {
        ordered.push(enriched);
        seen.add(productId);
      }

      if (ordered.length >= this.maxProducts) {
        break;
      }
    }

    return ordered;
  }
}
