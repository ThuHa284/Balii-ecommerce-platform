'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BadgeInfo,
  ChevronRight,
  HelpCircle,
  ImageIcon,
  Loader2,
  Shirt,
  Sparkles,
  User,
  Wand2,
} from 'lucide-react';
import TryOnGarmentPicker from '@/components/ai/try-on-garment-picker';
import TryOnGuidePopup from '@/components/ai/try-on-guide-popup';
import TryOnResult from '@/components/ai/try-on-result';
import TryOnShopReferencePicker from '@/components/ai/try-on-shop-reference-picker';
import TryOnUpload from '@/components/ai/try-on-upload';
import TryOnWarningModal from '@/components/ai/try-on-warning-modal';
import AuthGuard from '@/components/auth/auth-guard';
import {
  getProductBySlug,
  getRecommendedProducts,
  RecommendedProduct,
} from '@/lib/api/products.api';
import { getUserErrorMessage } from '@/lib/error-utils';
import {
  analyzeTryOnPersonImage,
  submitProductDesignRequest,
  submitTryOnRequest,
} from '@/lib/api/tryon.api';
import { formatAgeGroupLabel, formatGenderLabel } from '@/lib/tryon-labels';
import { cn } from '@/lib/utils';
import { useTryOnStore } from '@/store/tryon.store';
import { Product } from '@/types/product.types';
import {
  PersonAnalysis,
  TryOnProductDesignRequest,
  TryOnRequest,
  TryOnSyncResponse,
} from '@/types/tryon.types';
import { toast } from 'sonner';

function getProductImageOptions(product: {
  thumbnail: string;
  images?: string[];
}) {
  return Array.from(
    new Set([product.thumbnail, ...(product.images ?? [])].filter(Boolean)),
  );
}

