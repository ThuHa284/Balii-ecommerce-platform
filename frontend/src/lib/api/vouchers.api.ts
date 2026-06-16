import apiClient from './client';
import {
  CreateVoucherData,
  UserVoucher,
  Voucher,
  VoucherDiscountType,
} from '@/types/voucher.types';

type VoucherApiResponse = {
  id: string;
  code: string;
  name?: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type UserVoucherApiResponse = {
  id: string;
  voucher: VoucherApiResponse;
  savedAt: string;
  isUsed: boolean;
  usedAt: string | null;
};

function mapVoucher(input: VoucherApiResponse): Voucher {
  return {
    id: input.id,
    code: input.code,
    name: input.name?.trim() || input.code,
    description: input.description?.trim() || '',
    discountType: input.discountType,
    discountValue: Number(input.discountValue ?? 0),
    minOrderValue: Number(input.minOrderValue ?? 0),
    maxDiscount: input.maxDiscount != null ? Number(input.maxDiscount) : null,
    usageLimit: Number(input.usageLimit ?? 999999999),
    usedCount: Number(input.usedCount ?? 0),
    startDate: input.startDate,
    endDate: input.endDate,
    isActive: Boolean(input.isActive),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
  };
}

function mapUserVoucher(input: UserVoucherApiResponse): UserVoucher {
  return {
    id: input.id,
    voucher: mapVoucher(input.voucher),
    savedAt: input.savedAt,
    isUsed: Boolean(input.isUsed),
    usedAt: input.usedAt,
  };
}

function toVoucherPayload(data: CreateVoucherData) {
  return {
    code: data.code,
    name: data.name,
    description: data.description,
    discountType: data.discountType,
    discountValue: data.discountValue,
    minOrderValue: data.minOrderValue,
    maxDiscount: data.maxDiscount,
    usageLimit: data.usageLimit,
    startDate: data.startDate,
    endDate: data.endDate,
    isActive: data.isActive,
  };
}

export async function getAvailableVouchers(): Promise<Voucher[]> {
  const { data } = await apiClient.get('/vouchers');
  return (data as VoucherApiResponse[]).map(mapVoucher);
}

export async function getMyVouchers(): Promise<UserVoucher[]> {
  const { data } = await apiClient.get('/vouchers/me');
  return (data as UserVoucherApiResponse[]).map(mapUserVoucher);
}

export async function saveVoucher(code: string): Promise<UserVoucher> {
  const { data } = await apiClient.post(`/vouchers/${code}/save`);
  return mapUserVoucher(data as UserVoucherApiResponse);
}

export async function getAdminVouchers(): Promise<Voucher[]> {
  const { data } = await apiClient.get('/admin/vouchers');
  return (data as VoucherApiResponse[]).map(mapVoucher);
}

export async function createVoucher(data: CreateVoucherData): Promise<Voucher> {
  const { data: response } = await apiClient.post(
    '/admin/vouchers',
    toVoucherPayload(data),
  );
  return mapVoucher(response as VoucherApiResponse);
}

export async function updateVoucher(
  id: string,
  data: Partial<CreateVoucherData>,
): Promise<Voucher> {
  const { data: response } = await apiClient.patch(
    `/admin/vouchers/${id}`,
    data,
  );
  return mapVoucher(response as VoucherApiResponse);
}

export async function deleteVoucher(id: string): Promise<void> {
  await apiClient.delete(`/admin/vouchers/${id}`);
}
