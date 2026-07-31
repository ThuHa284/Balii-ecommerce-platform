'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Gift, Sparkles } from 'lucide-react';
import { getActiveCampaigns } from '@/lib/api/campaigns.api';
import { formatCurrency } from '@/lib/utils';
import { Campaign } from '@/types/product.types';

interface ComboBannerProps {
  variant?: 'full' | 'compact';
}

export default function ComboBanner({ variant = 'full' }: ComboBannerProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    void getActiveCampaigns()
      .then((items) =>
        setCampaigns(
          items
            .filter(
              (item) =>
                item.discountType === 'GIFT' &&
                item.giftVariantId &&
                item.giftQuantity > 0,
            )
            .sort(
              (left, right) =>
                left.minimumPurchaseQuantity - right.minimumPurchaseQuantity,
            ),
        ),
      )
      .catch(() => setCampaigns([]));
  }, []);

  if (!campaigns.length) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className="combo-gradient glass-card p-5 md:p-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-500 p-2.5 text-white shadow-lg shadow-violet-300/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Combo ưu đãi đang diễn ra
              </h3>
              <p className="text-sm text-muted-foreground">
                Quà tặng được tự động thêm vào giỏ khi đủ điều kiện.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {campaigns.map((campaign) => (
              <span
                key={campaign.id}
                className="rounded-full border border-white/40 bg-white/60 px-3 py-1.5 text-xs font-bold"
              >
                {campaign.badgeText || campaign.name}
              </span>
            ))}
          </div>
          <Link
            href="/products"
            className="btn-primary inline-flex shrink-0 items-center gap-2 text-sm"
          >
            Mua ngay <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="combo-gradient glass-card overflow-hidden">
      <div className="p-6 pb-4 md:p-8 md:pb-4">
        <div className="flex items-center gap-3">
          <div className="promo-pulse rounded-xl bg-violet-500 p-2.5 text-white shadow-lg shadow-violet-300/25">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              Combo <span className="text-gradient">ưu đãi</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Điều kiện và quà tặng được cập nhật trực tiếp từ hệ thống.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 md:px-8 md:pb-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {campaigns.map((campaign, index) => (
            <div
              key={campaign.id}
              className={`rounded-2xl border-2 p-5 transition-all duration-300 hover:scale-[1.02] ${
                index === campaigns.length - 1
                  ? 'border-violet-300 bg-violet-500/10 shadow-lg shadow-violet-200/30'
                  : 'border-white/50 bg-white/50'
              }`}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500 text-white">
                <Gift className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-heading text-lg font-bold">
                {campaign.badgeText || campaign.name}
              </h3>
              <p className="mb-3 text-sm text-muted-foreground">
                Mua tối thiểu {campaign.minimumPurchaseQuantity} sản phẩm, nhận{' '}
                {campaign.giftQuantity} {campaign.giftName || 'quà tặng'}.
              </p>
              <p className="mb-4 text-lg font-bold text-primary">
                {campaign.giftUnitPrice === 0
                  ? 'MIỄN PHÍ'
                  : `${formatCurrency(campaign.giftUnitPrice)} / quà`}
              </p>
              <Link
                href="/products"
                className="btn-primary block text-center text-sm"
              >
                Mua ngay
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
