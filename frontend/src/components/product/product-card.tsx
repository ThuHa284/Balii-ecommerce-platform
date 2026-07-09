'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Eye, ArrowRightLeft } from 'lucide-react';
import { Product } from '@/types/product.types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { useQuickViewStore } from '@/store/quickview.store';
import { useCompareStore } from '@/store/compare.store';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const isFavorite = isInWishlist(product.id);
  const { addItem, setCartDrawerOpen } = useCartStore();

  const openQuickView = useQuickViewStore((state) => state.openQuickView);
  const { toggleCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(product.id);

  const price = product.salePrice ?? product.basePrice;
  const hasDiscount =
    product.salePrice !== null && product.salePrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.basePrice - product.salePrice!) / product.basePrice) * 100,
      )
    : 0;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    if (!isFavorite) {
      toast.success(`Đã thêm "${product.name}" vào danh sách yêu thích!`, {
        icon: '❤️',
      });
    } else {
      toast.info(`Đã xoá "${product.name}" khỏi danh sách yêu thích.`);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const defaultVariant = product.variants[0];
    if (!defaultVariant) {
      toast.error('Sản phẩm tạm thời hết hàng!');
      return;
    }

    const priceToAdd =
      defaultVariant.salePrice ?? defaultVariant.price ?? price;

    await addItem({
      id: `cart_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      thumbnail: product.thumbnail,
      variant: defaultVariant,
      campaign: product.activeCampaign
        ? {
            id: product.activeCampaign.id,
            name: product.activeCampaign.name,
            discountType: product.activeCampaign.discountType,
            discountValue: product.activeCampaign.discountValue,
            badgeText: product.activeCampaign.badgeText,
          }
        : null,
      quantity: 1,
      price: priceToAdd,
      totalPrice: priceToAdd,
    });

    toast.success(
      `Đã thêm "${product.name}" (Size ${defaultVariant.size}) vào giỏ hàng!`,
    );
    setCartDrawerOpen(true);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product);
  };

  return (
    <div className="group glass-card-hover overflow-hidden">
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
        <Link
          href={`/products/${product.slug}`}
          className="block w-full h-full relative"
        >
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-full">
              -{discountPercent}%
            </span>
          )}
          {product.activeCampaign?.badgeText ? (
            <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-600 text-white rounded-full">
              {product.activeCampaign.badgeText}
            </span>
          ) : null}
          {product.isNew && (
            <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-500 text-white rounded-full">
              Mới
            </span>
          )}
        </div>

        {/* Wishlist button — always visible on mobile, hover on desktop */}
        <button
          onClick={handleToggleFavorite}
          className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 z-10"
          aria-label="Thêm vào yêu thích"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'
            }`}
          />
        </button>

        {/* Bottom action bar — slides up on hover */}
        <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2 p-2.5 bg-gradient-to-t from-black/40 to-transparent translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300 z-10">
          <button
            onClick={handleQuickView}
            className="flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-white hover:scale-105 active:scale-95"
            aria-label="Xem nhanh"
          >
            <Eye className="w-3.5 h-3.5" />
            Xem nhanh
          </button>
          <button
            onClick={(event) => {
              void handleAddToCart(event);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-violet-600 hover:scale-105 active:scale-95"
            aria-label="Thêm vào giỏ"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Thêm vào giỏ
          </button>
          <button
            onClick={handleToggleCompare}
            className={`p-1.5 rounded-lg backdrop-blur-sm shadow-sm transition-all hover:scale-105 active:scale-95 ${
              inCompare
                ? 'bg-violet-500 text-white'
                : 'bg-white/90 text-slate-700'
            }`}
            aria-label="So sánh"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-heading text-sm font-semibold text-foreground line-clamp-1 mb-1 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-primary">
            {formatCurrency(price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatCurrency(product.basePrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
