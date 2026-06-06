import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product } from "@/types/product.types";
import { TryOnStep, GeneratingPhase, TryOnHistoryItem } from "@/types/tryon.types";
import { toast } from "sonner";

interface TryOnState {
  // Images
  userImage: string | null;
  garmentImage: string | null;
  selectedProduct: Product | null;
  resultImage: string | null;

  // Flow control
  currentStep: TryOnStep;
  isGenerating: boolean;
  generationProgress: number;
  generatingPhase: GeneratingPhase;
  confidence: number | null;

  // UI
  showGuide: boolean;
  showCamera: boolean;

  // History
  history: TryOnHistoryItem[];

  // Actions
  setUserImage: (image: string | null) => void;
  setGarmentImage: (image: string | null, product?: Product | null) => void;
  setSelectedProduct: (product: Product | null) => void;
  setResultImage: (image: string | null) => void;
  setCurrentStep: (step: TryOnStep) => void;
  setIsGenerating: (value: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setGeneratingPhase: (phase: GeneratingPhase) => void;
  setConfidence: (value: number | null) => void;
  setShowGuide: (value: boolean) => void;
  setShowCamera: (value: boolean) => void;
  
  // History Actions
  saveToHistory: () => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  
  reset: () => void;
}

const initialState = {
  userImage: null,
  garmentImage: null,
  selectedProduct: null,
  resultImage: null,
  currentStep: "upload" as TryOnStep,
  isGenerating: false,
  generationProgress: 0,
  generatingPhase: "analyzing" as GeneratingPhase,
  confidence: null,
  showGuide: false,
  showCamera: false,
};

export const useTryOnStore = create<TryOnState>()(
  persist(
    (set, get) => ({
      ...initialState,
      history: [],

      setUserImage: (image) => set({ userImage: image }),

      setGarmentImage: (image, product = null) =>
        set({ garmentImage: image, selectedProduct: product }),

      setSelectedProduct: (product) => set({ selectedProduct: product }),

      setResultImage: (image) => set({ resultImage: image }),

      setCurrentStep: (step) => set({ currentStep: step }),

      setIsGenerating: (value) => set({ isGenerating: value }),

      setGenerationProgress: (progress) => set({ generationProgress: progress }),

      setGeneratingPhase: (phase) => set({ generatingPhase: phase }),

      setConfidence: (value) => set({ confidence: value }),

      setShowGuide: (value) => set({ showGuide: value }),

      setShowCamera: (value) => set({ showCamera: value }),

      saveToHistory: () => {
        const { resultImage, selectedProduct } = get();
        if (!resultImage) {
          toast.error("Không có ảnh kết quả để lưu!");
          return;
        }

        const newItem: TryOnHistoryItem = {
          id: `hist_${Date.now()}`,
          resultImage,
          garmentName: selectedProduct?.name || "Bộ đồ ngủ lụa",
          garmentThumbnail: selectedProduct?.thumbnail || "/images/placeholder.jpg",
          createdAt: new Date().toLocaleDateString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }),
        };

        set({ history: [newItem, ...get().history] });
        toast.success("Đã lưu ảnh thử đồ vào lịch sử! 💾");
      },

      removeFromHistory: (id) => {
        set({ history: get().history.filter((item) => item.id !== id) });
        toast.info("Đã xoá ảnh khỏi lịch sử.");
      },

      clearHistory: () => {
        set({ history: [] });
        toast.info("Đã xoá toàn bộ lịch sử thử đồ.");
      },

      reset: () => set(initialState),
    }),
    {
      name: "balii-tryon-storage",
      partialize: (state) => ({ history: state.history }),
    }
  )
);
