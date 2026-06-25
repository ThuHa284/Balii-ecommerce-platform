"use client";

import { useCompareStore } from "@/store/compare.store";
import { useCartStore } from "@/store/cart.store";
import { X, ShoppingBag, ArrowRightLeft, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Product } from "@/types/product.types";

export default function ComparePage() {
  const { compareItems, removeItem, clearCompare } = useCompareStore();
  const { addItem, setCartDrawerOpen } = useCartStore();

  const handleAddToCart = (product: Product) => {
    const defaultVariant = product.variants[0];
    if (!defaultVariant) {
      toast.error("Sản phẩm tạm thời hết hàng!");
      return;
    }

    const price = defaultVariant.salePrice || defaultVariant.price || product.salePrice || product.basePrice;

    addItem({
      id: defaultVariant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      thumbnail: product.thumbnail,
      variant: defaultVariant,
      quantity: 1,
      price: price,
      totalPrice: price,
    });

    toast.success(`Đã thêm "${product.name}" (Size ${defaultVariant.size}) vào giỏ hàng!`);
    setCartDrawerOpen(true);
  };

  if (compareItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6 min-h-[60vh] flex flex-col justify-center items-center">
        <div className="p-4 rounded-full bg-violet-50 text-violet-500 animate-pulse">
          <ArrowRightLeft className="w-12 h-12" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="font-heading text-2xl font-bold text-slate-800">Danh sách so sánh trống</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bạn chưa chọn sản phẩm nào để so sánh. Hãy quay lại cửa hàng, nhấn biểu tượng đối chiếu trên các sản phẩm để thêm vào bảng so sánh.
          </p>
        </div>
        <Link href="/products" className="btn-primary px-6 py-2.5 text-sm font-bold shadow-md">
          Khám phá sản phẩm ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-8 space-y-8 min-h-[80vh]">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/20 pb-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-8 h-8 text-violet-500" />
            So sánh sản phẩm
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            So sánh chi tiết thông tin, kích thước và giá cả của các sản phẩm lụa ngủ Balii.
          </p>
        </div>
        <button
          onClick={clearCompare}
          className="btn-outline px-4 py-2 text-xs font-bold text-red-500 border-red-200 bg-red-50/10 hover:bg-red-50 hover:border-red-300 self-start sm:self-auto"
        >
          Xoá toàn bộ ({compareItems.length})
        </button>
      </div>

      {/* Comparison Grid (Scrollable on small screens) */}
      <div className="overflow-x-auto rounded-2xl border border-violet-100/60 bg-white/40 backdrop-blur-xl shadow-xl scrollbar-thin">
        <table className="w-full border-collapse text-left min-w-[640px]">
          <thead>
            <tr className="border-b border-violet-100/80">
              <th className="p-6 text-sm font-bold text-slate-500 w-1/4 bg-slate-50/20">Thuộc tính</th>
              {compareItems.map((product) => (
                <th key={product.id} className="p-6 w-1/4 relative align-top">
                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(product.id)}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-500 transition-colors shadow-sm"
                    title="Xoá sản phẩm khỏi bảng so sánh"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="space-y-4 pt-4">
                    {/* Thumbnail */}
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md">
                      <Image src={product.thumbnail} alt={product.name} fill className="object-cover" />
                    </div>
                    {/* Product Identity */}
                    <div>
                      <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wide">
                        {product.category?.name || "Đồ ngủ thiết kế"}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-800 line-clamp-2 mt-0.5">
                        {product.name}
                      </h3>
                    </div>
                  </div>
                </th>
              ))}
              {/* Fill remaining empty headers up to 3 */}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <th key={idx} className="p-6 w-1/4 bg-slate-50/5 text-center text-slate-400 font-medium text-xs">
                  Trống (Thêm sản phẩm để so sánh)
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-100/50">
            {/* Price Row */}
            <tr>
              <td className="p-6 text-xs font-bold text-slate-500 bg-slate-50/20">Giá bán lẻ</td>
              {compareItems.map((product) => {
                const price = product.salePrice || product.basePrice;
                const hasDiscount = product.salePrice !== null && product.salePrice < product.basePrice;
                return (
                  <td key={product.id} className="p-6">
                    <span className="text-lg font-bold text-violet-700">{formatCurrency(price)}</span>
                    {hasDiscount && (
                      <div className="text-xs text-slate-400 line-through mt-0.5">
                        {formatCurrency(product.basePrice)}
                      </div>
                    )}
                  </td>
                );
              })}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <td key={idx} className="p-6 bg-slate-50/5"></td>
              ))}
            </tr>

            {/* Description Row */}
            <tr>
              <td className="p-6 text-xs font-bold text-slate-500 bg-slate-50/20">Mô tả ngắn</td>
              {compareItems.map((product) => (
                <td key={product.id} className="p-6 text-xs text-slate-700 leading-relaxed font-medium">
                  {product.shortDescription}
                </td>
              ))}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <td key={idx} className="p-6 bg-slate-50/5"></td>
              ))}
            </tr>

            {/* Sizes Row */}
            <tr>
              <td className="p-6 text-xs font-bold text-slate-500 bg-slate-50/20">Các Kích cỡ</td>
              {compareItems.map((product) => {
                const sizes = Array.from(new Set(product.variants.map((v) => v.size)));
                return (
                  <td key={product.id} className="p-6">
                    <div className="flex flex-wrap gap-1.5">
                      {sizes.map((s) => (
                        <span key={s} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg border border-violet-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </td>
                );
              })}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <td key={idx} className="p-6 bg-slate-50/5"></td>
              ))}
            </tr>

            {/* Sizing Advisor Reference */}
            <tr>
              <td className="p-6 text-xs font-bold text-slate-500 bg-slate-50/20">Tư vấn cân nặng</td>
              {compareItems.map((product) => (
                <td key={product.id} className="p-6">
                  <div className="space-y-1 bg-violet-50/30 p-3 rounded-xl border border-violet-100 text-[10px] font-semibold text-slate-700">
                    {Array.from(new Set(product.variants.map((variant) => variant.size))).map((sizeLabel) => (
                      <div key={sizeLabel} className="flex justify-between border-b border-slate-100/50 pb-0.5 last:border-b-0">
                        <span>Size:</span>
                        <span className="text-violet-600">{sizeLabel}</span>
                      </div>
                    ))}
                  </div>
                </td>
              ))}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <td key={idx} className="p-6 bg-slate-50/5"></td>
              ))}
            </tr>

            {/* Colors Row */}
            <tr>
              <td className="p-6 text-xs font-bold text-slate-500 bg-slate-50/20">Màu sắc sắc thái</td>
              {compareItems.map((product) => {
                const colors = Array.from(
                  new Map(product.variants.map((v) => [v.color, v.colorCode])).entries()
                );
                return (
                  <td key={product.id} className="p-6">
                    <div className="flex flex-wrap gap-2">
                      {colors.map(([colorName, colorCode]) => (
                        <div key={colorName} className="flex items-center gap-1">
                          <span
                            className="w-4 h-4 rounded-full border border-slate-200 shadow-sm"
                            style={{ backgroundColor: colorCode || "#ccc" }}
                          />
                          <span className="text-[10px] text-slate-600 font-medium">{colorName}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <td key={idx} className="p-6 bg-slate-50/5"></td>
              ))}
            </tr>

            {/* Reviews Row */}
            <tr>
              <td className="p-6 text-xs font-bold text-slate-500 bg-slate-50/20">Đánh giá khách hàng</td>
              {compareItems.map((product) => (
                <td key={product.id} className="p-6">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{product.averageRating} / 5</span>
                    <span className="text-muted-foreground font-normal">({product.totalReviews} lượt)</span>
                  </div>
                </td>
              ))}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <td key={idx} className="p-6 bg-slate-50/5"></td>
              ))}
            </tr>

            {/* Purchase Action Row */}
            <tr>
              <td className="p-6 text-xs font-bold text-slate-500 bg-slate-50/20 bg-violet-500/5">Hành động</td>
              {compareItems.map((product) => (
                <td key={product.id} className="p-6 bg-violet-500/5">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1 font-bold"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Thêm giỏ hàng
                    </button>
                    <Link
                      href={`/products/${product.slug}`}
                      className="btn-outline w-full text-center text-xs py-2 font-bold"
                    >
                      Xem chi tiết
                    </Link>
                  </div>
                </td>
              ))}
              {Array.from({ length: 3 - compareItems.length }).map((_, idx) => (
                <td key={idx} className="p-6 bg-slate-50/5"></td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
