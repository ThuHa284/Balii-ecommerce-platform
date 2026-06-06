"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Eye, Package, Printer, Search, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import InvoiceModal from "@/components/admin/invoice-modal";
import { AdminOrder, getAdminOrders } from "@/lib/api/admin.api";

function OrderDetailModal({
  order,
  onClose,
}: {
  order: AdminOrder | null;
  onClose: () => void;
}) {
  if (!order) return null;

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
              Chi tiết đơn {order.orderCode}
            </h2>
            <p className="text-sm text-muted-foreground">
              {order.customerName} · {formatDateTime(order.createdAt)}
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
            <div className="glass-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Trạng thái
              </p>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
              >
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="glass-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Thanh toán
              </p>
              <p className="text-sm font-semibold text-foreground">
                {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.paymentStatus}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Tổng tiền
              </p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(order.total)}
              </p>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="mb-3 font-heading text-lg font-semibold text-foreground">
              Khách hàng
            </h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{order.customerName}</p>
              <p className="text-muted-foreground">
                {order.customerEmail || "Chưa có email"}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.phone}
              </p>
              <p className="text-muted-foreground">
                {order.shippingAddress.street}, {order.shippingAddress.ward},{" "}
                {order.shippingAddress.district}, {order.shippingAddress.province}
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
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-primary">
                      {formatCurrency(item.totalPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
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
        </div>
      </div>
    </>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedValueRange, setSelectedValueRange] = useState("");
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    async function loadOrders() {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminOrders();
        setOrders(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách đơn hàng.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.orderCode.toLowerCase().includes(search.toLowerCase()) ||
        order.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (order.customerEmail || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = selectedStatus ? order.status === selectedStatus : true;

      let matchesValue = true;
      if (selectedValueRange === "under1m") matchesValue = order.total < 1000000;
      else if (selectedValueRange === "1mto2m") {
        matchesValue = order.total >= 1000000 && order.total <= 2000000;
      } else if (selectedValueRange === "over2m") {
        matchesValue = order.total > 2000000;
      }

      return matchesSearch && matchesStatus && matchesValue;
    });
  }, [orders, search, selectedStatus, selectedValueRange]);

  function openInvoice(order: AdminOrder) {
    setActiveOrder(order);
    setIsInvoiceOpen(true);
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
        Quản lý đơn hàng
      </h1>
      <p className="text-muted-foreground mb-8">
        {loading ? "Đang tải đơn hàng..." : `${filteredOrders.length} đơn hàng (khớp bộ lọc)`}
      </p>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn, tên khách hoặc email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="processing">Đang xử lý</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="shipping">Đang giao hàng</option>
            <option value="delivered">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
            <option value="refunded">Đã hoàn tiền</option>
          </select>

          <select
            value={selectedValueRange}
            onChange={(e) => setSelectedValueRange(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 cursor-pointer"
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
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Mã đơn</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Khách hàng</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Tổng tiền</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Trạng thái</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Ngày đặt</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-muted-foreground">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-white/20 hover:bg-white/30 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium">{order.orderCode}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customerEmail || "Chưa có email"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-primary">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openInvoice(order)}
                        className="p-2 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors"
                        title="In hóa đơn đóng gói"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDetailOrder(order)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Xem chi tiết đơn"
                      >
                        <Eye className="w-4 h-4" />
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
      />
    </div>
  );
}
