import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types/product.types";
import { toast } from "sonner";

interface CompareStore {
  compareItems: Product[];
  toggleCompare: (product: Product) => void;
  removeItem: (productId: string) => void;
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      compareItems: [],

      toggleCompare: (product: Product) => {
        const items = get().compareItems;
        const exists = items.some((item) => item.id === product.id);

        if (exists) {
          set({ compareItems: items.filter((item) => item.id !== product.id) });
          toast.info(`Đã xoá "${product.name}" khỏi danh sách so sánh.`);
        } else {
          if (items.length >= 3) {
            toast.warning("Bạn chỉ có thể so sánh tối đa 3 sản phẩm cùng lúc!");
            return;
          }
          set({ compareItems: [...items, product] });
          toast.success(`Đã thêm "${product.name}" vào danh sách so sánh.`, {
            icon: "⚖️",
          });
        }
      },

      removeItem: (productId: string) => {
        const items = get().compareItems;
        set({ compareItems: items.filter((item) => item.id !== productId) });
      },

      clearCompare: () => {
        set({ compareItems: [] });
      },

      isInCompare: (productId: string) => {
        return get().compareItems.some((item) => item.id === productId);
      },
    }),
    {
      name: "balii-compare-storage",
    }
  )
);
