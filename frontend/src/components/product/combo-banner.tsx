"use client";

import Link from "next/link";
import { Gift, Flame, Gem, ArrowRight, Truck, Sparkles } from "lucide-react";
import { COMBO_TIERS, MOCK_COMBO_SHORTS } from "@/lib/api/mock-data";
import { formatCurrency } from "@/lib/utils";

interface ComboBannerProps {
  variant?: "full" | "compact";
}

export default function ComboBanner({ variant = "full" }: ComboBannerProps) {
  const tierIcons: Record<string, React.ReactNode> = {
    gift: <Gift className="w-5 h-5" />,
    flame: <Flame className="w-5 h-5" />,
    gem: <Gem className="w-5 h-5" />,
  };

  if (variant === "compact") {
    return (
      <div className="combo-gradient glass-card p-5 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-300/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Combo Ưu Đãi Đặc Biệt
              </h3>
              <p className="text-sm text-muted-foreground">
                Mua càng nhiều, ưu đãi càng lớn — Tặng quần bảo hộ lụa miễn phí!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {COMBO_TIERS.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-white/40 text-xs font-bold text-foreground"
              >
                <span>{tier.badge}</span>
                <span className="hidden sm:inline">{tier.name}</span>
              </div>
            ))}
          </div>

          <Link
            href="/products"
            className="btn-primary text-sm inline-flex items-center gap-2 flex-shrink-0"
          >
            Mua ngay
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="combo-gradient glass-card overflow-hidden">
      {/* Header */}
      <div className="p-6 md:p-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-300/25 promo-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              Combo <span className="text-gradient">Ưu Đãi</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Mua đồ ngủ lụa — Tặng quần bảo hộ lụa miễn phí!
            </p>
          </div>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="px-6 md:px-8 pb-6 md:pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COMBO_TIERS.map((tier) => {
            const isHot = tier.id === "combo_2";
            const isVIP = tier.id === "combo_3";

            return (
              <div
                key={tier.id}
                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] ${
                  isVIP
                    ? "bg-violet-500/10 border-violet-300 shadow-lg shadow-violet-200/30"
                    : isHot
                    ? "bg-orange-50/60 border-orange-200 shadow-lg shadow-orange-200/20"
                    : "bg-white/50 border-white/50"
                }`}
              >
                {/* Popular badge */}
                {isHot && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow-lg">
                    🔥 Phổ biến nhất
                  </div>
                )}
                {isVIP && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-500 text-white text-xs font-bold shadow-lg">
                    💎 Tiết kiệm nhất
                  </div>
                )}

                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                    isVIP
                      ? "bg-violet-500 text-white"
                      : isHot
                      ? "bg-orange-500 text-white"
                      : "bg-violet-100 text-violet-500"
                  }`}
                >
                  {tierIcons[tier.icon]}
                </div>

                {/* Title */}
                <h3 className="font-heading text-lg font-bold text-foreground mb-1">
                  {tier.badge} {tier.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {tier.description}
                </p>

                {/* Price info */}
                <div className="flex items-center gap-2 mb-4">
                  {tier.freeShorts > 0 ? (
                    <>
                      <span className="text-lg font-bold text-green-600">
                        MIỄN PHÍ
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        {formatCurrency(tier.freeShorts * MOCK_COMBO_SHORTS.basePrice)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(tier.shortsPrice)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / quần bảo hộ
                      </span>
                    </>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href="/products"
                  className={`w-full text-center text-sm font-medium py-2.5 rounded-xl block transition-all ${
                    isVIP
                      ? "btn-primary"
                      : isHot
                      ? "bg-orange-500 text-white hover:bg-orange-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-300/25"
                      : "btn-outline"
                  }`}
                >
                  Mua ngay
                </Link>
              </div>
            );
          })}
        </div>

        {/* Freeship note */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Truck className="w-4 h-4 text-green-500" />
          <span>
            Mua từ <strong className="text-foreground">2 sản phẩm</strong> trở lên
            được <strong className="text-green-600">FREESHIP</strong> toàn quốc!
          </span>
        </div>
      </div>
    </div>
  );
}
