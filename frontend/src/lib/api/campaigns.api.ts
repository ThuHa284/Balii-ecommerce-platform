import apiClient from './client';
import { mapCampaign } from './adapters';
import { Campaign, CampaignDiscountType } from '@/types/product.types';

export interface CampaignPayload {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  imageUrl?: string;
  bannerImageUrl?: string;
  productIds?: string[];
  discountType: CampaignDiscountType;
  discountValue?: number | null;
  giftName?: string;
  giftDescription?: string;
  badgeText?: string;
  priorityOrder?: number;
  startAt: string;
  endAt: string;
  isActive?: boolean;
}

type CampaignResponse = Campaign;
type CampaignListResponse = CampaignResponse[];

export async function uploadCampaignImage(
  file: File,
  kind: 'cover' | 'banner' = 'cover',
): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post<{ url: string; publicId: string }>(
    `/campaigns/images?kind=${kind}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return data;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get<CampaignListResponse>('/campaigns');
  return data.map(mapCampaign);
}

export async function getActiveCampaigns(): Promise<Campaign[]> {
  const { data } =
    await apiClient.get<CampaignListResponse>('/campaigns/active');
  return data.map(mapCampaign);
}

export async function getCampaignBySlug(
  slug: string,
): Promise<Campaign | null> {
  try {
    const { data } = await apiClient.get<CampaignResponse>(
      `/campaigns/slug/${slug}`,
    );
    return mapCampaign(data);
  } catch {
    return null;
  }
}

export async function createCampaign(
  payload: CampaignPayload,
): Promise<Campaign> {
  const { data } = await apiClient.post<CampaignResponse>(
    '/campaigns',
    payload,
  );
  return mapCampaign(data);
}

export async function updateCampaign(
  id: string,
  payload: Partial<CampaignPayload>,
): Promise<Campaign> {
  const { data } = await apiClient.patch<CampaignResponse>(
    `/campaigns/${id}`,
    payload,
  );
  return mapCampaign(data);
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiClient.delete(`/campaigns/${id}`);
}
