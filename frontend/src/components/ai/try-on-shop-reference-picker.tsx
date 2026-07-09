'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Search, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';

import { getProducts } from '@/lib/api/products.api';
import { cn, formatCurrency } from '@/lib/utils';
import { Product } from '@/types/product.types';

interface TryOnShopReferencePickerProps {
  title: string;
  description: string;
  selectedImage: string | null;
  selectedProduct: Product | null;
  onSelect: (product: Product, image: string) => void;
  onClear: () => void;
  excludeProductIds?: string[];
}

function getProductImageOptions(product: Product) {
  return Array.from(
    new Set([product.thumbnail, ...(product.images ?? [])].filter(Boolean)),
  );
}

export default function TryOnShopReferencePicker({
  title,
  description,
  selectedImage,
  selectedProduct,
  onSelect,
  onClear,
  excludeProductIds = [],
}: TryOnShopReferencePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await getProducts({ limit: 100 });
        setProducts(response.products);
      } catch {
        toast.error('Không tải được danh sách sản phẩm tham chiếu.');
      }
    }

    void loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const excluded = new Set(excludeProductIds.filter(Boolean));
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      if (excluded.has(product.id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return product.name.toLowerCase().includes(normalizedQuery);
    });
  }, [excludeProductIds, products, searchQuery]);

  const handleSelectProduct = useCallback(
    (product: Product) => {
      const [defaultImage] = getProductImageOptions(product);

      if (!defaultImage) {
        toast.error('Sản phẩm này chưa có ảnh để dùng làm tham chiếu.');
        return;
      }

      onSelect(product, defaultImage);
    },
    [onSelect],
  );

  const imageOptions = selectedProduct
    ? getProductImageOptions(selectedProduct)
    : [];

  return (
    <div className="rounded-2xl border border-white/60 bg-white/60 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        {selectedImage && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {selectedImage && selectedProduct ? (
        <div className="space-y-2.5">
          <div className="flex gap-3 rounded-2xl bg-slate-50/90 p-2.5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-24 sm:w-24">
              <Image
                src={selectedImage}
                alt={selectedProduct.name}
                fill
                className="object-cover"
                sizes="120px"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 inline-flex rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white">
                Đang chọn
              </div>
              <p className="line-clamp-2 text-sm font-semibold text-foreground">
                {selectedProduct.name}
              </p>
              <p className="mt-1 text-xs font-medium text-primary">
                {formatCurrency(
                  selectedProduct.salePrice || selectedProduct.basePrice,
                )}
              </p>
            </div>
          </div>

          {imageOptions.length > 1 && (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
              {imageOptions.map((image, index) => {
                const isActive = image === selectedImage;

                return (
                  <button
                    key={`${selectedProduct.id}-${index}`}
                    type="button"
                    onClick={() => onSelect(selectedProduct, image)}
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
                      sizes="72px"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-violet-300/60 bg-violet-50/50 px-4 py-4 text-sm text-muted-foreground">
          Chọn một sản phẩm từ shop để lấy ảnh tham chiếu.
        </div>
      )}

      <div className="mt-3">
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm sản phẩm trong shop..."
            className="w-full rounded-xl border border-white/50 bg-white/70 py-2 pl-10 pr-4 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-muted-foreground">
            Không tìm thấy sản phẩm phù hợp.
          </div>
        ) : (
          <div className="grid max-h-[260px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {filteredProducts.map((product) => {
              const isActive = product.id === selectedProduct?.id;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className={cn(
                    'group overflow-hidden rounded-xl border border-white/60 bg-white/85 text-left transition-all hover:border-violet-300 hover:shadow-sm',
                    isActive && 'ring-2 ring-violet-300',
                  )}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={product.thumbnail}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="140px"
                    />
                    {isActive && (
                      <div className="absolute left-2 top-2 rounded-full bg-violet-500 px-2 py-1 text-[10px] font-semibold text-white">
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Đang chọn
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 p-2">
                    <div className="flex items-start gap-1.5">
                      <ShoppingBag className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />
                      <p className="line-clamp-2 text-[11px] font-medium text-foreground">
                        {product.name}
                      </p>
                    </div>
                    <p className="text-[11px] font-semibold text-primary">
                      {formatCurrency(product.salePrice || product.basePrice)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
