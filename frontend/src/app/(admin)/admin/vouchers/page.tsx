'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Ticket,
  Percent,
  Banknote,
  Calendar,
  Hash,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  VOUCHER_STATUS_LABELS,
  VOUCHER_STATUS_COLORS,
  VOUCHER_DISCOUNT_TYPE_LABELS,
} from '@/lib/constants';
import {
  getAdminVouchers,
  createVoucher,
  deleteVoucher,
  updateVoucher,
} from '@/lib/api/vouchers.api';
import {
  Voucher,
  VoucherDiscountType,
  CreateVoucherData,
} from '@/types/voucher.types';

function getVoucherStatus(voucher: Voucher): string {
  if (!voucher.isActive) return 'inactive';
  if (new Date(voucher.endDate) < new Date()) return 'expired';
  if (voucher.usedCount >= voucher.usageLimit) return 'used_up';
  return 'active';
}

const EMPTY_FORM: CreateVoucherData = {
  code: '',
  name: '',
  description: '',
  discountType: VoucherDiscountType.PERCENT,
  discountValue: 0,
  minOrderValue: 0,
  maxDiscount: null,
  usageLimit: 100,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  isActive: true,
};

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateVoucherData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadVouchers();
  }, []);

  async function loadVouchers() {
    setLoading(true);
    try {
      const data = await getAdminVouchers();
      setVouchers(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingVoucher(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(voucher: Voucher) {
    setEditingVoucher(voucher);
    setForm({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minOrderValue: voucher.minOrderValue,
      maxDiscount: voucher.maxDiscount,
      usageLimit: voucher.usageLimit,
      startDate: voucher.startDate.split('T')[0],
      endDate: voucher.endDate.split('T')[0],
      isActive: voucher.isActive,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingVoucher) {
        const updatedVoucher = await updateVoucher(editingVoucher.id, form);
        setVouchers((prev) =>
          prev.map((v) => (v.id === editingVoucher.id ? updatedVoucher : v)),
        );
      } else {
        const newVoucher = await createVoucher(form);
        setVouchers((prev) => [newVoucher, ...prev]);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteVoucher(deleteId);
    setVouchers((prev) => prev.filter((v) => v.id !== deleteId));
    setDeleteId(null);
  }

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'BL';
    for (let i = 0; i < 6; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    setForm((prev) => ({ ...prev, code }));
  }

  const filtered = vouchers.filter(
    (v) =>
      v.code.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
            Quản lý Voucher
          </h1>
          <p className="text-muted-foreground">{vouchers.length} voucher</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Thêm voucher
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
            placeholder="Tìm theo mã hoặc tên voucher..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card p-8 animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/40 rounded" />
          ))}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/30">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Mã
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Tên voucher
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Giảm giá
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Đã dùng
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Trạng thái
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">
                    Hết hạn
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((voucher) => {
                  const status = getVoucherStatus(voucher);
                  return (
                    <tr
                      key={voucher.id}
                      className="border-b border-white/20 hover:bg-white/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono bg-violet-50 text-violet-600 px-2.5 py-1 rounded-lg border border-violet-200">
                          {voucher.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-foreground">
                          {voucher.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {voucher.description}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          {voucher.discountType ===
                          VoucherDiscountType.PERCENT ? (
                            <Percent className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Banknote className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span className="text-sm font-semibold text-primary">
                            {voucher.discountType ===
                            VoucherDiscountType.PERCENT
                              ? `${voucher.discountValue}%`
                              : formatCurrency(voucher.discountValue)}
                          </span>
                        </div>
                        {voucher.minOrderValue > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Đơn tối thiểu{' '}
                            {formatCurrency(voucher.minOrderValue)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {voucher.usedCount}/{voucher.usageLimit}
                        </div>
                        <div className="w-20 h-1.5 bg-white/50 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                            style={{
                              width: `${Math.min(100, (voucher.usedCount / voucher.usageLimit) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${VOUCHER_STATUS_COLORS[status]}`}
                        >
                          {VOUCHER_STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(voucher.endDate)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(voucher)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(voucher.id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <Ticket className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Không tìm thấy voucher nào
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="glass-card p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-foreground">
                {editingVoucher ? 'Sửa voucher' : 'Thêm voucher mới'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-white/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Mã voucher
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) =>
                        setForm({ ...form, code: e.target.value.toUpperCase() })
                      }
                      placeholder="VD: WELCOME20"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm font-mono uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateCode}
                    className="btn-outline text-xs px-4"
                  >
                    Tạo tự động
                  </button>
                </div>
              </div>

              {/* Name + Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Tên voucher
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="VD: Chào mừng thành viên mới"
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Mô tả
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="VD: Giảm 20% cho đơn đầu tiên"
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                  />
                </div>
              </div>

              {/* Discount Type + Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Loại giảm giá
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountType: e.target.value as VoucherDiscountType,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm appearance-none"
                  >
                    <option value={VoucherDiscountType.PERCENT}>Giảm %</option>
                    <option value={VoucherDiscountType.FIXED}>
                      Giảm cố định (VNĐ)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Giá trị{' '}
                    {form.discountType === VoucherDiscountType.PERCENT
                      ? '(%)'
                      : '(VNĐ)'}
                  </label>
                  <input
                    type="number"
                    value={form.discountValue || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountValue: Number(e.target.value),
                      })
                    }
                    placeholder={
                      form.discountType === VoucherDiscountType.PERCENT
                        ? 'VD: 20'
                        : 'VD: 50000'
                    }
                    required
                    min={1}
                    max={
                      form.discountType === VoucherDiscountType.PERCENT
                        ? 100
                        : undefined
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Giảm tối đa (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={form.maxDiscount || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maxDiscount: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    placeholder="Để trống nếu không giới hạn"
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                  />
                </div>
              </div>

              {/* Min Order + Usage Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Đơn tối thiểu (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={form.minOrderValue || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minOrderValue: Number(e.target.value),
                      })
                    }
                    placeholder="VD: 500000"
                    min={0}
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Giới hạn lượt sử dụng
                  </label>
                  <input
                    type="number"
                    value={form.usageLimit || ''}
                    onChange={(e) =>
                      setForm({ ...form, usageLimit: Number(e.target.value) })
                    }
                    placeholder="VD: 100"
                    required
                    min={1}
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Ngày bắt đầu
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={
                        typeof form.startDate === 'string'
                          ? form.startDate.split('T')[0]
                          : form.startDate
                      }
                      onChange={(e) =>
                        setForm({ ...form, startDate: e.target.value })
                      }
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Ngày kết thúc
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={
                        typeof form.endDate === 'string'
                          ? form.endDate.split('T')[0]
                          : form.endDate
                      }
                      onChange={(e) =>
                        setForm({ ...form, endDate: e.target.value })
                      }
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/40 border border-white/50">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Kích hoạt voucher
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Voucher sẽ hiển thị cho khách hàng khi được bật
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="transition-colors"
                >
                  {form.isActive ? (
                    <ToggleRight className="w-10 h-10 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-muted-foreground/40" />
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-white/50 text-foreground font-medium hover:bg-white/40 transition-all text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary text-sm py-3 disabled:opacity-50"
                >
                  {saving
                    ? 'Đang lưu...'
                    : editingVoucher
                      ? 'Cập nhật voucher'
                      : 'Tạo voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="glass-card p-8 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                Xác nhận xóa
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Bạn có chắc chắn muốn xóa voucher này? Hành động này không thể
                hoàn tác.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border-2 border-white/50 text-foreground font-medium hover:bg-white/40 transition-all"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
                >
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