function PersonAnalysisCard({
  userImage,
  personAnalysis,
  isAnalyzingPerson,
  onAnalyze,
}: {
  userImage: string | null;
  personAnalysis: PersonAnalysis | null;
  isAnalyzingPerson: boolean;
  onAnalyze: () => void;
}) {
  if (!userImage) return null;

  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-violet-100/70 bg-white/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BadgeInfo className="h-4 w-4 text-violet-500" />
            AI đoán tuổi và giới tính
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Phân tích nhanh từ ảnh người dùng trước khi thử đồ.
          </p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={isAnalyzingPerson}
          className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
        >
          {isAnalyzingPerson ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Đang phân tích
            </span>
          ) : (
            'Phân tích ngay'
          )}
        </button>
      </div>

      {personAnalysis && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-violet-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Giới tính
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {formatGenderLabel(personAnalysis.gender)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Độ tin cậy:{' '}
              {personAnalysis.genderConfidence != null
                ? `${Math.round(personAnalysis.genderConfidence * 100)}%`
                : 'N/A'}
            </p>
          </div>

          <div className="rounded-xl bg-violet-50/80 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Nhóm tuổi
            </p>
            <p className="mt-1 text-sm font-bold text-foreground">
              {formatAgeGroupLabel(personAnalysis.ageGroup)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Độ tin cậy:{' '}
              {personAnalysis.ageConfidence != null
                ? `${Math.round(personAnalysis.ageConfidence * 100)}%`
                : 'N/A'}
            </p>
          </div>
        </div>
      )}
    </div>
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
    personAnalysis,
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
  const [isAnalyzingPerson, setIsAnalyzingPerson] = useState(false);
  const [activeMode, setActiveMode] = useState<'classic' | 'demo'>('classic');
  const [colorReferenceImage, setColorReferenceImage] = useState<string | null>(
    null,
  );
  const [patternReferenceImage, setPatternReferenceImage] = useState<
    string | null
  >(null);
  const [colorReferenceProduct, setColorReferenceProduct] =
    useState<Product | null>(null);
  const [patternReferenceProduct, setPatternReferenceProduct] =
    useState<Product | null>(null);
  const normalizedPersonAnalysis = personAnalysis ?? null;

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

  const canGenerateProductDesign =
    !!garmentImage &&
    !!colorReferenceImage &&
    !!patternReferenceImage &&
    !isGenerating &&
    !resultImage;

  const handleSelectColorReference = useCallback(
    (product: Product, image: string) => {
      setResultImage(null);
      setResultUrl(null);
      setColorReferenceProduct(product);
      setColorReferenceImage(image);
    },
    [setResultImage, setResultUrl],
  );

  const handleSelectPatternReference = useCallback(
    (product: Product, image: string) => {
      setResultImage(null);
      setResultUrl(null);
      setPatternReferenceProduct(product);
      setPatternReferenceImage(image);
    },
    [setResultImage, setResultUrl],
  );

  const handleSwitchMode = useCallback(
    (mode: 'classic' | 'demo') => {
      setActiveMode(mode);
      setCurrentStep(userImage ? 'garment' : 'upload');
      setResultImage(null);
      setResultUrl(null);
      setWarningData(null);
      setIsWarningOpen(false);
      setGenerationProgress(0);
      setGeneratingPhase('analyzing');
      setIsGenerating(false);
    },
    [
      setCurrentStep,
      setGeneratingPhase,
      setGenerationProgress,
      setIsGenerating,
      setResultImage,
      setResultUrl,
      userImage,
    ],
  );

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
      toast.error(getUserErrorMessage(error, 'Không thể tiếp tục thử đồ.'));
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

  const handleAnalyzePerson = useCallback(async () => {
    if (!userImage) {
      toast.error('Vui lòng tải ảnh của bạn trước.');
      return;
    }

    setIsAnalyzingPerson(true);

    try {
      const analysis = await analyzeTryOnPersonImage(userImage);
      setPersonAnalysis(analysis);
      toast.success('Đã phân tích tuổi và giới tính.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể phân tích tuổi và giới tính lúc này.',
      );
    } finally {
      setIsAnalyzingPerson(false);
    }
  }, [setPersonAnalysis, userImage]);

  const handleSubmitProductDesign = useCallback(async () => {
    if (!garmentImage || !colorReferenceImage || !patternReferenceImage) {
      toast.error('Vui lòng chọn đủ ảnh màu và ảnh hoạ tiết tham chiếu.');
      return;
    }

    if (colorReferenceImage === patternReferenceImage) {
      toast.error(
        'Vui lòng chọn 2 ảnh tham chiếu khác nhau cho màu áo và họa tiết.',
      );
      return;
    }

    const request: TryOnProductDesignRequest = {
      baseGarmentImage: garmentImage,
      colorReferenceImage,
      patternReferenceImage,
      productId: selectedProduct?.id,
    };

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratingPhase('analyzing');
    setCurrentStep('result');

    const timer = simulateProgress();

    try {
      const response = await submitProductDesignRequest(request);
      window.clearInterval(timer);
      setGenerationProgress(100);

      if (!response.resultUrl) {
        throw new Error('Không nhận được ảnh sản phẩm từ hệ thống.');
      }

      setResultImage(response.resultUrl);
      setResultUrl(response.resultUrl);
      setPersonAnalysis(null);
      setConfidence(0);
      setCurrentStep('result');
      toast.success('Tạo ảnh sản phẩm thành công.');
      window.setTimeout(() => {
        saveToHistory();
      }, 0);
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
  }, [
    colorReferenceImage,
    garmentImage,
    patternReferenceImage,
    saveToHistory,
    selectedProduct?.id,
    setConfidence,
    setCurrentStep,
    setGeneratingPhase,
    setGenerationProgress,
    setIsGenerating,
    setPersonAnalysis,
    setResultImage,
    setResultUrl,
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

          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => handleSwitchMode('classic')}
              className={cn(
                'rounded-full px-5 py-2.5 text-sm font-semibold transition-all',
                activeMode === 'classic'
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-200'
                  : 'border border-violet-200 bg-white/80 text-foreground hover:border-violet-300',
              )}
            >
              Try on thường
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('demo')}
              className={cn(
                'rounded-full px-5 py-2.5 text-sm font-semibold transition-all',
                activeMode === 'demo'
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-300/40'
                  : 'border border-slate-200 bg-white/80 text-foreground hover:border-slate-300',
              )}
            >
              Try on mới (demo)
            </button>
          </div>

          {activeMode === 'classic' && (
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
                    <PersonAnalysisCard
                      userImage={userImage}
                      personAnalysis={normalizedPersonAnalysis}
                      isAnalyzingPerson={isAnalyzingPerson}
                      onAnalyze={() => void handleAnalyzePerson()}
                    />
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
          )}

          {activeMode === 'classic' && (
            <div className="hidden items-start gap-6 md:grid md:grid-cols-3 lg:gap-8">
              <div className="fade-in-up">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
                    1
                  </div>
                  <h2 className="font-medium text-foreground">Ảnh của bạn</h2>
                </div>
                <TryOnUpload />
                <PersonAnalysisCard
                  userImage={userImage}
                  personAnalysis={normalizedPersonAnalysis}
                  isAnalyzingPerson={isAnalyzingPerson}
                  onAnalyze={() => void handleAnalyzePerson()}
                />
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
                  <div className="flex h-full flex-col items-center justify-center pt-8">
                    <div className="text-center">
                      <div className="relative mb-5 inline-block">
                        <div
                          className={cn(
                            'flex h-20 w-20 items-center justify-center rounded-full transition-all',
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
                              'h-7 w-7',
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
          )}

          {activeMode === 'demo' && (
            <div className="space-y-4">
              {/* Top row: 3 equal cards — User Photo | Base Garment | Result */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Card 1: Ảnh người dùng */}
                <div className="rounded-2xl border border-violet-100/70 bg-white/70 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[11px] font-bold text-white">
                      1
                    </div>
                    <h2 className="text-sm font-medium text-foreground">Ảnh của bạn</h2>
                  </div>
                  <TryOnUpload compact />
                  <PersonAnalysisCard
                    userImage={userImage}
                    personAnalysis={normalizedPersonAnalysis}
                    isAnalyzingPerson={isAnalyzingPerson}
                    onAnalyze={() => void handleAnalyzePerson()}
                  />
                </div>

                {/* Card 2: Chọn sản phẩm form gốc */}
                <div className="rounded-2xl border border-violet-100/70 bg-white/70 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[11px] font-bold text-white">
                      2
                    </div>
                    <h2 className="text-sm font-medium text-foreground">Form gốc</h2>
                  </div>
                  <TryOnGarmentPicker compact />
                </div>

                {/* Card 3: Kết quả */}
                <div className="rounded-2xl border border-violet-100/70 bg-white/70 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                      ✨
                    </div>
                    <h2 className="text-sm font-medium text-foreground">Kết quả</h2>
                  </div>
                  {isGenerating || resultImage ? (
                    <TryOnResult compact />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 text-center text-xs text-muted-foreground">
                      Chọn đủ ảnh tham chiếu để tạo bản demo.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom section: References + Generate */}
              <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-violet-50/60 p-4">
                <div className="mb-3 flex items-start gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Tùy chỉnh sản phẩm
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Chọn sản phẩm tham chiếu để lấy màu áo và họa tiết.
                    </p>
                  </div>
                </div>

                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/90 px-2.5 py-1.5 text-[11px] text-amber-800">
                  Nếu backend trả về lỗi quota Gemini, tab demo sẽ chưa thể
                  tạo ảnh cho đến khi API key có quota hoặc billing hợp lệ.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <TryOnShopReferencePicker
                    title="Ảnh lấy màu áo"
                    description="Chỉ dùng màu và tông màu của sản phẩm tham chiếu."
                    selectedImage={colorReferenceImage}
                    selectedProduct={colorReferenceProduct}
                    onSelect={handleSelectColorReference}
                    onClear={() => {
                      setColorReferenceImage(null);
                      setColorReferenceProduct(null);
                    }}
                  />

                  <TryOnShopReferencePicker
                    title="Ảnh lấy họa tiết"
                    description="Chỉ dùng pattern, motif hoặc họa tiết của sản phẩm tham chiếu."
                    selectedImage={patternReferenceImage}
                    selectedProduct={patternReferenceProduct}
                    onSelect={handleSelectPatternReference}
                    onClear={() => {
                      setPatternReferenceImage(null);
                      setPatternReferenceProduct(null);
                    }}
                  />
                </div>

                {!resultImage && (
                  <button
                    type="button"
                    onClick={() => void handleSubmitProductDesign()}
                    disabled={!canGenerateProductDesign || isGenerating}
                    className={cn(
                      'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all',
                      canGenerateProductDesign && !isGenerating
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-300/40 hover:bg-slate-800'
                        : 'cursor-not-allowed border border-white/60 bg-white/65 text-muted-foreground',
                    )}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tạo ảnh demo
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Tạo try on mới (demo)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

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
    <AuthGuard redirectTo="/login?redirect=/try-on">
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
    </AuthGuard>
  );
}
