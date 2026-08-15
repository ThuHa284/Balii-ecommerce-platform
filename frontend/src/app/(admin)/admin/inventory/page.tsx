'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  PackageOpen,
  RefreshCw,
  Search,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getInventoryMovements,
  InventoryMovement,
} from '@/lib/api/products.api';
import { formatDateTime } from '@/lib/utils';

const inventoryEventLabels: Record<string, string> = {
  initial_stock: 'Khởi tạo tồn kho',
  variant_created: 'Thêm sản phẩm',
  admin_adjustment: 'Admin điều chỉnh tồn kho',
  order_reserved: 'Đơn hàng giữ hàng',
  order_committed: 'Đơn hàng đã trừ kho',
  order_released: 'Hủy đơn, trả lại tồn',
  order_returned: 'Hoàn hàng nhập lại kho',
  inventory_adjustment: 'Điều chỉnh tồn kho',
  system_adjustment: 'Hệ thống điều chỉnh',
};

const referenceTypeLabels: Record<string, string> = {
  order: 'Đơn hàng',
  product_variant: 'Phiên bản sản phẩm',
  return_request: 'Yêu cầu trả hàng',
};

type VariantSummary = {
  variantId: string;
  sku: string;
  sizeLabel: string | null;
  colorName: string | null;
  itemType: string | null;
  stockDelta: number;
  reservedDelta: number;
  stockAfter: number;
  reservedAfter: number;
  movements: InventoryMovement[];
};

type MovementGroup = {
  id: string;
  title: string;
  eventType: string;
  referenceType: string | null;
  referenceId: string | null;
  productNames: string[];
  createdAt: string;
  stockDelta: number;
  reservedDelta: number;
  variants: VariantSummary[];
};

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatEventType(eventType: string) {
  return inventoryEventLabels[eventType] ?? eventType;
}

function groupKey(movement: InventoryMovement) {
  if (movement.referenceType === 'order' && movement.referenceId) {
    return `order:${movement.referenceId}:${movement.eventType}`;
  }
  if (movement.referenceType === 'return_request' && movement.referenceId) {
    return `return:${movement.referenceId}:${movement.eventType}`;
  }
  if (
    movement.eventType === 'variant_created' ||
    movement.eventType === 'initial_stock' ||
    movement.eventType === 'admin_adjustment'
  ) {
    const minute = movement.createdAt.slice(0, 16);
    return `admin:${movement.productId}:${movement.actorId ?? 'system'}:${movement.eventType}:${minute}`;
  }
  return `${movement.referenceType ?? 'event'}:${movement.referenceId ?? movement.id}:${movement.eventType}`;
}

export function groupInventoryMovements(
  movements: InventoryMovement[],
): MovementGroup[] {
  const grouped = new Map<string, InventoryMovement[]>();
  for (const movement of movements) {
    const key = groupKey(movement);
    grouped.set(key, [...(grouped.get(key) ?? []), movement]);
  }

  return [...grouped.entries()].map(([id, rows]) => {
    const first = rows[0];
    const byVariant = new Map<string, InventoryMovement[]>();
    for (const row of rows) {
      byVariant.set(row.variantId, [
        ...(byVariant.get(row.variantId) ?? []),
        row,
      ]);
    }
    const variants = [...byVariant.values()].map((variantRows) => {
      const latest = variantRows[0];
      return {
        variantId: latest.variantId,
        sku: latest.sku,
        sizeLabel: latest.sizeLabel,
        colorName: latest.colorName,
        itemType: latest.itemType,
        stockDelta: variantRows.reduce((sum, row) => sum + row.stockDelta, 0),
        reservedDelta: variantRows.reduce(
          (sum, row) => sum + row.reservedDelta,
          0,
        ),
        stockAfter: latest.stockAfter,
        reservedAfter: latest.reservedAfter,
        movements: variantRows,
      };
    });
    const productNames = [...new Set(rows.map((row) => row.productName))];
    const referenceLabel = first.referenceType
      ? (referenceTypeLabels[first.referenceType] ?? first.referenceType)
      : null;
    const title =
      referenceLabel && first.referenceId
        ? `${referenceLabel} ${first.referenceId}`
        : `${formatEventType(first.eventType)} · ${productNames.join(', ')}`;

    return {
      id,
      title,
      eventType: first.eventType,
      referenceType: first.referenceType,
      referenceId: first.referenceId,
      productNames,
      createdAt: first.createdAt,
      stockDelta: rows.reduce((sum, row) => sum + row.stockDelta, 0),
      reservedDelta: rows.reduce((sum, row) => sum + row.reservedDelta, 0),
      variants,
    };
  });
}

