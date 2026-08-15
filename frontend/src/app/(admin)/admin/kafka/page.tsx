'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  Network,
  RadioTower,
  RefreshCw,
  Send,
  Server,
  Users,
  Zap,
} from 'lucide-react';
import AuthGuard from '@/components/auth/auth-guard';
import {
  AdminKafkaOverviewResponse,
  getAdminKafkaOverview,
  getKafkaDemoStatus,
  KafkaDemoRunResult,
  KafkaDemoStatus,
  runKafkaDemoAsync,
  runKafkaDemoSync,
} from '@/lib/api/admin.api';
import { formatDateTime } from '@/lib/utils';
import { UserRole } from '@/types/user.types';

export default function AdminKafkaPage() {
  return (
    <AuthGuard requiredRole={UserRole.SUPER_ADMIN}>
      <KafkaDashboard />
    </AuthGuard>
  );
}

function KafkaDashboard() {
  const [data, setData] = useState<AdminKafkaOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await getAdminKafkaOverview());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tải thông tin Kafka.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getAdminKafkaOverview()
      .then((overview) => {
        if (!cancelled) setData(overview);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Không thể tải thông tin Kafka.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const topicsByName = useMemo(
    () => new Map(data?.topics.map((topic) => [topic.name, topic]) ?? []),
    [data?.topics],
  );

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
        <span className="ml-3 text-sm text-muted-foreground">
          Đang đọc trạng thái Kafka...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Network className="h-8 w-8 text-violet-500" />
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                Kafka Events
              </h1>
              <p className="mt-1 text-muted-foreground">
                Producer → topic → consumer và trạng thái Outbox thực tế.
              </p>
            </div>
          </div>
          <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            Chỉ Super Admin được xem
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <a
            href={data?.kafkaUiUrl || 'http://localhost:8081'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <ExternalLink className="h-4 w-4" />
            Mở Kafka UI: Topic & Partition
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Metric
              label="Kết nối Kafka"
              value={data.connected ? 'Hoạt động' : 'Mất kết nối'}
              icon={
                data.connected ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )
              }
            />
            <Metric
              label="Topic nghiệp vụ"
              value={String(data.topics.length)}
              icon={<RadioTower className="h-5 w-5 text-violet-600" />}
            />
            <Metric
              label="Consumer group thực tế"
              value={String(data.consumerGroups.length)}
              icon={<Users className="h-5 w-5 text-sky-600" />}
            />
            <Metric
              label="Event đã publish"
              value={String(data.outbox.counts.PUBLISHED ?? 0)}
              icon={<Inbox className="h-5 w-5 text-emerald-600" />}
            />
          </section>

          {data.error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {data.error}
            </div>
          ) : null}

          <KafkaDemoPanel />

          <section className="glass-card p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold text-foreground">
                  Cách chia topic và event
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Consumer bên phải là thiết kế dự kiến; consumer group thực tế
                  được kiểm tra ở phần bên dưới.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Broker: {data.brokers.join(', ') || 'Chưa cấu hình'}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {data.eventCatalog.map((event) => {
                const topic = topicsByName.get(event.topic);
                return (
                  <div
                    key={event.topic}
                    className="grid gap-3 rounded-2xl border border-white/40 bg-white/35 p-4 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr]"
                  >
                    <FlowBox
                      icon={<Server className="h-5 w-5 text-violet-600" />}
                      title="Producer"
                      primary={event.producer}
                      secondary="Ghi PostgreSQL Outbox trước khi gửi Kafka"
                    />
                    <ArrowRight className="mx-auto hidden h-5 w-5 self-center text-violet-300 lg:block" />
                    <FlowBox
                      icon={<RadioTower className="h-5 w-5 text-sky-600" />}
                      title={event.label}
                      primary={event.topic}
                      secondary={
                        topic
                          ? `${topic.partitions} partition · ${topic.messageCount} message · replication ${topic.replicationFactor}`
                          : 'Topic chưa tồn tại trên broker'
                      }
                    />
                    <ArrowRight className="mx-auto hidden h-5 w-5 self-center text-violet-300 lg:block" />
                    <FlowBox
                      icon={<Users className="h-5 w-5 text-emerald-600" />}
                      title="Consumer dự kiến"
                      primary={event.intendedConsumers.join(', ')}
                      secondary={event.description}
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="glass-card p-5">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Consumer group đang chạy
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Đây mới là Kafka worker thực sự đăng ký nhận message.
              </p>
              <div className="mt-4 space-y-3">
                {data.consumerGroups.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Chưa có consumer group. Hệ thống đang publish event nhưng
                    chưa có Kafka consumer nhận các topic này.
                  </div>
                ) : (
                  data.consumerGroups.map((group) => (
                    <div
                      key={group.groupId}
                      className="rounded-2xl border border-white/40 bg-white/45 p-4"
                    >
                      <p className="font-mono text-sm font-semibold">
                        {group.groupId}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Protocol: {group.protocolType || 'consumer'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="glass-card p-5">
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Trạng thái Outbox
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Event được lưu bền vững trước khi gửi sang Kafka.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {Object.entries(data.outbox.counts).map(([status, count]) => (
                  <div
                    key={status}
                    className="rounded-2xl border border-white/40 bg-white/45 p-4"
                  >
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {status}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-white/30 px-5 py-4">
              <h2 className="font-heading text-xl font-semibold">
                Event Outbox gần đây
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Aggregate</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3">Retry</th>
                    <th className="px-5 py-3">Tạo lúc</th>
                    <th className="px-5 py-3">Publish lúc</th>
                  </tr>
                </thead>
                <tbody>
                  {data.outbox.recentEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-white/20 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <p className="font-mono text-sm font-semibold">
                          {event.type}
                        </p>
                        <p className="mt-1 max-w-56 truncate text-[11px] text-muted-foreground">
                          {event.id}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm">{event.aggregateType}</p>
                        <p className="mt-1 max-w-52 truncate text-[11px] text-muted-foreground">
                          {event.aggregateId}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            event.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : event.status === 'FAILED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm">{event.retryCount}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {event.publishedAt
                          ? formatDateTime(event.publishedAt)
                          : 'Chưa publish'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function KafkaDemoPanel() {
  const [recipient, setRecipient] = useState('khach-hang@balii.vn');
  const [message, setMessage] = useState(
    'Đơn hàng #BALII-2026 của bạn đã được xác nhận.',
  );
  const [syncBusy, setSyncBusy] = useState(false);
  const [asyncBusy, setAsyncBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<
    (KafkaDemoRunResult & { clientRttMs: number }) | null
  >(null);
  const [asyncResult, setAsyncResult] = useState<
    (KafkaDemoRunResult & { clientRttMs: number }) | null
  >(null);
  const [status, setStatus] = useState<KafkaDemoStatus | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  // Poll the consumer processing log so async events show up as they're handled.
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      void getKafkaDemoStatus()
        .then((next) => {
          if (!cancelled) setStatus(next);
        })
        .catch(() => {
          /* status is best-effort */
        });
    };
    tick();
    const timer = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function handleSync() {
    setSyncBusy(true);
    setDemoError(null);
    const t0 = performance.now();
    try {
      const result = await runKafkaDemoSync({ recipient, message });
      setSyncResult({
        ...result,
        clientRttMs: Math.round(performance.now() - t0),
      });
    } catch (err) {
      setDemoError(
        err instanceof Error ? err.message : 'Lỗi khi chạy demo đồng bộ.',
      );
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleAsync() {
    setAsyncBusy(true);
    setDemoError(null);
    const t0 = performance.now();
    try {
      const result = await runKafkaDemoAsync({ recipient, message });
      setAsyncResult({
        ...result,
        clientRttMs: Math.round(performance.now() - t0),
      });
    } catch (err) {
      setDemoError(
        err instanceof Error ? err.message : 'Lỗi khi chạy demo Kafka.',
      );
    } finally {
      setAsyncBusy(false);
    }
  }

  return (
    <section className="glass-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            Demo: Kafka vs không Kafka
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cùng một hành động &quot;gửi thông báo đơn hàng&quot;, làm theo 2
            cách. Đồng bộ: caller bị chặn tới khi xử lý xong. Bất đồng bộ
            (Kafka): caller được trả về ngay, consumer xử lý nền (xem log bên
            dưới).
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            status?.connected
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {status?.connected
            ? 'Consumer demo đang chạy'
            : 'Consumer demo chưa kết nối'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-xs font-semibold text-muted-foreground">
            Người nhận
          </span>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs font-semibold text-muted-foreground">
            Nội dung
          </span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {demoError ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {demoError}
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Synchronous / no Kafka */}
        <div className="rounded-2xl border border-white/50 bg-white/40 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-rose-600" />
            <h3 className="font-semibold">Không dùng Kafka (đồng bộ)</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Gọi trực tiếp và chờ. Caller bị chặn suốt thời gian xử lý.
          </p>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncBusy}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Gửi đồng bộ
          </button>
          {syncResult ? (
            <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <p className="font-semibold">
                Caller bị chặn {syncResult.clientRttMs} ms (round-trip)
              </p>
              <p className="mt-1">{syncResult.note}</p>
            </div>
          ) : null}
        </div>

        {/* Async / Kafka */}
        <div className="rounded-2xl border border-white/50 bg-white/40 p-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">Qua Kafka (bất đồng bộ)</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Publish event rồi trả về ngay. Consumer xử lý nền, không chặn
            caller.
          </p>
          <button
            type="button"
            onClick={() => void handleAsync()}
            disabled={asyncBusy}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {asyncBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Gửi qua Kafka
          </button>
          {asyncResult ? (
            <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <p className="font-semibold">
                Caller được trả về sau {asyncResult.clientRttMs} ms
                {asyncResult.published === false ? ' (Kafka chưa kết nối)' : ''}
              </p>
              <p className="mt-1">{asyncResult.note}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-foreground">
          Log consumer xử lý (Kafka)
        </h3>
        {status && status.processedLog.length > 0 ? (
          <div className="mt-2 space-y-2">
            {status.processedLog.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/40 bg-white/50 px-3 py-2 text-xs"
              >
                <span className="font-mono">{entry.recipient}</span>
                <span className="truncate">{entry.message}</span>
                <span className="text-muted-foreground">
                  xử lý sau {entry.latencyMs} ms ·{' '}
                  {formatDateTime(entry.processedAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Chưa có event nào được consumer xử lý. Bấm &quot;Gửi qua Kafka&quot;
            để thấy message được xử lý nền sau vài giây.
          </p>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/60">
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FlowBox({
  icon,
  title,
  primary,
  secondary,
}: {
  icon: React.ReactNode;
  title: string;
  primary: string;
  secondary: string;
}) {
  return (
    <div className="rounded-xl border border-white/50 bg-white/60 p-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <p className="mt-3 break-words font-mono text-sm font-semibold">
        {primary}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {secondary}
      </p>
    </div>
  );
}
