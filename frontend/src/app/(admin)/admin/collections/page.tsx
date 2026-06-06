'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Library, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { canDeleteAdminResource } from '@/lib/api/admin.utils';
import {
  createCollection,
  deleteCollection,
  getCollections,
  updateCollection,
} from '@/lib/api/collections.api';
import { getAdminProducts } from '@/lib/api/products.api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Collection, Product } from '@/types/product.types';

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const userRole = useAuthStore((state) => state.user?.role);
  const canDelete = canDeleteAdminResource(userRole);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [season, setSeason] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [image, setImage] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [collectionData, productData] = await Promise.all([
          getCollections(),
          getAdminProducts(),
        ]);
        setCollections(collectionData);
        setProducts(productData);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Không tải được bộ sưu tập.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const filtered = useMemo(
    () =>
      collections.filter((collection) => {
        const matchesSearch = collection.name
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesSeason = selectedSeason
          ? collection.season === selectedSeason
          : true;
        const matchesStatus =
          selectedStatus === 'active'
            ? collection.isActive
            : selectedStatus === 'inactive'
              ? !collection.isActive
              : true;

        return matchesSearch && matchesSeason && matchesStatus;
      }),
    [collections, search, selectedSeason, selectedStatus],
  );

  const seasons = useMemo(
    () =>
      Array.from(
        new Set(
          collections.map((collection) => collection.season).filter(Boolean),
        ),
      ),
    [collections],
  );

  function resetForm() {
    setEditId(null);
    setName('');
    setSlug('');
    setSeason('');
    setDescription('');
    setShortDescription('');
    setImage('');
    setBannerImage('');
    setSelectedProductIds([]);
  }

  function handleOpenAddModal() {
    resetForm();
    setShowModal(true);
  }

  function handleOpenEditModal(collection: Collection) {
    setEditId(collection.id);
    setName(collection.name);
    setSlug(collection.slug);
    setSeason(collection.season);
    setDescription(collection.description);
    setShortDescription(collection.shortDescription);
    setImage(collection.image);
    setBannerImage(collection.bannerImage);
    setSelectedProductIds(collection.productIds);
    setShowModal(true);
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !slug.trim() || !season.trim()) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        season: season.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        imageUrl: image.trim(),
        bannerImageUrl: bannerImage.trim(),
        productIds: selectedProductIds,
        isActive: true,
      };

      if (editId) {
        const updated = await updateCollection(editId, payload);
        setCollections((current) =>
          current.map((collection) =>
            collection.id === editId ? updated : collection,
          ),
        );
        toast.success('Đã cập nhật bộ sưu tập.');
      } else {
        const created = await createCollection(payload);
        setCollections((current) => [created, ...current]);
        toast.success('Đã thêm bộ sưu tập.');
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Lưu bộ sưu tập thất bại.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (!canDelete) {
      toast.error('Chỉ super admin mới có quyền xóa bộ sưu tập.');
      return;
    }

    try {
      setDeleting(true);
      await deleteCollection(deleteId);
      setCollections((current) =>
        current.filter((collection) => collection.id !== deleteId),
      );
      setDeleteId(null);
      toast.success('Đã xóa bộ sưu tập.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Xóa bộ sưu tập thất bại.',
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-amber-700/70">
              Trưng bày và chiến dịch
            </p>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Quản lý bộ sưu tập
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Gom nhóm sản phẩm theo mùa vụ, concept hoặc chiến dịch bán hàng để
              đội nội dung và vận hành phối hợp nhanh hơn.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Thêm bộ sưu tập
          </button>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên bộ sưu tập..."
              className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả mùa vụ</option>
            {seasons.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-white/30 bg-slate-50/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Bộ sưu tập
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Mùa vụ
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Số sản phẩm
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Trạng thái
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
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Đang tải bộ sưu tập...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Chưa có bộ sưu tập phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((collection) => (
                  <tr
                    key={collection.id}
                    className="border-b border-white/20 transition-colors hover:bg-white/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-white/40">
                          {collection.image ? (
                            <Image
                              src={collection.image}
                              alt={collection.name}
                              fill
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {collection.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {collection.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {collection.season}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      {collection.productIds.length} sản phẩm
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          collection.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {collection.isActive ? 'Hoạt động' : 'Tạm ngưng'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(collection)}
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                          title="Chỉnh sửa bộ sưu tập"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canDelete) {
                              toast.error(
                                'Chỉ super admin mới có quyền xóa bộ sưu tập.',
                              );
                              return;
                            }
                            setDeleteId(collection.id);
                          }}
                          disabled={!canDelete}
                          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title={
                            canDelete
                              ? 'Xóa bộ sưu tập'
                              : 'Chỉ super admin mới được xóa'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
                Xác nhận xóa bộ sưu tập
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Bộ sưu tập sẽ bị xóa khỏi hệ thống và không thể khôi phục lại
                sau khi xác nhận.
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
                  {deleting ? 'Đang xóa...' : 'Xóa bộ sưu tập'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-10 backdrop-blur-sm">
          <div
            className="glass-card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/30 pb-4">
              <h3 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                <Library className="h-5 w-5 text-violet-500" />
                {editId ? 'Cập nhật bộ sưu tập' : 'Thêm bộ sưu tập mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 transition-colors hover:bg-white/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Tên bộ sưu tập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editId) {
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/đ/g, 'd')
                            .replace(/[^a-z0-9\s-]/g, '')
                            .replace(/\s+/g, '-'),
                        );
                      }
                    }}
                    placeholder="Ví dụ: Summer Silk 2026"
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="Vi du: summer-silk-2026"
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Mùa vụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="Ví dụ: Summer 2026"
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Thông điệp ngắn cho bộ sưu tập"
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả đầy đủ về bộ sưu tập..."
                  className="w-full resize-none rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Link ảnh đại diện
                  </label>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Link ảnh banner
                  </label>
                  <input
                    type="text"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Chọn sản phẩm thuộc bộ sưu tập
                </label>
                <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-white/20 bg-white/30 p-3 sm:grid-cols-2">
                  {products.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProductSelection(product.id)}
                        className={`flex items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                          isSelected
                            ? 'border border-violet-300 bg-violet-500/10 text-violet-700'
                            : 'border border-transparent bg-white/40 text-foreground/80 hover:bg-white/60'
                        }`}
                      >
                        <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded">
                          <Image
                            src={product.thumbnail}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold">
                            {product.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatCurrency(
                              product.salePrice || product.basePrice,
                            )}
                          </p>
                        </div>
                        {isSelected ? (
                          <Check className="h-4 w-4 shrink-0 text-violet-600" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t border-white/30 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border-2 border-white/50 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/40"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 py-3 text-sm disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
