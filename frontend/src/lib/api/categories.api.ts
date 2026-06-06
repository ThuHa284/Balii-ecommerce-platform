import apiClient from "./client";
import { mapCategory } from "./adapters";
import { Category } from "@/types/product.types";

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get("/categories");
  return (data as any[]).map(mapCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const { data } = await apiClient.get(`/categories/slug/${slug}`);
    return mapCategory(data);
  } catch {
    return null;
  }
}
