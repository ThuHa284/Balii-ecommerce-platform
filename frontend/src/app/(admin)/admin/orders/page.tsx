'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Eye, Package, Printer, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import InvoiceModal from '@/components/admin/invoice-modal';
import {
  AdminOrder,
  getAdminOrders,
  getAdminOrderReturnRequests,
  reviewAdminReturnRequest,
  updateAdminOrderStatus,
} from '@/lib/api/admin.api';
import { formatAddressLine } from '@/lib/address-utils';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ReturnRequest } from '@/types/order.types';

const STATUS_ACTIONS = [
  'confirmed',
  'processing',
  'shipping',
  'delivered',
] as const;

function getOrderItemCampaignLabel(item: AdminOrder['items'][number]) {
  if (item.campaignBadgeText) return item.campaignBadgeText;
  if (item.campaignDiscountType === 'PERCENT') {
    return `Giảm thêm ${item.campaignDiscountValue ?? 0}%`;
  }
  if (item.campaignDiscountType === 'AMOUNT') {
    return `Giảm thêm ${formatCurrency(item.campaignDiscountValue ?? 0)}`;
  }
  if (item.campaignDiscountType === 'GIFT') {
    return item.campaignName || 'Tặng quà chiến dịch';
  }
  return item.campaignName || '';
}

