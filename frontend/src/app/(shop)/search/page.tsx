"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import ProductGrid from "@/components/product/product-grid";
import { MOCK_PRODUCTS } from "@/lib/api/mock-data";
import { useSearchParams } from "next/navigation";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(query);

  const results = MOCK_PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl font-bold text-foreground mb-4">Tìm kiếm</h1>
          <form className="max-w-lg mx-auto relative" action="/search" method="get">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input name="q" type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm kiếm sản phẩm đồ ngủ..." className="w-full pl-12 pr-4 py-4 rounded-2xl glass-card text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </form>
        </div>

        {query && (
          <div className="mb-8">
            <p className="text-muted-foreground">
              Tìm thấy <span className="font-bold text-foreground">{results.length}</span> kết quả cho &ldquo;<span className="text-primary">{query}</span>&rdquo;
            </p>
          </div>
        )}

        {results.length > 0 ? (
          <ProductGrid products={results} columns={4} />
        ) : query ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa khác.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
