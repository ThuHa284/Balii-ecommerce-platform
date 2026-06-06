"use client";

import { useEffect, useState } from "react";
import ProductGrid from "@/components/product/product-grid";
import { useWishlistStore } from "@/store/wishlist.store";
import { Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Product } from "@/types/product.types";
import { getProducts } from "@/lib/api/products.api";

export default function WishlistPage() {
  const { items } = useWishlistStore();
  const [mounted, setMounted] = useState(false);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadWishlistProducts() {
      const response = await getProducts({ limit: 100 });
      setWishlistProducts(response.products.filter((product) => items.includes(product.id)));
    }

    if (mounted) {
      void loadWishlistProducts();
    }
  }, [items, mounted]);

  return (
    <div className="pt-28 pb-16 min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/30 pb-6 mb-10">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">
              Danh sách <span className="text-gradient">Yêu Thích</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Lưu giữ những mẫu sleepwear cao cấp bạn yêu thích nhất
            </p>
          </div>
          {mounted && wishlistProducts.length > 0 && (
            <span className="mt-2 md:mt-0 px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-600 text-xs font-bold border border-violet-200/50">
              {wishlistProducts.length} sản phẩm
            </span>
          )}
        </div>

        {!mounted ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card aspect-[3/4] w-full rounded-2xl bg-white/20" />
            ))}
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="glass-card p-12 md:p-16 text-center max-w-md mx-auto">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-50 mb-6 text-rose-500">
              <Heart className="w-10 h-10" />
            </div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">
              Danh sách yêu thích trống
            </h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              Bạn chưa lưu sản phẩm nào. Hãy khám phá ngay các bộ đồ ngủ lụa quyến rũ của Balii!
            </p>
            <Link href="/products" className="btn-primary inline-flex items-center gap-2">
              Khám phá sản phẩm <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <ProductGrid products={wishlistProducts} columns={3} />
        )}
      </div>
    </div>
  );
}
