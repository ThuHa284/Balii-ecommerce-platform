'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Search, ShoppingBag, Tag } from 'lucide-react';
import { toast } from 'sonner';

import { getProducts } from '@/lib/api/products.api';
import { cn, formatCurrency } from '@/lib/utils';
import { useTryOnStore } from '@/store/tryon.store';
import { Product } from '@/types/product.types';

interface TryOnGarmentPickerProps {
  className?: string;
}

const AGE_OPTIONS = [
  { value: 'under_18', label: 'Dưới 18' },
  { value: '18_25', label: '18_25' },
  { value: '26_35', label: '26_35' },
  { value: '36_plus', label: '36_plus' },
] as const;

function getProductImageOptions(product: Product) {
  return Array.from(
    new Set([product.thumbnail, ...(product.images ?? [])].filter(Boolean)),
  );
}

function renderGenderLabel(value?: string | null) {
  if (value === 'male') return 'Nam';
  if (value === 'female') return 'Nữ';
  if (value === 'unisex') return 'Unisex';
  return 'Chưa chọn';
}

function renderAgeLabel(value: string) {
  return AGE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default function TryOnGarmentPicker({
  className,
}: TryOnGarmentPickerProps) {
  const {
    garmentImage,
    selectedProduct,
    garmentTargetGender,
    garmentRecommendedAgeGroups,
    setGarmentImage,
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

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [products, searchQuery],
  );

  const handleSelectProduct = useCallback(
    (product: Product) => {
      const [defaultImage] = getProductImageOptions(product);
      setGarmentImage(defaultImage ?? product.thumbnail, product);
    },
    [setGarmentImage],
  );

  const handleSelectProductImage = useCallback(
    (image: string) => {
      if (!selectedProduct) return;
      setGarmentImage(image, selectedProduct);
    },
    [selectedProduct, setGarmentImage],
  );

  const handleClearGarment = useCallback(() => {
    setGarmentImage(null, null);
  }, [setGarmentImage]);

  if (garmentImage) {
    const productImageOptions = selectedProduct
      ? getProductImageOptions(selectedProduct)
      : [];

    return (
      <div className={cn('', className)}>
        <div className="group relative overflow-hidden rounded-2xl glass-card">
          <div className="relative aspect-[3/4]">
            <img
              src={garmentImage}
              alt={selectedProduct?.name || 'Sản phẩm đã chọn'}
              className="h-full w-full object-cover"
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
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-white/80 active:scale-95 md:hidden"
        >
          Đổi sản phẩm khác
        </button>

        <div className="mt-4 rounded-2xl bg-white/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Tag className="h-4 w-4 text-violet-500" />
            Metadata đang áp dụng
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Giới tính phù hợp:{' '}
              <span className="font-medium text-foreground">
                {renderGenderLabel(garmentTargetGender)}
              </span>
            </p>
            <p>
              Độ tuổi phù hợp:{' '}
              <span className="font-medium text-foreground">
                {garmentRecommendedAgeGroups.length
                  ? garmentRecommendedAgeGroups.map(renderAgeLabel).join(', ')
                  : 'Chưa chọn'}
              </span>
            </p>
          </div>
        </div>

        {selectedProduct && productImageOptions.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Chọn ảnh sản phẩm
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
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

      <div className="grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto pr-1">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => handleSelectProduct(product)}
            className="group overflow-hidden rounded-xl text-left glass-card-hover"
          >
            <div className="relative aspect-square overflow-hidden rounded-t-xl">
              <Image
                src={product.thumbnail}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 768px) 40vw, 200px"
              />
              {getProductImageOptions(product).length > 1 && (
                <div className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white">
                  +{getProductImageOptions(product).length - 1} ảnh
                </div>
              )}
            </div>
            <div className="space-y-1 p-2.5">
              <p className="truncate text-xs font-medium text-foreground">
                {product.name}
              </p>
              <p className="text-xs font-semibold text-primary">
                {formatCurrency(product.salePrice || product.basePrice)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {renderGenderLabel(product.targetGender)} •{' '}
                {(product.recommendedAgeGroups ?? [])
                  .map(renderAgeLabel)
                  .join(', ')}
              </p>
            </div>
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Không tìm thấy sản phẩm
          </p>
        </div>
      )}
    </div>
  );
}
