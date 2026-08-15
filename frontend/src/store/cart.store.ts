import { create } from 'zustand';
import { Cart, CartItem } from '@/types/cart.types';
import {
  addToCart,
  clearCartApi,
  getCart,
  removeCartItem,
  updateCartItem,
} from '@/lib/api/cart.api';

interface CartState {
  items: CartItem[];
  promotionItems: CartItem[];
  serverSubtotal: number;
  serverShippingFee: number;
  serverDiscount: number;
  serverTotal: number;
  isCartDrawerOpen: boolean;
  isLoading: boolean;
  hydrateCart: () => Promise<void>;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCartDrawer: () => void;
  setCartDrawerOpen: (open: boolean) => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  promotionItems: [],
  serverSubtotal: 0,
  serverShippingFee: 0,
  serverDiscount: 0,
  serverTotal: 0,
  isCartDrawerOpen: false,
  isLoading: false,
  hydrateCart: async () => {
    set({ isLoading: true });
    try {
      const cart = await getCart();
      setCartResponse(set, cart);
    } catch {
      // Background cart hydration should not surface as an unhandled promise when the service is unavailable.
      set({ items: [], promotionItems: [] });
    } finally {
      set({ isLoading: false });
    }
  },
  addItem: async (item) => {
    set({ isLoading: true });
    try {
      const cart = await addToCart(
        item.productId,
        item.variant.id,
        item.quantity,
      );
      setCartResponse(set, cart);
    } finally {
      set({ isLoading: false });
    }
  },
  removeItem: async (itemId) => {
    set({ isLoading: true });
    try {
      const cart = await removeCartItem(itemId);
      setCartResponse(set, cart);
    } finally {
      set({ isLoading: false });
    }
  },
  updateQuantity: async (itemId, quantity) => {
    set({ isLoading: true });
    try {
      const cart =
        quantity <= 0
          ? await removeCartItem(itemId)
          : await updateCartItem(itemId, quantity);
      setCartResponse(set, cart);
    } finally {
      set({ isLoading: false });
    }
  },
  clearCart: async () => {
    set({ isLoading: true });
    try {
      await clearCartApi();
      set({
        items: [],
        promotionItems: [],
        serverSubtotal: 0,
        serverShippingFee: 0,
        serverDiscount: 0,
        serverTotal: 0,
      });
    } finally {
      set({ isLoading: false });
    }
  },
  toggleCartDrawer: () => set({ isCartDrawerOpen: !get().isCartDrawerOpen }),
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
  subtotal: () => get().items.reduce((sum, item) => sum + item.totalPrice, 0),
  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));

function setCartResponse(set: (state: Partial<CartState>) => void, cart: Cart) {
  set({
    items: cart.items,
    promotionItems: cart.promotionItems,
    serverSubtotal: cart.subtotal,
    serverShippingFee: cart.shippingFee,
    serverDiscount: cart.discount,
    serverTotal: cart.total,
  });
}
