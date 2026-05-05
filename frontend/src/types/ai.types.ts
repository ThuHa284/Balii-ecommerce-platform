export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  productSuggestions?: AISuggestion[];
}

export interface AISuggestion {
  productId: string;
  productName: string;
  productSlug: string;
  thumbnail: string;
  price: number;
  reason: string;
}

export interface RecommendedProduct {
  productId: string;
  productName: string;
  productSlug: string;
  thumbnail: string;
  price: number;
  salePrice: number | null;
  score: number;
}
