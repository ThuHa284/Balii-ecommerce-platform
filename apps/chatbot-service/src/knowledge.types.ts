export type ProductContext = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  material: string;
  targetGender: string;
  thumbnail: string;
  updatedAt?: string;
};

export type KnowledgeDocument = {
  id: string;
  type: 'faq' | 'policy' | 'product';
  title: string;
  content: string;
  metadata?: Record<string, string | number | null>;
};

export type RetrievedDocument = KnowledgeDocument & {
  score?: number;
};

export type KnowledgeSearchResult = {
  documents: RetrievedDocument[];
  suggestedProducts: ProductContext[];
  retrievalMode: 'vector' | 'keyword';
};
