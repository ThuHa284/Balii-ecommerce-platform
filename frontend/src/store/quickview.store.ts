import { create } from "zustand";
import { Product } from "@/types/product.types";

interface QuickViewStore {
  isOpen: boolean;
  selectedProduct: Product | null;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;
}

export const useQuickViewStore = create<QuickViewStore>((set) => ({
  isOpen: false,
  selectedProduct: null,
  openQuickView: (product: Product) => {
    set({ isOpen: true, selectedProduct: product });
  },
  closeQuickView: () => {
    set({ isOpen: false, selectedProduct: null });
  },
}));
