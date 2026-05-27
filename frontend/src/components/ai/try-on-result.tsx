"use client";

import { useMemo } from "react";
import { Download, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTryOnStore } from "@/store/tryon.store";

interface TryOnResultProps {
  className?: string;
}

const PHASE_LABELS: Record<string, string> = {
  analyzing: "Đang phân tích ảnh...",
  mapping: "Đang xử lý quần áo...",
  rendering: "Đang render kết quả...",
  finalizing: "Đang hoàn thiện...",
};

export default function TryOnResult({ className }: TryOnResultProps) {
  const {
    resultImage,
    isGenerating,
    generationProgress,
    generatingPhase,
    confidence,
    userImage,
    garmentImage,
    reset,
  } = useTryOnStore();

  // Determine which phase label to show based on progress
  const phaseLabel = useMemo(() => {
    if (generationProgress < 25) return PHASE_LABELS.analyzing;
    if (generationProgress < 50) return PHASE_LABELS.mapping;
    if (generationProgress < 80) return PHASE_LABELS.rendering;
    return PHASE_LABELS.finalizing;
  }, [generationProgress]);

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `balii-tryon-${Date.now()}.jpg`;
    link.click();
  };

  // -- Generating State --
  if (isGenerating) {
    return (
      <div className={cn("", className)}>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass-card ai-glow-ring">
          {/* Blended background from user + garment images */}
          <div className="absolute inset-0">
            {userImage && (
              <img
                src={userImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]"
              />
            )}
            {garmentImage && (
              <img
                src={garmentImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
                style={{
                  animation: `ai-morph-reveal 2s ease-in-out infinite alternate`,
                }}
              />
            )}
          </div>

          {/* Shimmer overlay */}
          <div className="ai-shimmer absolute inset-0" />

          {/* Scanning line */}
          <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-violet-400 to-transparent animate-ai-scan z-10" />

          {/* Floating particles */}
          <div className="absolute inset-0 z-10">
            <span className="ai-particle" style={{ left: "10%", bottom: "20%" }} />
            <span className="ai-particle" style={{ left: "20%", bottom: "40%" }} />
            <span className="ai-particle" style={{ left: "50%", bottom: "60%" }} />
            <span className="ai-particle" style={{ left: "75%", bottom: "30%" }} />
            <span className="ai-particle" style={{ left: "90%", bottom: "50%" }} />
            <span className="ai-particle" style={{ left: "35%", bottom: "70%" }} />
          </div>

          {/* Rotating ring deco */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-2 border-dashed border-violet-300/40 animate-ai-spin-slow" />
          </div>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <div className="p-4 rounded-full bg-white/20 backdrop-blur-md mb-4">
              <Wand2 className="w-8 h-8 text-violet-500 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-foreground/80 mb-2">
              {phaseLabel}
            </p>

            {/* Progress bar */}
            <div className="w-48 h-2 rounded-full bg-white/30 overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-300 ease-out"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {generationProgress}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -- Result State --
  if (resultImage) {
    return (
      <div className={cn("", className)}>
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass-card ai-morph-in">
          <img
            src={resultImage}
            alt="Kết quả mặc thử"
            className="w-full h-full object-cover"
          />
          {/* Confidence badge */}
          {confidence && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium shadow-lg">
              <Sparkles className="w-3 h-3" />
              Độ chính xác: {confidence}%
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all active:scale-95 shadow-lg shadow-violet-300/25"
          >
            <Download className="w-4 h-4" />
            Tải ảnh
          </button>
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/60 border border-white/50 text-sm font-medium text-foreground hover:bg-white/80 transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // -- Idle State (placeholder) --
  return (
    <div className={cn("", className)}>
      <div className="aspect-[3/4] rounded-2xl glass-card border-2 border-dashed border-violet-200/40 flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-violet-300" />
        </div>
        <div className="text-center px-4">
          <p className="text-sm font-medium text-foreground/60 mb-1">
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
