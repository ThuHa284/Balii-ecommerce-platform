import apiClient from './client';
import { LocationOption } from '@/types/location.types';

const provinceCache = new Map<string, Promise<LocationOption[]>>();
const districtCache = new Map<number, Promise<LocationOption[]>>();
const wardCache = new Map<number, Promise<LocationOption[]>>();

function normalizeLocations(data: unknown): LocationOption[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((item) => {
    const value = item as Record<string, unknown>;
    return {
      id: Number(value.id ?? 0),
      name: String(value.name ?? ''),
      code:
        typeof value.code === 'string' || value.code == null
          ? (value.code as string | null | undefined)
          : null,
    };
  });
}

export async function getProvinces(): Promise<LocationOption[]> {
  const cacheKey = 'all';

  if (!provinceCache.has(cacheKey)) {
    provinceCache.set(
      cacheKey,
      apiClient
        .get('/locations/provinces')
        .then(({ data }) => normalizeLocations(data)),
    );
  }

  return provinceCache.get(cacheKey)!;
}

export async function getDistricts(
  provinceId: number,
): Promise<LocationOption[]> {
  if (!districtCache.has(provinceId)) {
    districtCache.set(
      provinceId,
      apiClient
        .get('/locations/districts', {
          params: { provinceId },
        })
        .then(({ data }) => normalizeLocations(data)),
    );
  }

  return districtCache.get(provinceId)!;
}

export async function getWards(districtId: number): Promise<LocationOption[]> {
  if (!wardCache.has(districtId)) {
    wardCache.set(
      districtId,
      apiClient
        .get('/locations/wards', {
          params: { districtId },
        })
        .then(({ data }) => normalizeLocations(data)),
    );
  }

  return wardCache.get(districtId)!;
}
