import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { Product } from '@/types/product.types';
import {
  GeneratingPhase,
  PersonAnalysis,
  TryOnHistoryItem,
  TryOnStep,
} from '@/types/tryon.types';

interface TryOnState {
  userImage: string | null;
  garmentImage: string | null;
  selectedProduct: Product | null;
  garmentTargetGender: 'male' | 'female' | 'unisex' | null;
  garmentRecommendedAgeGroups: string[];
  garmentSource: 'shop' | 'upload' | null;
  resultImage: string | null;
  resultUrl: string | null;
  personAnalysis: PersonAnalysis | null;
  currentStep: TryOnStep;
  isGenerating: boolean;
  generationProgress: number;
  generatingPhase: GeneratingPhase;
  confidence: number | null;
  showGuide: boolean;
  showCamera: boolean;
  history: TryOnHistoryItem[];
  setUserImage: (image: string | null) => void;
  setGarmentImage: (image: string | null, product?: Product | null) => void;
  setGarmentMetadata: (
    gender: 'male' | 'female' | 'unisex' | null,
    ageGroups: string[],
    source?: 'shop' | 'upload' | null,
  ) => void;
  setSelectedProduct: (product: Product | null) => void;
  setResultImage: (image: string | null) => void;
  setResultUrl: (url: string | null) => void;
  setPersonAnalysis: (analysis: PersonAnalysis | null) => void;
  setCurrentStep: (step: TryOnStep) => void;
  setIsGenerating: (value: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setGeneratingPhase: (phase: GeneratingPhase) => void;
  setConfidence: (value: number | null) => void;
  setShowGuide: (value: boolean) => void;
  setShowCamera: (value: boolean) => void;
  clearResult: () => void;
  saveToHistory: () => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

const initialState = {
  userImage: null,
  garmentImage: null,
  selectedProduct: null,
  garmentTargetGender: null,
  garmentRecommendedAgeGroups: [],
  garmentSource: null,
  resultImage: null,
  resultUrl: null,
  personAnalysis: null,
  currentStep: 'upload' as TryOnStep,
  isGenerating: false,
  generationProgress: 0,
  generatingPhase: 'analyzing' as GeneratingPhase,
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
        set({
          garmentImage: image,
          selectedProduct: product,
          garmentSource: image ? (product ? 'shop' : 'upload') : null,
          garmentTargetGender: product
            ? (product.targetGender ?? 'female')
            : null,
          garmentRecommendedAgeGroups: product?.recommendedAgeGroups ?? [],
        }),
      setGarmentMetadata: (gender, ageGroups, source = null) =>
        set({
          garmentTargetGender: gender,
          garmentRecommendedAgeGroups: ageGroups,
          garmentSource: source,
        }),
      setSelectedProduct: (product) => set({ selectedProduct: product }),
      setResultImage: (image) => set({ resultImage: image }),
      setResultUrl: (url) => set({ resultUrl: url }),
      setPersonAnalysis: (analysis) => set({ personAnalysis: analysis }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setIsGenerating: (value) => set({ isGenerating: value }),
      setGenerationProgress: (progress) =>
        set({ generationProgress: progress }),
      setGeneratingPhase: (phase) => set({ generatingPhase: phase }),
      setConfidence: (value) => set({ confidence: value }),
      setShowGuide: (value) => set({ showGuide: value }),
      setShowCamera: (value) => set({ showCamera: value }),
      clearResult: () =>
        set({
          resultImage: null,
          resultUrl: null,
          personAnalysis: null,
          confidence: null,
          isGenerating: false,
          generationProgress: 0,
          generatingPhase: 'analyzing',
          currentStep: 'garment',
        }),

      saveToHistory: () => {
        const { resultImage, selectedProduct } = get();

        if (!resultImage) {
          toast.error('Không có ảnh kết quả để lưu.');
          return;
        }

        const newItem: TryOnHistoryItem = {
          id: `hist_${Date.now()}`,
          resultImage,
          garmentName: selectedProduct?.name || 'Sản phẩm thử đồ',
          garmentThumbnail:
            selectedProduct?.thumbnail || '/images/placeholder.svg',
          createdAt: new Date().toLocaleDateString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
          }),
        };

        set({ history: [newItem, ...get().history] });
        toast.success('Đã lưu ảnh thử đồ vào lịch sử cục bộ.');
      },

      removeFromHistory: (id) => {
        set({ history: get().history.filter((item) => item.id !== id) });
        toast.info('Đã xóa ảnh khỏi lịch sử cục bộ.');
      },

      clearHistory: () => {
        set({ history: [] });
        toast.info('Đã xóa toàn bộ lịch sử cục bộ.');
      },

      reset: () => set({ ...initialState, history: get().history }),
    }),
    {
      name: 'balii-tryon-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        userImage: state.userImage,
        history: state.history,
      }),
    },
  ),
);
