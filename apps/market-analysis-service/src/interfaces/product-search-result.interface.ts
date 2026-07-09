export interface ProductSearchResult {
  title: string;
  source?: string | null;
  link: string | null;
  imageUrl?: string | null;
  price?: string | null;
  extractedPrice?: number | null;
  currency?: string | null;
  rating?: number | null;
  reviews?: number | null;
  snippet?: string | null;
  engine: 'google_lens' | 'google_shopping' | 'google_images';
  confidenceScore: number;
  isSaved?: boolean;
  rawData?: Record<string, any>;
}

export interface ProductSearchResponse {
  success: true;
  keyword: string;
  imageUrl?: string;
  total: number;
  results: ProductSearchResult[];
}
