'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import StatsCard from '@/components/admin/stats-card';
import {
  getAdminAnalyticsStats,
  getAdminDashboardStats,
  type AdminAnalyticsStats,
  type AdminDashboardStats,
} from '@/lib/api/admin.api';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

function formatCompactCurrency(amount: number) {
  if (amount <= 0) {
    return '0 ₫';
  }

  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(amount % 1_000_000_000 === 0 ? 0 : 1)} tỷ`;
  }

  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}tr`;
  }

  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}k`;
  }

  return formatCurrency(amount);
}

export default function AdminDashboardPage() {
  const [dashboardStats, setDashboardStats] =
    useState<AdminDashboardStats | null>(null);
  const [analyticsStats, setAnalyticsStats] =
    useState<AdminAnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        setError(null);
        const [dashboardResponse, analyticsResponse] = await Promise.all([
          getAdminDashboardStats(),
          getAdminAnalyticsStats(),
        ]);
        setDashboardStats(dashboardResponse);
        setAnalyticsStats(analyticsResponse);
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

  const revenueByMonth = useMemo(
    () => dashboardStats?.revenueByMonth ?? [],
    [dashboardStats?.revenueByMonth],
  );
  const recentOrders = dashboardStats?.recentOrders ?? [];
  const topProducts = analyticsStats?.topProducts ?? [];
  const orderStatusBreakdown = useMemo(
    () => analyticsStats?.orderStatusBreakdown ?? [],
    [analyticsStats?.orderStatusBreakdown],
  );
  const maxRevenue = useMemo(() => {
    if (!revenueByMonth.length) return 1;
    return Math.max(...revenueByMonth.map((item) => item.revenue), 1);
  }, [revenueByMonth]);
  const chartTicks = useMemo(
    () =>
      [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
        ratio,
        value: Math.round(maxRevenue * ratio),
      })),
    [maxRevenue],
  );

  const totalStatusOrders = useMemo(
    () => orderStatusBreakdown.reduce((sum, item) => sum + item.count, 0),
    [orderStatusBreakdown],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
          Tổng quan
        </h1>
        <p className="text-muted-foreground">
          Gom doanh thu, vận hành đơn hàng và phân tích bán hàng vào cùng một
          màn hình.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Doanh thu"
          value={dashboardStats?.totalRevenue ?? 0}
          change={dashboardStats?.revenueGrowth}
          icon="revenue"
          isCurrency
        />
        <StatsCard
          title="Đơn hàng"
          value={dashboardStats?.totalOrders ?? 0}
          change={dashboardStats?.orderGrowth}
          icon="orders"
        />
        <StatsCard
          title="Khách hàng"
          value={dashboardStats?.totalCustomers ?? 0}
          icon="customers"
        />
        <StatsCard
          title="Sản phẩm"
          value={dashboardStats?.totalProducts ?? 0}
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
              {dashboardStats
                ? `${dashboardStats.revenueGrowth > 0 ? '+' : ''}${dashboardStats.revenueGrowth}%`
                : '--'}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex h-56 w-16 flex-col justify-between pb-5 pr-2 text-right text-[10px] font-medium text-muted-foreground">
              {chartTicks.map((tick) => (
                <span key={tick.ratio}>
                  {formatCompactCurrency(tick.value)}
                </span>
              ))}
            </div>

            <div className="relative h-56 flex-1">
              {chartTicks.map((tick) => (
                <div
                  key={tick.ratio}
                  className="absolute inset-x-0 border-t border-dashed border-slate-200/80"
                  style={{ top: `${(1 - tick.ratio) * 100}%` }}
                />
              ))}

              <div className="relative flex h-48 items-end gap-2 pt-2">
                {(revenueByMonth.length
                  ? revenueByMonth
                  : Array.from({ length: 12 }, (_, index) => ({
                      month: `T${index + 1}`,
                      revenue: 0,
                    }))
                ).map((item) => {
                  const barHeight =
                    item.revenue > 0
                      ? Math.max((item.revenue / maxRevenue) * 100, 8)
                      : 0;

                  return (
                    <div
                      key={item.month}
                      className="flex flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="min-h-5 text-center text-[10px] font-semibold text-violet-700">
                        {item.revenue > 0
                          ? formatCompactCurrency(item.revenue)
                          : null}
                      </div>
                      <div
                        className="group relative w-full rounded-t-lg bg-violet-500 transition-all hover:bg-violet-600"
                        style={{ height: `${barHeight}%` }}
                      >
                        <div className="absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          {formatCurrency(item.revenue)}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
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

            {!isLoading && recentOrders.length === 0 && (
              <div className="rounded-xl bg-white/40 p-4 text-sm text-muted-foreground">
                Chưa có đơn hàng nào trong hệ thống.
              </div>
            )}

            {recentOrders.map((order) => (
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

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="glass-card flex flex-col justify-between p-6 lg:col-span-3">
          <div className="mb-6">
            <h2 className="mb-1 font-heading text-lg font-bold text-foreground">
              Chỉ số bán hàng
            </h2>
            <p className="text-xs text-muted-foreground">
              Giá trị đơn trung bình và tốc độ tăng trưởng theo dữ liệu thực.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                title: 'Tổng doanh thu',
                value: formatCurrency(analyticsStats?.totalRevenue ?? 0),
                growth: analyticsStats?.revenueGrowth ?? 0,
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-600',
              },
              {
                title: 'Tổng đơn hàng',
                value: String(analyticsStats?.totalOrders ?? 0),
                growth: analyticsStats?.orderGrowth ?? 0,
                bg: 'bg-blue-500/10',
                text: 'text-blue-600',
              },
              {
                title: 'Giá trị đơn TB',
                value: formatCurrency(analyticsStats?.averageOrderValue ?? 0),
                growth: 0,
                bg: 'bg-violet-500/10',
                text: 'text-violet-600',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-2xl bg-white/40 p-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </span>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {card.value}
                </p>
                <div
                  className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${card.bg} ${card.text}`}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {card.growth > 0 ? '+' : ''}
                  {card.growth}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <div>
            <h2 className="mb-1 font-heading text-lg font-bold text-foreground">
              Top sản phẩm bán chạy
            </h2>
            <p className="mb-6 text-xs text-muted-foreground">
              Xếp hạng theo số lượng bán và doanh thu thực tế.
            </p>
          </div>

          <div className="space-y-4">
            {isLoading &&
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl bg-white/40 p-3"
                >
                  <div className="h-12 rounded bg-slate-200/60" />
                </div>
              ))}

            {!isLoading && topProducts.length === 0 && (
              <div className="rounded-xl bg-white/40 p-4 text-sm text-muted-foreground">
                Chưa có dữ liệu sản phẩm bán chạy.
              </div>
            )}

            {topProducts.map((product, index) => (
              <div
                key={product.productId}
                className="flex items-center justify-between rounded-xl bg-white/40 p-3 transition-colors hover:bg-white/60"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-600">
                    #{index + 1}
                  </div>
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-slate-100">
                    {product.thumbnail ? (
                      <Image
                        src={product.thumbnail}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">
                      {product.productName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Đã bán:{' '}
                      <strong className="text-foreground">
                        {product.quantitySold}
                      </strong>
                    </p>
                    {product.campaignQuantitySold > 0 ? (
                      <p className="text-[10px] text-rose-600">
                        Campaign: {product.campaignQuantitySold} sp /{' '}
                        {product.campaignOrderCount} đơn
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Campaign: chưa ghi nhận
                      </p>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-primary">
                    {formatCurrency(product.revenue)}
                  </p>
                  {product.campaignRevenue > 0 ? (
                    <p className="text-[10px] text-rose-600">
                      {formatCurrency(product.campaignRevenue)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="mb-4 font-heading text-lg font-bold text-foreground">
          Trạng thái đơn hàng
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderStatusBreakdown.map((item) => {
            const percent =
              totalStatusOrders > 0
                ? Math.round((item.count / totalStatusOrders) * 100)
                : 0;

            return (
              <div key={item.status} className="rounded-2xl bg-white/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {ORDER_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {percent}%
                  </span>
                </div>
                <p className="mb-3 text-2xl font-bold text-foreground">
                  {item.count}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
