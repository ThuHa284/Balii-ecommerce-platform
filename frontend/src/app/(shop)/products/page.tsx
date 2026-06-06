"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X, Check, RotateCcw } from "lucide-react";
import ProductGrid from "@/components/product/product-grid";
import { PRODUCT_SORT_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getCategories } from "@/lib/api/categories.api";
import { getProducts } from "@/lib/api/products.api";
import { Category, Product } from "@/types/product.types";

const SIZES = ["S", "M", "L", "XL"];

const PRICE_RANGES = [
  { label: "Tất cả mức giá", value: "all" },
  { label: "Dưới 800.000đ", value: "under-800" },
  { label: "800.000đ - 1.000.000đ", value: "800-1000" },
  { label: "Trên 1.000.000đ", value: "over-1000" },
];

export default function ProductsPage() {
  const [sortBy, setSortBy] = useState("newest");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("all");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadData() {
      const [productResponse, categoryList] = await Promise.all([
        getProducts({ limit: 100 }),
        getCategories(),
      ]);
      setProducts(productResponse.products);
      setCategories(categoryList);
    }

    void loadData();
  }, []);

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedPriceRange("all");
    setSelectedSizes([]);
  };

  const isFiltered = selectedCategory !== null || selectedPriceRange !== "all" || selectedSizes.length > 0;

  // 1. Filter logic
  const filteredProducts = products.filter((product) => {
    // Category filter
    if (selectedCategory && product.categoryId !== selectedCategory) {
      return false;
    }

    // Price filter
    const price = product.salePrice || product.basePrice;
    if (selectedPriceRange === "under-800") {
      if (price >= 800000) return false;
    } else if (selectedPriceRange === "800-1000") {
      if (price < 800000 || price > 1000000) return false;
    } else if (selectedPriceRange === "over-1000") {
      if (price <= 1000000) return false;
    }

    // Size filter
    if (selectedSizes.length > 0) {
      const productSizes = product.variants.map((v) => v.size);
      const hasMatchingSize = selectedSizes.some((size) => productSizes.includes(size));
      if (!hasMatchingSize) return false;
    }

    return true;
  });

  // 2. Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = a.salePrice || a.basePrice;
    const priceB = b.salePrice || b.basePrice;

    switch (sortBy) {
      case "price_asc":
        return priceA - priceB;
      case "price_desc":
        return priceB - priceA;
      case "rating":
        return b.averageRating - a.averageRating;
      case "best_seller":
        return b.totalReviews - a.totalReviews;
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  return (
    <div className="pt-28 pb-16 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Tất Cả <span className="text-gradient">Sản Phẩm</span>
          </h1>
          <p className="text-muted-foreground">Khám phá bộ sưu tập đồ ngủ lụa cao cấp của Balii</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-6">
            {/* Category Filter */}
            <div className="glass-card p-5">
              <h3 className="font-heading text-sm font-bold text-foreground mb-4">Danh Mục</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    selectedCategory === null
                      ? "bg-violet-500 text-white shadow-md shadow-violet-300/25"
                      : "text-foreground/80 hover:bg-white/40"
                  )}
                >
                  Tất cả danh mục
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex justify-between items-center",
                      selectedCategory === cat.id
                        ? "bg-violet-500 text-white shadow-md shadow-violet-300/25"
                        : "text-foreground/80 hover:bg-white/40"
                    )}
                  >
                    <span>{cat.name}</span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-bold",
                      selectedCategory === cat.id ? "bg-white/20 text-white" : "bg-gray-100 text-muted-foreground"
                    )}>
                      {cat.productCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="glass-card p-5">
              <h3 className="font-heading text-sm font-bold text-foreground mb-4">Khoảng Giá</h3>
              <div className="space-y-2">
                {PRICE_RANGES.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setSelectedPriceRange(range.value)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between",
                      selectedPriceRange === range.value
                        ? "bg-violet-50 text-violet-600 font-bold"
                        : "text-foreground/80 hover:bg-white/40"
                    )}
                  >
                    <span>{range.label}</span>
                    {selectedPriceRange === range.value && <Check className="w-4 h-4 text-violet-500" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div className="glass-card p-5">
              <h3 className="font-heading text-sm font-bold text-foreground mb-4">Kích Thước</h3>
              <div className="grid grid-cols-4 gap-2">
                {SIZES.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={cn(
                        "h-10 rounded-xl text-xs font-bold transition-all border",
                        isSelected
                          ? "bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-300/25"
                          : "bg-white/60 text-foreground border-white/50 hover:bg-white"
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear Filters Button */}
            {isFiltered && (
              <button
                onClick={handleClearFilters}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-red-200 text-red-500 font-medium text-sm hover:bg-red-50 transition-all active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                Xoá bộ lọc
              </button>
            )}
          </aside>

          {/* Main Product Area */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="glass-card p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {sortedProducts.length} sản phẩm
                  </span>
                </div>
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 text-violet-600 text-xs font-bold border border-violet-200"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Bộ lọc
                </button>
              </div>

              {/* Sort Selection */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <label className="text-sm text-muted-foreground flex-shrink-0">Sắp xếp:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
                >
                  {PRODUCT_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Summary */}
            {isFiltered && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-xs text-muted-foreground font-semibold mr-1">Bộ lọc đang chọn:</span>
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 text-xs font-medium">
                    {categories.find((c) => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory(null)} className="hover:text-violet-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedPriceRange !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 text-xs font-medium">
                    {PRICE_RANGES.find((r) => r.value === selectedPriceRange)?.label}
                    <button onClick={() => setSelectedPriceRange("all")} className="hover:text-violet-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedSizes.map((size) => (
                  <span key={size} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-200 text-xs font-medium">
                    Size: {size}
                    <button onClick={() => toggleSize(size)} className="hover:text-violet-800">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-red-500 font-bold hover:underline ml-2"
                >
                  Xoá hết
                </button>
              </div>
            )}

            {/* Products Grid */}
            {sortedProducts.length > 0 ? (
              <ProductGrid products={sortedProducts} columns={3} />
            ) : (
              <div className="glass-card p-16 text-center">
                <SlidersHorizontal className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-heading text-lg font-bold text-foreground mb-1">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  Hãy thử thay đổi tiêu chí bộ lọc của bạn hoặc xóa hết bộ lọc để xem toàn bộ sản phẩm.
                </p>
                <button onClick={handleClearFilters} className="btn-primary">
                  Xoá bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          />

          {/* Sheet Drawer */}
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-2xl p-6 overflow-y-auto flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <span className="font-heading text-lg font-bold text-foreground">Bộ Lọc</span>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Content */}
            <div className="flex-1 space-y-6">
              {/* Category */}
              <div>
                <h4 className="font-heading text-sm font-bold text-foreground mb-3">Danh Mục</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      selectedCategory === null
                        ? "bg-violet-500 text-white border-violet-500"
                        : "bg-gray-50 border-gray-200 text-foreground/80"
                    )}
                  >
                    Tất cả
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                        selectedCategory === cat.id
                          ? "bg-violet-500 text-white border-violet-500"
                          : "bg-gray-50 border-gray-200 text-foreground/80"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <h4 className="font-heading text-sm font-bold text-foreground mb-3">Khoảng Giá</h4>
                <div className="space-y-2">
                  {PRICE_RANGES.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => setSelectedPriceRange(range.value)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center justify-between",
                        selectedPriceRange === range.value
                          ? "bg-violet-50 text-violet-600 border-violet-200 font-bold"
                          : "bg-gray-50 border-gray-100 text-foreground/80"
                      )}
                    >
                      <span>{range.label}</span>
                      {selectedPriceRange === range.value && <Check className="w-4 h-4 text-violet-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizes */}
              <div>
                <h4 className="font-heading text-sm font-bold text-foreground mb-3">Kích Thước</h4>
                <div className="grid grid-cols-4 gap-2">
                  {SIZES.map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={cn(
                          "h-10 rounded-lg text-xs font-bold transition-all border",
                          isSelected
                            ? "bg-violet-500 text-white border-violet-500 shadow-sm"
                            : "bg-gray-50 border-gray-200 text-foreground"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="border-t border-gray-100 pt-4 mt-6 flex gap-3">
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="flex-1 py-3 px-4 rounded-xl border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Xoá lọc
                </button>
              )}
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="btn-primary flex-1 py-3 text-xs font-semibold text-center"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
