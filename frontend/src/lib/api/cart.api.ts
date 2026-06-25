import { Cart } from '@/types/cart.types';
import apiClient from './client';
import { mapCart } from './adapters';

type BackendCart = Parameters<typeof mapCart>[0];

function ensureSessionId() {
  if (typeof window === 'undefined') {
    return;
  }

  const current = window.localStorage.getItem('balii-session-id');
  if (!current) {
    window.localStorage.setItem('balii-session-id', crypto.randomUUID());
  }
}

export async function getCart(): Promise<Cart> {
  ensureSessionId();
  const { data } = await apiClient.get<BackendCart>('/cart');
  return mapCart(data);
}

export async function addToCart(
  _productId: string,
  variantId: string,
  quantity: number,
): Promise<Cart> {
  ensureSessionId();
  const { data } = await apiClient.post<BackendCart>('/cart/items', {
    variantId,
    quantity,
  });
  return mapCart(data);
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
): Promise<Cart> {
  ensureSessionId();
  const { data } = await apiClient.patch<BackendCart>(`/cart/items/${itemId}`, {
    quantity,
  });
  return mapCart(data);
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  ensureSessionId();
  const { data } = await apiClient.delete<BackendCart>(`/cart/items/${itemId}`);
  return mapCart(data);
}

export async function clearCartApi(): Promise<void> {
  ensureSessionId();
  await apiClient.delete('/cart');
}

export async function mergeGuestCartApi(): Promise<Cart | null> {
  ensureSessionId();

  if (typeof window === 'undefined') {
    return null;
  }

  const sessionId = window.localStorage.getItem('balii-session-id');
  if (!sessionId) {
    return null;
  }

  const { data } = await apiClient.post<BackendCart>('/cart/merge', {
    sessionId,
  });
  return mapCart(data);
}
