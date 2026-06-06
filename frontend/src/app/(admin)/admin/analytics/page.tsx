'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowUpRight,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {
  getAdminAnalyticsStats,
  type AdminAnalyticsStats,
} from '@/lib/api/admin.api';
import { ORDER_STATUS_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('12months');
  const [stats, setStats] = useState<AdminAnalyticsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getAdminAnalyticsStats();
        setStats(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu phân tích.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadAnalytics();
  }, []);

  const maxRevenue = useMemo(() => {
    if (!stats?.monthlyRevenue.length) return 1;
    return Math.max(...stats.monthlyRevenue.map((item) => item.revenue), 1);
  }, [stats]);

  const totalStatusOrders = useMemo(
    () =>
      (stats?.orderStatusBreakdown ?? []).reduce(
        (sum, item) => sum + item.count,
        0,
      ),
    [stats],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="mb-2 font-heading text-3xl font-bold text-foreground">
            Phân tích dữ liệu
          </h1>
          <p className="text-muted-foreground">
            Báo cáo hiệu suất kinh doanh thực tế từ hệ thống đơn hàng và sản
            phẩm.
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="w-full cursor-pointer rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 sm:w-auto"
        >
          <option value="12months">12 tháng gần nhất</option>
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Tổng doanh thu',
            value: formatCurrency(stats?.totalRevenue ?? 0),
            growth: stats?.revenueGrowth ?? 0,
            icon: DollarSign,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
          },
          {
            title: 'Tổng đơn hàng',
            value: String(stats?.totalOrders ?? 0),
            growth: stats?.orderGrowth ?? 0,
            icon: ShoppingCart,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
          },
          {
            title: 'Giá trị đơn trung bình',
            value: formatCurrency(stats?.averageOrderValue ?? 0),
            growth: 0,
            icon: Package,
            color: 'text-violet-500',
            bg: 'bg-violet-500/10',
          },
          {
            title: 'Tổng khách hàng',
            value: String(stats?.totalCustomers ?? 0),
            growth: 0,
            icon: Users,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
          },
        ].map((card) => (
          <div
            key={card.title}
            className="glass-card flex items-start justify-between p-6"
          >
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                {card.title}
              </span>
              <h3 className="text-2xl font-bold text-foreground">
                {card.value}
              </h3>
              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                {card.growth > 0 ? '+' : ''}
                {card.growth}%
                <span className="font-normal text-muted-foreground">
                  so với tháng trước
                </span>
              </div>
            </div>
            <div className={`rounded-xl p-3 ${card.bg} ${card.color}`}>
              <card.icon className="h-6 w-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="glass-card flex flex-col justify-between p-6 lg:col-span-3">
          <div>
            <h2 className="mb-1 font-heading text-lg font-bold text-foreground">
              Doanh thu theo tháng
            </h2>
            <p className="mb-6 text-xs text-muted-foreground">
              Dữ liệu doanh thu 12 tháng gần nhất từ các đơn không bị hủy hoặc
              hoàn tiền.
            </p>
          </div>

          <div className="space-y-6">
            {(stats?.monthlyRevenue ?? []).map((item) => {
              const revenuePercent = (item.revenue / maxRevenue) * 100;

              return (
                <div key={item.month} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {item.month}
                    </span>
                    <div className="font-mono text-muted-foreground">
                      {formatCurrency(item.revenue)}
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-1000"
                      style={{ width: `${revenuePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="animate-pulse space-y-2">
                    <div className="h-3 w-20 rounded bg-slate-200/60" />
                    <div className="h-2 rounded bg-slate-200/50" />
                  </div>
                ))}
              </div>
            )}
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

            {!isLoading && (stats?.topProducts.length ?? 0) === 0 && (
              <div className="rounded-xl bg-white/40 p-4 text-sm text-muted-foreground">
                Chưa có dữ liệu sản phẩm bán chạy.
              </div>
            )}

            {stats?.topProducts.map((product, index) => (
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
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-primary">
                    {formatCurrency(product.revenue)}
                  </p>
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
          {(stats?.orderStatusBreakdown ?? []).map((item) => {
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
