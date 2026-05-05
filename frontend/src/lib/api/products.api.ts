import { Product, ProductFilter, Category } from "@/types/product.types";
import { PaginatedResponse, ApiResponse } from "@/types/api.types";
import apiClient from "./client";
import { MOCK_PRODUCTS } from "./mock-data";

const USE_MOCK = true;

export async function getProducts(
  filters?: ProductFilter
): Promise<{ products: Product[]; meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }> {
  if (USE_MOCK) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 12;
    let filtered = [...MOCK_PRODUCTS];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filters?.categorySlug) {
      filtered = filtered.filter((p) => p.category.slug === filters.categorySlug);
    }
    if (filters?.sort === "price_asc") filtered.sort((a, b) => (a.salePrice || a.basePrice) - (b.salePrice || b.basePrice));
    if (filters?.sort === "price_desc") filtered.sort((a, b) => (b.salePrice || b.basePrice) - (a.salePrice || a.basePrice));
    return new Promise((resolve) =>
      setTimeout(() => resolve({
        products: filtered.slice((page - 1) * limit, page * limit),
        meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit), hasNext: page * limit < filtered.length, hasPrev: page > 1 },
      }), 600)
    );
  }
  const { data } = await apiClient.get<PaginatedResponse<Product>>("/products", { params: filters });
  return { products: data.data, meta: data.meta };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(MOCK_PRODUCTS.find((p) => p.slug === slug) || null), 500)
    );
  }
  const { data } = await apiClient.get<ApiResponse<Product>>(`/products/${slug}`);
  return data.data;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(MOCK_PRODUCTS.filter((p) => p.isFeatured)), 500)
    );
  }
  const { data } = await apiClient.get<ApiResponse<Product[]>>("/products/featured");
  return data.data;
}

export async function getNewProducts(): Promise<Product[]> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(MOCK_PRODUCTS.filter((p) => p.isNew)), 500)
    );
  }
  const { data } = await apiClient.get<ApiResponse<Product[]>>("/products/new");
  return data.data;
}
