'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Receipt, Search, X } from 'lucide-react';
import { AdminRefund, getAdminRefunds } from '@/lib/api/admin.api';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  REFUND_STATUS_COLORS,
  REFUND_STATUS_LABELS,
} from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function RefundDetailModal({
  refund,
  onClose,
}: {
  refund: AdminRefund | null;
  onClose: () => void;
}) {
  if (!refund) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-slate-50 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/30 bg-white/90 px-6 py-4 backdrop-blur">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              Chi tiết refund
            </h2>
            <p className="text-sm text-muted-foreground">{refund.id}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="glass-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Refund status
              </p>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  REFUND_STATUS_COLORS[refund.refundStatus] ??
                  'bg-slate-100 text-slate-700'
                }`}
              >
                {REFUND_STATUS_LABELS[refund.refundStatus] ??
                  refund.refundStatus}
              </span>
            </div>
            <div className="glass-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Payment status
              </p>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  PAYMENT_STATUS_COLORS[refund.paymentStatus] ??
                  'bg-slate-100 text-slate-700'
                }`}
              >
                {PAYMENT_STATUS_LABELS[refund.paymentStatus] ??
                  refund.paymentStatus}
              </span>
            </div>
            <div className="glass-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Số lần retry
              </p>
              <p className="text-lg font-bold text-foreground">
                {refund.retryCount}
              </p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">
              Thông tin chính
            </h3>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Payment ID</p>
                <p className="font-medium text-foreground">
                  {refund.paymentId}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Order ID</p>
                <p className="font-medium text-foreground">{refund.orderId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User ID</p>
                <p className="font-medium text-foreground">{refund.userId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider</p>
                <p className="font-medium text-foreground">
                  {PAYMENT_METHOD_LABELS[refund.provider] ?? refund.provider}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Số tiền thanh toán</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(refund.paymentAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Số tiền hoàn</p>
                <p className="font-medium text-primary">
                  {formatCurrency(refund.refundAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Gateway status</p>
                <p className="font-medium text-foreground">
                  {refund.gatewayStatus ?? 'Chưa có'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Workflow resolution</p>
                <p className="font-medium text-foreground">
                  {refund.workflowResolution ?? 'Chưa có'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Provider refund ID</p>
                <p className="font-medium text-foreground">
                  {refund.providerRefundId ?? 'Chưa có'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tạo lúc</p>
                <p className="font-medium text-foreground">
                  {formatDateTime(refund.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Hoàn lúc</p>
                <p className="font-medium text-foreground">
                  {refund.refundedAt
                    ? formatDateTime(refund.refundedAt)
                    : 'Chưa hoàn'}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">
              Lý do
            </h3>
            <p className="text-sm text-muted-foreground">
              {refund.reason ?? 'Không có'}
            </p>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">
              Lỗi / từ chối
            </h3>
            <p className="text-sm text-muted-foreground">
              {refund.failureReason ?? 'Không có'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedRefundStatus, setSelectedRefundStatus] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [detailRefund, setDetailRefund] = useState<AdminRefund | null>(null);

  useEffect(() => {
    async function loadRefunds() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminRefunds();
        setRefunds(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách refund.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadRefunds();
  }, []);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((refund) => {
      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        keyword.length === 0 ||
        refund.id.toLowerCase().includes(keyword) ||
        refund.paymentId.toLowerCase().includes(keyword) ||
        refund.orderId.toLowerCase().includes(keyword) ||
        (refund.providerRefundId ?? '').toLowerCase().includes(keyword);

      const matchesRefundStatus = selectedRefundStatus
        ? refund.refundStatus === selectedRefundStatus
        : true;

      const matchesProvider = selectedProvider
        ? refund.provider === selectedProvider
        : true;

      return matchesSearch && matchesRefundStatus && matchesProvider;
    });
  }, [refunds, search, selectedRefundStatus, selectedProvider]);

  return (
    <div>
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
        Kiểm tra hoàn tiền
      </h1>
      <p className="mb-8 text-muted-foreground">
        {loading
          ? 'Đang tải refund...'
          : `${filteredRefunds.length} refund trong hệ thống`}
      </p>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="mb-6 glass-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo refund ID, payment ID, order ID..."
              className="w-full rounded-xl border border-white/50 bg-white/60 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <select
            value={selectedRefundStatus}
            onChange={(e) => setSelectedRefundStatus(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả refund status</option>
            <option value="pending">Chờ xử lý</option>
            <option value="refunded">Đã hoàn tiền</option>
            <option value="failed">Thất bại</option>
          </select>

          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả cổng thanh toán</option>
            <option value="vnpay">VNPay</option>
            <option value="momo">MoMo</option>
            <option value="mock_online">Mock online</option>
            <option value="bank_transfer">Chuyển khoản</option>
            <option value="cod">COD</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          Đang tải danh sách refund...
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Receipt className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
          <p className="text-muted-foreground">Không có refund phù hợp.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Refund
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Giao dịch
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Số tiền
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Gateway
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Tạo lúc
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map((refund) => (
                <tr
                  key={refund.id}
                  className="border-b border-white/20 transition-colors hover:bg-white/30"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">
                      {refund.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Order: {refund.orderId}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-foreground">
                      {refund.paymentId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[refund.provider] ??
                        refund.provider}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(refund.refundAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / {formatCurrency(refund.paymentAmount)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          REFUND_STATUS_COLORS[refund.refundStatus] ??
                          'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {REFUND_STATUS_LABELS[refund.refundStatus] ??
                          refund.refundStatus}
                      </span>
                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            PAYMENT_STATUS_COLORS[refund.paymentStatus] ??
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[refund.paymentStatus] ??
                            refund.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    <p>{refund.gatewayStatus ?? 'Chưa có'}</p>
                    <p className="text-xs">{refund.providerRefundId ?? '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDateTime(refund.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDetailRefund(refund)}
                        className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                        title="Xem chi tiết refund"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <RefundDetailModal
        refund={detailRefund}
        onClose={() => setDetailRefund(null)}
      />
    </div>
  );
}
