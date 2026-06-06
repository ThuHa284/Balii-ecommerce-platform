import { COMBO_TIERS } from '@/lib/api/mock-data';
import {
  COMBO_SHORTS_BASE_PRICE,
  COMBO_SHORTS_BUNDLE_PRICE,
  FREESHIP_MIN_ITEMS,
} from '@/lib/constants';

export interface ComboResult {
  tierId: string;
  tierName: string;
  freeShorts: number;
  shortsPrice: number;
  totalShortsValue: number;
  savings: number;
  badge: string;
  description: string;
}

export function getComboTier(eligibleItemCount: number): ComboResult | null {
  const sortedTiers = [...COMBO_TIERS].sort((a, b) => b.minItems - a.minItems);
  const matchedTier = sortedTiers.find(
    (tier) => eligibleItemCount >= tier.minItems,
  );

  if (!matchedTier) return null;

  const totalShortsValue =
    matchedTier.freeShorts > 0
      ? matchedTier.freeShorts * COMBO_SHORTS_BASE_PRICE
      : 0;
  const savings =
    matchedTier.freeShorts > 0
      ? totalShortsValue
      : COMBO_SHORTS_BASE_PRICE - COMBO_SHORTS_BUNDLE_PRICE;

  return {
    tierId: matchedTier.id,
    tierName: matchedTier.name,
    freeShorts: matchedTier.freeShorts,
    shortsPrice: matchedTier.shortsPrice,
    totalShortsValue,
    savings: Math.max(0, savings),
    badge: matchedTier.badge,
    description: matchedTier.description,
  };
}

export function getNextTierInfo(
  eligibleItemCount: number,
): { itemsNeeded: number; nextTier: string; nextDescription: string } | null {
  const sortedTiers = [...COMBO_TIERS].sort((a, b) => a.minItems - b.minItems);
  const nextTier = sortedTiers.find(
    (tier) => tier.minItems > eligibleItemCount,
  );

  if (!nextTier) return null;

  return {
    itemsNeeded: nextTier.minItems - eligibleItemCount,
    nextTier: nextTier.name,
    nextDescription: nextTier.description,
  };
}

export function isEligibleForFreeShipping(
  itemCount: number,
  subtotal: number,
): boolean {
  return itemCount >= FREESHIP_MIN_ITEMS || subtotal >= 500000;
}

export function getFreeShippingMessage(
  itemCount: number,
  subtotal: number,
): string | null {
  if (isEligibleForFreeShipping(itemCount, subtotal)) {
    return 'Bạn đã được MIỄN PHÍ vận chuyển!';
  }

  if (itemCount === 1) {
    return 'Thêm 1 sản phẩm nữa để được FREESHIP!';
  }

  return null;
}
