import { create } from "zustand";

interface WishlistState {
  items: string[]; // Array of product IDs in wishlist
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  toggleWishlist: (productId) => {
    const exists = get().items.includes(productId);
    if (exists) {
      set({ items: get().items.filter((id) => id !== productId) });
    } else {
      set({ items: [...get().items, productId] });
    }
  },
  isInWishlist: (productId) => get().items.includes(productId),
  clearWishlist: () => set({ items: [] }),
}));
