export type ProductContext = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  material: string;
  targetGender: string;
  recommendedAgeGroups: string[];
  thumbnail: string;
  updatedAt?: string;
  variants: ProductVariantContext[];
};

export type ProductVariantContext = {
  id: string;
  sku: string;
  size: string;
  color: string;
  itemType: string;
  price: number | null;
  stock: number;
  attributeSummary: string;
};

export type KnowledgeDocument = {
  id: string;
  type: 'faq' | 'policy' | 'product';
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type RetrievedDocument = KnowledgeDocument & {
  score?: number;
};

export type RetrievalMode = 'vector' | 'keyword' | 'hybrid' | 'none';

export type KnowledgeSearchResult = {
  documents: RetrievedDocument[];
  suggestedProducts: ProductContext[];
  retrievalMode: RetrievalMode;
};

/**
 * Health/diagnostics snapshot of the vector retrieval arm. Surfaced through the
 * chatbot health endpoint so a broken vector path (bad API key, Qdrant down,
 * empty collection) is visible instead of failing silently to keyword-only.
 */
export type VectorDiagnostics = {
  embeddingEnabled: boolean;
  embeddingModel: string;
  qdrantUrl: string;
  collection: string;
  collectionReady: boolean;
  indexedPoints: number | null;
  lastError: string | null;
};

/**
 * Result of a hybrid retrieval, carrying which arms actually contributed so the
 * caller (and the admin health view) can tell vector vs keyword vs fused.
 */
export type HybridSearchResult = KnowledgeSearchResult & {
  arms: {
    vector: boolean;
    keyword: boolean;
  };
};
