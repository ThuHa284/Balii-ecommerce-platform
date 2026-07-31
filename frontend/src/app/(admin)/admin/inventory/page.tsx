'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Warehouse } from 'lucide-react';
import { toast } from 'sonner';
import {
  getInventoryMovements,
  InventoryMovement,
} from '@/lib/api/products.api';
import { formatDateTime } from '@/lib/utils';

const inventoryEventLabels: Record<string, string> = {
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

function formatDelta(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatEventType(eventType: string) {
  return inventoryEventLabels[eventType] ?? eventType;
}

function formatReferenceType(referenceType?: string | null) {
  if (!referenceType) return 'Không có';
  return referenceTypeLabels[referenceType] ?? referenceType;
}

export default function AdminInventoryPage() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMovements(await getInventoryMovements(undefined, 200));
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

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return movements;
    return movements.filter((movement) =>
      [
        movement.productName,
        movement.sku,
        movement.eventType,
        formatEventType(movement.eventType),
        movement.referenceId,
        formatReferenceType(movement.referenceType),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
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
            Theo dõi mọi lần nhập, giữ hàng, trừ kho và hoàn kho để kiểm tra lệch tồn.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tồn là số còn trong kho. Giữ chỗ là số đã được đặt cho đơn chưa hoàn tất, chưa nên bán cho đơn khác.
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
            placeholder="Tìm theo sản phẩm, SKU, loại sự kiện hoặc mã tham chiếu..."
            className="w-full rounded-xl border border-white/50 bg-white/60 py-2.5 pl-10 pr-3 text-sm"
          />
        </label>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Sản phẩm / SKU</th>
                <th className="px-4 py-3">Sự kiện</th>
                <th className="px-4 py-3 text-right">Tồn thay đổi</th>
                <th className="px-4 py-3 text-right">Giữ chỗ thay đổi</th>
                <th className="px-4 py-3 text-right">Sau ghi nhận</th>
                <th className="px-4 py-3">Tham chiếu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((movement) => (
                <tr key={movement.id} className="hover:bg-white/45">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {formatDateTime(movement.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{movement.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {movement.sku}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                      {formatEventType(movement.eventType)}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      movement.stockDelta < 0
                        ? 'text-red-600'
                        : movement.stockDelta > 0
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {formatDelta(movement.stockDelta)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      movement.reservedDelta > 0
                        ? 'text-amber-600'
                        : movement.reservedDelta < 0
                          ? 'text-sky-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {formatDelta(movement.reservedDelta)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                    Tồn {movement.stockAfter} · giữ chỗ {movement.reservedAfter}
                  </td>
                  <td className="max-w-64 px-4 py-3 text-xs text-muted-foreground">
                    <p>{formatReferenceType(movement.referenceType)}</p>
                    <p className="truncate" title={movement.referenceId || ''}>
                      {movement.referenceId || 'Không có mã tham chiếu'}
                    </p>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Chưa có biến động phù hợp.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}