import {
  CreateVoucherData,
  Voucher,
  VoucherDiscountType,
  UserVoucher,
} from '@/types/voucher.types';

const USE_MOCK = true;

const mockVouchers: Voucher[] = [
  {
    id: 'vc_001',
    code: 'WELCOME20',
    name: 'Chào mừng thành viên mới',
    description: 'Giảm 20% cho đơn hàng đầu tiên',
    discountType: VoucherDiscountType.PERCENT,
    discountValue: 20,
    minOrderValue: 500000,
    maxDiscount: 200000,
    usageLimit: 1000,
    usedCount: 456,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'vc_002',
    code: 'SUMMER50K',
    name: 'Ưu đãi mùa hè',
    description: 'Giảm 50.000đ cho đơn từ 300.000đ',
    discountType: VoucherDiscountType.FIXED,
    discountValue: 50000,
    minOrderValue: 300000,
    maxDiscount: null,
    usageLimit: 500,
    usedCount: 123,
    startDate: '2024-05-01T00:00:00Z',
    endDate: '2025-08-31T23:59:59Z',
    isActive: true,
    createdAt: '2024-04-20T00:00:00Z',
    updatedAt: '2024-05-01T00:00:00Z',
  },
  {
    id: 'vc_003',
    code: 'VIP30',
    name: 'Ưu đãi VIP',
    description: 'Giảm 30% cho khách hàng thân thiết',
    discountType: VoucherDiscountType.PERCENT,
    discountValue: 30,
    minOrderValue: 800000,
    maxDiscount: 300000,
    usageLimit: 200,
    usedCount: 189,
    startDate: '2024-02-01T00:00:00Z',
    endDate: '2025-06-30T23:59:59Z',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
  },
  {
    id: 'vc_004',
    code: 'FREESHIP',
    name: 'Miễn phí vận chuyển',
    description: 'Giảm 30.000đ phí ship cho mọi đơn hàng',
    discountType: VoucherDiscountType.FIXED,
    discountValue: 30000,
    minOrderValue: 0,
    maxDiscount: null,
    usageLimit: 2000,
    usedCount: 1876,
    startDate: '2024-01-15T00:00:00Z',
    endDate: '2025-12-31T23:59:59Z',
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 'vc_005',
    code: 'NEWYEAR100K',
    name: 'Mừng năm mới',
    description: 'Giảm 100.000đ cho đơn từ 1.000.000đ',
    discountType: VoucherDiscountType.FIXED,
    discountValue: 100000,
    minOrderValue: 1000000,
    maxDiscount: null,
    usageLimit: 300,
    usedCount: 300,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-02-28T23:59:59Z',
    isActive: false,
    createdAt: '2023-12-25T00:00:00Z',
    updatedAt: '2024-02-28T23:59:59Z',
  },
  {
    id: 'vc_006',
    code: 'SILK15',
    name: 'Bộ sưu tập Lụa',
    description: 'Giảm 15% cho sản phẩm lụa cao cấp',
    discountType: VoucherDiscountType.PERCENT,
    discountValue: 15,
    minOrderValue: 600000,
    maxDiscount: 150000,
    usageLimit: 800,
    usedCount: 234,
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2025-09-30T23:59:59Z',
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-10T00:00:00Z',
  },
];

const mockUserVouchers: UserVoucher[] = [
  {
    id: 'uv_001',
    voucher: mockVouchers[0],
    savedAt: '2024-03-10T08:00:00Z',
    isUsed: false,
    usedAt: null,
  },
  {
    id: 'uv_002',
    voucher: mockVouchers[3],
    savedAt: '2024-03-12T14:30:00Z',
    isUsed: true,
    usedAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'uv_003',
    voucher: mockVouchers[5],
    savedAt: '2024-03-14T09:00:00Z',
    isUsed: false,
    usedAt: null,
  },
];

export async function getAvailableVouchers(): Promise<Voucher[]> {
  if (!USE_MOCK) return [];

  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          mockVouchers.filter(
            (voucher) =>
              voucher.isActive &&
              new Date(voucher.endDate) > new Date() &&
              voucher.usedCount < voucher.usageLimit,
          ),
        ),
      500,
    ),
  );
}

export async function getMyVouchers(): Promise<UserVoucher[]> {
  if (!USE_MOCK) return [];
  return new Promise((resolve) =>
    setTimeout(() => resolve(mockUserVouchers), 500),
  );
}

export async function saveVoucher(code: string): Promise<UserVoucher> {
  if (!USE_MOCK) throw new Error('Not implemented');

  const voucher = mockVouchers.find((item) => item.code === code);
  if (!voucher) {
    throw new Error('Voucher không tồn tại');
  }

  const userVoucher: UserVoucher = {
    id: `uv_${Date.now()}`,
    voucher,
    savedAt: new Date().toISOString(),
    isUsed: false,
    usedAt: null,
  };

  return new Promise((resolve) => setTimeout(() => resolve(userVoucher), 500));
}

export async function getAdminVouchers(): Promise<Voucher[]> {
  if (!USE_MOCK) return [];
  return new Promise((resolve) => setTimeout(() => resolve(mockVouchers), 500));
}

export async function createVoucher(data: CreateVoucherData): Promise<Voucher> {
  if (!USE_MOCK) throw new Error('Not implemented');

  const newVoucher: Voucher = {
    ...data,
    id: `vc_${Date.now()}`,
    usedCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve) => setTimeout(() => resolve(newVoucher), 600));
}

export async function updateVoucher(
  id: string,
  data: Partial<CreateVoucherData>,
): Promise<Voucher> {
  if (!USE_MOCK) throw new Error('Not implemented');

  const voucher = mockVouchers.find((item) => item.id === id);
  if (!voucher) {
    throw new Error('Voucher không tồn tại');
  }

  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          ...voucher,
          ...data,
          updatedAt: new Date().toISOString(),
        }),
      500,
    ),
  );
}

export async function deleteVoucher(id: string): Promise<void> {
  if (!USE_MOCK) return;
  void id;
  return new Promise((resolve) => setTimeout(resolve, 500));
}
