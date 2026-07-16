'use client';

import { useEffect, useRef, useState } from 'react';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import Canvas from 'diagram-js/lib/core/Canvas';
import Overlays from 'diagram-js/lib/features/overlays/Overlays';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type {
  AdminWorkflowActivity,
  AdminWorkflowIncident,
} from '@/lib/api/admin.api';

type ViewerServices = {
  canvas: Canvas;
  overlays: Overlays;
};

interface BpmnWorkflowViewerProps {
  xml: string;
  activities: AdminWorkflowActivity[];
  incidents: AdminWorkflowIncident[];
  aggregateActivities?: Array<{
    activityId: string;
    activeInstances: number;
    incidents: number;
  }>;
}

export function BpmnWorkflowViewer({
  xml,
  activities,
  incidents,
  aggregateActivities = [],
}: BpmnWorkflowViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<NavigatedViewer<ViewerServices> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new NavigatedViewer<ViewerServices>({
      container: containerRef.current,
    });
    viewerRef.current = viewer;
    let disposed = false;

    async function renderDiagram() {
      try {
        setError(null);
        await viewer.importXML(xml);
        if (disposed) return;

        const canvas = viewer.get('canvas');

        for (const activity of activities) {
          canvas.addMarker(
            activity.activityId,
            activity.status === 'ACTIVE'
              ? 'workflow-active'
              : 'workflow-completed',
          );
        }

        for (const incident of incidents) {
          if (incident.activityId) {
            canvas.addMarker(incident.activityId, 'workflow-incident');
          }
        }

        const overlays = viewer.get('overlays');
        for (const activity of aggregateActivities) {
          if (activity.activeInstances <= 0 && activity.incidents <= 0) {
            continue;
          }

          const badge = document.createElement('div');
          badge.className =
            activity.incidents > 0
              ? 'workflow-count-badge workflow-count-badge-incident'
              : 'workflow-count-badge';
          badge.textContent = String(activity.activeInstances);
          badge.title =
            activity.incidents > 0
              ? `${activity.activeInstances} luồng đang chạy, ${activity.incidents} sự cố`
              : `${activity.activeInstances} luồng đang chạy`;

          overlays.add(activity.activityId, {
            position: { top: -12, right: -12 },
            html: badge,
          });
        }

        canvas.zoom('fit-viewport');
      } catch (renderError) {
        if (!disposed) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : 'Không thể hiển thị sơ đồ BPMN.',
          );
        }
      }
    }

    void renderDiagram();

    return () => {
      disposed = true;
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [activities, aggregateActivities, incidents, xml]);

  function zoom(delta: number) {
    const canvas = viewerRef.current?.get('canvas');
    if (!canvas) return;
    canvas.zoom(Math.min(3, Math.max(0.2, canvas.zoom() + delta)));
  }

  function fitViewport() {
    viewerRef.current?.get('canvas').zoom('fit-viewport');
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/70">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 px-4 py-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Đang chạy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Đã chạy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-red-500" /> Incident
          </span>
          {aggregateActivities.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <i className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
                #
              </i>
              Số luồng đang đứng tại bước
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => zoom(-0.15)}
            className="rounded-lg border border-white/60 bg-white p-2 text-muted-foreground hover:text-foreground"
            aria-label="Thu nhỏ sơ đồ"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={fitViewport}
            className="rounded-lg border border-white/60 bg-white p-2 text-muted-foreground hover:text-foreground"
            aria-label="Căn vừa sơ đồ"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoom(0.15)}
            className="rounded-lg border border-white/60 bg-white p-2 text-muted-foreground hover:text-foreground"
            aria-label="Phóng to sơ đồ"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? (
        <div className="px-4 py-8 text-center text-sm text-red-600">
          {error}
        </div>
      ) : (
        <div
          ref={containerRef}
          className="bpmn-workflow-viewer h-[520px] w-full"
        />
      )}
    </div>
  );
}
