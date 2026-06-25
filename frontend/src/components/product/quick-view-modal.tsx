'use client';

import { useQuickViewStore } from '@/store/quickview.store';
import { useCartStore } from '@/store/cart.store';
import { useWishlistStore } from '@/store/wishlist.store';
import { X, ShoppingBag, Heart, Check, HelpCircle } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

function parseSizeRange(sizeLabel: string) {
  const matched = sizeLabel.match(
    /(\d+(?:[.,]\d+)?)\s*(?:kg)?\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*(?:kg)?/i,
  );

  if (!matched) {
    return null;
  }

  return {
    min: Number(matched[1].replace(',', '.')),
    max: Number(matched[2].replace(',', '.')),
  };
}

export default function QuickViewModal() {
  const { isOpen, selectedProduct, closeQuickView } = useQuickViewStore();
  const { addItem, setCartDrawerOpen } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [weightInput, setWeightInput] = useState('');
  const [suggestedSize, setSuggestedSize] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    const timer = window.setTimeout(() => {
      const defaultVariant = selectedProduct.variants[0];
      if (defaultVariant) {
        setSelectedSize(defaultVariant.size);
        setSelectedColor(defaultVariant.color);
      }

      setQuantity(1);
      setWeightInput('');
      setSuggestedSize('');
      setActiveImageIndex(0);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedProduct]);

  if (!isOpen || !selectedProduct) {
    return null;
  }

  const isFavorite = isInWishlist(selectedProduct.id);
  const sizes = Array.from(
    new Set(
      selectedProduct.variants.map((variant) => variant.size).filter(Boolean),
    ),
  );
  const colors = Array.from(
    new Map(
      selectedProduct.variants.map((variant) => [
        variant.color,
        variant.colorCode,
      ]),
    ).entries(),
  );

  const handleWeightChange = (value: string) => {
    setWeightInput(value);
    const weight = parseFloat(value);

    if (Number.isNaN(weight) || weight <= 0) {
      setSuggestedSize('');
      return;
    }

    const recommendedSize =
      sizes.find((sizeLabel) => {
        const range = parseSizeRange(sizeLabel);
        return range ? weight >= range.min && weight <= range.max : false;
      }) ?? '';

    setSuggestedSize(recommendedSize);
    if (recommendedSize) {
      setSelectedSize(recommendedSize);
    }
  };

  const currentVariant =
    selectedProduct.variants.find(
      (variant) =>
        variant.size === selectedSize &&
        (colors.length === 0 || variant.color === selectedColor),
    ) ??
    selectedProduct.variants.find((variant) => variant.size === selectedSize) ??
    selectedProduct.variants[0];

  const price =
    currentVariant?.salePrice ||
    currentVariant?.price ||
    selectedProduct.salePrice ||
    selectedProduct.basePrice;
  const originalPrice = currentVariant?.price || selectedProduct.basePrice;
  const hasDiscount = currentVariant
    ? currentVariant.salePrice !== null &&
      currentVariant.salePrice < currentVariant.price
    : selectedProduct.salePrice !== null &&
      selectedProduct.salePrice < selectedProduct.basePrice;

  const imagesToDisplay =
    currentVariant && currentVariant.images.length > 0
      ? currentVariant.images
      : selectedProduct.images.length > 0
        ? selectedProduct.images
        : [selectedProduct.thumbnail];

  const handleAddToCart = async () => {
    if (!currentVariant) {
      toast.error('Vui lòng chọn kích cỡ và màu sắc hợp lệ.');
      return;
    }

    if (currentVariant.stock <= 0) {
      toast.error('Phiên bản này đã hết hàng.');
      return;
    }

    await addItem({
      id: `cart_${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSlug: selectedProduct.slug,
      thumbnail: imagesToDisplay[activeImageIndex] || selectedProduct.thumbnail,
      variant: currentVariant,
      quantity,
      price,
      totalPrice: price * quantity,
    });

    toast.success(
      `Đã thêm ${quantity} x "${selectedProduct.name}" (${currentVariant.size}) vào giỏ hàng!`,
    );
    closeQuickView();
    setCartDrawerOpen(true);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(selectedProduct.id);
    if (!isFavorite) {
      toast.success(
        `Đã thêm "${selectedProduct.name}" vào danh sách yêu thích!`,
        {
          icon: '♥',
        },
      );
      return;
    }

    toast.info(`Đã xóa "${selectedProduct.name}" khỏi danh sách yêu thích.`);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 animate-fade-in bg-black/40 backdrop-blur-md transition-opacity duration-300"
        onClick={closeQuickView}
      />

      <div className="fixed inset-4 z-50 flex w-auto max-w-4xl animate-scale-up flex-col overflow-hidden rounded-2xl border border-white/40 shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-11/12 sm:-translate-x-1/2 sm:-translate-y-1/2 md:w-full md:flex-row glass-card max-h-[90vh]">
        <button
          onClick={closeQuickView}
          className="absolute right-4 top-4 z-20 rounded-full bg-white/60 p-2 text-slate-800 shadow-md transition-colors hover:bg-white hover:text-black"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex w-full flex-col justify-between border-b border-white/20 bg-slate-50/20 p-4 md:w-1/2 md:border-b-0 md:border-r sm:p-6">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 via-white to-rose-50 shadow-inner">
            <Image
              src={
                imagesToDisplay[activeImageIndex] || selectedProduct.thumbnail
              }
              alt={selectedProduct.name}
              fill
              className="object-contain p-4 transition-all duration-300"
            />
            {hasDiscount && (
              <span className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                GIẢM GIÁ
              </span>
            )}
          </div>

          {imagesToDisplay.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {imagesToDisplay.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-all ${
                    index === activeImageIndex
                      ? 'scale-105 border-violet-500'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    className="object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex max-h-[50vh] w-full flex-col space-y-5 overflow-y-auto p-6 md:max-h-[90vh] md:w-1/2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              {selectedProduct.category?.name || 'Đồ ngủ thiết kế'}
            </span>
            <h2 className="mt-1 font-heading text-xl font-extrabold text-slate-900 md:text-2xl">
              {selectedProduct.name}
            </h2>
          </div>

          <div className="flex items-baseline gap-3 rounded-xl border border-violet-100/50 bg-violet-500/5 p-3">
            <span className="text-2xl font-bold text-violet-700">
              {formatCurrency(price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-slate-400 line-through">
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-violet-200/50 bg-gradient-to-r from-violet-500/5 to-purple-500/5 p-4">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <HelpCircle className="h-4 w-4 text-violet-500" />
                Gợi ý chọn size theo cân nặng
              </label>
              {suggestedSize && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600">
                  Gợi ý: {suggestedSize}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={weightInput}
                onChange={(event) => handleWeightChange(event.target.value)}
                placeholder="Nhập cân nặng của bạn (kg), ví dụ 52"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Hệ thống sẽ đối chiếu cân nặng với khoảng kg có sẵn trong từng
              size của sản phẩm.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800">
              Kích thước:{' '}
              <span className="font-semibold text-violet-600">
                {selectedSize}
              </span>
            </span>
            <div className="flex flex-wrap gap-2">
              {sizes.map((sizeLabel) => {
                const isSuggested = sizeLabel === suggestedSize;
                return (
                  <button
                    key={sizeLabel}
                    onClick={() => setSelectedSize(sizeLabel)}
                    className={`rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                      selectedSize === sizeLabel
                        ? 'scale-105 border-violet-600 bg-violet-600 text-white shadow-md'
                        : isSuggested
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                          : 'border-slate-200 bg-white/60 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {sizeLabel} {isSuggested && '✨'}
                  </button>
                );
              })}
            </div>
          </div>

          {colors.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800">
                Màu sắc:{' '}
                <span className="font-semibold text-violet-600">
                  {selectedColor}
                </span>
              </span>
              <div className="flex flex-wrap gap-3">
                {colors.map(([colorName, colorCode]) => (
                  <button
                    key={colorName}
                    onClick={() => setSelectedColor(colorName)}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                      selectedColor === colorName
                        ? 'scale-110 border-violet-600 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorCode || '#ccc' }}
                    title={colorName}
                  >
                    {selectedColor === colorName && (
                      <Check className="h-4 w-4 text-white drop-shadow mix-blend-difference" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs font-medium">
            Tình trạng:{' '}
            {currentVariant && currentVariant.stock > 0 ? (
              <span className="font-bold text-emerald-600">
                Còn hàng ({currentVariant.stock})
              </span>
            ) : (
              <span className="font-bold text-rose-500">Hết hàng</span>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-white/20 pt-3">
            <div className="flex items-center rounded-xl border border-slate-200 bg-white/60 p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-slate-600 hover:bg-slate-100 hover:text-black"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-semibold text-slate-800">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-slate-600 hover:bg-slate-100 hover:text-black"
              >
                +
              </button>
            </div>

            <button
              onClick={() => {
                void handleAddToCart();
              }}
              disabled={!currentVariant || currentVariant.stock <= 0}
              className="btn-primary flex-1 py-3 text-sm font-bold shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Thêm vào giỏ
            </button>

            <button
              onClick={handleToggleWishlist}
              className={`rounded-xl border p-3 transition-all ${
                isFavorite
                  ? 'border-rose-200 bg-rose-50 text-rose-500 shadow-sm'
                  : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white hover:text-rose-500'
              }`}
            >
              <Heart
                className={`h-5 w-5 ${isFavorite ? 'fill-rose-500' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
