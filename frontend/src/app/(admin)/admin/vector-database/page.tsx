'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers3,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import {
  AdminVectorDiagnostics,
  getAdminVectorDiagnostics,
  reindexAdminVectorDatabase,
} from '@/lib/api/admin.api';

export default function VectorDatabasePage() {
  const [data, setData] = useState<AdminVectorDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return 'http://localhost:6335/dashboard';
    }
    return `http://${window.location.hostname || 'localhost'}:6335/dashboard`;
  }, []);

  async function loadDiagnostics() {
    try {
      setLoading(true);
      setError(null);
      setData(await getAdminVectorDiagnostics());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể đọc trạng thái Vector DB.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReindex() {
    try {
      setReindexing(true);
      setError(null);
      const vector = await reindexAdminVectorDatabase();
      setData({
        vectorHealthy:
          vector.embeddingEnabled &&
          vector.collectionReady &&
          (vector.indexedPoints ?? 0) > 0 &&
          !vector.lastError,
        vector,
        message: 'Đã tạo lại vector index từ catalog hiện tại.',
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Không thể tạo lại vector index.',
      );
    } finally {
      setReindexing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDiagnostics();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const vector = data?.vector;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-violet-500" />
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground">
                Vector Database
              </h1>
              <p className="mt-1 text-muted-foreground">
                Quan sát embedding, collection và số point trong Qdrant.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadDiagnostics()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/70 px-4 py-2.5 text-sm font-semibold hover:bg-white disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <ExternalLink className="h-4 w-4" />
            Mở Qdrant Dashboard
          </a>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Vector retrieval"
          value={data?.vectorHealthy ? 'Hoạt động' : 'Degraded'}
          healthy={Boolean(data?.vectorHealthy)}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <Metric
          label="Collection"
          value={vector?.collection ?? 'Đang tải...'}
          healthy={Boolean(vector?.collectionReady)}
          icon={<Layers3 className="h-5 w-5" />}
        />
        <Metric
          label="Indexed points"
          value={
            typeof vector?.indexedPoints === 'number'
              ? vector.indexedPoints.toLocaleString('vi-VN')
              : '—'
          }
          healthy={(vector?.indexedPoints ?? 0) > 0}
          icon={<Database className="h-5 w-5" />}
        />
        <Metric
          label="Embedding model"
          value={vector?.embeddingModel || 'Chưa bật'}
          healthy={Boolean(vector?.embeddingEnabled)}
          icon={<Cpu className="h-5 w-5" />}
        />
      </section>

      <section className="glass-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl font-semibold text-foreground">
              Kịch bản demo Vector DB
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Chứng minh chatbot dùng semantic vector search thay vì chỉ tìm từ
              khóa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleReindex()}
            disabled={reindexing}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <RotateCcw
              className={`h-4 w-4 ${reindexing ? 'animate-spin' : ''}`}
            />
            Reindex catalog
          </button>
        </div>

        <ol className="mt-5 grid gap-3 lg:grid-cols-3">
          <Step
            number="1"
            title="Mở collection"
            detail="Vào Qdrant Dashboard, chọn Collections rồi mở balii_chatbot_knowledge."
          />
          <Step
            number="2"
            title="Xem point và payload"
            detail="Mở Points để thấy vector cùng payload sản phẩm, FAQ và policy đã được lập chỉ mục."
          />
          <Step
            number="3"
            title="Reindex và đối chiếu"
            detail="Bấm Reindex catalog, làm mới dashboard và đối chiếu Indexed points trên màn hình này."
          />
        </ol>

        {vector?.lastError ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            {vector.lastError}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  healthy,
  icon,
}: {
  label: string;
  value: string;
  healthy: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass-card p-4">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          healthy
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        }`}
      >
        {icon}
      </div>
      <p className="mt-3 break-words text-lg font-bold text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Step({
  number,
  title,
  detail,
}: {
  number: string;
  title: string;
  detail: string;
}) {
  return (
    <li className="rounded-2xl border border-white/40 bg-white/45 p-4">
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
        {number}
      </span>
      <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
    </li>
  );
}
