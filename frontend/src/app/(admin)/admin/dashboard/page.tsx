'use client';

import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import StatsCard from '@/components/admin/stats-card';
import {
  getAdminDashboardStats,
  type AdminDashboardStats,
} from '@/lib/api/admin.api';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getAdminDashboardStats();
        setStats(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu tổng quan.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const maxRevenue = useMemo(() => {
    if (!stats?.revenueByMonth.length) return 1;
    return Math.max(...stats.revenueByMonth.map((item) => item.revenue), 1);
  }, [stats]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
          Tổng quan
        </h1>
        <p className="text-muted-foreground">
          Theo dõi nhanh doanh thu, đơn hàng và tình trạng kinh doanh hiện tại.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Doanh thu"
          value={stats?.totalRevenue ?? 0}
          change={stats?.revenueGrowth}
          icon="revenue"
          isCurrency
        />
        <StatsCard
          title="Đơn hàng"
          value={stats?.totalOrders ?? 0}
          change={stats?.orderGrowth}
          icon="orders"
        />
        <StatsCard
          title="Khách hàng"
          value={stats?.totalCustomers ?? 0}
          icon="customers"
        />
        <StatsCard
          title="Sản phẩm"
          value={stats?.totalProducts ?? 0}
          icon="products"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Doanh thu 12 tháng gần nhất
              </h2>
              <p className="text-sm text-muted-foreground">
                Dữ liệu thực từ hệ thống đơn hàng
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              {stats
                ? `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%`
                : '--'}
            </div>
          </div>

          <div className="flex h-48 items-end gap-2">
            {(
              stats?.revenueByMonth ??
              Array.from({ length: 12 }, (_, index) => ({
                month: `T${index + 1}`,
                revenue: 0,
              }))
            ).map((item) => (
              <div
                key={item.month}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className="group relative w-full cursor-pointer rounded-t-lg bg-violet-500 transition-all hover:bg-violet-600"
                  style={{ height: `${(item.revenue / maxRevenue) * 100}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {formatCurrency(item.revenue)}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
            Đơn hàng gần đây
          </h2>
          <div className="space-y-3">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl bg-white/40 p-3"
                >
                  <div className="mb-2 h-4 rounded bg-slate-200/70" />
                  <div className="h-3 w-2/3 rounded bg-slate-200/60" />
                </div>
              ))}

            {!isLoading && (stats?.recentOrders?.length ?? 0) === 0 && (
              <div className="rounded-xl bg-white/40 p-4 text-sm text-muted-foreground">
                Chưa có đơn hàng nào trong hệ thống.
              </div>
            )}

            {stats?.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl bg-white/40 p-3 transition-colors hover:bg-white/60"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.orderCode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(order.total)}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      ORDER_STATUS_COLORS[order.status] ||
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
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
