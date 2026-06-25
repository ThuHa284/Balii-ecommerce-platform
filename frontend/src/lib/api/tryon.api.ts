import axios from 'axios';
import apiClient from './client';
import { SOCKET_URL } from '@/lib/constants';
import {
  TryOnHistoryRecord,
  TryOnRequest,
  TryOnResult,
  TryOnStats,
  TryOnSyncResponse,
} from '@/types/tryon.types';

const TRYON_API_BASE_URL = `${SOCKET_URL.replace(/\/$/, '')}/try-on`;

function getCurrentUserHeaders() {
  if (typeof window === 'undefined' || !window.__BALII_USER_ID__) {
    return {};
  }

  return {
    'x-user-id': window.__BALII_USER_ID__,
  };
}

async function imageUrlToFile(
  imageUrl: string,
  baseName: string,
): Promise<File> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Không thể tải ảnh ${baseName} để gửi đến dịch vụ try-on.`);
  }

  const blob = await response.blob();
  const extension = blob.type.split('/')[1] || 'jpg';

  return new File([blob], `${baseName}.${extension}`, {
    type: blob.type || 'image/jpeg',
  });
}

function normalizeTryOnResponse(payload: unknown): TryOnSyncResponse {
  const response = payload as {
    success?: boolean;
    needConfirmation?: boolean;
    code?: string;
    message?: string;
    error?: string;
    data?: Record<string, unknown>;
  };

  const data = (response.data ?? {}) as TryOnSyncResponse;

  return {
    success: response.success,
    needConfirmation: response.needConfirmation,
    code: response.code,
    message: response.message,
    error: response.error,
    id: data.id,
    status: data.status,
    resultUrl: data.resultUrl,
    cloudinaryPublicId: data.cloudinaryPublicId,
    personAnalysis: data.personAnalysis,
    warnings: data.warnings,
    suggestions: data.suggestions,
    suggestedFilters: data.suggestedFilters,
  };
}

function normalizeTryOnError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: string | Record<string, unknown> }
      | undefined;

    const message =
      typeof responseData?.message === 'string'
        ? responseData.message
        : error.message || 'Không thể kết nối đến dịch vụ try-on.';

    return new Error(message);
  }

  return error instanceof Error
    ? error
    : new Error('Có lỗi xảy ra khi tạo ảnh try-on.');
}

export async function buildTryOnFormData(
  request: TryOnRequest,
  confirmWarnings = false,
) {
  const [modelImageFile, garmentImageFile] = await Promise.all([
    imageUrlToFile(request.userImage, 'model-image'),
    imageUrlToFile(request.garmentImage, 'garment-image'),
  ]);

  const formData = new FormData();
  formData.append('modelImage', modelImageFile);
  formData.append('garmentImage', garmentImageFile);
  formData.append('category', request.category || 'auto');
  formData.append('mode', request.mode || 'performance');
  formData.append('garmentPhotoType', request.garmentPhotoType || 'auto');

  if (request.productId) {
    formData.append('productId', request.productId);
  }

  if (request.targetGender) {
    formData.append('targetGender', request.targetGender);
  }

  if (request.recommendedAgeGroups?.length) {
    formData.append(
      'recommendedAgeGroups',
      request.recommendedAgeGroups.join(','),
    );
  }

  if (confirmWarnings) {
    formData.append('confirmWarnings', 'true');
  }

  return formData;
}

export async function createTryOnSync(
  formData: FormData,
): Promise<TryOnSyncResponse> {
  const response = await axios.post(`${TRYON_API_BASE_URL}/sync`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...getCurrentUserHeaders(),
    },
    timeout: 180000,
  });

  return normalizeTryOnResponse(response.data);
}

export async function submitTryOnRequest(
  request: TryOnRequest,
  confirmWarnings = false,
): Promise<TryOnSyncResponse> {
  try {
    const formData = await buildTryOnFormData(request, confirmWarnings);
    return await createTryOnSync(formData);
  } catch (error) {
    throw normalizeTryOnError(error);
  }
}

export async function generateTryOn(
  request: TryOnRequest,
): Promise<TryOnResult> {
  const payload = await submitTryOnRequest(request);

  if (payload.needConfirmation) {
    throw new Error(
      payload.message || 'Cần xác nhận trước khi tiếp tục thử đồ.',
    );
  }

  if (payload.status !== 'completed' || !payload.resultUrl) {
    throw new Error(
      payload.message || payload.error || 'Try-on chưa hoàn tất.',
    );
  }

  return {
    id: payload.id || `tryon_${Date.now()}`,
    resultImageUrl: payload.resultUrl,
    resultUrl: payload.resultUrl,
    status: 'completed',
    confidence: 0,
    createdAt: new Date().toISOString(),
    personAnalysis: payload.personAnalysis,
    cloudinaryPublicId: payload.cloudinaryPublicId,
  };
}

export async function getTryOnHistory(): Promise<TryOnHistoryRecord[]> {
  const { data } = await apiClient.get<TryOnHistoryRecord[]>(
    '/try-on/history',
    {
      headers: getCurrentUserHeaders(),
    },
  );

  return data;
}

export async function getTryOnStats(): Promise<TryOnStats> {
  const { data } = await apiClient.get<TryOnStats>('/try-on/stats', {
    headers: getCurrentUserHeaders(),
  });
  return data;
}
