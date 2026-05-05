"use client";

import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { Search, Eye } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const mockOrders = [
  { id: "ord_001", orderCode: "BL240315001", customerName: "Nguyễn Văn An", email: "nguyen@example.com", total: 720000, status: "delivered", createdAt: "2024-03-15T10:30:00Z" },
  { id: "ord_002", orderCode: "BL240316002", customerName: "Trần Thị Bình", email: "tran@example.com", total: 1380000, status: "shipping", createdAt: "2024-03-16T14:20:00Z" },
  { id: "ord_003", orderCode: "BL240317003", customerName: "Lê Văn Cường", email: "le@example.com", total: 950000, status: "confirmed", createdAt: "2024-03-17T09:15:00Z" },
  { id: "ord_004", orderCode: "BL240318004", customerName: "Phạm Thị Dung", email: "pham@example.com", total: 2100000, status: "pending", createdAt: "2024-03-18T16:45:00Z" },
  { id: "ord_005", orderCode: "BL240319005", customerName: "Hoàng Minh Tuấn", email: "hoang@example.com", total: 890000, status: "processing", createdAt: "2024-03-19T08:00:00Z" },
];

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const filtered = mockOrders.filter((o) => o.orderCode.includes(search) || o.customerName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Quản lý đơn hàng</h1>
      <p className="text-muted-foreground mb-8">{mockOrders.length} đơn hàng</p>
      <div className="glass-card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã đơn hoặc tên khách..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm" />
        </div>
      </div>
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
            {filtered.map((order) => (
              <tr key={order.id} className="border-b border-white/20 hover:bg-white/30 transition-colors">
                <td className="px-6 py-4 text-sm font-medium">{order.orderCode}</td>
                <td className="px-6 py-4"><p className="text-sm">{order.customerName}</p><p className="text-xs text-muted-foreground">{order.email}</p></td>
                <td className="px-6 py-4 text-sm font-bold text-primary">{formatCurrency(order.total)}</td>
                <td className="px-6 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span></td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                <td className="px-6 py-4 text-right"><button className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Eye className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
