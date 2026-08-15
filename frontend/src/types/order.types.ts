import { Address } from './user.types';

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'refund_pending'
    | 'refund_failed'
    | 'manual_refund_pending'
    | 'completed';
  reason: string;
  imageUrls: string[];
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  restockedAt: string | null;
  refundMode: 'provider' | 'manual' | null;
  refundStatus: string | null;
  refundPaymentId: string | null;
  refundWorkflowStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requestedRefundAmount: number;
  approvedRefundAmount: number | null;
  manualRefundAmount: number | null;
  manualRefundReference: string | null;
  manualRefundNote: string | null;
  manualRefundEvidenceUrls: string[];
  manualRefundCompletedBy: string | null;
  items: ReturnRequestItem[];
}

export interface ReturnRequestItem {
  id: string;
  orderItemId: string;
  productName: string;
  sku: string;
  variantLabel: string | null;
  thumbnailUrl: string | null;
  requestedQuantity: number;
  acceptedQuantity: number | null;
  disposition: 'restock' | 'damaged' | 'rejected' | null;
  unitPrice: number;
  grossAmount: number;
  refundAmount: number;
}

export interface AdminReturnRequest extends ReturnRequest {
  orderCode: string;
  customerName: string;
  customerEmail: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  thumbnail: string;
  variantSize: string;
  variantColor: string;
  sku: string;
  campaignId?: string | null;
  campaignName?: string | null;
  campaignDiscountType?: 'PERCENT' | 'AMOUNT' | 'GIFT' | null;
  campaignDiscountValue?: number | null;
  campaignBadgeText?: string | null;
  price: number;
  quantity: number;
  totalPrice: number;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
