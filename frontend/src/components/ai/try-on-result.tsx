'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Download, ExternalLink, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTryOnStore } from '@/store/tryon.store';

interface TryOnResultProps {
  className?: string;
}

const PHASE_LABELS: Record<string, string> = {
  analyzing: 'Đang phân tích ảnh...',
  mapping: 'Đang xử lý quần áo...',
  rendering: 'Đang render kết quả...',
  finalizing: 'Đang hoàn thiện...',
};

export default function TryOnResult({ className }: TryOnResultProps) {
  const {
    resultImage,
    resultUrl,
    isGenerating,
    generationProgress,
    confidence,
    userImage,
    garmentImage,
    reset,
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

  if (isGenerating) {
    return (
      <div className={cn('', className)}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl glass-card ai-glow-ring">
          <div className="absolute inset-0">
            {userImage && (
              <img
                src={userImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-40 blur-[2px]"
              />
            )}
            {garmentImage && (
              <img
                src={garmentImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
                style={{
                  animation:
                    'ai-morph-reveal 2s ease-in-out infinite alternate',
                }}
              />
            )}
          </div>
          <div className="ai-shimmer absolute inset-0" />
          <div className="absolute left-0 right-0 z-10 h-1 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-ai-scan" />
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
            <div className="mb-4 rounded-full bg-white/20 p-4 backdrop-blur-md">
              <Wand2 className="h-8 w-8 animate-pulse text-violet-500" />
            </div>
            <p className="mb-2 text-sm font-medium text-foreground/80">
              {phaseLabel}
            </p>
            <div className="mb-2 h-2 w-48 overflow-hidden rounded-full bg-white/30">
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
      <div className={cn('space-y-4', className)}>
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl glass-card ai-morph-in">
          <img
            src={resultImage}
            alt="Kết quả mặc thử"
            className="h-full w-full object-cover"
          />
          {confidence ? (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-green-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              Độ chính xác: {confidence}%
            </div>
          ) : null}
        </div>

        <div className="glass-card space-y-3 p-4">
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
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-white"
        >
          <Download className="h-3.5 w-3.5" />
          Tải ảnh xuống thiết bị
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={reset}
            className="rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-white"
          >
            Thử lại
          </button>
          <Link
            href="/account/try-on-history"
            className="btn-primary flex items-center justify-center py-2.5 text-xs"
          >
            Xem lịch sử
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-violet-200/40 glass-card">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-50">
          <Sparkles className="h-10 w-10 text-violet-300" />
        </div>
        <div className="px-4 text-center">
          <p className="mb-1 text-sm font-medium text-foreground/60">
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
