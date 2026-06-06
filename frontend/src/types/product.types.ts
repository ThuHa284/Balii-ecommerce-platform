export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  basePrice: number;
  salePrice: number | null;
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
  createdAt: string;
  updatedAt: string;
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
