"use client";

import { useEffect, useCallback, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Wand2,
  HelpCircle,
  ArrowRight,
  ChevronRight,
  User,
  Shirt,
  ImageIcon,
  History,
  Trash2,
  Maximize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTryOnStore } from "@/store/tryon.store";
import { getProductBySlug } from "@/lib/api/products.api";
import { generateTryOn } from "@/lib/api/tryon.api";
import TryOnUpload from "@/components/ai/try-on-upload";
import TryOnGarmentPicker from "@/components/ai/try-on-garment-picker";
import TryOnResult from "@/components/ai/try-on-result";
import TryOnGuidePopup from "@/components/ai/try-on-guide-popup";
import { toast } from "sonner";

function TryOnContent() {
  const searchParams = useSearchParams();
  const {
    userImage,
    garmentImage,
    isGenerating,
    resultImage,
    currentStep,
    showGuide,
    setGarmentImage,
    setCurrentStep,
    setIsGenerating,
    setGenerationProgress,
    setGeneratingPhase,
    setResultImage,
    setConfidence,
    setShowGuide,
    reset,
  } = useTryOnStore();

  // Pre-fill garment from query param (?product=slug)
  useEffect(() => {
    async function loadProductFromQuery() {
      const productSlug = searchParams.get("product");

      if (!productSlug) {
        return;
      }

      const product = await getProductBySlug(productSlug);

      if (product) {
        setGarmentImage(product.thumbnail, product);
      }
    }

    void loadProductFromQuery();
  }, [searchParams, setGarmentImage]);



  const canGenerate = !!userImage && !!garmentImage && !isGenerating && !resultImage;

  const handleGenerate = useCallback(async () => {
    if (!userImage || !garmentImage) {
      toast.error("Vui lòng tải ảnh và chọn quần áo trước!");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratingPhase("analyzing");
    setCurrentStep("result");

    try {
      const result = await generateTryOn(
        { userImage, garmentImage },
        (progress) => {
          setGenerationProgress(progress);
          if (progress < 25) setGeneratingPhase("analyzing");
          else if (progress < 50) setGeneratingPhase("mapping");
          else if (progress < 80) setGeneratingPhase("rendering");
          else setGeneratingPhase("finalizing");
        }
      );

      setResultImage(result.resultImageUrl);
      setConfidence(result.confidence);
      toast.success("Tạo ảnh thành công! ✨");
    } catch {
      toast.error("Có lỗi xảy ra. Vui lòng thử lại!");
    } finally {
      setIsGenerating(false);
    }
  }, [
    userImage,
    garmentImage,
    setIsGenerating,
    setGenerationProgress,
    setGeneratingPhase,
    setCurrentStep,
    setResultImage,
    setConfidence,
  ]);

  // Step data for mobile stepper
  const steps = [
    {
      id: "upload" as const,
      label: "Ảnh của bạn",
      icon: User,
      done: !!userImage,
    },
    {
      id: "garment" as const,
      label: "Chọn quần áo",
      icon: Shirt,
      done: !!garmentImage,
    },
    {
      id: "result" as const,
      label: "Kết quả",
      icon: ImageIcon,
      done: !!resultImage,
    },
  ];

  return (
    <div className="pt-24 md:pt-28 pb-16 min-h-screen">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12">
          <div className="fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-foreground mb-4">
            <Sparkles className="w-4 h-4 text-violet-500" />
            AI Virtual Try-On
          </div>
          <h1 className="fade-in-up fade-in-up-delay-1 font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3">
            Mặc Thử{" "}
            <span className="text-gradient">Quần Áo Ảo</span>
          </h1>
          <p className="fade-in-up fade-in-up-delay-2 text-muted-foreground max-w-lg mx-auto text-sm md:text-base">
            Tải ảnh của bạn, chọn sản phẩm yêu thích và xem kết quả ngay lập
            tức!
          </p>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="fade-in-up fade-in-up-delay-3 inline-flex items-center gap-1.5 mt-3 text-sm text-violet-500 hover:text-violet-600 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            {showGuide ? "Ẩn hướng dẫn" : "Hướng dẫn sử dụng"}
          </button>
        </div>

        {/* Inline Guide Section */}
        <TryOnGuidePopup
          open={showGuide}
          onClose={() => setShowGuide(!showGuide)}
        />

        {/* ========================================
            MOBILE STEPPER (< md)
            ======================================== */}
        <div className="md:hidden mb-8">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all",
                    currentStep === step.id
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-300/25"
                      : step.done
                      ? "bg-green-100 text-green-700"
                      : "bg-white/50 text-muted-foreground"
                  )}
                >
                  <step.icon className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{step.label}</span>
                  <span className="xs:hidden">{i + 1}</span>
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 mx-1" />
                )}
              </div>
            ))}
          </div>

          {/* Active step content */}
          <div className="fade-in-up">
            {currentStep === "upload" && (
              <div>
                <TryOnUpload />
                {userImage && (
                  <button
                    onClick={() => setCurrentStep("garment")}
                    className="mt-4 w-full btn-primary flex items-center justify-center gap-2 py-3"
                  >
                    Tiếp theo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {currentStep === "garment" && (
              <div>
                <TryOnGarmentPicker />
                {garmentImage && !resultImage && (
                  <button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="mt-4 w-full btn-primary flex items-center justify-center gap-2 py-3.5 text-base disabled:opacity-50"
                  >
                    <Wand2 className="w-5 h-5" />
                    Tạo ảnh mặc thử
                  </button>
                )}
              </div>
            )}

            {currentStep === "result" && (
              <TryOnResult />
            )}
          </div>
        </div>

        {/* ========================================
            DESKTOP 3-COLUMN LAYOUT (≥ md)
            ======================================== */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* Column 1: User Image */}
          <div className="fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <h2 className="font-medium text-foreground">Ảnh của bạn</h2>
            </div>
            <TryOnUpload />
          </div>

          {/* Column 2: Generate / Center */}
          <div className="fade-in-up fade-in-up-delay-1">
            {/* Show result area if generating or has result */}
            {(isGenerating || resultImage) ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold">
                    ✨
                  </div>
                  <h2 className="font-medium text-foreground">Kết quả</h2>
                </div>
                <TryOnResult />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full pt-12">
                {/* Generate button area */}
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <div
                      className={cn(
                        "w-28 h-28 rounded-full flex items-center justify-center transition-all",
                        canGenerate
                          ? "bg-gradient-to-br from-violet-500 to-purple-600 shadow-2xl shadow-violet-300/30 hover:scale-110 hover:shadow-violet-400/40 cursor-pointer active:scale-95"
                          : "bg-white/40 border-2 border-dashed border-violet-200"
                      )}
                      onClick={canGenerate ? handleGenerate : undefined}
                    >
                      <Wand2
                        className={cn(
                          "w-10 h-10",
                          canGenerate ? "text-white" : "text-violet-300"
                        )}
                      />
                    </div>
                    {canGenerate && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full bg-violet-500 text-white text-xs font-medium shadow-lg animate-pulse">
                          Sẵn sàng!
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                    {!userImage && !garmentImage
                      ? "Tải ảnh và chọn quần áo để bắt đầu"
                      : !userImage
                      ? "Tải ảnh của bạn ở bên trái"
                      : !garmentImage
                      ? "Chọn quần áo ở bên phải"
                      : "Nhấn nút để tạo ảnh mặc thử!"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Garment */}
          <div className="fade-in-up fade-in-up-delay-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold">
                2
              </div>
              <h2 className="font-medium text-foreground">Chọn quần áo</h2>
            </div>
            <TryOnGarmentPicker />
          </div>
        </div>

        {/* History Carousel Section */}
        <TryOnHistoryCarousel />
      </div>
    </div>
  );
}

function TryOnHistoryCarousel() {
  const { history, removeFromHistory, clearHistory } = useTryOnStore();
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (history.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t border-violet-100/50 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-violet-500" />
          <h2 className="font-heading text-lg font-bold text-slate-800">Lịch sử mặc thử đồ ({history.length})</h2>
        </div>
        <button
          onClick={clearHistory}
          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 hover:underline"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xoá tất cả lịch sử
        </button>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scroll-smooth">
        {history.map((item) => (
          <div
            key={item.id}
            className="relative flex flex-col bg-white/40 border border-white/60 p-2.5 rounded-2xl shrink-0 w-44 hover:shadow-lg transition-all group"
          >
            {/* Image Container */}
            <div
              className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer"
              onClick={() => setPreviewImage(item.resultImage)}
            >
              <img src={item.resultImage} alt="Thử đồ" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[10px] text-white font-bold bg-violet-600/80 px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                  <Maximize2 className="w-3 h-3" /> Xem lại
                </span>
              </div>
            </div>

            {/* Garment Badge Info */}
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 bg-slate-50/50 p-1.5 rounded-xl border border-slate-100/50">
                <div className="relative w-6 h-8 rounded-lg overflow-hidden shrink-0">
                  <img src={item.garmentThumbnail} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-slate-800 truncate">{item.garmentName}</p>
                </div>
              </div>

              {/* Timestamp & Delete */}
              <div className="flex items-center justify-between text-[9px] text-muted-foreground pt-1">
                <span>{item.createdAt}</span>
                <button
                  onClick={() => removeFromHistory(item.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Xoá lịch sử"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreviewImage(null)} />
          <div className="relative bg-white rounded-2xl overflow-hidden max-w-sm w-full border border-white/20 shadow-2xl z-10 animate-scale-up aspect-[3/4]">
            <img src={previewImage} alt="Kết quả mặc thử" className="w-full h-full object-cover" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/55 hover:bg-black/85 text-white shadow-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TryOnPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-28 pb-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-violet-300 border-t-violet-500 animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          </div>
        </div>
      }
    >
      <TryOnContent />
    </Suspense>
  );
}
