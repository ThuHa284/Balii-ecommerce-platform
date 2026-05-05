"use client";

import ProductGrid from "@/components/product/product-grid";
import { MOCK_PRODUCTS } from "@/lib/api/mock-data";
import { Heart } from "lucide-react";
import Link from "next/link";

export default function WishlistPage() {
  const wishlistProducts = MOCK_PRODUCTS.slice(0, 3);

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Sản phẩm yêu thích</h1>
      {wishlistProducts.length === 0 ? (
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
