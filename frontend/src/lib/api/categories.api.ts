import apiClient from './client';
import { mapCategory } from './adapters';
import { Category } from '@/types/product.types';

export interface CategoryPayload {
  name: string;
  slug: string;
  imageUrl?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

type CategoryResponse = Parameters<typeof mapCategory>[0];

export async function getCategories(): Promise<Category[]> {
  const { data } = await apiClient.get<CategoryResponse[]>('/categories');
  return data.map(mapCategory);
}

export async function createCategory(
  payload: CategoryPayload,
): Promise<Category> {
  const { data } = await apiClient.post<CategoryResponse>(
    '/categories',
    payload,
  );
  return mapCategory(data);
}

export async function updateCategory(
  id: string,
  payload: Partial<CategoryPayload>,
): Promise<Category> {
  const { data } = await apiClient.patch<CategoryResponse>(
    `/categories/${id}`,
    payload,
  );
  return mapCategory(data);
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const { data } = await apiClient.get<CategoryResponse>(`/categories/${id}`);
    return mapCategory(data);
  } catch {
    return null;
  }
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  try {
    const { data } = await apiClient.get<CategoryResponse>(
      `/categories/slug/${slug}`,
    );
    return mapCategory(data);
  } catch {
    return null;
  }
}
