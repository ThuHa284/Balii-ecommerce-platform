"use client";

import { useCompareStore } from "@/store/compare.store";
import { X, ArrowRightLeft, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function FloatingCompareBar() {
  const { compareItems, removeItem, clearCompare } = useCompareStore();

  if (compareItems.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-white/80 backdrop-blur-xl border border-violet-200/60 shadow-2xl rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 animate-slide-up">
      {/* Label & Stats */}
      <div className="flex items-center gap-2 justify-between w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800">So sánh sản phẩm</h4>
            <p className="text-[10px] text-muted-foreground">Tối đa 3 sản phẩm ({compareItems.length}/3)</p>
          </div>
        </div>
        <button
          onClick={clearCompare}
          className="sm:hidden text-xs text-red-500 font-bold flex items-center gap-1 hover:underline"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xoá hết
        </button>
      </div>

      {/* Product Thumbnails List */}
      <div className="flex items-center gap-3 overflow-x-auto w-full sm:flex-1 py-1 justify-start">
        {compareItems.map((product) => {
          const price = product.salePrice || product.basePrice;
          return (
            <div
              key={product.id}
              className="relative flex items-center gap-2 bg-slate-50/50 border border-slate-100 p-1.5 pr-3 rounded-xl shrink-0 group hover:border-violet-200 transition-colors"
            >
              <div className="relative w-9 h-12 rounded-lg overflow-hidden shrink-0 shadow-sm">
                <Image src={product.thumbnail} alt={product.name} fill className="object-cover" />
              </div>
              <div className="max-w-[100px] sm:max-w-[120px]">
                <h5 className="text-[10px] font-bold text-slate-800 truncate">{product.name}</h5>
                <p className="text-[10px] font-semibold text-violet-600">{formatCurrency(price)}</p>
              </div>
              <button
                onClick={() => removeItem(product.id)}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-500 shadow transition-colors"
                aria-label="Xoá khỏi so sánh"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* Empty slots placeholders */}
        {Array.from({ length: Math.max(0, 3 - compareItems.length) }).map((_, idx) => (
          <div
            key={idx}
            className="hidden sm:flex items-center justify-center w-[120px] h-12 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px] font-medium"
          >
            Trống
          </div>
        ))}
      </div>

      {/* Compare Action Buttons */}
      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
        <button
          onClick={clearCompare}
          className="hidden sm:flex items-center justify-center p-2.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          title="Xoá toàn bộ danh sách so sánh"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <Link
          href="/compare"
          className="btn-primary w-full sm:w-auto text-xs py-2.5 px-4 font-bold shadow-md shadow-violet-500/10 flex items-center justify-center gap-1.5"
        >
          So sánh ngay <ArrowRightLeft className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
