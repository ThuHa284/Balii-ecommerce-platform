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

export type KnowledgeSearchResult = {
  documents: RetrievedDocument[];
  suggestedProducts: ProductContext[];
  retrievalMode: 'vector' | 'keyword';
};
