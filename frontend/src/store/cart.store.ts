import { create } from "zustand";
import { CartItem } from "@/types/cart.types";
import {
  addToCart,
  clearCartApi,
  getCart,
  removeCartItem,
  updateCartItem,
} from "@/lib/api/cart.api";

interface CartState {
  items: CartItem[];
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
  isCartDrawerOpen: false,
  isLoading: false,
  hydrateCart: async () => {
    set({ isLoading: true });
    try {
      const cart = await getCart();
      set({ items: cart.items });
    } finally {
      set({ isLoading: false });
    }
  },
  addItem: async (item) => {
    set({ isLoading: true });
    try {
      const cart = await addToCart(item.productId, item.variant.id, item.quantity);
      set({ items: cart.items });
    } finally {
      set({ isLoading: false });
    }
  },
  removeItem: async (itemId) => {
    set({ isLoading: true });
    try {
      const cart = await removeCartItem(itemId);
      set({ items: cart.items });
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
      set({ items: cart.items });
    } finally {
      set({ isLoading: false });
    }
  },
  clearCart: async () => {
    set({ isLoading: true });
    try {
      await clearCartApi();
      set({ items: [] });
    } finally {
      set({ isLoading: false });
    }
  },
  toggleCartDrawer: () => set({ isCartDrawerOpen: !get().isCartDrawerOpen }),
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
  subtotal: () => get().items.reduce((sum, item) => sum + item.totalPrice, 0),
  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
