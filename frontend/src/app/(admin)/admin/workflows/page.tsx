'use client';

import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Route,
  Search,
  Wifi,
} from 'lucide-react';
import {
  AdminWorkflowMonitorResponse,
  AdminWorkflowSnapshot,
  AdminWorkflowContext,
  getAdminWorkflowContexts,
  getAdminWorkflowMonitor,
  runAdminWorkflowDemo,
} from '@/lib/api/admin.api';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  REFUND_STATUS_COLORS,
  REFUND_STATUS_LABELS,
} from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { BpmnWorkflowViewer } from '@/components/admin/bpmn-workflow-viewer';
import { WorkflowOverview } from '@/components/admin/workflow-overview';

function getWorkflowStateClasses(state: AdminWorkflowSnapshot['state']) {
  switch (state) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-700';
    case 'COMPLETED':
      return 'bg-sky-100 text-sky-700';
    case 'INCIDENT':
      return 'bg-red-100 text-red-700';
    case 'UNAVAILABLE':
      return 'bg-amber-100 text-amber-700';
    case 'NOT_FOUND':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-violet-100 text-violet-700';
  }
}

function stringifyVariable(value: unknown) {
  if (value == null) return 'null';
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

const WORKFLOW_POLL_INTERVAL_MS = 3000;

function WorkflowCard({
  title,
  subtitle,
  workflow,
  actionSlot,
}: {
  title: string;
  subtitle: string;
  workflow: AdminWorkflowSnapshot;
  actionSlot?: ReactNode;
}) {
  return (
    <section className="glass-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actionSlot}
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${getWorkflowStateClasses(workflow.state)}`}
          >
            {workflow.state}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/40 bg-white/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Process instance
          </p>
          <p className="mt-2 break-all text-sm font-medium text-foreground">
            {workflow.processInstanceId ?? 'Chưa có'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Bắt đầu
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {workflow.startedAt
              ? formatDateTime(workflow.startedAt)
              : 'Chưa có'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/40 bg-white/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Kết thúc
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {workflow.endedAt ? formatDateTime(workflow.endedAt) : 'Đang chạy'}
          </p>
        </div>
      </div>

      {workflow.error ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {workflow.error}
        </div>
      ) : null}

      {workflow.bpmnXml ? (
        <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="font-medium text-foreground">Sơ đồ BPMN</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Kéo để di chuyển, cuộn để phóng to và xem bước hiện tại của
                process instance.
              </p>
            </div>
            <p className="max-w-xl break-all text-right text-[11px] text-muted-foreground">
              Definition: {workflow.processDefinitionId}
            </p>
          </div>
          <BpmnWorkflowViewer
            xml={workflow.bpmnXml}
            activities={workflow.activities}
            incidents={workflow.incidents}
          />
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-5">
          <div>
            <h3 className="font-medium text-foreground">Luồng hoạt động</h3>
            <div className="mt-3 space-y-3">
              {workflow.activities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/50 bg-white/30 px-4 py-5 text-sm text-muted-foreground">
                  Chưa có activity nào được ghi nhận.
                </div>
              ) : (
                workflow.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      activity.status === 'ACTIVE'
                        ? 'border-emerald-200 bg-emerald-50/80'
                        : 'border-white/40 bg-white/35'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {activity.activityName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.activityId} · {activity.activityType}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          activity.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {activity.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Bắt đầu:{' '}
                        {activity.startedAt
                          ? formatDateTime(activity.startedAt)
                          : 'N/A'}
                      </span>
                      <span>
                        Kết thúc:{' '}
                        {activity.endedAt
                          ? formatDateTime(activity.endedAt)
                          : 'Đang chạy'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-foreground">Incident</h3>
            <div className="mt-3 space-y-3">
              {workflow.incidents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/50 bg-white/30 px-4 py-5 text-sm text-muted-foreground">
                  Không có incident.
                </div>
              ) : (
                workflow.incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-red-700">
                      {incident.message ?? 'Incident'}
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      {incident.activityId ?? 'unknown activity'} ·{' '}
                      {incident.incidentType ?? 'unknown type'}
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      {incident.createdAt
                        ? formatDateTime(incident.createdAt)
                        : 'Chưa có timestamp'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/40 bg-white/35 p-4">
            <h3 className="font-medium text-foreground">Step hiện tại</h3>
            <div className="mt-3 space-y-2">
              {workflow.currentSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Không có step active.
                </p>
              ) : (
                workflow.currentSteps.map((step) => (
                  <div
                    key={`${step.activityId}-${step.activityType}`}
                    className="rounded-xl bg-emerald-50 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-emerald-700">
                      {step.activityName}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {step.activityId} · {step.activityType}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/40 bg-white/35 p-4">
            <h3 className="font-medium text-foreground">Biến quan trọng</h3>
            <div className="mt-3 space-y-2">
              {Object.entries(workflow.highlightedVariables).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Không có biến được chọn.
                </p>
              ) : (
                Object.entries(workflow.highlightedVariables).map(
                  ([key, variable]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-white/40 bg-white/60 px-3 py-2"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {key}
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-foreground">
                        {stringifyVariable(variable.value)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {variable.type}
                      </p>
                    </div>
                  ),
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function AdminWorkflowsPage() {
  const [orderId, setOrderId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminWorkflowMonitorResponse | null>(
    null,
  );
  const [contexts, setContexts] = useState<AdminWorkflowContext[]>([]);
  const [contextsLoading, setContextsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [polling, setPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const initialOrderId = params.get('orderId')?.trim() ?? '';
    const initialPaymentId = params.get('paymentId')?.trim() ?? '';

    void getAdminWorkflowContexts()
      .then((items) => {
        if (!cancelled) setContexts(items);
      })
      .finally(() => {
        if (!cancelled) setContextsLoading(false);
      });

    if (initialOrderId || initialPaymentId) {
      queueMicrotask(() => {
        if (cancelled) return;
        setOrderId(initialOrderId);
        setPaymentId(initialPaymentId);
        setLoading(true);
      });
      void getAdminWorkflowMonitor({
        orderId: initialOrderId || undefined,
        paymentId: initialPaymentId || undefined,
      })
        .then((data) => {
          if (!cancelled) {
            setResult(data);
            setLastUpdated(new Date().toISOString());
          }
        })
        .catch((requestError: unknown) => {
          if (!cancelled) {
            setError(
              requestError instanceof Error
                ? requestError.message
                : 'Không thể tải workflow monitor.',
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadWorkflow(
    params: { orderId?: string; paymentId?: string },
    options: { silent?: boolean } = {},
  ) {
    try {
      if (options.silent) {
        setPolling(true);
      } else {
        setLoading(true);
        setError(null);
      }
      const data = await getAdminWorkflowMonitor(params);
      setResult(data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      if (!options.silent) {
        setResult(null);
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải workflow monitor.',
        );
      }
    } finally {
      if (options.silent) {
        setPolling(false);
      } else {
        setLoading(false);
      }
    }
  }

  const hasWorkflowResult = Boolean(result);
  const workflowSearchOrderId = result?.search.orderId;
  const workflowSearchPaymentId = result?.search.paymentId;

  useEffect(() => {
    if (!autoRefresh || !hasWorkflowResult) return;

    const params = {
      orderId: workflowSearchOrderId || undefined,
      paymentId: workflowSearchPaymentId || undefined,
    };
    const timer = window.setInterval(() => {
      void loadWorkflow(params, { silent: true });
    }, WORKFLOW_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [
    autoRefresh,
    hasWorkflowResult,
    workflowSearchOrderId,
    workflowSearchPaymentId,
  ]);
  async function handleRunDemoWorkflow(
    action:
      | 'start_wait_callback'
      | 'start_service_incident' = 'start_wait_callback',
    faultTopic?: string,
  ) {
    const selectedPaymentId = result?.payment.id || paymentId.trim();
    const selectedOrderId = result?.payment.orderId || orderId.trim();

    if (!selectedPaymentId && !selectedOrderId) {
      setError(
        'Chọn một giao dịch gần đây hoặc nhập Order ID/Payment ID trước khi chạy demo.',
      );
      return;
    }

    try {
      setDemoRunning(true);
      setError(null);
      const data = await runAdminWorkflowDemo({
        action,
        faultTopic,
        orderId: selectedOrderId || undefined,
        paymentId: selectedPaymentId || undefined,
      });
      setResult(data);
      setOrderId(data.search.orderId);
      setPaymentId(data.search.paymentId);
      setLastUpdated(new Date().toISOString());
      setAutoRefresh(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thể chạy demo workflow.',
      );
    } finally {
      setDemoRunning(false);
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadWorkflow({
      orderId: orderId.trim() || undefined,
      paymentId: paymentId.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Workflow Monitor
        </h1>
        <p className="mt-2 text-muted-foreground">
          Xem trực tiếp sơ đồ BPMN, bước đang chạy, lịch sử và incident của
          payment hoặc refund.
        </p>
      </div>

      <WorkflowOverview />

      <form
        onSubmit={(event) => {
          void handleSearch(event);
        }}
        className="glass-card p-5"
      >
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Order ID
            </span>
            <input
              type="text"
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              placeholder="Nhập UUID đơn hàng"
              className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <span className="block text-xs text-muted-foreground">
              M? don h?ng; d?ng l?m business key c?a payment workflow.
            </span>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Payment ID
            </span>
            <input
              type="text"
              value={paymentId}
              onChange={(event) => setPaymentId(event.target.value)}
              placeholder="Hoặc nhập UUID payment"
              className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <span className="block text-xs text-muted-foreground">
              M? giao d?ch thanh to?n; t?m payment v? c?c refund li?n quan.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Tra workflow
          </button>
        </div>
      </form>

      <section className="glass-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/30 px-5 py-4">
          <div>
            <h2 className="font-heading text-lg font-semibold text-foreground">
              Giao d?ch g?n d?y
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Chọn một giao dịch để mở workflow, không cần sao chép UUID.
            </p>
          </div>
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            {contexts.length} giao dịch
          </span>
        </div>

        {contextsLoading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            ?ang t?i giao d?ch g?n d?y...
          </div>
        ) : contexts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Chưa có giao dịch thanh toán để theo dõi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-white/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">M? don</th>
                  <th className="px-5 py-3">Khách hàng</th>
                  <th className="px-5 py-3">Thanh toán</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {contexts.map((context) => (
                  <tr
                    key={context.paymentId}
                    className="border-b border-white/20 last:border-0 hover:bg-white/30"
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {context.orderCode ?? '?on chua c? m? hi?n th?'}
                      </p>
                      <p className="mt-1 max-w-48 truncate text-[11px] text-muted-foreground">
                        {context.orderId}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">
                      {context.customerName ?? 'Không rõ khách hàng'}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(context.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[context.provider] ??
                          context.provider}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          PAYMENT_STATUS_COLORS[context.status] ??
                          'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[context.status] ??
                          context.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {formatDateTime(context.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          setOrderId('');
                          setPaymentId(context.paymentId);
                          void loadWorkflow({ paymentId: context.paymentId });
                        }}
                        className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-600 disabled:opacity-60"
                      >
                        <Route className="h-4 w-4" />
                        Xem workflow
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      {result ? (
        <>
          <section className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  autoRefresh
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {polling ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Wifi className="h-5 w-5" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Theo dõi realtime bằng polling mỗi{' '}
                  {WORKFLOW_POLL_INTERVAL_MS / 1000} gi?y
                </p>
                <p className="text-xs text-muted-foreground">
                  {lastUpdated
                    ? `Cập nhật lần cuối: ${formatDateTime(lastUpdated)}`
                    : 'Chưa có lần cập nhật nào.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoRefresh((current) => !current)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  autoRefresh
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {autoRefresh ? (
                  <PauseCircle className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {autoRefresh ? 'Tạm dừng realtime' : 'Bật realtime'}
              </button>
            </div>
          </section>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
            <div className="glass-card p-4 xl:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Payment context
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Order ID</p>
                  <p className="break-all text-sm font-medium text-foreground">
                    {result.payment.orderId}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment ID</p>
                  <p className="break-all text-sm font-medium text-foreground">
                    {result.payment.id}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Provider</p>
                  <p className="text-sm font-medium text-foreground">
                    {PAYMENT_METHOD_LABELS[result.payment.provider] ??
                      result.payment.provider}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Số tiền</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatCurrency(result.payment.amount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Payment status
              </p>
              <span
                className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  PAYMENT_STATUS_COLORS[result.payment.status] ??
                  'bg-slate-100 text-slate-700'
                }`}
              >
                {PAYMENT_STATUS_LABELS[result.payment.status] ??
                  result.payment.status}
              </span>
              <p className="mt-3 text-xs text-muted-foreground">
                Tạo lúc {formatDateTime(result.payment.createdAt)}
              </p>
            </div>

            <div className="glass-card p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Refund workflow
              </p>
              <p className="mt-3 text-2xl font-bold text-foreground">
                {result.refundWorkflows.length}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Số luồng hoàn tiền liên quan payment này
              </p>
            </div>
          </section>

          <WorkflowCard
            title="Payment Processing"
            subtitle={`Business key: ${result.paymentWorkflow.businessKey}`}
            workflow={result.paymentWorkflow}
            actionSlot={
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleRunDemoWorkflow('start_wait_callback');
                  }}
                  disabled={demoRunning || loading}
                  title="Khởi tạo một tiến trình mới và để nó dừng chờ callback từ cổng thanh toán (không có IPN)."
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {demoRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Demo: kẹt chờ callback
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleRunDemoWorkflow(
                      'start_service_incident',
                      'payment.create-or-reuse',
                    );
                  }}
                  disabled={demoRunning || loading}
                  title="Khởi tạo tiến trình và ép lỗi tại service task 'payment.create-or-reuse' để tạo incident (token kẹt đỏ tại bước tạo payment)."
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {demoRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Demo: incident tại Create Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleRunDemoWorkflow(
                      'start_service_incident',
                      'payment.validate-request',
                    );
                  }}
                  disabled={demoRunning || loading}
                  title="Khởi tạo tiến trình và ép lỗi tại service task 'payment.validate-request' để tạo incident ngay ở bước đầu."
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {demoRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Demo: incident tại Validate
                </button>
              </div>
            }
          />

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-violet-500" />
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Refund Workflows
              </h2>
            </div>

            {result.refundWorkflows.length === 0 ? (
              <div className="glass-card px-5 py-10 text-center">
                <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Chưa có refund workflow nào gắn với payment này.
                </p>
              </div>
            ) : (
              result.refundWorkflows.map((item) => (
                <div key={item.refund.id} className="space-y-4">
                  <div className="glass-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Refund ID: {item.refund.id}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tạo lúc {formatDateTime(item.refund.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          REFUND_STATUS_COLORS[item.refund.refundStatus] ??
                          'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {REFUND_STATUS_LABELS[item.refund.refundStatus] ??
                          item.refund.refundStatus}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Số tiền</p>
                        <p className="text-sm font-medium text-foreground">
                          {formatCurrency(item.refund.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Workflow resolution
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {item.refund.workflowResolution ?? 'Chưa có'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Provider refund ID
                        </p>
                        <p className="break-all text-sm font-medium text-foreground">
                          {item.refund.providerRefundId ?? 'Chưa có'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Refunded at
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {item.refund.refundedAt
                            ? formatDateTime(item.refund.refundedAt)
                            : 'Chưa hoàn'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <WorkflowCard
                    title="Refund Workflow"
                    subtitle={`Business key: ${item.workflow.businessKey}`}
                    workflow={item.workflow}
                  />
                </div>
              ))
            )}
          </section>
        </>
      ) : (
        <div className="glass-card px-5 py-12 text-center">
          <Route className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Nhập `orderId` hoặc `paymentId` để xem luồng BPMN.
          </p>
        </div>
      )}
    </div>
  );
}
