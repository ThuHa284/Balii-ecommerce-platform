export interface Voucher {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherValidationResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  voucher: Voucher;
}

export interface VoucherUsage {
  id: string;
  voucherId: string;
  userId: string;
  orderId: string;
  discountApplied: number;
  usedAt: string;
  voucherCode: string;
  voucherType: VoucherDiscountType;
}

export interface VoucherRedeemResult {
  success: boolean;
  discountAmount: number;
  finalAmount: number;
  usage: VoucherUsage;
  voucher: Voucher;
}

export enum VoucherDiscountType {
  PERCENT = "percent",
  FIXED = "fixed",
}

export enum VoucherStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  USED_UP = "used_up",
  INACTIVE = "inactive",
}

export interface UserVoucher {
  id: string;
  voucher: Voucher;
  savedAt: string;
  isUsed: boolean;
  usedAt: string | null;
}

export interface CreateVoucherData {
  code: string;
  name: string;
  description: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}
