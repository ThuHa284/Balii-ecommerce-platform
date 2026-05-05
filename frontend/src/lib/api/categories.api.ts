import { Category } from "@/types/product.types";
import { ApiResponse } from "@/types/api.types";
import apiClient from "./client";
import { MOCK_CATEGORIES } from "./mock-data";

const USE_MOCK = true;

export async function getCategories(): Promise<Category[]> {
  if (USE_MOCK) {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_CATEGORIES), 400));
  }
  const { data } = await apiClient.get<ApiResponse<Category[]>>("/categories");
  return data.data;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(MOCK_CATEGORIES.find((c) => c.slug === slug) || null), 400)
    );
  }
  const { data } = await apiClient.get<ApiResponse<Category>>(`/categories/${slug}`);
  return data.data;
}
