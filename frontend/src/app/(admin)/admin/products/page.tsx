'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ExcelImportModal from '@/components/admin/excel-import-modal';
import {
  canDeleteAdminResource,
  getAdminRoleLabel,
} from '@/lib/api/admin.utils';
import { getCategories } from '@/lib/api/categories.api';
import { deleteProduct, getAdminProducts } from '@/lib/api/products.api';
import { getUserErrorMessage } from '@/lib/error-utils';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Category, Product } from '@/types/product.types';

function getProductStock(product: Product) {
  return product.variants.reduce((sum, variant) => sum + variant.stock, 0);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStock, setSelectedStock] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const userRole = useAuthStore((state) => state.user?.role);
  const canDelete = canDeleteAdminResource(userRole);
  const roleLabel = getAdminRoleLabel(userRole);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [productData, categoryData] = await Promise.all([
          getAdminProducts(),
          getCategories(),
        ]);
        setProducts(productData);
        setCategories(categoryData);
      } catch (error) {
        toast.error(
          getUserErrorMessage(error, 'Không tải được danh sách sản phẩm.'),
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((product) => {
        const normalizedSearch = search.trim().toLowerCase();
        const matchesSearch = normalizedSearch
          ? product.name.toLowerCase().includes(normalizedSearch) ||
            product.slug.toLowerCase().includes(normalizedSearch)
          : true;
        const matchesCategory = selectedCategory
          ? product.categoryId === selectedCategory
          : true;

        const totalStock = getProductStock(product);
        const matchesStock =
          selectedStock === 'instock'
            ? totalStock > 0
            : selectedStock === 'outofstock'
              ? totalStock === 0
              : true;

        const price = product.salePrice || product.basePrice;
        const matchesPrice =
          selectedPriceRange === 'under800'
            ? price < 800000
            : selectedPriceRange === '800to1000'
              ? price >= 800000 && price <= 1000000
              : selectedPriceRange === 'over1000'
                ? price > 1000000
                : true;

        return matchesSearch && matchesCategory && matchesStock && matchesPrice;
      }),
    [products, search, selectedCategory, selectedPriceRange, selectedStock],
  );

  const summary = useMemo(() => {
    const totalStock = filtered.reduce((sum, product) => sum + getProductStock(product), 0);
    const featuredCount = filtered.filter((product) => product.isFeatured).length;
    const outOfStockCount = filtered.filter((product) => getProductStock(product) === 0).length;

    return {
      totalStock,
      featuredCount,
      outOfStockCount,
    };
  }, [filtered]);

  async function handleDelete() {
    if (!deleteId) return;
    if (!canDelete) {
      toast.error('Chỉ super admin mới có quyền xóa sản phẩm.');
      return;
    }

    try {
      setDeleting(true);
      await deleteProduct(deleteId);
      setProducts((current) =>
        current.filter((product) => product.id !== deleteId),
      );
      setDeleteId(null);
      toast.success('Đã xóa sản phẩm.');
    } catch (error) {
      toast.error(getUserErrorMessage(error, 'Xóa sản phẩm thất bại.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-violet-900 p-6 text-white shadow-xl shadow-slate-900/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-white/60">
              Quản trị danh mục bán hàng
            </p>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
              {roleLabel}
            </span>
            <h1 className="font-heading text-3xl font-bold">
              Sản phẩm và tồn kho
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              Theo dõi nhanh số lượng sản phẩm, hàng nổi bật và trạng thái tồn
              kho để xử lý vận hành hằng ngày.
            </p>
            {!canDelete ? (
              <p className="mt-3 max-w-2xl rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Bạn đang ở quyền admin. Tạo và cập nhật sản phẩm vẫn khả dụng,
                nhưng xóa sản phẩm là thao tác dành riêng cho super admin.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowExcelImport(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import Excel
            </button>
            <Link
              href="/admin/products/form"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Thêm sản phẩm
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm text-white/70">Sản phẩm đang hiển thị</p>
            <p className="mt-1 text-2xl font-bold">{filtered.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm text-white/70">Tổng tồn kho</p>
            <p className="mt-1 text-2xl font-bold">{summary.totalStock}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
            <p className="text-sm text-white/70">Hết hàng / nổi bật</p>
            <p className="mt-1 text-2xl font-bold">
              {summary.outOfStockCount} / {summary.featuredCount}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc slug sản phẩm..."
              className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả tồn kho</option>
            <option value="instock">Còn hàng</option>
            <option value="outofstock">Hết hàng</option>
          </select>

          <select
            value={selectedPriceRange}
            onChange={(e) => setSelectedPriceRange(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả mức giá</option>
            <option value="under800">Dưới 800.000đ</option>
            <option value="800to1000">800.000đ - 1.000.000đ</option>
            <option value="over1000">Trên 1.000.000đ</option>
          </select>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px]">
            <thead>
              <tr className="border-b border-white/30 bg-slate-50/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Sản phẩm
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Danh mục
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Giá bán
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Tồn kho
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Đánh giá
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Đang tải sản phẩm...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Không có sản phẩm phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const stock = getProductStock(product);

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-white/20 transition-colors hover:bg-white/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            <Image
                              src={product.thumbnail}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {product.category?.name ?? '-'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(product.salePrice || product.basePrice)}
                        </p>
                        {product.salePrice ? (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(product.basePrice)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            stock > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {stock > 0 ? `${stock} sản phẩm` : 'Hết hàng'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {product.averageRating} ★
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/form?id=${product.id}`}
                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => {
                              if (!canDelete) {
                                toast.error(
                                  'Chỉ super admin mới có quyền xóa sản phẩm.',
                                );
                                return;
                              }
                              setDeleteId(product.id);
                            }}
                            disabled={!canDelete}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            title={
                              canDelete
                                ? 'Xóa sản phẩm'
                                : 'Chỉ super admin mới được xóa'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {deleteId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="glass-card mx-4 w-full max-w-md p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-bold text-foreground">
                Xác nhận xóa sản phẩm
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Hành động này không thể hoàn tác. Sản phẩm sẽ bị xóa khỏi danh
                sách quản trị và không còn hiển thị trên hệ thống.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 rounded-xl border-2 border-white/50 px-4 py-2.5 font-medium text-foreground transition-all hover:bg-white/40"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-medium text-white transition-all hover:bg-red-600 disabled:opacity-60"
                >
                  {deleting ? 'Đang xóa...' : 'Xóa sản phẩm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ExcelImportModal
        open={showExcelImport}
        onClose={() => setShowExcelImport(false)}
      />
    </div>
  );
}
