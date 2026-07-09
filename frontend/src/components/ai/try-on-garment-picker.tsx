'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Search, ShoppingBag, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { getProducts } from '@/lib/api/products.api';
import { formatAgeGroupLabel, formatGenderLabel } from '@/lib/tryon-labels';
import { cn, formatCurrency } from '@/lib/utils';
import { useTryOnStore } from '@/store/tryon.store';
import { Product } from '@/types/product.types';

interface TryOnGarmentPickerProps {
  className?: string;
  compact?: boolean;
}

function getProductImageOptions(product: Product) {
  return Array.from(
    new Set([product.thumbnail, ...(product.images ?? [])].filter(Boolean)),
  );
}

export default function TryOnGarmentPicker({
  className,
  compact = false,
}: TryOnGarmentPickerProps) {
  const {
    garmentImage,
    selectedProduct,
    garmentTargetGender,
    garmentRecommendedAgeGroups,
    setGarmentImage,
    clearResult,
  } = useTryOnStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await getProducts({ limit: 100 });
        setProducts(response.products);
      } catch {
        toast.error('Không tải được danh sách sản phẩm. Vui lòng thử lại.');
      }
    }

    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery),
    );
  }, [products, searchQuery]);

  const suggestedProducts = useMemo(() => {
    if (!selectedProduct) {
      return filteredProducts;
    }

    return filteredProducts.filter(
      (product) => product.id !== selectedProduct.id,
    );
  }, [filteredProducts, selectedProduct]);

  const handleSelectProduct = useCallback(
    (product: Product) => {
      clearResult();
      const [defaultImage] = getProductImageOptions(product);
      setGarmentImage(defaultImage ?? product.thumbnail, product);
    },
    [clearResult, setGarmentImage],
  );

  const handleSelectProductImage = useCallback(
    (image: string) => {
      if (!selectedProduct) return;

      clearResult();
      setGarmentImage(image, selectedProduct);
    },
    [clearResult, selectedProduct, setGarmentImage],
  );

  const handleClearGarment = useCallback(() => {
    clearResult();
    setGarmentImage(null, null);
  }, [clearResult, setGarmentImage]);

  const renderProductGrid = useCallback(
    (items: Product[]) => {
      if (items.length === 0) {
        return (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Không tìm thấy sản phẩm phù hợp
            </p>
          </div>
        );
      }

      return (
        <div
          className={cn(
            'grid overflow-y-auto pr-1',
            compact
              ? 'max-h-[260px] grid-cols-2 gap-2 sm:grid-cols-3'
              : 'max-h-[400px] grid-cols-2 gap-3',
          )}
        >
          {items.map((product) => {
            const isActive = product.id === selectedProduct?.id;

            return (
              <button
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className={cn(
                  'group overflow-hidden rounded-xl text-left glass-card-hover',
                  isActive && 'ring-2 ring-violet-300',
                )}
              >
                <div
                  className={cn(
                    'relative overflow-hidden rounded-t-xl',
                    compact ? 'aspect-[3/4]' : 'aspect-square',
                  )}
                >
                  <Image
                    src={product.thumbnail}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes={
                      compact
                        ? '(max-width: 768px) 40vw, 140px'
                        : '(max-width: 768px) 40vw, 200px'
                    }
                  />
                  {getProductImageOptions(product).length > 1 && (
                    <div className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">
                      +{getProductImageOptions(product).length - 1} ảnh
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute left-2 top-2 rounded-full bg-violet-500 px-2 py-1 text-[10px] font-semibold text-white">
                      Đang chọn
                    </div>
                  )}
                </div>
                <div className={cn('space-y-1', compact ? 'p-2' : 'p-2.5')}>
                  <p
                    className={cn(
                      'font-medium text-foreground',
                      compact ? 'line-clamp-2 text-[11px]' : 'truncate text-xs',
                    )}
                  >
                    {product.name}
                  </p>
                  <p
                    className={cn(
                      'font-semibold text-primary',
                      compact ? 'text-[11px]' : 'text-xs',
                    )}
                  >
                    {formatCurrency(product.salePrice || product.basePrice)}
                  </p>
                  <p
                    className={cn(
                      'text-muted-foreground',
                      compact ? 'line-clamp-2 text-[10px]' : 'text-[11px]',
                    )}
                  >
                    {formatGenderLabel(product.targetGender)} ·{' '}
                    {(product.recommendedAgeGroups ?? [])
                      .map(formatAgeGroupLabel)
                      .join(', ')}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      );
    },
    [compact, handleSelectProduct, selectedProduct?.id],
  );

  if (garmentImage) {
    const productImageOptions = selectedProduct
      ? getProductImageOptions(selectedProduct)
      : [];

    return (
      <div className={cn('space-y-4', className)}>
        <div className="group relative overflow-hidden rounded-2xl glass-card">
          <div
            className={cn(
              'relative',
              compact ? 'aspect-[3/4]' : 'aspect-square max-h-[360px]',
            )}
          >
            <Image
              src={garmentImage}
              alt={selectedProduct?.name || 'Sản phẩm đã chọn'}
              fill
              className="object-cover"
              sizes={
                compact
                  ? '(max-width: 768px) 100vw, 280px'
                  : '(max-width: 768px) 100vw, 400px'
              }
            />
          </div>

          {selectedProduct && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <p className="truncate text-sm font-medium text-white">
                {selectedProduct.name}
              </p>
              <p className="text-xs text-white/80">
                {formatCurrency(
                  selectedProduct.salePrice || selectedProduct.basePrice,
                )}
              </p>
            </div>
          )}

          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
            <Check className="h-3 w-3" />
            Đã chọn
          </div>

          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              onClick={handleClearGarment}
              className="flex items-center gap-2 rounded-xl bg-white/90 px-5 py-2.5 text-sm font-medium text-foreground transition-all hover:scale-105 hover:bg-white active:scale-95"
            >
              Đổi sản phẩm
            </button>
          </div>
        </div>

        <button
          onClick={handleClearGarment}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/80 active:scale-95 md:hidden"
        >
          Đổi sản phẩm khác
        </button>

        <div className={cn('rounded-2xl bg-white/50', compact ? 'p-3' : 'p-4')}>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Tag className="h-4 w-4 text-violet-500" />
            Metadata đang áp dụng
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Giới tính phù hợp:{' '}
              <span className="font-medium text-foreground">
                {formatGenderLabel(garmentTargetGender)}
              </span>
            </p>
            <p>
              Độ tuổi phù hợp:{' '}
              <span className="font-medium text-foreground">
                {garmentRecommendedAgeGroups.length
                  ? garmentRecommendedAgeGroups
                      .map(formatAgeGroupLabel)
                      .join(', ')
                  : 'Chưa chọn'}
              </span>
            </p>
          </div>
        </div>

        {selectedProduct && productImageOptions.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Chọn ảnh sản phẩm
            </p>
            <div
              className={cn(
                'grid gap-2',
                compact ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-5',
              )}
            >
              {productImageOptions.map((image, index) => {
                const isActive = image === garmentImage;

                return (
                  <button
                    key={`${selectedProduct.id}-image-${index}`}
                    type="button"
                    onClick={() => handleSelectProductImage(image)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-xl border transition-all',
                      isActive
                        ? 'border-violet-500 ring-2 ring-violet-200'
                        : 'border-white/60 hover:border-violet-300',
                    )}
                  >
                    <Image
                      src={image}
                      alt={`${selectedProduct.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={cn('rounded-2xl bg-white/40', compact ? 'p-3' : 'p-4')}>
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-violet-500" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Thử tiếp với sản phẩm khác
              </p>
              <p className="text-xs text-muted-foreground">
                Ảnh người dùng vẫn được giữ trong tab này cho đến khi bạn đóng
                trình duyệt hoặc đổi lại ảnh người mẫu.
              </p>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Tìm sản phẩm khác..."
              className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          {renderProductGrid(suggestedProducts)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/40 px-4 py-3">
        <ShoppingBag className="h-4 w-4 text-violet-500" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Chọn quần áo từ cửa hàng
          </p>
          <p className="text-xs text-muted-foreground">
            Chỉ dùng sản phẩm trong shop để AI kiểm tra đúng giới tính và độ
            tuổi phù hợp trước khi tạo ảnh.
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm sản phẩm..."
          className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>

      {renderProductGrid(filteredProducts)}
    </div>
  );
}
