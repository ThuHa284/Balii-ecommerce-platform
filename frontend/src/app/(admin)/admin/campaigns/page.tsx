'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  CalendarRange,
  Check,
  Gift,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  canDeleteAdminResource,
  getAdminRoleLabel,
} from '@/lib/api/admin.utils';
import {
  createCampaign,
  deleteCampaign,
  getCampaigns,
  updateCampaign,
  uploadCampaignImage,
} from '@/lib/api/campaigns.api';
import { getAdminProducts } from '@/lib/api/products.api';
import { getUserErrorMessage } from '@/lib/error-utils';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Campaign, CampaignDiscountType, Product } from '@/types/product.types';

const discountTypeOptions: Array<{
  value: CampaignDiscountType;
  label: string;
  helper: string;
}> = [
  {
    value: 'PERCENT',
    label: 'Giảm thêm theo %',
    helper: 'Giảm sâu hơn trên giá khuyến mãi hiện tại của sản phẩm.',
  },
  {
    value: 'AMOUNT',
    label: 'Giảm thêm theo tiền',
    helper: 'Trừ trực tiếp một số tiền cố định trong thời gian chiến dịch.',
  },
  {
    value: 'GIFT',
    label: 'Tặng kèm quà/phụ kiện',
    helper: 'Không giảm thêm tiền, thay bằng quà tặng hoặc phụ kiện đi kèm.',
  },
];

