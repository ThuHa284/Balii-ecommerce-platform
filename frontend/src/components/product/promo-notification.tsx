"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Gift,
  Truck,
  Sparkles,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { useCartStore } from "@/store/cart.store";
import { getComboTier, getNextTierInfo, isEligibleForFreeShipping, getFreeShippingMessage } from "@/lib/combo-utils";
import { cn } from "@/lib/utils";

// ─── Floating Promo Bar ──────────────────────────────────────────────────────

export function FloatingPromoBar() {
  const [isDismissed, setIsDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem("promo-bar-dismissed") != null
  );

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("promo-bar-dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        "promo-float-bar py-3 transition-all duration-500",
        "translate-y-0"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Sparkles className="w-5 h-5 text-white/90 flex-shrink-0 promo-pulse" />
            <p className="text-white text-sm font-medium truncate">
              <span className="hidden sm:inline">
                🎁 Mua 2 sản phẩm tặng FREE quần bảo hộ + FREESHIP!{" "}
              </span>
              <span className="sm:hidden">
                🎁 Mua 2 tặng quần FREE + FREESHIP!
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/products"
              className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-full transition-all hover:scale-105 active:scale-95 backdrop-blur-sm border border-white/20"
            >
              Mua ngay
            </Link>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cart Promo Suggestions ──────────────────────────────────────────────────

export function CartPromoSuggestions() {
  const { items } = useCartStore();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const comboTier = getComboTier(itemCount);
  const nextTierInfo = getNextTierInfo(itemCount);
  const freeShipping = isEligibleForFreeShipping(itemCount, subtotal);
  const freeShipMessage = getFreeShippingMessage(itemCount, subtotal);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Free Shipping Status */}
      {freeShipMessage && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all",
            freeShipping
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          )}
        >
          <Truck className="w-4 h-4 flex-shrink-0" />
          <span>{freeShipMessage}</span>
        </div>
      )}

      {/* Current Combo Tier */}
      {comboTier && comboTier.freeShorts > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
          <Gift className="w-4 h-4 flex-shrink-0" />
          <span>
            {comboTier.badge} {comboTier.description}
          </span>
        </div>
      )}

      {/* Next Tier Suggestion */}
      {nextTierInfo && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs bg-white/50 border border-white/40">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />
            <span>
              Thêm <strong className="text-foreground">{nextTierInfo.itemsNeeded}</strong>{" "}
              sản phẩm → <strong className="text-violet-600">{nextTierInfo.nextTier}</strong>
            </span>
          </div>
          <Link
            href="/products"
            className="text-violet-600 font-bold hover:underline flex items-center gap-1"
          >
            Mua thêm
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Add-to-Cart Toast ───────────────────────────────────────────────────────

interface PromoToastProps {
  itemCount: number;
  onDismiss: () => void;
}

export function PromoToast({ itemCount, onDismiss }: PromoToastProps) {
  const nextTierInfo = getNextTierInfo(itemCount);
  const comboTier = getComboTier(itemCount);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-24 right-4 z-50 max-w-sm animate-slide-in-right">
      <div className="glass-card p-4 shadow-2xl border border-white/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 flex-shrink-0">
            <Gift className="w-5 h-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            {comboTier && comboTier.freeShorts > 0 ? (
              <>
                <p className="text-sm font-bold text-foreground">
                  {comboTier.badge} Bạn đã đạt {comboTier.tierName}!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {comboTier.description}
                </p>
              </>
            ) : nextTierInfo ? (
              <>
                <p className="text-sm font-bold text-foreground">
                  🎯 Sắp đạt combo rồi!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thêm {nextTierInfo.itemsNeeded} sản phẩm để được{" "}
                  <span className="text-violet-600 font-medium">
                    {nextTierInfo.nextDescription}
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-foreground">
                  ✅ Đã thêm vào giỏ hàng!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mua thêm sản phẩm để nhận ưu đãi combo
                </p>
              </>
            )}

            {itemCount >= 2 && (
              <div className="freeship-badge mt-2">
                <Truck className="w-3 h-3" />
                FREESHIP
              </div>
            )}
          </div>

          <button
            onClick={onDismiss}
            className="p-1 rounded-lg hover:bg-white/40 transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
