'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ChevronRight,
  HelpCircle,
  ImageIcon,
  Shirt,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react';
import TryOnGarmentPicker from '@/components/ai/try-on-garment-picker';
import TryOnGuidePopup from '@/components/ai/try-on-guide-popup';
import TryOnResult from '@/components/ai/try-on-result';
import TryOnUpload from '@/components/ai/try-on-upload';
import TryOnWarningModal from '@/components/ai/try-on-warning-modal';
import {
  getProductBySlug,
  getRecommendedProducts,
  RecommendedProduct,
} from '@/lib/api/products.api';
import { submitTryOnRequest } from '@/lib/api/tryon.api';
import { cn } from '@/lib/utils';
import { useTryOnStore } from '@/store/tryon.store';
import { TryOnRequest, TryOnSyncResponse } from '@/types/tryon.types';
import { toast } from 'sonner';

function getProductImageOptions(product: {
  thumbnail: string;
  images?: string[];
}) {
  return Array.from(
    new Set([product.thumbnail, ...(product.images ?? [])].filter(Boolean)),
  );
}

function TryOnContent() {
  const searchParams = useSearchParams();
  const {
    userImage,
    garmentImage,
    selectedProduct,
    garmentTargetGender,
    garmentRecommendedAgeGroups,
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
    setResultUrl,
    setPersonAnalysis,
    setConfidence,
    setShowGuide,
    saveToHistory,
  } = useTryOnStore();

  const [warningData, setWarningData] = useState<TryOnSyncResponse | null>(
    null,
  );
  const [recommendedProducts, setRecommendedProducts] = useState<
    RecommendedProduct[]
  >([]);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [lastRequest, setLastRequest] = useState<TryOnRequest | null>(null);

  useEffect(() => {
    async function loadProductFromQuery() {
      const productSlug = searchParams.get('product');

      if (!productSlug) return;

      const product = await getProductBySlug(productSlug);

      if (product) {
        const [defaultImage] = getProductImageOptions(product);
        setGarmentImage(defaultImage ?? product.thumbnail, product);
      }
    }

    void loadProductFromQuery();
  }, [searchParams, setGarmentImage]);

  const canGenerate =
    !!userImage &&
    !!garmentImage &&
    !isGenerating &&
    !resultImage &&
    !!garmentTargetGender &&
    garmentRecommendedAgeGroups.length > 0;

  const steps = useMemo(
    () => [
      {
        id: 'upload' as const,
        label: 'Ảnh của bạn',
        icon: User,
        done: !!userImage,
      },
      {
        id: 'garment' as const,
        label: 'Chọn quần áo',
        icon: Shirt,
        done: !!garmentImage,
      },
      {
        id: 'result' as const,
        label: 'Kết quả',
        icon: ImageIcon,
        done: !!resultImage,
      },
    ],
    [garmentImage, resultImage, userImage],
  );

  const simulateProgress = useCallback(() => {
    let progress = 0;

    return window.setInterval(() => {
      progress = Math.min(progress + (progress < 70 ? 6 : 2), 90);
      setGenerationProgress(progress);

      if (progress < 25) setGeneratingPhase('analyzing');
      else if (progress < 50) setGeneratingPhase('mapping');
      else if (progress < 80) setGeneratingPhase('rendering');
      else setGeneratingPhase('finalizing');
    }, 800);
  }, [setGeneratingPhase, setGenerationProgress]);

  const loadRecommendedProducts = useCallback(
    async (warning: TryOnSyncResponse) => {
      const suggestedGender = warning.suggestedFilters?.gender;
      const suggestedAgeGroup = warning.suggestedFilters?.ageGroup;

      if (!suggestedGender || !suggestedAgeGroup) {
        setRecommendedProducts([]);
        return;
      }

      try {
        const products = await getRecommendedProducts(
          suggestedGender,
          suggestedAgeGroup,
        );
        setRecommendedProducts(products);
      } catch {
        setRecommendedProducts([]);
      }
    },
    [],
  );

  const handleTryOnSuccess = useCallback(
    (response: TryOnSyncResponse) => {
      if (!response.resultUrl) {
        throw new Error('Không nhận được ảnh kết quả từ hệ thống.');
      }

      setResultImage(response.resultUrl);
      setResultUrl(response.resultUrl);
      setPersonAnalysis(response.personAnalysis ?? null);
      setConfidence(0);
      setCurrentStep('result');
      setWarningData(null);
      setIsWarningOpen(false);
      setRecommendedProducts([]);
      toast.success('Tạo ảnh mặc thử thành công.');
      window.setTimeout(() => {
        saveToHistory();
      }, 0);
    },
    [
      saveToHistory,
      setConfidence,
      setCurrentStep,
      setPersonAnalysis,
      setResultImage,
      setResultUrl,
    ],
  );

  const handleSubmitTryOn = useCallback(
    async (confirmWarnings = false) => {
      if (!userImage || !garmentImage) {
        toast.error('Vui lòng tải ảnh và chọn quần áo trước.');
        return;
      }

      if (!garmentTargetGender || !garmentRecommendedAgeGroups.length) {
        toast.error(
          'Sản phẩm chưa có đủ metadata để AI kiểm tra trước khi tạo ảnh.',
        );
        return;
      }

      const request: TryOnRequest = {
        userImage,
        garmentImage,
        productId: selectedProduct?.id,
        targetGender: garmentTargetGender,
        recommendedAgeGroups: garmentRecommendedAgeGroups,
      };

      setLastRequest(request);
      setIsGenerating(true);
      setGenerationProgress(0);
      setGeneratingPhase('analyzing');
      setCurrentStep('result');

      const timer = simulateProgress();

      try {
        const response = await submitTryOnRequest(request, confirmWarnings);
        window.clearInterval(timer);
        setGenerationProgress(100);

        if (response.needConfirmation) {
          setIsGenerating(false);
          setWarningData(response);
          setPersonAnalysis(response.personAnalysis ?? null);
          await loadRecommendedProducts(response);
          setIsWarningOpen(true);
          return;
        }

        handleTryOnSuccess(response);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Có lỗi xảy ra. Vui lòng thử lại.',
        );
      } finally {
        window.clearInterval(timer);
        setIsGenerating(false);
      }
    },
    [
      garmentImage,
      garmentRecommendedAgeGroups,
      garmentTargetGender,
      handleTryOnSuccess,
      loadRecommendedProducts,
      selectedProduct?.id,
      setCurrentStep,
      setGeneratingPhase,
      setGenerationProgress,
      setIsGenerating,
      setPersonAnalysis,
      simulateProgress,
      userImage,
    ],
  );

  const handleContinueAnyway = useCallback(async () => {
    if (!lastRequest) return;

    setIsContinuing(true);
    setIsWarningOpen(false);
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratingPhase('analyzing');

    const timer = simulateProgress();

    try {
      const response = await submitTryOnRequest(lastRequest, true);
      window.clearInterval(timer);
      setGenerationProgress(100);

      if (response.needConfirmation) {
        setWarningData(response);
        await loadRecommendedProducts(response);
        setIsWarningOpen(true);
        return;
      }

      handleTryOnSuccess(response);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Không thể tiếp tục thử đồ.',
      );
    } finally {
      window.clearInterval(timer);
      setIsGenerating(false);
      setIsContinuing(false);
    }
  }, [
    handleTryOnSuccess,
    lastRequest,
    loadRecommendedProducts,
    setGeneratingPhase,
    setGenerationProgress,
    setIsGenerating,
    simulateProgress,
  ]);

  return (
    <>
      <div className="min-h-screen pb-16 pt-24 md:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center md:mb-12">
            <div className="fade-in-up mb-4 inline-flex items-center gap-2 rounded-full glass-card px-4 py-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-violet-500" />
              AI Virtual Try-On
            </div>
            <h1 className="fade-in-up fade-in-up-delay-1 mb-3 font-heading text-3xl font-bold text-foreground md:text-4xl lg:text-5xl">
              Mặc Thử <span className="text-gradient">Quần Áo Ảo</span>
            </h1>
            <p className="fade-in-up fade-in-up-delay-2 mx-auto max-w-lg text-sm text-muted-foreground md:text-base">
              Tải ảnh của bạn, chọn sản phẩm yêu thích và xem kết quả ngay lập
              tức.
            </p>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="fade-in-up fade-in-up-delay-3 mt-3 inline-flex items-center gap-1.5 text-sm text-violet-500 transition-colors hover:text-violet-600"
            >
              <HelpCircle className="h-4 w-4" />
              {showGuide ? 'Ẩn hướng dẫn' : 'Hướng dẫn sử dụng'}
            </button>
          </div>

          <TryOnGuidePopup
            open={showGuide}
            onClose={() => setShowGuide(false)}
          />

          <div className="mb-8 md:hidden">
            <div className="mb-6 flex items-center justify-center gap-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all',
                      currentStep === step.id
                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-300/25'
                        : step.done
                          ? 'bg-green-100 text-green-700'
                          : 'bg-white/50 text-muted-foreground',
                    )}
                  >
                    <step.icon className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">{step.label}</span>
                    <span className="xs:hidden">{index + 1}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <ChevronRight className="mx-1 h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              ))}
            </div>

            <div className="fade-in-up">
              {currentStep === 'upload' && (
                <div>
                  <TryOnUpload />
                  {userImage && (
                    <button
                      onClick={() => setCurrentStep('garment')}
                      className="btn-primary mt-4 flex w-full items-center justify-center gap-2 py-3"
                    >
                      Tiếp theo
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {currentStep === 'garment' && (
                <div>
                  <TryOnGarmentPicker />
                  {garmentImage && !resultImage && (
                    <button
                      onClick={() => void handleSubmitTryOn()}
                      disabled={!canGenerate}
                      className="btn-primary mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-base disabled:opacity-50"
                    >
                      <Wand2 className="h-5 w-5" />
                      Tạo ảnh mặc thử
                    </button>
                  )}
                </div>
              )}

              {currentStep === 'result' && <TryOnResult />}
            </div>
          </div>

          <div className="hidden items-start gap-6 md:grid md:grid-cols-3 lg:gap-8">
            <div className="fade-in-up">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
                  1
                </div>
                <h2 className="font-medium text-foreground">Ảnh của bạn</h2>
              </div>
              <TryOnUpload />
            </div>

            <div className="fade-in-up fade-in-up-delay-1">
              {isGenerating || resultImage ? (
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
                      ✨
                    </div>
                    <h2 className="font-medium text-foreground">Kết quả</h2>
                  </div>
                  <TryOnResult />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center pt-12">
                  <div className="text-center">
                    <div className="relative mb-6 inline-block">
                      <div
                        className={cn(
                          'flex h-28 w-28 items-center justify-center rounded-full transition-all',
                          canGenerate
                            ? 'cursor-pointer bg-gradient-to-br from-violet-500 to-purple-600 shadow-2xl shadow-violet-300/30 hover:scale-110 hover:shadow-violet-400/40 active:scale-95'
                            : 'border-2 border-dashed border-violet-200 bg-white/40',
                        )}
                        onClick={() => {
                          if (canGenerate) {
                            void handleSubmitTryOn();
                          }
                        }}
                      >
                        <Wand2
                          className={cn(
                            'h-10 w-10',
                            canGenerate ? 'text-white' : 'text-violet-300',
                          )}
                        />
                      </div>
                      {canGenerate && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <span className="animate-pulse rounded-full bg-violet-500 px-3 py-1 text-xs font-medium text-white shadow-lg">
                            Sẵn sàng!
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="mx-auto max-w-[220px] text-sm text-muted-foreground">
                      {!userImage && !garmentImage
                        ? 'Tải ảnh và chọn quần áo để bắt đầu'
                        : !userImage
                          ? 'Tải ảnh của bạn ở bên trái'
                          : !garmentImage
                            ? 'Chọn quần áo ở bên phải'
                            : 'Nhấn nút để tạo ảnh mặc thử'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="fade-in-up fade-in-up-delay-2">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
                  2
                </div>
                <h2 className="font-medium text-foreground">Chọn quần áo</h2>
              </div>
              <TryOnGarmentPicker />
            </div>
          </div>

          <div className="mt-12 rounded-3xl border border-violet-100/50 bg-gradient-to-br from-violet-500/5 to-white/70 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Lịch sử thử đồ của bạn
                </h2>
                <p className="text-sm text-muted-foreground">
                  Xem lại toàn bộ ảnh đã tạo, trạng thái xử lý và phân tích
                  người mẫu.
                </p>
              </div>
              <Link
                href="/account/try-on-history"
                className="btn-primary text-sm"
              >
                Xem lịch sử thử đồ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <TryOnWarningModal
        open={isWarningOpen}
        warning={warningData}
        recommendedProducts={recommendedProducts}
        isContinuing={isContinuing}
        onClose={() => setIsWarningOpen(false)}
        onContinue={() => void handleContinueAnyway()}
      />
    </>
  );
}

export default function TryOnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center pb-16 pt-28">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-violet-300 border-t-violet-500" />
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          </div>
        </div>
      }
    >
      <TryOnContent />
    </Suspense>
  );
}
