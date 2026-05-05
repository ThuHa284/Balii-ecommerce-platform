"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import Link from "next/link";
import { Package, Eye } from "lucide-react";

const mockOrders = [
  { id: "ord_001", orderCode: "BL240315001", total: 720000, status: "delivered", itemCount: 1, createdAt: "2024-03-15T10:30:00Z" },
  { id: "ord_002", orderCode: "BL240316002", total: 1380000, status: "shipping", itemCount: 2, createdAt: "2024-03-16T14:20:00Z" },
  { id: "ord_003", orderCode: "BL240317003", total: 950000, status: "pending", itemCount: 1, createdAt: "2024-03-17T09:15:00Z" },
];

export default function OrdersPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Đơn hàng của tôi</h1>
      {mockOrders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Bạn chưa có đơn hàng nào</p>
          <Link href="/products" className="btn-primary inline-block">Mua sắm ngay</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {mockOrders.map((order) => (
            <div key={order.id} className="glass-card p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{order.orderCode}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{order.itemCount} sản phẩm</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(order.total)}</p>
                </div>
                <Link href={`/orders/${order.id}`} className="btn-outline text-sm px-4 py-2 inline-flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Chi tiết
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
