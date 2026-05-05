import { create } from "zustand";
import { CartItem } from "@/types/cart.types";

interface CartState {
  items: CartItem[];
  isCartDrawerOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCartDrawer: () => void;
  setCartDrawerOpen: (open: boolean) => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isCartDrawerOpen: false,
  addItem: (item) => {
    const existing = get().items.find(
      (i) => i.productId === item.productId && i.variant.id === item.variant.id
    );
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.id === existing.id
            ? { ...i, quantity: i.quantity + item.quantity, totalPrice: (i.quantity + item.quantity) * i.price }
            : i
        ),
      });
    } else {
      set({ items: [...get().items, item] });
    }
  },
  removeItem: (itemId) => set({ items: get().items.filter((i) => i.id !== itemId) }),
  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter((i) => i.id !== itemId) });
    } else {
      set({
        items: get().items.map((i) =>
          i.id === itemId ? { ...i, quantity, totalPrice: quantity * i.price } : i
        ),
      });
    }
  },
  clearCart: () => set({ items: [] }),
  toggleCartDrawer: () => set({ isCartDrawerOpen: !get().isCartDrawerOpen }),
  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),
  subtotal: () => get().items.reduce((sum, item) => sum + item.totalPrice, 0),
  itemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
}));
