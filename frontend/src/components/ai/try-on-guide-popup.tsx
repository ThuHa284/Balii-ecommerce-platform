"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  CircleCheck,
  CircleX,
  Lightbulb,
  Camera,
  Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTryOnStore } from "@/store/tryon.store";

interface TryOnGuidePopupProps {
  open: boolean;
  onClose: () => void;
}

const SLIDES = [
  {
    icon: Camera,
    title: "Ảnh của bạn",
    subtitle: "Cách chụp ảnh để AI xử lý tốt nhất",
    dos: [
      "Đứng thẳng, hai tay thả tự nhiên hai bên",
      "Mặc áo ôm sát hoặc áo mỏng",
      "Nền đơn giản, ánh sáng đủ",
      "Chụp toàn thân cho kết quả tốt nhất",
    ],
    donts: [
      "Không ngồi hoặc nghiêng người",
      "Không mặc áo khoác dày",
      "Không che tay lên người",
      "Không chụp trong bóng tối",
    ],
  },
  {
    icon: Shirt,
    title: "Ảnh quần áo",
    subtitle: "Loại ảnh quần áo nào cho kết quả tốt",
    dos: [
      "Ảnh sản phẩm trên nền trắng/đơn giản",
      "Ảnh flatlay (trải phẳng) rõ nét",
      "Ảnh trên mannequin/người mẫu",
      "Độ phân giải cao, đủ sáng",
    ],
    donts: [
      "Ảnh bị nhăn, gấp nếp nhiều",
      "Ảnh quá tối hoặc mờ",
      "Nền quá rối mắt",
      "Ảnh quá nhỏ / resolution thấp",
    ],
  },
  {
    icon: Lightbulb,
    title: "Mẹo hay",
    subtitle: "Để có kết quả ấn tượng nhất",
    tips: [
      "📸 Sử dụng camera sau cho ảnh nét hơn",
      "💡 Chụp nơi có ánh sáng tự nhiên",
      "🧍 Đứng cách tường ít nhất 30cm",
      "👕 Mặc áo sáng màu để AI phân biệt dễ hơn",
      "📐 Giữ điện thoại thẳng, ngang tầm ngực",
      "🔄 Thử nhiều lần với các góc khác nhau",
    ],
  },
];

export default function TryOnGuidePopup({
  open,
  onClose,
}: TryOnGuidePopupProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Reset slide when opening
  useEffect(() => {
    if (open) setCurrentSlide(0);
  }, [open]);

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem("balii-tryon-guide-dismissed", "true");
    }
    onClose();
  }, [dontShowAgain, onClose]);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  if (!open) return null;

  const slide = SLIDES[currentSlide];
  const SlideIcon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card overflow-hidden animate-fade-in shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-white/40 hover:bg-white/60 transition-all active:scale-90"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-5 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-white/20 backdrop-blur-sm mb-3">
            <SlideIcon className="w-7 h-7 text-white" />
          </div>
          <h3 className="font-heading text-xl font-bold text-white mb-1">
            {slide.title}
          </h3>
          <p className="text-sm text-white/80">{slide.subtitle}</p>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[50vh] overflow-y-auto">
          {"dos" in slide && slide.dos && (
            <>
              {/* DOs */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
                  ✅ Nên làm
                </p>
                <ul className="space-y-2">
                  {slide.dos.map((item: string, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-foreground/80"
                    >
                      <CircleCheck className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* DON'Ts */}
              {"donts" in slide && slide.donts && (
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
                    ❌ Không nên
                  </p>
                  <ul className="space-y-2">
                    {slide.donts.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground/80"
                      >
                        <CircleX className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {"tips" in slide && slide.tips && (
            <ul className="space-y-3">
              {slide.tips.map((tip: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-foreground/80 p-3 rounded-xl bg-violet-50/50"
                >
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          {/* Dots */}
          <div className="flex justify-center gap-2 mb-4">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentSlide
                    ? "w-6 bg-violet-500"
                    : "bg-violet-200 hover:bg-violet-300"
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className={cn(
                "flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                currentSlide === 0
                  ? "opacity-0 pointer-events-none"
                  : "bg-white/60 border border-white/50 text-foreground hover:bg-white/80 active:scale-95"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>

            {currentSlide < SLIDES.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-6 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all active:scale-95 shadow-lg shadow-violet-300/25"
              >
                Tiếp
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="flex items-center gap-1 px-6 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition-all active:scale-95 shadow-lg shadow-violet-300/25"
              >
                <Check className="w-4 h-4" />
                Đã hiểu
              </button>
            )}
          </div>

          {/* Don't show again */}
          <label className="flex items-center gap-2 mt-3 justify-center cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-violet-300 text-violet-500 focus:ring-violet-300"
            />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Không hiển thị lại
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
