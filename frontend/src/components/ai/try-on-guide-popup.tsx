"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ChevronDown,
  CircleCheck,
  CircleX,
  Lightbulb,
  Camera,
  Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TryOnGuidePopupProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: Camera,
    title: "1. Ảnh của bạn",
    dos: [
      "Đứng thẳng, hai tay thả tự nhiên hai bên",
      "Mặc áo ôm sát hoặc áo mỏng",
      "Nền đơn giản, ánh sáng đủ",
      "Chụp toàn thân hoặc nửa trên",
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
    title: "2. Ảnh quần áo",
    dos: [
      "Ảnh sản phẩm trên nền trắng hoặc đơn giản",
      "Ảnh flatlay rõ nét",
      "Ảnh trên mannequin hoặc người mẫu",
      "Độ phân giải cao, đủ sáng",
    ],
    donts: [
      "Ảnh bị nhăn hoặc gấp nếp nhiều",
      "Ảnh quá tối hoặc mờ",
      "Nền quá rối mắt",
      "Ảnh quá nhỏ hoặc độ phân giải thấp",
    ],
  },
];

const TIPS = [
  { emoji: "📸", text: "Sử dụng camera sau cho ảnh nét hơn" },
  { emoji: "💡", text: "Chụp nơi có ánh sáng tự nhiên" },
  { emoji: "🧍", text: "Đứng cách tường ít nhất 30cm" },
  { emoji: "👕", text: "Mặc áo sáng màu để AI phân biệt dễ hơn" },
  { emoji: "📐", text: "Giữ điện thoại thẳng, ngang tầm ngực" },
  { emoji: "🔄", text: "Thử nhiều lần với các góc khác nhau" },
];

export default function TryOnGuidePopup({
  open,
  onClose,
}: TryOnGuidePopupProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-500 ease-in-out",
        open ? "max-h-[2000px] opacity-100 mt-2 mb-6" : "max-h-0 opacity-0 mb-0"
      )}
    >
      <div className="glass-card overflow-hidden">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-violet-500/10 to-purple-500/10 hover:from-violet-500/15 hover:to-purple-500/15 transition-all group"
        >
          <span className="font-heading font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-violet-500" />
            Hướng dẫn chụp ảnh thử đồ ảo
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-300",
              open ? "rotate-180" : "rotate-0"
            )}
          />
        </button>

        <div className="p-4 sm:p-5 space-y-5">
          <div className="rounded-2xl overflow-hidden border border-violet-100/70 bg-white/70 shadow-sm">
            <div className="relative aspect-[16/9] w-full bg-slate-50">
              <Image
                src="/BangHuongDanSuDungAITryOn.png"
                alt="Hướng dẫn sử dụng AI Try-On"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 1200px"
                priority={open}
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowDetails((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              {showDetails ? "Ẩn chi tiết" : "Chi tiết"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-300",
                  showDetails ? "rotate-180" : "rotate-0"
                )}
              />
            </button>
          </div>

          {showDetails && (
            <div className="space-y-5 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTIONS.map((section) => {
                  const SectionIcon = section.icon;

                  return (
                    <div
                      key={section.title}
                      className="rounded-2xl bg-white/40 border border-white/60 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                          <SectionIcon className="w-4 h-4 text-violet-500" />
                        </div>
                        <h4 className="font-semibold text-foreground text-sm">
                          {section.title}
                        </h4>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider mb-1.5">
                          Nên làm
                        </p>
                        <ul className="space-y-1">
                          {section.dos.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-1.5 text-xs sm:text-sm text-foreground/75"
                            >
                              <CircleCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-1.5">
                          Không nên
                        </p>
                        <ul className="space-y-1">
                          {section.donts.map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-1.5 text-xs sm:text-sm text-foreground/75"
                            >
                              <CircleX className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-violet-50/80 to-purple-50/80 border border-violet-100/60 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-violet-500" />
                  </div>
                  <h4 className="font-semibold text-foreground text-sm">
                    3. Mẹo hay
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {TIPS.map((tip) => (
                    <div
                      key={tip.text}
                      className="flex items-center gap-2 text-xs sm:text-sm text-foreground/75 px-3 py-2 rounded-xl bg-white/50"
                    >
                      <span className="text-base shrink-0">{tip.emoji}</span>
                      {tip.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
