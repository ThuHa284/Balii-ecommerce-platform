import apiClient from './client';
import { mapCollection } from './adapters';
import { Collection } from '@/types/product.types';

export interface CollectionPayload {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  productIds?: string[];
  season?: string;
  isActive?: boolean;
}

type CollectionResponse = Collection;
type CollectionListResponse = CollectionResponse[];

export async function getCollections(): Promise<Collection[]> {
  const { data } = await apiClient.get<CollectionListResponse>('/collections');
  return data.map(mapCollection);
}

export async function getCollectionBySlug(
  slug: string,
): Promise<Collection | null> {
  try {
    const { data } = await apiClient.get<CollectionResponse>(
      `/collections/slug/${slug}`,
    );
    return mapCollection(data);
  } catch {
    return null;
  }
}

export async function createCollection(
  payload: CollectionPayload,
): Promise<Collection> {
  const { data } = await apiClient.post<CollectionResponse>(
    '/collections',
    payload,
  );
  return mapCollection(data);
}

export async function updateCollection(
  id: string,
  payload: Partial<CollectionPayload>,
): Promise<Collection> {
  const { data } = await apiClient.patch<CollectionResponse>(
    `/collections/${id}`,
    payload,
  );
  return mapCollection(data);
}

export async function deleteCollection(id: string): Promise<void> {
  await apiClient.delete(`/collections/${id}`);
}
