export interface PersonAnalysis {
  gender?: string;
  genderConfidence?: number;
  ageGroup?: string;
  ageConfidence?: number;
}

export interface SuggestedFilters {
  gender?: string;
  ageGroup?: string;
}

export interface TryOnRequest {
  userImage: string;
  garmentImage: string;
  productId?: string;
  targetGender?: 'male' | 'female' | 'unisex';
  recommendedAgeGroups?: string[];
  category?: 'auto' | 'tops' | 'bottoms' | 'one-pieces';
  mode?: 'performance' | 'balanced' | 'quality';
  garmentPhotoType?: 'auto' | 'model' | 'flat-lay';
}

export interface TryOnProductDesignRequest {
  baseGarmentImage: string;
  colorReferenceImage: string;
  patternReferenceImage: string;
  productId?: string;
}

export interface TryOnResult {
  id: string;
  resultImageUrl: string;
  resultUrl: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  confidence: number;
  createdAt: string;
  personAnalysis?: PersonAnalysis | null;
  cloudinaryPublicId?: string;
}

export interface TryOnSyncResponse {
  success?: boolean;
  needConfirmation?: boolean;
  code?: string;
  id?: string;
  status?: string;
  resultUrl?: string;
  cloudinaryPublicId?: string;
  message?: string;
  error?: string;
  personAnalysis?: PersonAnalysis;
  warnings?: string[];
  suggestions?: string[];
  suggestedFilters?: SuggestedFilters;
}

export interface TryOnHistoryRecord {
  id: string;
  userId?: string | null;
  productId?: string | null;
  resultUrl?: string | null;
  detectedGender?: string | null;
  detectedAgeGroup?: string | null;
  status: string;
  createdAt: string;
  needConfirmation?: boolean;
}

export interface TryOnStats {
  total: number;
  completed: number;
  failed: number;
  needConfirmation: number;
}

export type TryOnStep = 'upload' | 'garment' | 'result';

export type GeneratingPhase =
  | 'analyzing'
  | 'mapping'
  | 'rendering'
  | 'finalizing';

export interface TryOnHistoryItem {
  id: string;
  resultImage: string;
  garmentName: string;
  garmentThumbnail: string;
  createdAt: string;
}
