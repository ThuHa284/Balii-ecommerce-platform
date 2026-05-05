"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, Minus, Plus, ShoppingBag, Heart, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { MOCK_PRODUCTS } from "@/lib/api/mock-data";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart.store";
import ProductGrid from "@/components/product/product-grid";
import { use } from "react";

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const product = MOCK_PRODUCTS.find((p) => p.slug === slug) || MOCK_PRODUCTS[0];
  const [selectedSize, setSelectedSize] = useState(product.variants[0]?.size || "");
  const [selectedColor, setSelectedColor] = useState(product.variants[0]?.color || "");
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(0);
  const { addItem, setCartDrawerOpen } = useCartStore();

  const selectedVariant = product.variants.find((v) => v.size === selectedSize && v.color === selectedColor) || product.variants[0];
  const price = selectedVariant?.salePrice || selectedVariant?.price || product.salePrice || product.basePrice;
  const hasDiscount = product.salePrice !== null;
  const relatedProducts = MOCK_PRODUCTS.filter((p) => p.id !== product.id).slice(0, 3);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem({
      id: `cart_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      thumbnail: product.thumbnail,
      variant: selectedVariant,
      quantity,
      price,
      totalPrice: price * quantity,
    });
    setCartDrawerOpen(true);
  };

  const uniqueSizes = [...new Set(product.variants.map((v) => v.size))];
  const uniqueColors = [...new Set(product.variants.map((v) => v.color))];

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="glass-card overflow-hidden aspect-[3/4] relative rounded-2xl">
              <Image src={product.images[mainImage] || product.thumbnail} alt={product.name} fill className="object-cover" priority />
              {hasDiscount && (
                <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full">
                  -{Math.round(((product.basePrice - product.salePrice!) / product.basePrice) * 100)}%
                </span>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setMainImage(i)} className={`relative w-20 h-24 rounded-xl overflow-hidden border-2 transition-all ${mainImage === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="glass-card p-8">
            <div className="mb-4">
              <p className="text-sm text-primary font-medium mb-2">{product.category.name}</p>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">{product.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(product.averageRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">({product.totalReviews} đánh giá)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">{formatCurrency(price)}</span>
              {hasDiscount && <span className="text-lg text-muted-foreground line-through">{formatCurrency(product.basePrice)}</span>}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">{product.description}</p>

            {/* Size Selector */}
            <div className="mb-6">
              <p className="text-sm font-medium text-foreground mb-3">Kích thước: <span className="text-primary">{selectedSize}</span></p>
              <div className="flex gap-2">
                {uniqueSizes.map((size) => (
                  <button key={size} onClick={() => setSelectedSize(size)} className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedSize === size ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-300/30" : "bg-white/60 border border-white/50 text-foreground hover:bg-white/80"} hover:scale-[1.02] active:scale-95`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div className="mb-6">
              <p className="text-sm font-medium text-foreground mb-3">Màu sắc: <span className="text-primary">{selectedColor}</span></p>
              <div className="flex gap-3">
                {product.variants.filter((v, i, arr) => arr.findIndex((a) => a.color === v.color) === i).map((v) => (
                  <button key={v.color} onClick={() => setSelectedColor(v.color)} className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${selectedColor === v.color ? "border-primary ring-2 ring-pink-300 ring-offset-2" : "border-white/50"}`} style={{ backgroundColor: v.colorCode }} title={v.color} />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-8">
              <p className="text-sm font-medium text-foreground mb-3">Số lượng</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2.5 rounded-xl bg-white/60 border border-white/50 hover:bg-white/80 transition-all">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-lg font-medium">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-2.5 rounded-xl bg-white/60 border border-white/50 hover:bg-white/80 transition-all">
                  <Plus className="w-4 h-4" />
                </button>
                {selectedVariant && <span className="text-sm text-muted-foreground">Còn {selectedVariant.stock} sản phẩm</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <button onClick={handleAddToCart} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 text-base">
                <ShoppingBag className="w-5 h-5" /> Thêm vào giỏ
              </button>
              <button className="p-3.5 rounded-xl border-2 border-pink-300 text-pink-600 hover:bg-pink-50 transition-all hover:scale-[1.02] active:scale-95">
                <Heart className="w-5 h-5" />
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/30">
              {[
                { icon: Truck, text: "Miễn phí ship" },
                { icon: RotateCcw, text: "Đổi trả 30 ngày" },
                { icon: ShieldCheck, text: "Hàng chính hãng" },
              ].map((f) => (
                <div key={f.text} className="text-center">
                  <f.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">Sản phẩm <span className="text-gradient">liên quan</span></h2>
          <ProductGrid products={relatedProducts} columns={3} />
        </div>
      </div>
    </div>
  );
}
