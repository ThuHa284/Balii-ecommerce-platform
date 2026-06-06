"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { getOrderById } from "@/lib/api/orders.api";
import { Order, OrderStatus } from "@/types/order.types";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Package, CheckCircle2, Truck, Clock,
  XCircle, RotateCcw, MapPin, CreditCard, ClipboardList,
  ShieldCheck, Box
} from "lucide-react";

const TIMELINE_STEPS = [
  { status: OrderStatus.PENDING, label: "Đặt hàng", icon: ClipboardList },
  { status: OrderStatus.CONFIRMED, label: "Xác nhận", icon: ShieldCheck },
  { status: OrderStatus.PROCESSING, label: "Đang xử lý", icon: Box },
  { status: OrderStatus.SHIPPING, label: "Đang giao", icon: Truck },
  { status: OrderStatus.DELIVERED, label: "Đã giao", icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status);
  if (status === "cancelled" || status === "refunded") return -1;
  return idx;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    setLoading(true);
    try {
      const data = await getOrderById(id);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <div className="h-8 bg-white/50 rounded w-48 mb-6 animate-pulse" />
        <div className="glass-card p-8 animate-pulse space-y-6">
          <div className="h-6 bg-white/50 rounded w-1/3" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-16 h-20 rounded-xl bg-white/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/50 rounded w-1/2" />
                  <div className="h-3 bg-white/40 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="glass-card p-12 text-center">
        <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Không tìm thấy đơn hàng</p>
        <Link href="/account/orders" className="btn-primary inline-block text-sm">Quay lại danh sách</Link>
      </div>
    );
  }

  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "refunded";

  return (
    <div>
      {/* Back + Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/account/orders"
          className="p-2 rounded-xl hover:bg-white/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground/70" />
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Đơn hàng {order.orderCode}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Đặt ngày {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {/* Timeline */}
      {!isCancelled && (
        <div className="glass-card p-6 mb-6">
          <h2 className="font-heading text-sm font-semibold text-foreground mb-5">Trạng thái đơn hàng</h2>
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/50 z-0" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 z-0 transition-all duration-700"
              style={{
                width: currentStep >= 0
                  ? `calc(${(currentStep / (TIMELINE_STEPS.length - 1)) * 100}% - 40px)`
                  : "0%",
              }}
            />

            {TIMELINE_STEPS.map((step, i) => {
              const isCompleted = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={step.status} className="relative z-10 flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-300/30"
                        : "bg-white/70 text-muted-foreground/50 border-2 border-white/60"
                    } ${isCurrent ? "ring-4 ring-violet-200 scale-110" : ""}`}
                  >
                    <step.icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[11px] font-medium text-center whitespace-nowrap ${
                    isCompleted ? "text-primary" : "text-muted-foreground/50"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled/Refunded Banner */}
      {isCancelled && (
        <div className={`glass-card p-5 mb-6 border-l-4 ${
          order.status === "cancelled" ? "border-l-red-400" : "border-l-gray-400"
        }`}>
          <div className="flex items-center gap-3">
            {order.status === "cancelled" ? (
              <XCircle className="w-6 h-6 text-red-500" />
            ) : (
              <RotateCcw className="w-6 h-6 text-gray-500" />
            )}
            <div>
              <p className="font-medium text-foreground">
                {order.status === "cancelled" ? "Đơn hàng đã bị hủy" : "Đơn hàng đã được hoàn tiền"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cập nhật lần cuối: {formatDateTime(order.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products — 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h2 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Sản phẩm ({order.items.length})
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/40 transition-colors">
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-white/50">
                    <Image
                      src={item.thumbnail}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      Màu: {item.variantColor} | Size: {item.variantSize}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(item.price)}</p>
                    <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                    <p className="text-sm font-bold text-foreground mt-1">{formatCurrency(item.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {(order.status === "pending" || order.status === "shipping") && (
            <div className="glass-card p-6">
              <div className="flex gap-3">
                {order.status === "pending" && (
                  <button className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all text-sm flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Hủy đơn hàng
                  </button>
                )}
                {order.status === "shipping" && (
                  <button className="flex-1 btn-primary text-sm py-3 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã nhận hàng
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Info */}
        <div className="space-y-6">
          {/* Shipping Address */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Địa chỉ giao hàng
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">{order.shippingAddress.fullName}</p>
              <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
              <p className="text-muted-foreground">
                {order.shippingAddress.street}, {order.shippingAddress.ward},{" "}
                {order.shippingAddress.district}, {order.shippingAddress.province}
              </p>
            </div>
          </div>

          {/* Payment */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Thanh toán
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phương thức</span>
                <span className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {order.paymentStatus === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                </span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-sm font-semibold text-foreground mb-4">Tổng kết</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="text-foreground">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giảm giá</span>
                  <span className="text-emerald-600">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span className="text-foreground">
                  {order.shippingFee === 0 ? (
                    <span className="text-emerald-600">Miễn phí</span>
                  ) : (
                    formatCurrency(order.shippingFee)
                  )}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-white/30">
                <span className="font-semibold text-foreground">Tổng cộng</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          {order.note && (
            <div className="glass-card p-6">
              <h2 className="font-heading text-sm font-semibold text-foreground mb-3">Ghi chú</h2>
              <p className="text-sm text-muted-foreground italic">&ldquo;{order.note}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
