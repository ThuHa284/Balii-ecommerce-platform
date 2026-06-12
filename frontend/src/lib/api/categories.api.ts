import apiClient from "./client";
import { mapCategory } from "./adapters";
import { Category } from "@/types/product.types";

export interface CategoryPayload {
  name: string;
  slug: string;
  imageUrl?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get("/categories");
  return (data as any[]).map(mapCategory);
}

export async function createCategory(
  payload: CategoryPayload,
): Promise<Category> {
  const { data } = await apiClient.post("/categories", payload);
  return mapCategory(data);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const { data } = await apiClient.get(`/categories/slug/${slug}`);
    return mapCategory(data);
  } catch {
    return null;
  }
}
