"use client";

import StatsCard from "@/components/admin/stats-card";
import { BarChart3, TrendingUp } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";

const stats = {
  totalRevenue: 125600000, totalOrders: 342, totalCustomers: 1280, totalProducts: 56,
  revenueGrowth: 12.5, orderGrowth: 8.3,
};

const revenueByMonth = [
  { month: "T1", revenue: 8500000 }, { month: "T2", revenue: 9200000 }, { month: "T3", revenue: 11000000 },
  { month: "T4", revenue: 10500000 }, { month: "T5", revenue: 12800000 }, { month: "T6", revenue: 14200000 },
  { month: "T7", revenue: 13500000 }, { month: "T8", revenue: 11800000 }, { month: "T9", revenue: 10200000 },
  { month: "T10", revenue: 9800000 }, { month: "T11", revenue: 11500000 }, { month: "T12", revenue: 12600000 },
];

const maxRevenue = Math.max(...revenueByMonth.map((r) => r.revenue));

const recentOrders = [
  { id: "ord_001", orderCode: "BL240315001", customerName: "Nguyễn Văn An", total: 720000, status: "delivered", createdAt: "2024-03-15T10:30:00Z" },
  { id: "ord_002", orderCode: "BL240316002", customerName: "Trần Thị Bình", total: 1380000, status: "shipping", createdAt: "2024-03-16T14:20:00Z" },
  { id: "ord_003", orderCode: "BL240317003", customerName: "Lê Văn Cường", total: 950000, status: "confirmed", createdAt: "2024-03-17T09:15:00Z" },
  { id: "ord_004", orderCode: "BL240318004", customerName: "Phạm Thị Dung", total: 2100000, status: "pending", createdAt: "2024-03-18T16:45:00Z" },
  { id: "ord_005", orderCode: "BL240319005", customerName: "Hoàng Minh Tuấn", total: 890000, status: "processing", createdAt: "2024-03-19T08:00:00Z" },
];

export default function AdminDashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Tổng quan</h1>
        <p className="text-muted-foreground">Chào mừng trở lại, Admin! Đây là tình hình hôm nay.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Doanh thu" value={stats.totalRevenue} change={stats.revenueGrowth} icon="revenue" isCurrency />
        <StatsCard title="Đơn hàng" value={stats.totalOrders} change={stats.orderGrowth} icon="orders" />
        <StatsCard title="Khách hàng" value={stats.totalCustomers} change={5.2} icon="customers" />
        <StatsCard title="Sản phẩm" value={stats.totalProducts} icon="products" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">Doanh thu theo tháng</h2>
              <p className="text-sm text-muted-foreground">Năm 2024</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
              <TrendingUp className="w-4 h-4" />
              +{stats.revenueGrowth}%
            </div>
          </div>
          {/* Simple Bar Chart */}
          <div className="flex items-end gap-2 h-48">
            {revenueByMonth.map((item) => (
              <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-pink-500 to-rose-400 rounded-t-lg transition-all hover:from-pink-600 hover:to-rose-500 cursor-pointer relative group"
                  style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="glass-card p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Đơn hàng gần đây</h2>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.orderCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{formatCurrency(order.total)}</p>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
