"use client";

import { useEffect, useCallback, Suspense } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTryOnStore } from "@/store/tryon.store";
import { MOCK_PRODUCTS } from "@/lib/api/mock-data";
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
    const productSlug = searchParams.get("product");
    if (productSlug) {
      const product = MOCK_PRODUCTS.find((p) => p.slug === productSlug);
      if (product) {
        setGarmentImage(product.thumbnail, product);
      }
    }
  }, [searchParams, setGarmentImage]);

  // Show guide on first visit
  useEffect(() => {
    const dismissed = localStorage.getItem("balii-tryon-guide-dismissed");
    if (!dismissed) {
      setShowGuide(true);
    }
  }, [setShowGuide]);

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
            onClick={() => setShowGuide(true)}
            className="fade-in-up fade-in-up-delay-3 inline-flex items-center gap-1.5 mt-3 text-sm text-violet-500 hover:text-violet-600 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Hướng dẫn sử dụng
          </button>
        </div>

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
      </div>

      {/* Guide Popup */}
      <TryOnGuidePopup
        open={showGuide}
        onClose={() => setShowGuide(false)}
      />
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
