"use client";
 
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag, Star, Eye, ArrowRightLeft } from "lucide-react";
import { Product } from "@/types/product.types";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useQuickViewStore } from "@/store/quickview.store";
import { useCompareStore } from "@/store/compare.store";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const isFavorite = isInWishlist(product.id);
  const { addItem, setCartDrawerOpen } = useCartStore();
  
  const openQuickView = useQuickViewStore((state) => state.openQuickView);
  const { toggleCompare, isInCompare } = useCompareStore();
  const inCompare = isInCompare(product.id);

  const price = product.salePrice || product.basePrice;
  const hasDiscount = product.salePrice !== null && product.salePrice < product.basePrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.basePrice - product.salePrice!) / product.basePrice) * 100)
    : 0;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
    if (!isFavorite) {
      toast.success(`Đã thêm "${product.name}" vào danh sách yêu thích!`, {
        icon: "❤️",
      });
    } else {
      toast.info(`Đã xoá "${product.name}" khỏi danh sách yêu thích.`);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const defaultVariant = product.variants[0];
    if (!defaultVariant) {
      toast.error("Sản phẩm tạm thời hết hàng!");
      return;
    }

    const priceToAdd = defaultVariant.salePrice || defaultVariant.price || price;

    await addItem({
      id: `cart_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      thumbnail: product.thumbnail,
      variant: defaultVariant,
      quantity: 1,
      price: priceToAdd,
      totalPrice: priceToAdd,
    });

    toast.success(`Đã thêm "${product.name}" (Size ${defaultVariant.size}) vào giỏ hàng!`);
    setCartDrawerOpen(true);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product);
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product);
  };

  return (
    <div className="group glass-card-hover overflow-hidden">
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl">
        <Link href={`/products/${product.slug}`} className="block w-full h-full relative">
          <Image
            src={product.thumbnail}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </Link>
 
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasDiscount && (
            <span className="px-2.5 py-1 text-xs font-bold bg-red-500 text-white rounded-full">
              -{discountPercent}%
            </span>
          )}
          {product.isNew && (
            <span className="px-2.5 py-1 text-xs font-bold bg-gradient-to-r from-emerald-400 to-teal-500 text-white rounded-full">
              Mới
            </span>
          )}
        </div>
 
        {/* Quick Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 translate-x-0 sm:translate-x-2 sm:group-hover:translate-x-0 z-10">
          <button
            onClick={handleToggleFavorite}
            className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white shadow-lg transition-all hover:scale-110 active:scale-95"
            aria-label="Thêm vào yêu thích"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? "fill-rose-500 text-rose-500" : "text-foreground"
              }`}
            />
          </button>
          <button
            onClick={handleQuickView}
            className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white shadow-lg transition-all hover:scale-110 active:scale-95"
            aria-label="Xem nhanh"
          >
            <Eye className="w-4 h-4 text-foreground hover:text-violet-500 transition-colors" />
          </button>
          <button
            onClick={handleToggleCompare}
            className={`p-2.5 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white shadow-lg transition-all hover:scale-110 active:scale-95 ${
              inCompare ? "text-violet-600 bg-violet-50/80" : ""
            }`}
            aria-label="So sánh"
          >
            <ArrowRightLeft className={`w-4 h-4 transition-colors ${inCompare ? "text-violet-600" : "text-foreground"}`} />
          </button>
          <button
            onClick={handleAddToCart}
            className="p-2.5 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white shadow-lg transition-all hover:scale-110 active:scale-95"
            aria-label="Thêm nhanh vào giỏ hàng"
          >
            <ShoppingBag className="w-4 h-4 text-foreground hover:text-violet-500 transition-colors" />
          </button>
        </div>
 
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
 
      {/* Info */}
      <div className="p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-heading text-sm font-semibold text-foreground line-clamp-2 mb-1 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
          {product.shortDescription}
        </p>
 
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-medium text-foreground">{product.averageRating}</span>
          <span className="text-xs text-muted-foreground">({product.totalReviews})</span>
        </div>
 
        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">{formatCurrency(price)}</span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(product.basePrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
