import { create } from "zustand";
import { Product } from "@/types/product.types";
import { TryOnStep, GeneratingPhase } from "@/types/tryon.types";

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

export const useTryOnStore = create<TryOnState>((set) => ({
  ...initialState,

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

  reset: () => set(initialState),
}));
