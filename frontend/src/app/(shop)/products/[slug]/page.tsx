'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Star,
  Minus,
  Plus,
  ShoppingBag,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { COMBO_TIERS, MOCK_COMBO_SHORTS } from '@/lib/api/mock-data';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import ProductGrid from '@/components/product/product-grid';
import ComboSelector from '@/components/product/combo-selector';
import { Product } from '@/types/product.types';
import { getProductBySlug, getProducts } from '@/lib/api/products.api';

type GalleryItem = {
  image: string;
  color: string;
  variantId: string;
};

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(0);
  const { addItem, setCartDrawerOpen } = useCartStore();

  useEffect(() => {
    async function loadProduct() {
      const data = await getProductBySlug(slug);
      setProduct(data);
      if (data) {
        setSelectedSize(data.variants[0]?.size || '');
        setSelectedColor(data.variants[0]?.color || '');
        const list = await getProducts({ limit: 4 });
        setRelatedProducts(
          list.products.filter((item) => item.id !== data.id).slice(0, 3),
        );
      }
    }

    void loadProduct();
  }, [slug]);

  const variantPool = useMemo(() => {
    if (!product) return [];
    const inStock = product.variants.filter((variant) => variant.stock > 0);
    return inStock.length ? inStock : product.variants;
  }, [product]);

  const selectedVariant = useMemo(() => {
    return (
      variantPool.find(
        (variant) =>
          variant.size === selectedSize && variant.color === selectedColor,
      ) ||
      variantPool.find((variant) => variant.size === selectedSize) ||
      variantPool.find((variant) => variant.color === selectedColor) ||
      variantPool[0]
    );
  }, [selectedColor, selectedSize, variantPool]);

  const sizeOptions = useMemo(
    () => [...new Set(variantPool.map((variant) => variant.size))],
    [variantPool],
  );

  const colorOptions = useMemo(
    () =>
      variantPool.filter(
        (variant, index, variants) =>
          variants.findIndex((item) => item.color === variant.color) === index,
      ),
    [variantPool],
  );

  const galleryItems = useMemo<GalleryItem[]>(() => {
    if (!product) return [];

    if (selectedVariant?.images?.length) {
      return selectedVariant.images.map((image) => ({
        image,
        color: selectedVariant.color,
        variantId: selectedVariant.id,
      }));
    }

    const variantImages = variantPool.flatMap((variant) =>
      (variant.images ?? []).map((image) => ({
        image,
        color: variant.color,
        variantId: variant.id,
      })),
    );

    if (variantImages.length) {
      return variantImages;
    }

    const fallbackImages = product.images.length
      ? product.images
      : [product.thumbnail];

    return fallbackImages.map((image) => ({
      image,
      color: selectedVariant?.color ?? selectedColor,
      variantId: selectedVariant?.id ?? '',
    }));
  }, [product, selectedColor, selectedVariant, variantPool]);

  useEffect(() => {
    if (!selectedVariant) return;

    if (selectedSize !== selectedVariant.size) {
      setSelectedSize(selectedVariant.size);
    }
    if (selectedColor !== selectedVariant.color) {
      setSelectedColor(selectedVariant.color);
    }
  }, [selectedColor, selectedSize, selectedVariant]);

  useEffect(() => {
    setMainImage(0);
  }, [selectedVariant?.id]);

  if (!product) {
    return <div className="pt-28 pb-16 text-center">Đang tải sản phẩm...</div>;
  }

  const price =
    selectedVariant?.salePrice ||
    selectedVariant?.price ||
    product.salePrice ||
    product.basePrice;
  const hasDiscount = product.salePrice !== null;

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
    const nextVariant =
      variantPool.find(
        (variant) => variant.size === size && variant.color === selectedColor,
      ) || variantPool.find((variant) => variant.size === size);

    if (nextVariant) {
      setSelectedColor(nextVariant.color);
    }
  };

  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    const nextVariant =
      variantPool.find(
        (variant) => variant.size === selectedSize && variant.color === color,
      ) || variantPool.find((variant) => variant.color === color);

    if (nextVariant) {
      setSelectedSize(nextVariant.size);
    }
  };

  const handleSelectGalleryItem = (index: number) => {
    const item = galleryItems[index];
    setMainImage(index);
    if (!item) return;

    const nextVariant =
      variantPool.find((variant) => variant.id === item.variantId) ||
      variantPool.find((variant) => variant.color === item.color);

    if (nextVariant) {
      setSelectedSize(nextVariant.size);
      setSelectedColor(nextVariant.color);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    await addItem({
      id: `cart_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      thumbnail:
        selectedVariant.images?.[0] ||
        galleryItems[0]?.image ||
        product.thumbnail,
      variant: selectedVariant,
      quantity,
      price,
      totalPrice: price * quantity,
    });
    setCartDrawerOpen(true);
  };

  const handleSelectCombo = (
    tier: (typeof COMBO_TIERS)[number],
    shortsSize: string,
    shortsColor: string,
  ) => {
    if (!selectedVariant) return;

    void addItem({
      id: `cart_${Date.now()}_main`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      thumbnail:
        selectedVariant.images?.[0] ||
        galleryItems[0]?.image ||
        product.thumbnail,
      variant: selectedVariant,
      quantity,
      price,
      totalPrice: price * quantity,
    });

    const shortsColorObj =
      MOCK_COMBO_SHORTS.colors.find((color) => color.name === shortsColor) ||
      MOCK_COMBO_SHORTS.colors[0];

    const shortsVariant = {
      id: `var_shorts_${Date.now()}`,
      productId: MOCK_COMBO_SHORTS.id,
      size: shortsSize,
      color: shortsColor,
      colorCode: shortsColorObj.code,
      sku: `SHORTS-${shortsSize}-${shortsColor.substring(0, 2).toUpperCase()}`,
      price: MOCK_COMBO_SHORTS.basePrice,
      salePrice: tier.freeShorts > 0 ? 0 : tier.shortsPrice,
      stock: 99,
      images: [],
    };

    const shortsQuantity = tier.freeShorts > 0 ? tier.freeShorts : 1;
    const shortsPrice = tier.freeShorts > 0 ? 0 : tier.shortsPrice;

    void addItem({
      id: `cart_${Date.now()}_shorts`,
      productId: MOCK_COMBO_SHORTS.id,
      productName: `${MOCK_COMBO_SHORTS.name} (${tier.name})`,
      productSlug: MOCK_COMBO_SHORTS.slug,
      thumbnail: MOCK_COMBO_SHORTS.image,
      variant: shortsVariant,
      quantity: shortsQuantity,
      price: shortsPrice,
      totalPrice: shortsPrice * shortsQuantity,
    });

    setCartDrawerOpen(true);
  };

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-20">
          <div className="space-y-4">
            <div className="glass-card relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-rose-50">
              <Image
                src={galleryItems[mainImage]?.image || product.thumbnail}
                alt={product.name}
                fill
                className="object-contain p-4 sm:p-6"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
              {selectedVariant?.color ? (
                <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  Mẫu đang xem: {selectedVariant.color}
                </span>
              ) : null}
              {hasDiscount && (
                <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-full">
                  -
                  {Math.round(
                    ((product.basePrice - product.salePrice!) /
                      product.basePrice) *
                      100,
                  )}
                  %
                </span>
              )}
            </div>

            {galleryItems.length > 1 && (
              <div className="flex flex-wrap gap-3">
                {galleryItems.map((item, index) => (
                  <button
                    key={`${item.image}-${index}`}
                    onClick={() => handleSelectGalleryItem(index)}
                    className={`relative h-24 w-20 overflow-hidden rounded-xl border-2 bg-white transition-all ${
                      mainImage === index
                        ? 'border-primary shadow-md shadow-violet-200/60'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-contain p-1.5"
                      sizes="80px"
                    />
                    {item.color ? (
                      <span className="absolute inset-x-1 bottom-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                        {item.color}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-8">
            <div className="mb-4">
              <p className="text-sm text-primary font-medium mb-2">
                {product.category.name}
              </p>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`w-4 h-4 ${
                        index < Math.round(product.averageRating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({product.totalReviews} đánh giá)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(price)}
              </span>
              {hasDiscount && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.basePrice)}
                </span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-6">
              {product.description}
            </p>

            <div className="mb-6">
              <p className="text-sm font-medium text-foreground mb-3">
                Kích thước: <span className="text-primary">{selectedSize}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => handleSelectSize(size)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      selectedSize === size
                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-300/25'
                        : 'bg-white/60 border border-white/50 text-foreground hover:bg-white/80'
                    } hover:scale-[1.02] active:scale-95`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm font-medium text-foreground mb-3">
                Màu sắc: <span className="text-primary">{selectedColor}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                {colorOptions.map((variant) => {
                  const isAvailableForSize = variantPool.some(
                    (item) =>
                      item.size === selectedSize &&
                      item.color === variant.color,
                  );

                  return (
                    <button
                      key={variant.color}
                      onClick={() => handleSelectColor(variant.color)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-2 transition-all ${
                        selectedColor === variant.color
                          ? 'border-primary ring-2 ring-violet-300 ring-offset-2 bg-white'
                          : 'border-white/50 bg-white/70'
                      } ${
                        isAvailableForSize ? 'hover:scale-[1.02]' : 'opacity-60'
                      }`}
                      title={variant.color}
                    >
                      <span
                        className="block h-5 w-5 rounded-full border border-slate-200"
                        style={{ backgroundColor: variant.colorCode }}
                      />
                      <span className="text-sm text-slate-700">
                        {variant.color}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-foreground mb-3">
                Số lượng
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2.5 rounded-xl bg-white/60 border border-white/50 hover:bg-white/80 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-lg font-medium">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2.5 rounded-xl bg-white/60 border border-white/50 hover:bg-white/80 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {selectedVariant && (
                  <span className="text-sm text-muted-foreground">
                    Còn {selectedVariant.stock} sản phẩm
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => void handleAddToCart()}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3.5 text-base"
              >
                <ShoppingBag className="w-5 h-5" /> Thêm vào giỏ
              </button>
              <button className="p-3.5 rounded-xl border-2 border-violet-300 text-violet-600 hover:bg-violet-50 transition-all hover:scale-[1.02] active:scale-95">
                <Heart className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <ComboSelector
                productPrice={price}
                onSelectCombo={handleSelectCombo}
              />
            </div>

            <Link
              href={`/try-on?product=${product.slug}`}
              className="flex items-center justify-center gap-2.5 w-full mb-8 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 text-violet-600 font-medium text-sm hover:from-violet-100 hover:to-purple-100 hover:border-violet-300 hover:scale-[1.01] active:scale-[0.98] transition-all group"
            >
              <Wand2 className="w-5 h-5 text-violet-500 group-hover:rotate-12 transition-transform" />
              <span>Mặc thử ảo bằng AI</span>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-[10px] font-bold text-violet-500 uppercase tracking-wider">
                Mới
              </span>
            </Link>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/30">
              {[
                { icon: Truck, text: 'Miễn phí ship' },
                { icon: RotateCcw, text: 'Đổi trả 30 ngày' },
                { icon: ShieldCheck, text: 'Hàng chính hãng' },
              ].map((feature) => (
                <div key={feature.text} className="text-center">
                  <feature.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
            Sản phẩm <span className="text-gradient">liên quan</span>
          </h2>
          <ProductGrid products={relatedProducts} columns={3} />
        </div>
      </div>
    </div>
  );
}
