"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, ShoppingBag } from "lucide-react";
import { getCollections } from "@/lib/api/collections.api";
import { getProducts } from "@/lib/api/products.api";
import { Collection, Product } from "@/types/product.types";

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [collectionData, productData] = await Promise.all([
          getCollections(),
          getProducts({ page: 1, limit: 100 }),
        ]);

        setCollections(collectionData);
        setProducts(productData.products);
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  return (
    <div className="pt-28 pb-16">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative overflow-hidden rounded-3xl combo-gradient glass-card p-8 md:p-12 lg:p-16">
          <div className="absolute top-0 right-0 w-72 h-72 bg-violet-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-purple-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <div className="fade-in-up">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur-sm border border-white/40 text-sm font-medium text-foreground mb-6">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Bộ Sưu Tập Balii
              </span>
            </div>
            <h1 className="fade-in-up fade-in-up-delay-1 font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">
              Bộ Sưu Tập <span className="text-gradient">Đặc Biệt</span>
            </h1>
            <p className="fade-in-up fade-in-up-delay-2 text-muted-foreground max-w-lg mx-auto leading-relaxed">
              Khám phá những bộ sưu tập đồ ngủ lụa được tuyển chọn theo chủ đề,
              mùa và phong cách riêng biệt
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            Đang tải bộ sưu tập...
          </div>
        ) : collections.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted-foreground">
            Chưa có bộ sưu tập nào.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {collections.map((collection, index) => {
              const productCount = collection.productIds.length;
              const collectionProducts = collection.productIds
                .map((id) => productMap.get(id))
                .filter((product): product is Product => Boolean(product));

              return (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group block fade-in-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="relative overflow-hidden rounded-2xl aspect-[16/10] glass-card-hover">
                    <Image
                      src={collection.bannerImage || collection.image}
                      alt={collection.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-all duration-500 group-hover:from-black/80" />

                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1.5 text-xs font-bold bg-white/20 backdrop-blur-md text-white rounded-full border border-white/20">
                        {collection.season}
                      </span>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                      <h2 className="font-heading text-2xl md:text-3xl font-bold text-white mb-2 group-hover:translate-y-[-4px] transition-transform duration-300">
                        {collection.name}
                      </h2>
                      <p className="text-white/80 text-sm mb-4 max-w-sm line-clamp-2">
                        {collection.shortDescription}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-white/70" />
                          <span className="text-sm text-white/70">
                            {productCount} sản phẩm
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-white font-medium text-sm opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                          Xem bộ sưu tập
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>

                      <div className="flex -space-x-2 mt-4 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-100">
                        {collectionProducts.slice(0, 4).map((product) => (
                          <div
                            key={product.id}
                            className="w-10 h-10 rounded-full border-2 border-white/60 overflow-hidden shadow-lg"
                          >
                            <Image
                              src={product.thumbnail}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        ))}
                        {productCount > 4 && (
                          <div className="w-10 h-10 rounded-full border-2 border-white/60 bg-violet-500/80 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold shadow-lg">
                            +{productCount - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
