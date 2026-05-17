"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import Link from "next/link";
import Image from "next/image";
import { Package, Eye, Search, Filter } from "lucide-react";
import { getOrders } from "@/lib/api/orders.api";
import { Order } from "@/types/order.types";

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "processing", label: "Đang xử lý" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "cancelled", label: "Đã hủy" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const { orders: data } = await getOrders(1, 20);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders =
    activeTab === "all"
      ? orders
      : orders.filter((o) => o.status === activeTab);

  if (loading) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Đơn hàng của tôi</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="flex gap-4">
                <div className="w-16 h-20 rounded-xl bg-white/50" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-white/50 rounded w-1/3" />
                  <div className="h-3 bg-white/40 rounded w-1/2" />
                  <div className="h-3 bg-white/30 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Đơn hàng của tôi</h1>

      {/* Status Filter Tabs */}
      <div className="glass-card p-1.5 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.value
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-300/25"
                  : "text-foreground/70 hover:text-foreground hover:bg-white/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            {activeTab === "all" ? "Bạn chưa có đơn hàng nào" : "Không có đơn hàng nào ở trạng thái này"}
          </p>
          <Link href="/products" className="btn-primary inline-block text-sm">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="glass-card overflow-hidden hover:bg-white/75 transition-all duration-300 group">
              {/* Order Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/30">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-foreground">{order.orderCode}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              {/* Order Items Preview */}
              <div className="p-6">
                <div className="space-y-3">
                  {order.items.slice(0, 2).map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-white/40">
                        <Image
                          src={item.thumbnail}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.variantColor} / {item.variantSize} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary shrink-0">
                        {formatCurrency(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-muted-foreground pl-20">
                      +{order.items.length - 2} sản phẩm khác
                    </p>
                  )}
                </div>

                {/* Order Footer */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/30">
                  <div>
                    <p className="text-xs text-muted-foreground">{order.items.length} sản phẩm</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(order.total)}</p>
                  </div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="btn-outline text-sm px-5 py-2.5 inline-flex items-center gap-2 group-hover:border-violet-400"
                  >
                    <Eye className="w-4 h-4" />
                    Chi tiết
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
