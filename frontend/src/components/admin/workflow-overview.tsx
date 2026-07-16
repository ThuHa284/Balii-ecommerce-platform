'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  PlayCircle,
  Route,
} from 'lucide-react';
import {
  AdminWorkflowOverviewDefinition,
  getAdminWorkflowOverview,
} from '@/lib/api/admin.api';
import { BpmnWorkflowViewer } from './bpmn-workflow-viewer';

const PROCESS_LABELS: Record<string, string> = {
  Process_Payment_Processing: 'Xử lý thanh toán',
  Process_Refund_Workflow: 'Xử lý hoàn tiền',
  Process_Payment_Reconciliation: 'Đối soát thanh toán',
};

export function WorkflowOverview() {
  const [definitions, setDefinitions] = useState<
    AdminWorkflowOverviewDefinition[]
  >([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getAdminWorkflowOverview()
      .then((response) => {
        if (cancelled) return;
        setDefinitions(response.definitions);
        setSelectedKey(
          (current) =>
            current || response.definitions[0]?.processDefinitionKey || '',
        );
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Không thể tải tổng quan workflow từ Camunda.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () =>
      definitions.find(
        (definition) => definition.processDefinitionKey === selectedKey,
      ) ?? definitions[0],
    [definitions, selectedKey],
  );
  const grandTotals = useMemo(
    () =>
      definitions.reduce(
        (totals, definition) => ({
          all: totals.all + definition.totals.all,
          active: totals.active + definition.totals.active,
          completed: totals.completed + definition.totals.completed,
          incidents: totals.incidents + definition.totals.incidents,
        }),
        { all: 0, active: 0, completed: 0, incidents: 0 },
      ),
    [definitions],
  );

  if (loading) {
    return (
      <section className="glass-card flex min-h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        <span className="ml-3 text-sm text-muted-foreground">
          Đang tổng hợp các luồng từ Camunda...
        </span>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        {error}
      </section>
    );
  }

  if (!selected) {
    return (
      <section className="glass-card p-5 text-sm text-muted-foreground">
        Camunda chưa có BPMN nào thuộc nhóm thanh toán và hoàn tiền.
      </section>
    );
  }

  return (
    <section className="glass-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Route className="h-5 w-5 text-violet-500" />
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Tổng quan tất cả luồng BPMN
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Không cần nhập Order ID hoặc Payment ID. Con số trên mỗi bước là số
            process instance đang đứng tại bước đó.
          </p>
        </div>

        <select
          value={selected.processDefinitionKey}
          onChange={(event) => setSelectedKey(event.target.value)}
          className="rounded-xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-300"
        >
          {definitions.map((definition) => (
            <option
              key={definition.processDefinitionKey}
              value={definition.processDefinitionKey}
            >
              {PROCESS_LABELS[definition.processDefinitionKey] ??
                definition.processName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tổng đã khởi tạo"
          value={grandTotals.all}
          icon={<Route className="h-5 w-5 text-violet-600" />}
          color="bg-violet-100"
        />
        <StatCard
          label="Đang chạy"
          value={grandTotals.active}
          icon={<PlayCircle className="h-5 w-5 text-emerald-600" />}
          color="bg-emerald-100"
        />
        <StatCard
          label="Đã hoàn tất"
          value={grandTotals.completed}
          icon={<CheckCircle2 className="h-5 w-5 text-sky-600" />}
          color="bg-sky-100"
        />
        <StatCard
          label="Sự cố hiện tại"
          value={grandTotals.incidents}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          color="bg-red-100"
        />
      </div>

      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">
              {PROCESS_LABELS[selected.processDefinitionKey] ??
                selected.processName}
            </span>
            <span className="ml-3">
              Tổng: {selected.totals.all} · Đang chạy: {selected.totals.active}{' '}
              · Hoàn tất: {selected.totals.completed} · Sự cố:{' '}
              {selected.totals.incidents}
            </span>
          </div>
          <span>
            Phiên bản hiện tại: {selected.version} · Tổng số phiên bản:{' '}
            {selected.versions}
          </span>
        </div>
        <BpmnWorkflowViewer
          xml={selected.bpmnXml}
          activities={[]}
          incidents={[]}
          aggregateActivities={selected.activities}
        />
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/45 p-4">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
