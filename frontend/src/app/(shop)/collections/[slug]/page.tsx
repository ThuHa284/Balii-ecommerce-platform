"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles } from "lucide-react";
import ProductGrid from "@/components/product/product-grid";
import ComboBanner from "@/components/product/combo-banner";
import {
  getCollectionBySlug,
  getCollections,
} from "@/lib/api/collections.api";
import { getProducts } from "@/lib/api/products.api";
import { Collection, Product } from "@/types/product.types";

export default function CollectionDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [collectionData, collectionList, productData] = await Promise.all([
          getCollectionBySlug(slug),
          getCollections(),
          getProducts({ page: 1, limit: 100 }),
        ]);

        setCollection(collectionData);
        setCollections(collectionList);
        setProducts(productData.products);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      void loadData();
    }
  }, [slug]);

  const collectionProducts = useMemo(() => {
    if (!collection) {
      return [];
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    return collection.productIds
      .map((id) => productMap.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [collection, products]);

  const relatedCollections = useMemo(
    () => collections.filter((item) => item.slug !== slug).slice(0, 3),
    [collections, slug],
  );

  if (loading) {
    return (
      <div className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card p-12 text-muted-foreground">
            Đang tải bộ sưu tập...
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card p-12">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-4">
              Không tìm thấy bộ sưu tập
            </h1>
            <p className="text-muted-foreground mb-6">
              Bộ sưu tập bạn tìm kiếm không tồn tại hoặc đã bị xóa.
            </p>
            <Link
              href="/collections"
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách BST
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16">
      <section className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <Image
          src={collection.bannerImage || collection.image}
          alt={collection.name}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-4 fade-in-up">
              <Link href="/" className="hover:text-white transition-colors">
                Trang chủ
              </Link>
              <span>/</span>
              <Link
                href="/collections"
                className="hover:text-white transition-colors"
              >
                Bộ Sưu Tập
              </Link>
              <span>/</span>
              <span className="text-white">{collection.name}</span>
            </div>

            <div className="fade-in-up fade-in-up-delay-1">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                {collection.season}
              </span>
            </div>

            <h1 className="fade-in-up fade-in-up-delay-2 font-heading text-3xl md:text-5xl font-bold text-white mb-3">
              {collection.name}
            </h1>
            <p className="fade-in-up fade-in-up-delay-3 text-white/80 text-sm md:text-base max-w-xl leading-relaxed">
              {collection.description}
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10 mb-12">
        <ComboBanner variant="compact" />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground mb-1">
              Sản Phẩm Trong <span className="text-gradient">Bộ Sưu Tập</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {collectionProducts.length} sản phẩm
            </p>
          </div>

          <Link
            href="/collections"
            className="btn-outline inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Tất cả BST
          </Link>
        </div>

        {collectionProducts.length > 0 ? (
          <ProductGrid products={collectionProducts} columns={3} />
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">
              Chưa có sản phẩm nào trong bộ sưu tập này.
            </p>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <h2 className="font-heading text-2xl font-bold text-foreground mb-8 text-center">
          Bộ Sưu Tập <span className="text-gradient">Khác</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedCollections.map((item, index) => (
            <Link
              key={item.id}
              href={`/collections/${item.slug}`}
              className="group block fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative overflow-hidden rounded-2xl aspect-[4/3] glass-card-hover">
                <Image
                  src={item.image || item.bannerImage}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-heading text-lg font-bold text-white mb-1">
                    {item.name}
                  </h3>
                  <p className="text-xs text-white/70">
                    {item.productIds.length} sản phẩm · {item.season}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
