import { Cart, CartItem } from "@/types/cart.types";
import { ApiResponse } from "@/types/api.types";
import apiClient from "./client";

const USE_MOCK = true;

export async function getCart(): Promise<Cart> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ items: [], subtotal: 0, discount: 0, shippingFee: 0, total: 0, coupon: null, itemCount: 0 }), 300)
    );
  }
  const { data } = await apiClient.get<ApiResponse<Cart>>("/cart");
  return data.data;
}

export async function addToCart(productId: string, variantId: string, quantity: number): Promise<Cart> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ items: [], subtotal: 0, discount: 0, shippingFee: 0, total: 0, coupon: null, itemCount: quantity }), 500)
    );
  }
  const { data } = await apiClient.post<ApiResponse<Cart>>("/cart/items", { productId, variantId, quantity });
  return data.data;
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ items: [], subtotal: 0, discount: 0, shippingFee: 0, total: 0, coupon: null, itemCount: 0 }), 300)
    );
  }
  const { data } = await apiClient.patch<ApiResponse<Cart>>(`/cart/items/${itemId}`, { quantity });
  return data.data;
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ items: [], subtotal: 0, discount: 0, shippingFee: 0, total: 0, coupon: null, itemCount: 0 }), 300)
    );
  }
  const { data } = await apiClient.delete<ApiResponse<Cart>>(`/cart/items/${itemId}`);
  return data.data;
}

export async function applyCoupon(code: string): Promise<Cart> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ items: [], subtotal: 0, discount: 50000, shippingFee: 0, total: 0, coupon: { id: "cpn_001", code, discountType: "fixed", discountValue: 50000, minOrderValue: 500000, maxDiscount: null, expiresAt: "2025-12-31" }, itemCount: 0 }), 500)
    );
  }
  const { data } = await apiClient.post<ApiResponse<Cart>>("/cart/coupon", { code });
  return data.data;
}