function Delta({
  value,
  kind = 'stock',
}: {
  value: number;
  kind?: 'stock' | 'reserved';
}) {
  const color =
    value === 0
      ? 'text-slate-500'
      : kind === 'stock'
        ? value > 0
          ? 'text-emerald-600'
          : 'text-red-600'
        : value > 0
          ? 'text-amber-600'
          : 'text-sky-600';
  return <span className={`font-semibold ${color}`}>{formatDelta(value)}</span>;
}

export default function AdminInventoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMovements(await getInventoryMovements(undefined, 500));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không tải được lịch sử biến động tồn kho.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const groups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
      ? movements.filter((movement) =>
          [
            movement.productName,
            movement.sku,
            movement.sizeLabel,
            movement.colorName,
            movement.eventType,
            formatEventType(movement.eventType),
            movement.referenceId,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword)),
        )
      : movements;
    return groupInventoryMovements(filtered);
  }, [movements, search]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold">
            <Warehouse className="h-6 w-6 text-violet-600" />
            Đối soát tồn kho
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi lượt thêm sản phẩm, đặt hàng, hủy hoặc hoàn hàng được gom thành
            một dòng tổng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="glass-card p-4">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo sản phẩm, SKU, size, màu hoặc mã đơn..."
            className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-3 text-sm"
          />
        </label>
      </div>

      <div className="space-y-3">
        {groups.map((group) => (
          <details key={group.id} className="group glass-card overflow-hidden">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 px-5 py-4 hover:bg-white/45">
              <ChevronRight className="h-4 w-4 shrink-0 text-violet-500 transition-transform group-open:rotate-90" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold" title={group.title}>
                  {group.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(group.createdAt)} ·{' '}
                  {formatEventType(group.eventType)} · {group.variants.length}{' '}
                  biến thể
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-5 text-right text-xs">
                <span className="text-muted-foreground">Tồn kho</span>
                <span className="text-muted-foreground">Giữ chỗ</span>
                <Delta value={group.stockDelta} />
                <Delta value={group.reservedDelta} kind="reserved" />
              </div>
            </summary>

            <div className="border-t border-white/40 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <PackageOpen className="h-4 w-4" /> Tổng theo từng biến thể
              </div>
              <div className="space-y-2">
                {group.variants.map((variant) => (
                  <details
                    key={variant.variantId}
                    className="rounded-xl border border-white/60 bg-white/70"
                  >
                    <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{variant.sku}</p>
                        <p className="text-xs text-muted-foreground">
                          Size {variant.sizeLabel || '—'} · Màu{' '}
                          {variant.colorName || '—'} ·{' '}
                          {variant.itemType || 'Sản phẩm'}
                        </p>
                      </div>
                      <span className="text-right text-xs">
                        Tồn <Delta value={variant.stockDelta} />
                      </span>
                      <span className="text-right text-xs">
                        Giữ{' '}
                        <Delta value={variant.reservedDelta} kind="reserved" />
                      </span>
                    </summary>
                    <div className="border-t border-slate-100 px-4 py-3">
                      {variant.movements.map((movement) => (
                        <div
                          key={movement.id}
                          className="grid gap-1 border-b border-slate-100 py-2 text-xs last:border-0 sm:grid-cols-[160px_1fr_auto]"
                        >
                          <span className="text-muted-foreground">
                            {formatDateTime(movement.createdAt)}
                          </span>
                          <span>{formatEventType(movement.eventType)}</span>
                          <span>
                            Tồn <Delta value={movement.stockDelta} /> · giữ{' '}
                            <Delta
                              value={movement.reservedDelta}
                              kind="reserved"
                            />{' '}
                            · sau ghi nhận {movement.stockAfter}/
                            {movement.reservedAfter}
                          </span>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </details>
        ))}
        {!loading && groups.length === 0 ? (
          <div className="glass-card px-4 py-10 text-center text-muted-foreground">
            Chưa có biến động phù hợp.
          </div>
        ) : null}
      </div>
    </div>
  );
}
