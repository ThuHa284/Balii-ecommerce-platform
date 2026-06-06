export interface TryOnRequest {
  userImage: string; // base64 or object URL
  garmentImage: string; // product image URL or base64
  productId?: string;
  category?: "auto" | "tops" | "bottoms" | "one-pieces";
  mode?: "performance" | "balanced" | "quality";
  garmentPhotoType?: "auto" | "model" | "flat-lay";
}

export interface TryOnResult {
  id: string;
  resultImageUrl: string;
  status: "pending" | "generating" | "completed" | "failed";
  confidence: number; // 0–100
  createdAt: string;
}

export type TryOnStep = "upload" | "garment" | "result";

export type GeneratingPhase =
  | "analyzing"    // Đang phân tích ảnh...
  | "mapping"      // Đang mapping quần áo...
  | "rendering"    // Đang render kết quả...
  | "finalizing";  // Đang hoàn thiện...

export interface TryOnHistoryItem {
  id: string;
  resultImage: string;
  garmentName: string;
  garmentThumbnail: string;
  createdAt: string;
}
