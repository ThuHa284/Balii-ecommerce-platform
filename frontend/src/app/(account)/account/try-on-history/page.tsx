'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Sparkles,
  XCircle,
} from 'lucide-react';

import { getTryOnHistory, getTryOnStats } from '@/lib/api/tryon.api';
import { formatAgeGroupLabel, formatGenderLabel } from '@/lib/tryon-labels';
import { formatDateTime } from '@/lib/utils';
import { TryOnHistoryRecord, TryOnStats } from '@/types/tryon.types';

const STATUS_LABELS: Record<string, string> = {
  completed: 'Hoàn thành',
  failed: 'Thất bại',
  need_confirmation: 'Cần xác nhận',
  processing: 'Đang xử lý',
  pending: 'Đang chờ',
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  need_confirmation: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  pending: 'bg-slate-100 text-slate-700',
};

function StatsTile({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div
          className={`rounded-2xl bg-gradient-to-br p-3 text-white ${gradient}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function TryOnHistoryPage() {
  const [history, setHistory] = useState<TryOnHistoryRecord[]>([]);
  const [stats, setStats] = useState<TryOnStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [historyData, statsData] = await Promise.all([
          getTryOnHistory(),
          getTryOnStats(),
        ]);
        setHistory(historyData);
        setStats(statsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Không thể tải lịch sử thử đồ.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 font-heading text-2xl font-bold text-foreground">
          Lịch sử thử đồ AI
        </h1>
        <p className="text-muted-foreground">
          Theo dõi kết quả đã tạo, trạng thái xử lý và phân tích giới tính, độ
          tuổi từ ảnh người mẫu.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsTile
          title="Tổng lượt thử"
          value={stats?.total ?? 0}
          icon={<Sparkles className="h-5 w-5" />}
          gradient="from-violet-400 to-purple-500"
        />
        <StatsTile
          title="Hoàn thành"
          value={stats?.completed ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          gradient="from-emerald-400 to-teal-500"
        />
        <StatsTile
          title="Thất bại"
          value={stats?.failed ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          gradient="from-rose-400 to-red-500"
        />
        <StatsTile
          title="Cần xác nhận"
          value={stats?.needConfirmation ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          gradient="from-amber-400 to-orange-500"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="glass-card animate-pulse p-5">
              <div className="flex gap-4">
                <div className="h-28 w-24 rounded-2xl bg-white/50" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/3 rounded bg-white/50" />
                  <div className="h-3 w-1/2 rounded bg-white/40" />
                  <div className="h-3 w-1/4 rounded bg-white/30" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Clock3 className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
          <p className="mb-4 text-muted-foreground">
            Bạn chưa có lịch sử thử đồ nào.
          </p>
          <Link href="/try-on" className="btn-primary inline-block text-sm">
            Bắt đầu thử đồ
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="glass-card overflow-hidden p-5 transition-all duration-300 hover:bg-white/75"
            >
              <div className="flex flex-col gap-5 md:flex-row">
                <div className="relative h-36 w-full overflow-hidden rounded-2xl bg-white/40 md:h-40 md:w-32">
                  <Image
                    src={item.resultUrl || '/images/placeholder.svg'}
                    alt="Kết quả thử đồ"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 128px"
                  />
                </div>

                <div className="flex-1">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Mã lịch sử:{' '}
                        <span className="font-medium text-foreground">
                          {item.id}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Product ID:{' '}
                        <span className="font-medium text-foreground">
                          {item.productId || 'Không có'}
                        </span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                        STATUS_STYLES[item.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-white/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Giới tính
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatGenderLabel(item.detectedGender)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nhóm tuổi
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatAgeGroupLabel(item.detectedAgeGroup)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ngày tạo
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        URL kết quả
                      </p>
                      {item.resultUrl ? (
                        <a
                          href={item.resultUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 line-clamp-2 text-sm font-medium text-violet-600 hover:text-violet-700"
                        >
                          {item.resultUrl}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Chưa có
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
