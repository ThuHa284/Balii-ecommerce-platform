export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  salePrice: number | null;
  scheduledSalePrice?: number | null;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  isSaleActive?: boolean;
  targetGender?: 'male' | 'female' | 'unisex';
  recommendedAgeGroups?: string[];
  categoryId: string;
  category: Category;
  images: string[];
  thumbnail: string;
  variants: ProductVariant[];
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  isFeatured: boolean;
  isNew: boolean;
  tags: string[];
  activeCampaign?: ActiveCampaignSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveCampaignSummary {
  id: string;
  name: string;
  slug: string;
  discountType: CampaignDiscountType;
  discountValue: number | null;
  giftName: string;
  giftDescription: string;
  badgeText: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  colorCode: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  images: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  parentId: string | null;
  children: Category[];
  productCount: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  productId: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
}

export interface ProductFilter {
  categorySlug?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  sort?: string;
  page?: number;
  limit?: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  image: string;
  bannerImage: string;
  productIds: string[];
  season: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type CampaignDiscountType = 'PERCENT' | 'AMOUNT' | 'GIFT';

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  image: string;
  bannerImage: string;
  productIds: string[];
  discountType: CampaignDiscountType;
  discountValue: number | null;
  giftName: string;
  giftDescription: string;
  badgeText: string;
  priorityOrder: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  isLive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ComboTier {
  id: string;
  name: string;
  minItems: number;
  freeShorts: number;
  shortsPrice: number; // 0 = free, 119000 = discounted
  badge: string;
  description: string;
  icon: string;
}
