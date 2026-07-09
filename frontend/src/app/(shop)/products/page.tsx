'use client';

import { useEffect, useMemo, useState } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import ProductGrid from '@/components/product/product-grid';
import { PRODUCT_SORT_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getCategories } from '@/lib/api/categories.api';
import { getProducts } from '@/lib/api/products.api';
import { Category, Product } from '@/types/product.types';

export default function ProductsPage() {
  const [sortBy, setSortBy] = useState('newest');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWeightRanges, setSelectedWeightRanges] = useState<string[]>(
    [],
  );
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

  const sortOptions = useMemo(
    () => PRODUCT_SORT_OPTIONS.filter((option) => option.value !== 'rating'),
    [],
  );

  const availableWeightRanges = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .flatMap((product) =>
              product.variants.map((variant) => variant.size),
            )
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, 'vi')),
    [products],
  );

  const toggleWeightRange = (weightRange: string) => {
    setSelectedWeightRanges((current) =>
      current.includes(weightRange)
        ? current.filter((item) => item !== weightRange)
        : [...current, weightRange],
    );
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedWeightRanges([]);
  };

  const isFiltered =
    selectedCategory !== null || selectedWeightRanges.length > 0;

  const filteredProducts = products.filter((product) => {
    if (selectedCategory && product.categoryId !== selectedCategory) {
      return false;
    }

    if (selectedWeightRanges.length > 0) {
      const productWeightRanges = product.variants.map(
        (variant) => variant.size,
      );
      const hasMatchingWeight = selectedWeightRanges.some((weightRange) =>
        productWeightRanges.includes(weightRange),
      );
      if (!hasMatchingWeight) {
        return false;
      }
    }

    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = a.salePrice ?? a.basePrice;
    const priceB = b.salePrice ?? b.basePrice;

    switch (sortBy) {
      case 'best_seller':
        return (
          b.totalReviews - a.totalReviews ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'price_asc':
        return priceA - priceB;
      case 'price_desc':
        return priceB - priceA;
      case 'newest':
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  return (
    <div className="min-h-screen bg-background pt-28 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            Tất Cả <span className="text-gradient">Sản Phẩm</span>
          </h1>
          <p className="text-muted-foreground">
            Danh mục các sản phẩm được hiển thị theo số lượng sản phẩm, hàng mới
            nhất theo ngày thêm.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="hidden w-64 shrink-0 space-y-6 lg:block">
            <div className="glass-card p-5">
              <h3 className="mb-4 font-heading text-sm font-bold text-foreground">
                Danh Mục
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-all',
                    selectedCategory === null
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-300/25'
                      : 'text-foreground/80 hover:bg-white/40',
                  )}
                >
                  Tất cả danh mục
                </button>
                {categories
                  .slice()
                  .sort((a, b) => b.productCount - a.productCount)
                  .map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition-all',
                        selectedCategory === category.id
                          ? 'bg-violet-500 text-white shadow-md shadow-violet-300/25'
                          : 'text-foreground/80 hover:bg-white/40',
                      )}
                    >
                      <span>{category.name}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-bold',
                          selectedCategory === category.id
                            ? 'bg-white/20 text-white'
                            : 'bg-gray-100 text-muted-foreground',
                        )}
                      >
                        {category.productCount}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="mb-4 font-heading text-sm font-bold text-foreground">
                Lọc Theo Cân Nặng
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {availableWeightRanges.map((weightRange) => {
                  const isSelected = selectedWeightRanges.includes(weightRange);
                  return (
                    <button
                      key={weightRange}
                      onClick={() => toggleWeightRange(weightRange)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-bold transition-all',
                        isSelected
                          ? 'border-violet-500 bg-violet-500 text-white shadow-md shadow-violet-300/25'
                          : 'border-white/50 bg-white/60 text-foreground hover:bg-white',
                      )}
                    >
                      {weightRange}
                    </button>
                  );
                })}
              </div>
            </div>

            {isFiltered && (
              <button
                onClick={handleClearFilters}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 px-4 py-3 text-sm font-medium text-red-500 transition-all hover:bg-red-50 active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4" />
                Xóa bộ lọc
              </button>
            )}
          </aside>

          <div className="flex-1">
            <div className="glass-card mb-8 flex flex-col items-center justify-between gap-4 p-4 sm:flex-row">
              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {sortedProducts.length} sản phẩm
                  </span>
                </div>
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-600 lg:hidden"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Bộ lọc
                </button>
              </div>

              <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <label className="shrink-0 text-sm text-muted-foreground">
                  Sắp xếp:
                </label>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isFiltered && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold text-muted-foreground">
                  Bộ lọc đang chọn:
                </span>
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600">
                    {
                      categories.find(
                        (category) => category.id === selectedCategory,
                      )?.name
                    }
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="hover:text-violet-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedWeightRanges.map((weightRange) => (
                  <span
                    key={weightRange}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600"
                  >
                    {weightRange}
                    <button
                      onClick={() => toggleWeightRange(weightRange)}
                      className="hover:text-violet-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={handleClearFilters}
                  className="ml-2 text-xs font-bold text-red-500 hover:underline"
                >
                  Xóa hết
                </button>
              </div>
            )}

            {sortedProducts.length > 0 ? (
              <ProductGrid products={sortedProducts} columns={3} />
            ) : (
              <div className="glass-card p-16 text-center">
                <SlidersHorizontal className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                <h3 className="mb-1 font-heading text-lg font-bold text-foreground">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="mx-auto mb-6 max-w-sm text-sm text-muted-foreground">
                  Hãy thử đổi danh mục hoặc khoảng cân nặng để xem thêm sản phẩm
                  khác.
                </p>
                <button onClick={handleClearFilters} className="btn-primary">
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setMobileFilterOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300"
          />

          <div className="absolute top-0 right-0 bottom-0 flex w-80 flex-col overflow-y-auto bg-white p-6 shadow-2xl animate-slide-in-right">
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <span className="font-heading text-lg font-bold text-foreground">
                Bộ Lọc
              </span>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="rounded-xl p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <h4 className="mb-3 font-heading text-sm font-bold text-foreground">
                  Danh Mục
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      selectedCategory === null
                        ? 'border-violet-500 bg-violet-500 text-white'
                        : 'border-gray-200 bg-gray-50 text-foreground/80',
                    )}
                  >
                    Tất cả
                  </button>
                  {categories
                    .slice()
                    .sort((a, b) => b.productCount - a.productCount)
                    .map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                          selectedCategory === category.id
                            ? 'border-violet-500 bg-violet-500 text-white'
                            : 'border-gray-200 bg-gray-50 text-foreground/80',
                        )}
                      >
                        {category.name}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="mb-3 font-heading text-sm font-bold text-foreground">
                  Cân Nặng
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableWeightRanges.map((weightRange) => {
                    const isSelected =
                      selectedWeightRanges.includes(weightRange);
                    return (
                      <button
                        key={weightRange}
                        onClick={() => toggleWeightRange(weightRange)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-xs font-bold transition-all',
                          isSelected
                            ? 'border-violet-500 bg-violet-500 text-white shadow-sm'
                            : 'border-gray-200 bg-gray-50 text-foreground',
                        )}
                      >
                        {weightRange}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 border-t border-gray-100 pt-4">
              {isFiltered && (
                <button
                  onClick={handleClearFilters}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-4 py-3 text-xs font-semibold text-red-500 transition-all hover:bg-red-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Xóa lọc
                </button>
              )}
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="btn-primary flex-1 py-3 text-center text-xs font-semibold"
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
