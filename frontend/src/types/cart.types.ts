import { ProductVariant } from "./product.types";

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  thumbnail: string;
  variant: ProductVariant;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  coupon: Coupon | null;
  itemCount: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number | null;
  expiresAt: string;
}