function OrderDetailModal({
  order,
  onClose,
  onStatusUpdated,
}: {
  order: AdminOrder | null;
  onClose: () => void;
  onStatusUpdated: (order: AdminOrder) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);

  useEffect(() => {
    let isActive = true;

    if (!order) {
      queueMicrotask(() => {
        if (isActive) {
          setReturnRequests([]);
        }
      });

      return () => {
        isActive = false;
      };
    }

    void getAdminOrderReturnRequests(order.id)
      .then((requests) => {
        if (isActive) {
          setReturnRequests(requests);
        }
      })
      .catch(() => {
        if (isActive) {
          setReturnRequests([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [order]);

  if (!order) return null;
  const currentOrder = order;

  async function handleUpdateStatus(
    status: (typeof STATUS_ACTIONS)[number] | 'cancelled',
  ) {
    try {
      setIsUpdating(true);
      const updated = await updateAdminOrderStatus(currentOrder.id, status);
      onStatusUpdated(updated);
      toast.success('Đã cập nhật trạng thái đơn hàng.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật trạng thái đơn hàng.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleReviewReturnRequest(
    returnRequestId: string,
    status: 'approved' | 'rejected',
  ) {
    try {
      const updated = await reviewAdminReturnRequest(returnRequestId, {
        status,
      });
      setReturnRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success('Đã cập nhật yêu cầu trả hàng.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật yêu cầu trả hàng.',
      );
    }
  }

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
              Chi tiết đơn {currentOrder.orderCode}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentOrder.customerName} ·{' '}
              {formatDateTime(currentOrder.createdAt)}
            </p>
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
            <div className="glass-card p-4 md:col-span-2">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Trạng thái giao hàng
              </p>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
              >
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {STATUS_ACTIONS.map((status) => (
                  <button
                    key={status}
                    onClick={() => void handleUpdateStatus(status)}
                    disabled={isUpdating || String(order.status) === status}
                    className="rounded-lg border border-white/50 bg-white/60 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Thanh toán
              </p>
              <p className="text-sm font-semibold text-foreground">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] ||
                  order.paymentMethod}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.paymentStatus}
              </p>
              <p className="mt-3 text-lg font-bold text-primary">
                {formatCurrency(order.total)}
              </p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">
              Khách hàng
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                {order.customerName}
              </p>
              <p className="text-muted-foreground">
                {order.customerEmail || 'Chưa có email'}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.phone}
              </p>
              <p className="text-muted-foreground">
                {formatAddressLine(order.shippingAddress)}
              </p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">
              Sản phẩm
            </h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl bg-white/40 p-3"
                >
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.variantColor} / {item.variantSize}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                    {item.campaignName ? (
                      <p className="mt-1 inline-flex rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                        {getOrderItemCampaignLabel(item)}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)} x {item.quantity}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">
              Tổng kết đơn hàng
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giảm giá</span>
                <span>{formatCurrency(order.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span>{formatCurrency(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t border-white/30 pt-3">
                <span className="font-semibold text-foreground">Tổng cộng</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </div>
          </div>

          {order.note ? (
            <div className="glass-card p-5">
              <h3 className="mb-2 font-heading text-lg font-semibold text-foreground">
                Ghi chú
              </h3>
              <p className="text-sm text-muted-foreground">{order.note}</p>
            </div>
          ) : null}

          {returnRequests.length > 0 ? (
            <div className="glass-card p-5">
              <h3 className="mb-4 font-heading text-lg font-semibold text-foreground">
                Yêu cầu trả hàng
              </h3>
              <div className="space-y-4">
                {returnRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-white/50 bg-white/40 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {formatDateTime(request.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.reason}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {request.status}
                      </span>
                    </div>

                    {request.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {request.imageUrls.map((imageUrl, index) => (
                          <div
                            key={`${request.id}-${index}`}
                            className="relative aspect-square overflow-hidden rounded-xl bg-slate-100"
                          >
                            <Image
                              src={imageUrl}
                              alt={`Ảnh minh chứng ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {request.status === 'pending' ? (
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void handleReviewReturnRequest(
                              request.id,
                              'approved',
                            )
                          }
                          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white"
                        >
                          Duyệt trả hàng
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleReviewReturnRequest(
                              request.id,
                              'rejected',
                            )
                          }
                          className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : null}

                    {request.adminNote ? (
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                        Ghi chú admin: {request.adminNote}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedValueRange, setSelectedValueRange] = useState('');
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);
        setOrders(await getAdminOrders());
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách đơn hàng.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const keyword = search.toLowerCase();
      const matchesSearch =
        order.orderCode.toLowerCase().includes(keyword) ||
        order.customerName.toLowerCase().includes(keyword) ||
        (order.customerEmail || '').toLowerCase().includes(keyword);

      const matchesStatus = selectedStatus
        ? String(order.status) === selectedStatus
        : true;

      let matchesValue = true;
      if (selectedValueRange === 'under1m')
        matchesValue = order.total < 1000000;
      else if (selectedValueRange === '1mto2m') {
        matchesValue = order.total >= 1000000 && order.total <= 2000000;
      } else if (selectedValueRange === 'over2m') {
        matchesValue = order.total > 2000000;
      }

      return matchesSearch && matchesStatus && matchesValue;
    });
  }, [orders, search, selectedStatus, selectedValueRange]);

  function replaceOrder(updatedOrder: AdminOrder) {
    setOrders((current) =>
      current.map((item) =>
        item.id === updatedOrder.id ? updatedOrder : item,
      ),
    );
    setDetailOrder(updatedOrder);
    if (activeOrder?.id === updatedOrder.id) {
      setActiveOrder(updatedOrder);
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
        Quản lý đơn hàng
      </h1>
      <p className="mb-8 text-muted-foreground">
        {loading
          ? 'Đang tải đơn hàng...'
          : `${filteredOrders.length} đơn hàng khớp bộ lọc`}
      </p>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="glass-card mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn, tên khách hoặc email..."
              className="w-full rounded-xl border border-white/50 bg-white/60 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="shipping">Đang giao hàng</option>
            <option value="delivered">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <select
            value={selectedValueRange}
            onChange={(e) => setSelectedValueRange(e.target.value)}
            className="cursor-pointer rounded-xl border border-white/50 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            <option value="">Tất cả giá trị đơn</option>
            <option value="under1m">Dưới 1.000.000đ</option>
            <option value="1mto2m">1.000.000đ - 2.000.000đ</option>
            <option value="over2m">Trên 2.000.000đ</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          Đang tải danh sách đơn hàng...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
          <p className="text-muted-foreground">Không có đơn hàng phù hợp.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/30">
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Mã đơn
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Khách hàng
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Tổng tiền
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">
                  Ngày đặt
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-muted-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-white/20 transition-colors hover:bg-white/30"
                >
                  <td className="px-6 py-4 text-sm font-medium">
                    {order.orderCode}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customerEmail || 'Chưa có email'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-primary">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
                    >
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setActiveOrder(order);
                          setIsInvoiceOpen(true);
                        }}
                        className="rounded-lg p-2 text-violet-600 transition-colors hover:bg-violet-50"
                        title="In hóa đơn đóng gói"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDetailOrder(order)}
                        className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                        title="Xem chi tiết đơn"
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

      <div id="printable-invoice-wrapper">
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          order={activeOrder}
        />
      </div>

      <OrderDetailModal
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onStatusUpdated={replaceOrder}
      />
    </div>
  );
}
