'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Minus,
  Plus,
  ShoppingBag,
  Heart,
  Truck,
  RotateCcw,
  ShieldCheck,
  Wand2,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { COMBO_TIERS, MOCK_COMBO_SHORTS } from '@/lib/api/mock-data';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';
import ProductGrid from '@/components/product/product-grid';
import ComboSelector from '@/components/product/combo-selector';
import { Product } from '@/types/product.types';
import {
  getProductBySlug,
  getProductImages,
  getProducts,
  ProductImageRecord,
} from '@/lib/api/products.api';

type GalleryItem = {
  image: string;
  color: string;
  variantId: string;
};

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [product, setProduct] = useState<Product | null>(null);
  const [productImages, setProductImages] = useState<ProductImageRecord[]>([]);
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
        const imageData = await getProductImages(data.id);
        setProductImages(imageData);
        setSelectedSize(data.variants[0]?.size || '');
        setSelectedColor(data.variants[0]?.color || '');
        const list = await getProducts({ limit: 4 });
        setRelatedProducts(
          list.products.filter((item) => item.id !== data.id).slice(0, 3),
        );
      } else {
        setProductImages([]);
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

    const commonImages = productImages
      .filter((image) => !image.variantId)
      .map((image) => ({
        image: image.url,
        color: selectedVariant?.color ?? selectedColor,
        variantId: selectedVariant?.id ?? '',
      }));

    const selectedVariantImages = selectedVariant
      ? productImages
          .filter((image) => image.variantId === selectedVariant.id)
          .map((image) => ({
            image: image.url,
            color: selectedVariant.color,
            variantId: selectedVariant.id,
          }))
      : [];

    if (selectedVariantImages.length || commonImages.length) {
      return [...selectedVariantImages, ...commonImages];
    }

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
  }, [product, productImages, selectedColor, selectedVariant, variantPool]);

  useEffect(() => {
    const nextVariantId = selectedVariant?.id;
    if (!nextVariantId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setMainImage(0);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selectedVariant?.id]);

  if (!product) {
    return <div className="pt-28 pb-16 text-center">Đang tải sản phẩm...</div>;
  }

  const price =
    selectedVariant?.salePrice ??
    selectedVariant?.price ??
    product.salePrice ??
    product.basePrice;
  const hasDiscount = price < product.basePrice;

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
      campaign: product.activeCampaign
        ? {
            id: product.activeCampaign.id,
            name: product.activeCampaign.name,
            discountType: product.activeCampaign.discountType,
            discountValue: product.activeCampaign.discountValue,
            badgeText: product.activeCampaign.badgeText,
          }
        : null,
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
      campaign: product.activeCampaign
        ? {
            id: product.activeCampaign.id,
            name: product.activeCampaign.name,
            discountType: product.activeCampaign.discountType,
            discountValue: product.activeCampaign.discountValue,
            badgeText: product.activeCampaign.badgeText,
          }
        : null,
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
      campaign: null,
      quantity: shortsQuantity,
      price: shortsPrice,
      totalPrice: shortsPrice * shortsQuantity,
    });

    setCartDrawerOpen(true);
  };

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href="/products"
            className="hover:text-primary transition-colors"
          >
            Sản phẩm
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          {/* Gallery — Left Column */}
          <div className="lg:col-span-7 space-y-3">
            {/* Main Image */}
            <div className="glass-card relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
              <Image
                src={galleryItems[mainImage]?.image || product.thumbnail}
                alt={product.name}
                fill
                className="object-contain p-6 sm:p-8"
                sizes="(max-width: 1024px) 100vw, 58vw"
                priority
              />
              {hasDiscount && (
                <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold bg-red-500 text-white rounded-full shadow-lg">
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

            {/* Thumbnails */}
            {galleryItems.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryItems.map((item, index) => (
                  <button
                    key={`${item.image}-${index}`}
                    onClick={() => handleSelectGalleryItem(index)}
                    className={`relative flex-shrink-0 h-20 w-20 overflow-hidden rounded-xl border-2 bg-white transition-all ${
                      mainImage === index
                        ? 'border-violet-500 shadow-md shadow-violet-200/60 ring-1 ring-violet-300'
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-slate-200'
                    }`}
                  >
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info — Right Column */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 space-y-5">
              {/* Category & Name */}
              <div>
                <Link
                  href={`/categories/${product.category.slug || ''}`}
                  className="text-xs font-semibold text-violet-500 uppercase tracking-wider hover:text-violet-600 transition-colors"
                >
                  {product.category.name}
                </Link>
                <h1 className="mt-1.5 font-heading text-2xl md:text-3xl font-bold text-foreground leading-tight">
                  {product.name}
                </h1>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  {formatCurrency(price)}
                </span>
                {hasDiscount && (
                  <span className="text-base text-muted-foreground line-through">
                    {formatCurrency(product.basePrice)}
                  </span>
                )}
              </div>

              {product.activeCampaign ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <p className="font-semibold">
                    {product.activeCampaign.badgeText ||
                      product.activeCampaign.name}
                  </p>
                  <p className="mt-1 text-xs">
                    {product.activeCampaign.discountType === 'GIFT'
                      ? product.activeCampaign.giftDescription ||
                        `Tặng kèm ${product.activeCampaign.giftName || 'quà tặng'} khi mua trong thời gian chiến dịch.`
                      : 'Giá hiện tại đã bao gồm ưu đãi chiến dịch đang diễn ra.'}
                  </p>
                </div>
              ) : null}

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>

              {/* Divider */}
              <div className="border-t border-slate-200/60" />

              {/* Color Selector */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2.5">
                  Màu sắc: <span className="text-primary">{selectedColor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
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
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${
                          selectedColor === variant.color
                            ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200 ring-offset-1'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        } ${
                          isAvailableForSize
                            ? 'hover:scale-[1.02]'
                            : 'opacity-50'
                        }`}
                        title={variant.color}
                      >
                        <span
                          className="block h-4 w-4 rounded-full border border-slate-200"
                          style={{ backgroundColor: variant.colorCode }}
                        />
                        <span className="text-xs text-slate-700">
                          {variant.color}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Selector */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2.5">
                  Kích thước:{' '}
                  <span className="text-primary">{selectedSize}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSelectSize(size)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedSize === size
                          ? 'bg-violet-500 text-white shadow-md shadow-violet-300/25'
                          : 'bg-white border border-slate-200 text-foreground hover:bg-slate-50 hover:border-slate-300'
                      } hover:scale-[1.02] active:scale-95`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-xl border border-slate-200 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2.5 hover:bg-slate-50 transition-colors rounded-l-xl"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2.5 hover:bg-slate-50 transition-colors rounded-r-xl"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => void handleAddToCart()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 text-sm"
                >
                  <ShoppingBag className="w-4.5 h-4.5" /> Thêm vào giỏ hàng
                </button>
                <button className="p-3 rounded-xl border-2 border-violet-200 text-violet-500 hover:bg-violet-50 transition-all hover:scale-[1.02] active:scale-95">
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              {/* Stock info */}
              {selectedVariant && (
                <p className="text-xs text-muted-foreground">
                  Còn {selectedVariant.stock} sản phẩm trong kho
                </p>
              )}

              {/* Combo Selector */}
              <ComboSelector
                productPrice={price}
                onSelectCombo={handleSelectCombo}
              />

              {/* AI Try-On Link */}
              <Link
                href={`/try-on?product=${product.slug}`}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/60 text-violet-600 font-medium text-sm hover:from-violet-100 hover:to-purple-100 hover:border-violet-300 hover:scale-[1.01] active:scale-[0.98] transition-all group"
              >
                <Wand2 className="w-4.5 h-4.5 text-violet-500 group-hover:rotate-12 transition-transform" />
                <span>Mặc thử ảo bằng AI</span>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-[10px] font-bold text-violet-500 uppercase tracking-wider">
                  Mới
                </span>
              </Link>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/60">
                {[
                  { icon: Truck, text: 'Miễn phí ship' },
                  { icon: RotateCcw, text: 'Đổi trả 30 ngày' },
                  { icon: ShieldCheck, text: 'Hàng chính hãng' },
                ].map((feature) => (
                  <div
                    key={feature.text}
                    className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50/80 p-3"
                  >
                    <feature.icon className="w-4.5 h-4.5 text-violet-500" />
                    <p className="text-[11px] text-center font-medium text-muted-foreground leading-tight">
                      {feature.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
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
