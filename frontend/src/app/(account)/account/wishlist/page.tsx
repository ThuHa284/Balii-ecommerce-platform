"use client";

import { useEffect, useState } from "react";
import ProductGrid from "@/components/product/product-grid";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { useWishlistStore } from "@/store/wishlist.store";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Product } from "@/types/product.types";
import { getProducts } from "@/lib/api/products.api";

export default function WishlistPage() {
  const { items } = useWishlistStore();
  const mounted = useHasMounted();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);

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
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Sản phẩm yêu thích</h1>
      {!mounted ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card aspect-[3/4] w-full rounded-2xl bg-white/20" />
          ))}
        </div>
      ) : wishlistProducts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Chưa có sản phẩm yêu thích nào</p>
          <Link href="/products" className="btn-primary inline-block">Khám phá sản phẩm</Link>
        </div>
      ) : (
        <ProductGrid products={wishlistProducts} columns={3} />
      )}
    </div>
  );
}
