"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProductGrid from "@/components/product/product-grid";
import { getCategoryBySlug } from "@/lib/api/categories.api";
import { getProducts } from "@/lib/api/products.api";
import { Category, Product } from "@/types/product.types";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadData() {
      const [categoryData, productResponse] = await Promise.all([
        getCategoryBySlug(slug),
        getProducts({ categorySlug: slug, limit: 100 }),
      ]);
      setCategory(categoryData);
      setProducts(productResponse.products);
    }

    void loadData();
  }, [slug]);

  if (!category) {
    return (
      <div className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="glass-card p-12">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-3">Không tìm thấy danh mục</h1>
            <p className="text-muted-foreground">Danh mục bạn đang tìm kiếm không tồn tại.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Category Header */}
        <div className="glass-card overflow-hidden mb-10 relative h-48 md:h-64 rounded-2xl">
          <Image src={category.image} alt={category.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
          <div className="absolute bottom-6 left-6">
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2">{category.name}</h1>
            <p className="text-white/80">{category.description}</p>
          </div>
        </div>

        <p className="text-muted-foreground mb-8">{products.length} sản phẩm</p>
        {products.length > 0 ? (
          <ProductGrid products={products} columns={4} />
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Chưa có sản phẩm trong danh mục này.</p>
          </div>
        )}
      </div>
    </div>
  );
}
