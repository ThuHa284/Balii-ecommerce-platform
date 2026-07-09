import apiClient from './client';
import { mapProduct } from './adapters';
import { Product, ProductFilter } from '@/types/product.types';

export interface ProductPayload {
  categoryId?: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  originalPrice?: number;
  salePrice?: number | null;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  material?: string;
  targetGender?: 'male' | 'female' | 'unisex';
  recommendedAgeGroups?: string[];
  isActive?: boolean;
}

export interface ProductVariantPayload {
  id?: string;
  sku: string;
  price?: number;
  stockQuantity: number;
  reservedQuantity?: number;
  weightGram?: number;
  isActive?: boolean;
  itemType?: 'TOP' | 'BOTTOM' | 'SET';
  sizeLabel?: string;
  colorName?: string;
  colorCode?: string;
}

export interface ProductImageRecord {
  id: string;
  productId: string;
  variantId?: string | null;
  url: string;
  publicId?: string | null;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductImagePayload {
  variantId?: string | null;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  originalPrice: number | null;
  salePrice: number | null;
  targetGender: string;
  recommendedAgeGroups: string[];
  thumbnail: string;
}

type ProductResponse = Product;
type ProductListResponse = ProductResponse[];

export async function getProducts(filters?: ProductFilter): Promise<{
  products: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const { data } = await apiClient.get<ProductListResponse>('/products', {
    params: {
      keyword: filters?.search,
    },
  });

  const products = data.map(mapProduct);
  let filtered = [...products];

  if (filters?.categorySlug) {
    filtered = filtered.filter(
      (product) => product.category?.slug === filters.categorySlug,
    );
  }
  if (filters?.minPrice != null) {
    filtered = filtered.filter(
      (product) =>
        (product.salePrice ?? product.basePrice) >= filters.minPrice!,
    );
  }
  if (filters?.maxPrice != null) {
    filtered = filtered.filter(
      (product) =>
        (product.salePrice ?? product.basePrice) <= filters.maxPrice!,
    );
  }
  if (filters?.sizes?.length) {
    filtered = filtered.filter((product) =>
      product.variants.some((variant) => filters.sizes?.includes(variant.size)),
    );
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 12;
  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return {
    products: paged,
    meta: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      hasNext: start + limit < filtered.length,
      hasPrev: page > 1,
    },
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const { data } = await apiClient.get<ProductResponse>(
      `/products/slug/${slug}`,
    );
    return mapProduct(data);
  } catch {
    return null;
  }
}

export async function getAdminProducts(keyword?: string): Promise<Product[]> {
  const { data } = await apiClient.get<ProductListResponse>('/products', {
    params: keyword ? { keyword } : undefined,
  });

  return data.map(mapProduct);
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await apiClient.post<ProductResponse>('/products', payload);
  return mapProduct(data);
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>,
): Promise<Product> {
  const { data } = await apiClient.patch<ProductResponse>(
    `/products/${id}`,
    payload,
  );
  return mapProduct(data);
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}

export async function createProductVariant(
  productId: string,
  payload: ProductVariantPayload,
) {
  const { data } = await apiClient.post<ProductVariantPayload>(
    `/products/${productId}/variants`,
    payload,
  );
  return data;
}

export async function updateProductVariant(
  id: string,
  payload: Partial<ProductVariantPayload>,
) {
  const { data } = await apiClient.patch<ProductVariantPayload>(
    `/variants/${id}`,
    payload,
  );
  return data;
}

export async function deleteProductVariant(id: string): Promise<void> {
  await apiClient.delete(`/variants/${id}`);
}

export async function getProductImages(
  productId: string,
): Promise<ProductImageRecord[]> {
  const { data } = await apiClient.get<ProductImageRecord[]>(
    `/products/${productId}/images`,
  );
  return data;
}

export async function uploadProductImage(
  productId: string,
  file: File,
  payload?: ProductImagePayload,
) {
  const formData = new FormData();
  formData.append('file', file);
  if (payload?.variantId) {
    formData.append('variantId', payload.variantId);
  }
  if (payload?.altText) {
    formData.append('altText', payload.altText);
  }
  if (payload?.sortOrder != null) {
    formData.append('sortOrder', String(payload.sortOrder));
  }
  if (payload?.isPrimary != null) {
    formData.append('isPrimary', String(payload.isPrimary));
  }

  const { data } = await apiClient.post<ProductImageRecord>(
    `/products/${productId}/images`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

export async function updateProductImage(
  id: string,
  payload: ProductImagePayload,
): Promise<ProductImageRecord> {
  const { data } = await apiClient.patch<ProductImageRecord>(
    `/products/images/${id}`,
    payload,
  );
  return data;
}

export async function deleteProductImage(id: string): Promise<void> {
  await apiClient.delete(`/products/images/${id}`);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const { products } = await getProducts({ page: 1, limit: 8 });
  return [...products]
    .sort(
      (a, b) =>
        b.totalReviews - a.totalReviews ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);
}

export async function getNewProducts(): Promise<Product[]> {
  const { products } = await getProducts({ page: 1, limit: 8 });
  return [...products]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6);
}

export async function getRecommendedProducts(
  gender: string,
  ageGroup: string,
): Promise<RecommendedProduct[]> {
  const { data } = await apiClient.get<{
    success: true;
    data: RecommendedProduct[];
  }>('/products/recommend', {
    params: {
      gender,
      ageGroup,
    },
  });

  return data.data ?? [];
}
