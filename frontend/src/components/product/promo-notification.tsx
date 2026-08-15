'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Gift, Sparkles, Truck, X } from 'lucide-react';
import { getActiveCampaigns } from '@/lib/api/campaigns.api';
import { useCartStore } from '@/store/cart.store';
import { Campaign } from '@/types/product.types';

function getCampaignMessage(campaign: Campaign) {
  if (campaign.discountType === 'GIFT') {
    return `Mua tối thiểu ${campaign.minimumPurchaseQuantity} sản phẩm, nhận ${campaign.giftQuantity} ${campaign.giftName || 'quà tặng'}.`;
  }
  if (campaign.discountType === 'PERCENT') {
    return `${campaign.name}: giảm ${campaign.discountValue ?? 0}%.`;
  }
  return campaign.name;
}

export function FloatingPromoBar() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isDismissed, setIsDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      sessionStorage.getItem('promo-bar-dismissed') != null,
  );

  useEffect(() => {
    void getActiveCampaigns()
      .then((campaigns) => setCampaign(campaigns[0] ?? null))
      .catch(() => setCampaign(null));
  }, []);

  if (isDismissed || !campaign) return null;

  return (
    <div className="promo-float-bar py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Sparkles className="promo-pulse h-5 w-5 shrink-0 text-white/90" />
          <p className="truncate text-sm font-medium text-white">
            {campaign.badgeText || getCampaignMessage(campaign)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/products"
            className="rounded-full border border-white/20 bg-white/20 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-white/30"
          >
            Mua ngay
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsDismissed(true);
              sessionStorage.setItem('promo-bar-dismissed', 'true');
            }}
            className="rounded-full p-1 text-white/70 hover:bg-white/20 hover:text-white"
            aria-label="Đóng thông báo khuyến mãi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CartPromoSuggestions() {
  const items = useCartStore((state) => state.items);
  const promotionItems = useCartStore((state) => state.promotionItems);
  const shippingFee = useCartStore((state) => state.serverShippingFee);
  const appliedPromotions = useMemo(() => {
    const byCampaign = new Map<string, string>();
    for (const item of promotionItems) {
      const key = item.campaign?.id || item.id;
      byCampaign.set(
        key,
        item.campaign?.badgeText ||
          item.campaign?.name ||
          `${item.productName} × ${item.quantity}`,
      );
    }
    return [...byCampaign.entries()];
  }, [promotionItems]);

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {shippingFee === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          <Truck className="h-4 w-4 shrink-0" />
          Phí vận chuyển hiện tại là 0đ theo kết quả tính từ máy chủ.
        </div>
      ) : null}

      {appliedPromotions.map(([id, label]) => (
        <div
          key={id}
          className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700"
        >
          <Gift className="h-4 w-4 shrink-0" />
          Đã tự động áp dụng: {label}
        </div>
      ))}

      {!appliedPromotions.length ? (
        <p className="rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-xs text-muted-foreground">
          Quà tặng và khuyến mãi sẽ được máy chủ tự động áp dụng khi giỏ hàng
          đạt đúng điều kiện chiến dịch.
        </p>
      ) : null}
    </div>
  );
}
