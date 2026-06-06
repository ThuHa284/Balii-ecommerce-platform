"use client";

import { useQuickViewStore } from "@/store/quickview.store";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { X, ShoppingBag, Heart, Star, Check, HelpCircle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function QuickViewModal() {
  const { isOpen, selectedProduct, closeQuickView } = useQuickViewStore();
  const { addItem, setCartDrawerOpen } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [weightInput, setWeightInput] = useState<string>("");
  const [suggestedSize, setSuggestedSize] = useState<string>("");
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useEffect(() => {
    if (selectedProduct) {
      // Default to first variant
      const defaultVariant = selectedProduct.variants[0];
      if (defaultVariant) {
        setSelectedSize(defaultVariant.size);
        setSelectedColor(defaultVariant.color);
      }
      setQuantity(1);
      setWeightInput("");
      setSuggestedSize("");
      setActiveImageIndex(0);
    }
  }, [selectedProduct]);

  if (!isOpen || !selectedProduct) return null;

  const isFavorite = isInWishlist(selectedProduct.id);

  // Filter unique sizes and colors
  const sizes = Array.from(new Set(selectedProduct.variants.map((v) => v.size)));
  const colors = Array.from(
    new Map(selectedProduct.variants.map((v) => [v.color, v.colorCode])).entries()
  );

  // Weight advisor logic
  const handleWeightChange = (val: string) => {
    setWeightInput(val);
    const w = parseFloat(val);
    if (isNaN(w) || w <= 0) {
      setSuggestedSize("");
      return;
    }

    let recSize = "";
    if (w >= 40 && w <= 47) recSize = "S";
    else if (w >= 48 && w <= 53) recSize = "M";
    else if (w >= 54 && w <= 60) recSize = "L";
    else if (w >= 61 && w <= 70) recSize = "XL";

    setSuggestedSize(recSize);
    if (recSize && sizes.includes(recSize)) {
      setSelectedSize(recSize);
    }
  };

  // Find currently selected variant based on size & color selection
  const currentVariant = selectedProduct.variants.find(
    (v) =>
      v.size === selectedSize &&
      (colors.length === 0 || v.color === selectedColor)
  ) || selectedProduct.variants.find((v) => v.size === selectedSize) || selectedProduct.variants[0];

  const price = currentVariant?.salePrice || currentVariant?.price || selectedProduct.salePrice || selectedProduct.basePrice;
  const originalPrice = currentVariant?.price || selectedProduct.basePrice;
  const hasDiscount = currentVariant ? (currentVariant.salePrice !== null && currentVariant.salePrice < currentVariant.price) : (selectedProduct.salePrice !== null && selectedProduct.salePrice < selectedProduct.basePrice);

  const imagesToDisplay = currentVariant && currentVariant.images.length > 0 
    ? currentVariant.images 
    : selectedProduct.images.length > 0 ? selectedProduct.images : [selectedProduct.thumbnail];

  const handleAddToCart = async () => {
    if (!currentVariant) {
      toast.error("Vui lòng chọn kích cỡ và màu sắc hợp lệ!");
      return;
    }

    if (currentVariant.stock <= 0) {
      toast.error("Phiên bản này đã hết hàng!");
      return;
    }

    await addItem({
      id: `cart_${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productSlug: selectedProduct.slug,
      thumbnail: imagesToDisplay[activeImageIndex] || selectedProduct.thumbnail,
      variant: currentVariant,
      quantity: quantity,
      price: price,
      totalPrice: price * quantity,
    });

    toast.success(`Đã thêm ${quantity} x "${selectedProduct.name}" (Size ${currentVariant.size}) vào giỏ hàng!`);
    closeQuickView();
    setCartDrawerOpen(true);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(selectedProduct.id);
    if (!isFavorite) {
      toast.success(`Đã thêm "${selectedProduct.name}" vào danh sách yêu thích!`, {
        icon: "❤️",
      });
    } else {
      toast.info(`Đã xoá "${selectedProduct.name}" khỏi danh sách yêu thích.`);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
        onClick={closeQuickView}
      />

      {/* Modal Container */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-auto max-w-4xl sm:w-11/12 md:w-full glass-card max-h-[90vh] flex flex-col md:flex-row overflow-hidden border border-white/40 shadow-2xl rounded-2xl animate-scale-up">
        {/* Close Button */}
        <button
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/60 hover:bg-white text-slate-800 hover:text-black shadow-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Image Slider */}
        <div className="w-full md:w-1/2 flex flex-col bg-slate-50/20 p-4 sm:p-6 justify-between border-b md:border-b-0 md:border-r border-white/20">
          <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-inner">
            <Image
              src={imagesToDisplay[activeImageIndex] || selectedProduct.thumbnail}
              alt={selectedProduct.name}
              fill
              className="object-cover transition-all duration-300"
            />
            {hasDiscount && (
              <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-bold bg-red-500 text-white rounded-full shadow">
                GIẢM GIÁ
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {imagesToDisplay.length > 1 && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-thin">
              {imagesToDisplay.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-14 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    idx === activeImageIndex ? "border-violet-500 scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Detail Form */}
        <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto max-h-[50vh] md:max-h-[90vh] space-y-5">
          {/* Title & Category */}
          <div>
            <span className="text-xs font-semibold tracking-wider text-violet-600 uppercase">
              {selectedProduct.category?.name || "Đồ ngủ thiết kế"}
            </span>
            <h2 className="font-heading text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
              {selectedProduct.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-semibold text-slate-800">
                  {selectedProduct.averageRating}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({selectedProduct.totalReviews} đánh giá)
              </span>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 p-3 rounded-xl bg-violet-500/5 border border-violet-100/50">
            <span className="text-2xl font-bold text-violet-700">
              {formatCurrency(price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-slate-400 line-through">
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>

          {/* Weight to Size Advisor */}
          <div className="p-4 rounded-xl border border-violet-200/50 bg-gradient-to-r from-violet-500/5 to-purple-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-violet-500" /> Gợi ý chọn Size thông minh
              </label>
              {suggestedSize && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Gợi ý: Size {suggestedSize}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={weightInput}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="Nhập cân nặng của bạn (kg)... ví dụ: 52"
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              * Dựa trên cân nặng thực tế: S (40-47kg), M (48-53kg), L (54-60kg), XL (61-70kg).
            </p>
          </div>

          {/* Size Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800">
              Kích thước: <span className="font-semibold text-violet-600">{selectedSize}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {sizes.map((sz) => {
                const isSuggested = sz === suggestedSize;
                return (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                      selectedSize === sz
                        ? "bg-violet-600 text-white border-violet-600 shadow-md scale-105"
                        : isSuggested
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200"
                        : "bg-white/60 hover:bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    Size {sz} {isSuggested && "✨"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          {colors.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800">
                Màu sắc: <span className="font-semibold text-violet-600">{selectedColor}</span>
              </span>
              <div className="flex flex-wrap gap-3">
                {colors.map(([colorName, colorCode]) => (
                  <button
                    key={colorName}
                    onClick={() => setSelectedColor(colorName)}
                    className={`relative w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      selectedColor === colorName
                        ? "border-violet-600 scale-110 shadow-md"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: colorCode || "#ccc" }}
                    title={colorName}
                  >
                    {selectedColor === colorName && (
                      <Check className="w-4 h-4 text-white drop-shadow mix-blend-difference" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Info */}
          <div className="text-xs font-medium">
            Tình trạng:{" "}
            {currentVariant && currentVariant.stock > 0 ? (
              <span className="text-emerald-600 font-bold">Còn hàng ({currentVariant.stock})</span>
            ) : (
              <span className="text-rose-500 font-bold">Hết hàng</span>
            )}
          </div>

          {/* Quantity Selector & Add to Cart */}
          <div className="flex items-center gap-3 pt-3 border-t border-white/20">
            {/* Quantity */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white/60 p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-black rounded-lg hover:bg-slate-100 font-bold"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-semibold text-slate-800">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-black rounded-lg hover:bg-slate-100 font-bold"
              >
                +
              </button>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={!currentVariant || currentVariant.stock <= 0}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 transition-all text-sm"
            >
              <ShoppingBag className="w-4 h-4" /> Thêm vào giỏ
            </button>

            {/* Favorite */}
            <button
              onClick={handleToggleWishlist}
              className={`p-3 rounded-xl border transition-all ${
                isFavorite
                  ? "bg-rose-50 border-rose-200 text-rose-500 shadow-sm"
                  : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:text-rose-500"
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-rose-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
