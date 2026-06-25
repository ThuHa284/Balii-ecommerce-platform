'use client';

import { useState } from 'react';
import {
  Brain,
  Info,
  Loader2,
  Save,
  Settings,
  Store,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import AuthGuard from '@/components/auth/auth-guard';
import { UserRole } from '@/types/user.types';

export default function AdminSettingsPage() {
  const [storeName, setStoreName] = useState('Balii Sleepwear');
  const [storeEmail, setStoreEmail] = useState('contact@balii.vn');
  const [storePhone, setStorePhone] = useState('0987 654 321');
  const [freeShipMin, setFreeShipMin] = useState(500000);
  const [crawlInterval, setCrawlInterval] = useState('daily');
  const [priceTolerance, setPriceTolerance] = useState(15);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      setIsSaving(false);
      toast.success('Đã lưu thay đổi cài đặt hệ thống.');
    }, 800);
  };

  return (
    <AuthGuard
      requiredRole={UserRole.SUPER_ADMIN}
      redirectTo="/admin/dashboard"
    >
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-white/20 pb-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 font-heading text-3xl font-bold text-foreground">
              <Settings className="h-8 w-8 shrink-0 text-violet-500" />
              Cài đặt hệ thống
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Khu vực này chỉ dành cho quản trị hệ thống để quản lý cấu hình hệ
              thống và các tham số toàn cục.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary self-start shadow-md sm:self-auto"
          >
            <span className="flex items-center justify-center gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu cấu hình
                </>
              )}
            </span>
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        >
          <div className="space-y-6 lg:col-span-2">
            <div className="glass-card space-y-4 p-6">
              <h3 className="flex items-center gap-2 border-b border-white/30 pb-2 font-heading text-lg font-bold text-foreground">
                <Store className="h-5 w-5 text-violet-500" />
                Thông tin cửa hàng
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Tên cửa hàng
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Email liên hệ
                  </label>
                  <input
                    type="email"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Hotline kinh doanh
                  </label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    className="w-full rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Đơn vị tiền tệ chính
                  </label>
                  <input
                    type="text"
                    value="VND"
                    disabled
                    className="w-full rounded-xl border border-white/80 bg-gray-100 px-3 py-2 text-sm text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="glass-card space-y-4 p-6">
              <h3 className="flex items-center gap-2 border-b border-white/30 pb-2 font-heading text-lg font-bold text-foreground">
                <Truck className="h-5 w-5 text-violet-500" />
                Cấu hình vận chuyển và combo
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Mức tối thiểu được freeship
                  </label>
                  <input
                    type="number"
                    value={freeShipMin}
                    onChange={(e) => setFreeShipMin(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Phí phụ thu combo 1
                  </label>
                  <input
                    type="number"
                    value={119000}
                    disabled
                    className="w-full rounded-xl border border-white/80 bg-gray-100 px-3 py-2 text-sm text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card space-y-4 p-6">
              <h3 className="flex items-center gap-2 border-b border-white/30 pb-2 font-heading text-lg font-bold text-foreground">
                <Brain className="h-5 w-5 text-violet-500" />
                Thiết lập AI Agent
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Tần suất crawl đối thủ
                  </label>
                  <select
                    value={crawlInterval}
                    onChange={(e) => setCrawlInterval(e.target.value)}
                    className="w-full cursor-pointer rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  >
                    <option value="hourly">Mỗi giờ một lần</option>
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                    <option value="manual">Thủ công</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Ngưỡng cảnh báo chênh lệch giá (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={priceTolerance}
                      onChange={(e) =>
                        setPriceTolerance(Number(e.target.value))
                      }
                      className="flex-1 cursor-pointer accent-violet-500"
                    />
                    <span className="w-8 shrink-0 text-right font-mono text-sm font-bold text-violet-600">
                      ±{priceTolerance}%
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                    Hệ thống cảnh báo khi giá đối thủ lệch vượt ngưỡng này.
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card flex gap-3 border border-violet-100 bg-violet-50/50 p-5 text-xs leading-relaxed text-muted-foreground">
              <Info className="h-5 w-5 shrink-0 text-violet-500" />
              <div>
                <p className="mb-1 font-bold text-foreground">Đồng bộ:</p>
                <p>
                  Các thay đổi cấu hình được áp dụng sau khi lưu. Khu vực này
                  được tách riêng cho quản trị hệ thống để tránh quản trị viên
                  thông thường thay đổi cấu hình toàn cục.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
