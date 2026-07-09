// apps/cart-service/src/types/cart.types.ts

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug?: string;
  sku: string;
  thumbnailUrl?: string;
  variantLabel?: string;
  variantSize?: string;
  variantColor?: string;
  campaignId?: string | null;
  campaignName?: string | null;
  campaignDiscountType?: 'PERCENT' | 'AMOUNT' | 'GIFT' | null;
  campaignDiscountValue?: number | null;
  campaignBadgeText?: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  ownerKey: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  updatedAt: string;
}
