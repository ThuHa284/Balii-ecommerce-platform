'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderTree, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import {
  createCategory,
  deleteCategory,
  getCategories,
  type CategoryPayload,
  updateCategory,
} from '@/lib/api/categories.api';
import {
  canManageAdminResource,
  getAdminRoleLabel,
} from '@/lib/api/admin.utils';
import { getUserErrorMessage } from '@/lib/error-utils';
import { useAuthStore } from '@/store/auth.store';
import { Category } from '@/types/product.types';

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const userRole = useAuthStore((state) => state.user?.role);
  const canManage = canManageAdminResource(userRole);
  const roleLabel = getAdminRoleLabel(userRole);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => {
    async function loadCategories() {
      try {
        setIsLoading(true);
        const data = await getCategories();
        setCategories(data);
      } catch (error) {
        toast.error(
          getUserErrorMessage(error, 'Không tải được danh mục sản phẩm.'),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadCategories();
  }, []);

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.name.toLowerCase().includes(search.toLowerCase()) ||
          category.slug.toLowerCase().includes(search.toLowerCase()),
      ),
    [categories, search],
  );

  function resetForm() {
    setEditTarget(null);
    setName('');
    setSlug('');
    setImageUrl('');
    setSortOrder('0');
  }

  function handleOpenCreate() {
    resetForm();
    setShowModal(true);
  }

  function handleOpenEdit(category: Category) {
    setEditTarget(category);
    setName(category.name);
    setSlug(category.slug);
    setImageUrl(category.image || '');
    setSortOrder('0');
    setShowModal(true);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (!canManage) {
      toast.error('Bạn không có quyền quản lý danh mục.');
      return;
    }

    if (!name.trim() || !slug.trim()) {
      toast.error('Vui lòng nhập tên và slug danh mục.');
      return;
    }

    const payload: CategoryPayload = {
      name: name.trim(),
      slug: slug.trim(),
      imageUrl: imageUrl.trim() || undefined,
      sortOrder: Number(sortOrder || 0),
      isActive: true,
    };

    try {
      setSaving(true);

      if (editTarget) {
        const updated = await updateCategory(editTarget.id, payload);
        setCategories((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        toast.success('Đã cập nhật danh mục.');
      } else {
        const created = await createCategory(payload);
        setCategories((current) => [...current, created]);
        toast.success('Đã thêm danh mục.');
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(getUserErrorMessage(error, 'Lưu danh mục thất bại.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.id);
      setCategories((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      toast.success('Đã ẩn danh mục khỏi hệ thống.');
    } catch (error) {
      toast.error(getUserErrorMessage(error, 'Xóa danh mục thất bại.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50 p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-sky-700/70">
              Điều hướng sản phẩm
            </p>
            <span className="inline-flex rounded-full border border-sky-900/10 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900/70">
              {roleLabel}
            </span>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Quản lý danh mục
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Theo dõi số lượng sản phẩm theo từng danh mục và cập nhật cấu trúc
              trưng bày ngay trong trang quản trị.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Thêm danh mục
          </button>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc slug danh mục..."
            className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-white/30 bg-slate-50/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Danh mục
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Slug
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Sản phẩm
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Đang tải danh mục...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Không có danh mục phù hợp.
                  </td>
                </tr>
              ) : (
                filteredCategories
                  .slice()
                  .sort((a, b) => b.productCount - a.productCount)
                  .map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-white/20 transition-colors hover:bg-white/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                            <FolderTree className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {category.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {category.slug}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        {category.productCount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(category)}
                            className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                            title="Chỉnh sửa danh mục"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(category)}
                            className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                            title="Xóa danh mục"
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

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-10 backdrop-blur-sm">
          <div
            className="glass-card w-full max-w-xl p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/30 pb-4">
              <h3 className="font-heading text-xl font-bold text-foreground">
                {editTarget ? 'Cập nhật danh mục' : 'Thêm danh mục mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 transition-colors hover:bg-white/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(event) => void handleSave(event)}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (!editTarget) {
                      setSlug(normalizeSlug(event.target.value));
                    }
                  }}
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="Ví dụ: Đồ ngủ lụa"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(event) =>
                    setSlug(normalizeSlug(event.target.value))
                  }
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="do-ngu-lua"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Ảnh đại diện
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Thứ tự hiển thị
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  min={0}
                />
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

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="glass-card mx-4 w-full max-w-md p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-bold text-foreground">
                Xác nhận xóa danh mục
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Danh mục sẽ bị ẩn khỏi hệ thống. Các sản phẩm hiện có không bị
                xóa.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border-2 border-white/50 px-4 py-2.5 font-medium text-foreground transition-all hover:bg-white/40"
                >
                  Hủy
                </button>
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-medium text-white transition-all hover:bg-red-600 disabled:opacity-60"
                >
                  {deleting ? 'Đang xóa...' : 'Xóa danh mục'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
