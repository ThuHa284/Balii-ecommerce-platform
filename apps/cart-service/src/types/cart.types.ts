// apps/cart-service/src/types/cart.types.ts

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  productSlug?: string;
  sku: string;
  thumbnailUrl?: string;
  variantLabel?: string;
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
