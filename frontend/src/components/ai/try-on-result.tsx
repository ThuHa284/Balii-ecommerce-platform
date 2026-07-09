'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Download, ExternalLink, Sparkles, Wand2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useTryOnStore } from '@/store/tryon.store';

interface TryOnResultProps {
  className?: string;
  compact?: boolean;
}

const PHASE_LABELS: Record<string, string> = {
  analyzing: 'Đang phân tích ảnh...',
  mapping: 'Đang xử lý quần áo...',
  rendering: 'Đang render kết quả...',
  finalizing: 'Đang hoàn thiện...',
};

export default function TryOnResult({
  className,
  compact = false,
}: TryOnResultProps) {
  const {
    resultImage,
    resultUrl,
    isGenerating,
    generationProgress,
    confidence,
    userImage,
    garmentImage,
    clearResult,
  } = useTryOnStore();

  const phaseLabel = useMemo(() => {
    if (generationProgress < 25) return PHASE_LABELS.analyzing;
    if (generationProgress < 50) return PHASE_LABELS.mapping;
    if (generationProgress < 80) return PHASE_LABELS.rendering;
    return PHASE_LABELS.finalizing;
  }, [generationProgress]);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `balii-tryon-${Date.now()}.jpg`;
    link.click();
  };

  const frameClass = compact ? 'aspect-[3/4]' : 'aspect-square max-h-[360px]';
  const frameSizes = compact
    ? '(max-width: 768px) 100vw, 280px'
    : '(max-width: 768px) 100vw, 400px';

  if (isGenerating) {
    return (
      <div className={cn('', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl glass-card ai-glow-ring',
            frameClass,
          )}
        >
          <div className="absolute inset-0">
            {userImage && (
              <Image
                src={userImage}
                alt=""
                fill
                className="absolute inset-0 object-cover opacity-40 blur-[2px]"
                sizes={frameSizes}
              />
            )}
            {garmentImage && (
              <Image
                src={garmentImage}
                alt=""
                fill
                className="absolute inset-0 object-cover opacity-20 mix-blend-overlay"
                sizes={frameSizes}
                style={{
                  animation:
                    'ai-morph-reveal 2s ease-in-out infinite alternate',
                }}
              />
            )}
          </div>
          <div className="ai-shimmer absolute inset-0" />
          <div className="absolute left-0 right-0 z-10 h-1 animate-ai-scan bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
          <div className="absolute inset-0 z-10">
            <span
              className="ai-particle"
              style={{ left: '10%', bottom: '20%' }}
            />
            <span
              className="ai-particle"
              style={{ left: '20%', bottom: '40%' }}
            />
            <span
              className="ai-particle"
              style={{ left: '50%', bottom: '60%' }}
            />
            <span
              className="ai-particle"
              style={{ left: '75%', bottom: '30%' }}
            />
            <span
              className="ai-particle"
              style={{ left: '90%', bottom: '50%' }}
            />
            <span
              className="ai-particle"
              style={{ left: '35%', bottom: '70%' }}
            />
          </div>
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
            <div
              className={cn(
                'rounded-full bg-white/20 backdrop-blur-md',
                compact ? 'mb-3 p-3' : 'mb-4 p-4',
              )}
            >
              <Wand2
                className={cn(
                  'animate-pulse text-violet-500',
                  compact ? 'h-6 w-6' : 'h-8 w-8',
                )}
              />
            </div>
            <p
              className={cn(
                'font-medium text-foreground/80',
                compact ? 'mb-1 text-xs' : 'mb-2 text-sm',
              )}
            >
              {phaseLabel}
            </p>
            <div
              className={cn(
                'overflow-hidden rounded-full bg-white/30',
                compact ? 'mb-1 h-2 w-36' : 'mb-2 h-2 w-48',
              )}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {generationProgress}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (resultImage) {
    return (
      <div className={cn('space-y-3', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl glass-card ai-morph-in',
            frameClass,
          )}
        >
          <Image
            src={resultImage}
            alt="Kết quả mặc thử"
            fill
            className="object-cover"
            sizes={frameSizes}
          />
          {confidence ? (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-green-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              Độ chính xác: {confidence}%
            </div>
          ) : null}
        </div>

        <div className={cn('glass-card space-y-3', compact ? 'p-3' : 'p-4')}>
          <div className="rounded-xl bg-white/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cloudinary URL
            </p>
            {resultUrl ? (
              <a
                href={resultUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 break-all text-sm text-violet-600 hover:text-violet-700"
              >
                {resultUrl}
                <ExternalLink className="h-4 w-4 shrink-0" />
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Chưa có URL.</p>
            )}
          </div>
        </div>

        <button
          onClick={handleDownload}
          className={cn(
            'flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/50 bg-white/60 px-4 font-bold text-slate-700 shadow-sm transition-all hover:bg-white',
            compact ? 'py-2 text-[11px]' : 'py-2.5 text-xs',
          )}
        >
          <Download className="h-3.5 w-3.5" />
          Tải ảnh xuống thiết bị
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={clearResult}
            className={cn(
              'rounded-xl border border-white/50 bg-white/60 px-4 font-bold text-foreground transition-all hover:bg-white',
              compact ? 'py-2 text-[11px]' : 'py-2.5 text-xs',
            )}
          >
            Thử sản phẩm khác
          </button>
          <Link
            href="/account/try-on-history"
            className={cn(
              'btn-primary flex items-center justify-center',
              compact ? 'py-2 text-[11px]' : 'py-2.5 text-xs',
            )}
          >
            Xem lịch sử
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-violet-200/40 glass-card',
          frameClass,
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-violet-50',
            compact ? 'h-14 w-14' : 'h-20 w-20',
          )}
        >
          <Sparkles
            className={cn('text-violet-300', compact ? 'h-7 w-7' : 'h-10 w-10')}
          />
        </div>
        <div className="px-4 text-center">
          <p
            className={cn(
              'mb-1 font-medium text-foreground/60',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            Kết quả AI
          </p>
          <p className="text-xs text-muted-foreground">
            Tải ảnh và chọn quần áo để bắt đầu
          </p>
        </div>
      </div>
    </div>
  );
}