function toDateTimeLocalInput(value: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function normalizeDateTimeInput(value: string) {
  return value ? new Date(value).toISOString() : '';
}

function getCampaignOfferLabel(campaign: Campaign) {
  if (campaign.discountType === 'PERCENT') {
    return `Giảm thêm ${campaign.discountValue ?? 0}%`;
  }

  if (campaign.discountType === 'AMOUNT') {
    return `Giảm thêm ${formatCurrency(campaign.discountValue ?? 0)}`;
  }

  return campaign.giftName
    ? `Tặng kèm ${campaign.giftName}`
    : 'Tặng kèm quà/phụ kiện';
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const userRole = useAuthStore((state) => state.user?.role);
  const canDelete = canDeleteAdminResource(userRole);
  const roleLabel = getAdminRoleLabel(userRole);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [image, setImage] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [discountType, setDiscountType] =
    useState<CampaignDiscountType>('PERCENT');
  const [discountValue, setDiscountValue] = useState('');
  const [giftName, setGiftName] = useState('');
  const [giftDescription, setGiftDescription] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [priorityOrder, setPriorityOrder] = useState('0');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [campaignData, productData] = await Promise.all([
          getCampaigns(),
          getAdminProducts(),
        ]);
        setCampaigns(campaignData);
        setProducts(productData);
      } catch (error) {
        toast.error(
          getUserErrorMessage(error, 'Không tải được dữ liệu chiến dịch.'),
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesSearch =
        campaign.name.toLowerCase().includes(search.toLowerCase()) ||
        campaign.badgeText.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'live'
          ? campaign.isLive
          : statusFilter === 'inactive'
            ? !campaign.isActive
            : true;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  function resetForm() {
    setEditId(null);
    setName('');
    setSlug('');
    setDescription('');
    setShortDescription('');
    setImage('');
    setBannerImage('');
    setDiscountType('PERCENT');
    setDiscountValue('');
    setGiftName('');
    setGiftDescription('');
    setBadgeText('');
    setPriorityOrder('0');
    setStartAt('');
    setEndAt('');
    setIsActive(true);
    setSelectedProductIds([]);
    setImageFile(null);
    setBannerImageFile(null);
  }

  function handleOpenAddModal() {
    resetForm();
    setShowModal(true);
  }

  function handleOpenEditModal(campaign: Campaign) {
    setEditId(campaign.id);
    setName(campaign.name);
    setSlug(campaign.slug);
    setDescription(campaign.description);
    setShortDescription(campaign.shortDescription);
    setImage(campaign.image);
    setBannerImage(campaign.bannerImage);
    setDiscountType(campaign.discountType);
    setDiscountValue(
      campaign.discountValue != null ? String(campaign.discountValue) : '',
    );
    setGiftName(campaign.giftName);
    setGiftDescription(campaign.giftDescription);
    setBadgeText(campaign.badgeText);
    setPriorityOrder(String(campaign.priorityOrder ?? 0));
    setStartAt(toDateTimeLocalInput(campaign.startAt));
    setEndAt(toDateTimeLocalInput(campaign.endAt));
    setIsActive(campaign.isActive);
    setSelectedProductIds(campaign.productIds);
    setImageFile(null);
    setBannerImageFile(null);
    setShowModal(true);
  }

  function handleImageFileChange(file: File | null, kind: 'cover' | 'banner') {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Ảnh quá lớn, tối đa 10MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (kind === 'cover') {
      setImageFile(file);
      setImage(previewUrl);
      return;
    }

    setBannerImageFile(file);
    setBannerImage(previewUrl);
  }

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim() || !slug.trim() || !startAt || !endAt) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    if (discountType !== 'GIFT' && !discountValue.trim()) {
      toast.error('Vui lòng nhập mức ưu đãi cho chiến dịch.');
      return;
    }

    if (discountType === 'GIFT' && !giftName.trim()) {
      toast.error('Vui lòng nhập tên quà tặng/phụ kiện.');
      return;
    }

    try {
      setSaving(true);
      const uploadedImageUrl = imageFile
        ? (await uploadCampaignImage(imageFile, 'cover')).url
        : image.trim();
      const uploadedBannerUrl = bannerImageFile
        ? (await uploadCampaignImage(bannerImageFile, 'banner')).url
        : bannerImage.trim();

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        imageUrl: uploadedImageUrl,
        bannerImageUrl: uploadedBannerUrl,
        productIds: selectedProductIds,
        discountType,
        discountValue:
          discountType === 'GIFT' ? null : Number(discountValue.trim()),
        giftName: giftName.trim(),
        giftDescription: giftDescription.trim(),
        badgeText: badgeText.trim(),
        priorityOrder: Number(priorityOrder || 0),
        startAt: normalizeDateTimeInput(startAt),
        endAt: normalizeDateTimeInput(endAt),
        isActive,
      };

      if (editId) {
        const updated = await updateCampaign(editId, payload);
        setCampaigns((current) =>
          current.map((campaign) =>
            campaign.id === editId ? updated : campaign,
          ),
        );
        toast.success('Đã cập nhật chiến dịch.');
      } else {
        const created = await createCampaign(payload);
        setCampaigns((current) => [created, ...current]);
        toast.success('Đã thêm chiến dịch.');
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      toast.error(getUserErrorMessage(error, 'Lưu chiến dịch thất bại.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (!canDelete) {
      toast.error('Chỉ super admin mới có quyền xóa chiến dịch.');
      return;
    }

    try {
      setDeleting(true);
      await deleteCampaign(deleteId);
      setCampaigns((current) =>
        current.filter((campaign) => campaign.id !== deleteId),
      );
      setDeleteId(null);
      toast.success('Đã xóa chiến dịch.');
    } catch (error) {
      toast.error(getUserErrorMessage(error, 'Xóa chiến dịch thất bại.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50 p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-rose-700/70">
              Quản lý chiến dịch khuyến mãi
            </p>
            <span className="inline-flex rounded-full border border-rose-900/10 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-900/70">
              {roleLabel}
            </span>
            <h1 className="font-heading text-3xl font-bold text-slate-900">
              Chiến dịch không còn dùng chung với bộ sưu tập
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Mỗi chiến dịch có thời gian chạy, mức giảm thêm hoặc quà tặng
              riêng, gắn trực tiếp với danh sách sản phẩm cần đẩy bán.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Thêm chiến dịch
          </button>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-3">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên hoặc badge chiến dịch..."
              className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="live">Đang chạy</option>
            <option value="inactive">Đã tắt</option>
          </select>
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-white/30 bg-slate-50/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Chiến dịch
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Ưu đãi
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Thời gian
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Sản phẩm
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
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Đang tải chiến dịch...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-muted-foreground"
                  >
                    Chưa có chiến dịch phù hợp.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-white/20 transition-colors hover:bg-white/30"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg bg-white/40">
                          {campaign.image ? (
                            <Image
                              src={campaign.image}
                              alt={campaign.name}
                              fill
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {campaign.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.badgeText || campaign.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      {getCampaignOfferLabel(campaign)}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div>
                        {new Date(campaign.startAt).toLocaleString('vi-VN')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        đến {new Date(campaign.endAt).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {campaign.productIds.length} sản phẩm
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          campaign.isLive
                            ? 'bg-emerald-100 text-emerald-800'
                            : campaign.isActive
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {campaign.isLive
                          ? 'Đang chạy'
                          : campaign.isActive
                            ? 'Chờ tới lịch'
                            : 'Đã tắt'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(campaign)}
                          className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                          title="Chỉnh sửa chiến dịch"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (!canDelete) {
                              toast.error(
                                'Chỉ super admin mới có quyền xóa chiến dịch.',
                              );
                              return;
                            }
                            setDeleteId(campaign.id);
                          }}
                          disabled={!canDelete}
                          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title="Xóa chiến dịch"
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
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="mb-2 font-heading text-xl font-bold text-foreground">
                Xác nhận xóa chiến dịch
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Dữ liệu chiến dịch sẽ bị xóa khỏi hệ thống và không thể khôi
                phục lại sau khi xác nhận.
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
                  {deleting ? 'Đang xóa...' : 'Xóa chiến dịch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-10 backdrop-blur-sm">
          <div
            className="glass-card max-h-[85vh] w-full max-w-4xl overflow-y-auto p-6 md:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-white/30 pb-4">
              <h3 className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
                <Megaphone className="h-5 w-5 text-rose-500" />
                {editId ? 'Cập nhật chiến dịch' : 'Thêm chiến dịch mới'}
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
              className="space-y-5"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Tên chiến dịch <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (!editId) {
                        setSlug(
                          event.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/đ/g, 'd')
                            .replace(/[^a-z0-9\s-]/g, '')
                            .trim()
                            .replace(/\s+/g, '-'),
                        );
                      }
                    }}
                    placeholder="Ví dụ: Flash Sale Lụa Mùa Hè"
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
                    onChange={(event) => setSlug(event.target.value)}
                    placeholder="flash-sale-lua-mua-he"
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Mô tả ngắn
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(event) =>
                      setShortDescription(event.target.value)
                    }
                    placeholder="Thông điệp ngắn trên trang chủ"
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Badge hiển thị
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(event) => setBadgeText(event.target.value)}
                    placeholder="Ví dụ: Deal sâu 72h"
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Mô tả đầy đủ về chương trình khuyến mãi..."
                  className="w-full resize-none rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Thời gian bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(event) => setStartAt(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Thời gian kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(event) => setEndAt(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Kiểu ưu đãi
                  </label>
                  <div className="grid gap-2">
                    {discountTypeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDiscountType(option.value)}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          discountType === option.value
                            ? 'border-rose-300 bg-rose-500/10 text-rose-700'
                            : 'border-white/40 bg-white/40 text-foreground/80 hover:bg-white/60'
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          {option.label}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {option.helper}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {discountType !== 'GIFT' ? (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        {discountType === 'PERCENT'
                          ? 'Mức giảm thêm (%)'
                          : 'Mức giảm thêm theo tiền'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={discountValue}
                        onChange={(event) =>
                          setDiscountValue(event.target.value)
                        }
                        placeholder={
                          discountType === 'PERCENT'
                            ? 'Ví dụ: 25'
                            : 'Ví dụ: 120000'
                        }
                        className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Tên quà tặng/phụ kiện
                        </label>
                        <input
                          type="text"
                          value={giftName}
                          onChange={(event) => setGiftName(event.target.value)}
                          placeholder="Ví dụ: Túi giặt lụa cao cấp"
                          className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Mô tả quà tặng
                        </label>
                        <textarea
                          rows={3}
                          value={giftDescription}
                          onChange={(event) =>
                            setGiftDescription(event.target.value)
                          }
                          placeholder="Mô tả điều kiện hoặc nội dung quà tặng"
                          className="w-full resize-none rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">
                        Độ ưu tiên hiển thị
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={priorityOrder}
                        onChange={(event) =>
                          setPriorityOrder(event.target.value)
                        }
                        className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                    <label className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/40 px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(event) => setIsActive(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      Bật chiến dịch
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Link ảnh đại diện
                  </label>
                  <input
                    type="text"
                    value={image}
                    onChange={(event) => setImage(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      handleImageFileChange(
                        event.target.files?.[0] ?? null,
                        'cover',
                      )
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="mt-2 rounded-xl border border-dashed border-violet-300/60 bg-white/30 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/50"
                  >
                    Tải ảnh đại diện lên
                  </button>
                  {image ? (
                    <div className="relative mt-3 h-28 overflow-hidden rounded-xl">
                      <Image
                        src={image}
                        alt="Ảnh đại diện"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Link ảnh banner
                  </label>
                  <input
                    type="text"
                    value={bannerImage}
                    onChange={(event) => setBannerImage(event.target.value)}
                    className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      handleImageFileChange(
                        event.target.files?.[0] ?? null,
                        'banner',
                      )
                    }
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="mt-2 rounded-xl border border-dashed border-violet-300/60 bg-white/30 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white/50"
                  >
                    Tải ảnh banner lên
                  </button>
                  {bannerImage ? (
                    <div className="relative mt-3 h-28 overflow-hidden rounded-xl">
                      <Image
                        src={bannerImage}
                        alt="Ảnh banner"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Gift className="h-4 w-4 text-rose-500" />
                  Chọn sản phẩm thuộc chiến dịch
                </div>
                <div className="grid max-h-60 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-white/20 bg-white/30 p-3 sm:grid-cols-2">
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

              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-semibold">
                  <CalendarRange className="h-4 w-4" />
                  Ghi chú nghiệp vụ
                </div>
                <p className="mt-1">
                  Giá gốc và giá khuyến mãi cơ bản vẫn nằm ở sản phẩm. Chiến
                  dịch chỉ bổ sung giảm sâu hơn hoặc tặng kèm trong khoảng thời
                  gian cấu hình.
                </p>
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
                  {saving ? 'Đang lưu...' : 'Lưu chiến dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
