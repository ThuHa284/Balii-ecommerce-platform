"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { MOCK_PRODUCTS } from "@/lib/api/mock-data";
import { formatCurrency } from "@/lib/utils";

export default function AdminProductsPage() {
  const [products] = useState(MOCK_PRODUCTS);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">{products.length} sản phẩm</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm sản phẩm
        </button>
      </div>

      {/* Search */}
      <div className="glass-card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Sản phẩm</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Danh mục</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Giá</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Tồn kho</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Đánh giá</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr key={product.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-14 rounded-lg overflow-hidden shrink-0">
                        <Image src={product.thumbnail} alt={product.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">{product.category.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-primary">{formatCurrency(product.salePrice || product.basePrice)}</p>
                      {product.salePrice && <p className="text-xs text-muted-foreground line-through">{formatCurrency(product.basePrice)}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">{product.variants.reduce((s, v) => s + v.stock, 0)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-foreground">{product.averageRating} ⭐</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(product.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="glass-card p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">Xác nhận xóa</h3>
              <p className="text-sm text-muted-foreground mb-6">Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-white/50 text-foreground font-medium hover:bg-white/40 transition-all">
                  Hủy
                </button>
                <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">
                  Xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
