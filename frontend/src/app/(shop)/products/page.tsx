"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import ProductGrid from "@/components/product/product-grid";
import { MOCK_PRODUCTS } from "@/lib/api/mock-data";
import { PRODUCT_SORT_OPTIONS } from "@/lib/constants";

export default function ProductsPage() {
  const [sortBy, setSortBy] = useState("newest");
  const products = MOCK_PRODUCTS;

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Tất Cả <span className="text-gradient">Sản Phẩm</span>
          </h1>
          <p className="text-muted-foreground">Khám phá bộ sưu tập đồ ngủ lụa cao cấp của Balii</p>
        </div>

        {/* Toolbar */}
        <div className="glass-card p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{products.length} sản phẩm</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-muted-foreground">Sắp xếp:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            >
              {PRODUCT_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <ProductGrid products={products} columns={4} />
      </div>
    </div>
  );
}
