'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Tag,
  Clock,
  CheckCircle2,
  Gift,
  Percent,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  getAvailableVouchers,
  getMyVouchers,
  saveVoucher,
} from '@/lib/api/vouchers.api';
import {
  Voucher,
  UserVoucher,
  VoucherDiscountType,
} from '@/types/voucher.types';

type Tab = 'available' | 'saved';

export default function VouchersPage() {
  const [tab, setTab] = useState<Tab>('available');
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([]);
  const [myVouchers, setMyVouchers] = useState<UserVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [savedCodes, setSavedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [availableResult, savedResult] = await Promise.allSettled([
        getAvailableVouchers(),
        getMyVouchers(),
      ]);

      const available =
        availableResult.status === 'fulfilled' ? availableResult.value : [];
      const saved = savedResult.status === 'fulfilled' ? savedResult.value : [];

      setAvailableVouchers(available);
      setMyVouchers(saved);
      setSavedCodes(new Set(saved.map((uv) => uv.voucher.code)));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(code: string) {
    setSavingCode(code);
    try {
      const uv = await saveVoucher(code);
      setMyVouchers((prev) => [...prev, uv]);
      setSavedCodes((prev) => new Set(prev).add(code));
    } finally {
      setSavingCode(null);
    }
  }

  function getDiscountLabel(voucher: Voucher) {
    if (voucher.discountType === VoucherDiscountType.PERCENT) {
      return `${voucher.discountValue}%`;
    }
    return formatCurrency(voucher.discountValue);
  }

  function getRemainingPercent(voucher: Voucher) {
    return Math.max(
      0,
      ((voucher.usageLimit - voucher.usedCount) / voucher.usageLimit) * 100,
    );
  }

  if (loading) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">
          Voucher của tôi
        </h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-20 rounded-xl bg-white/50" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-white/50 rounded w-1/3" />
                  <div className="h-3 bg-white/40 rounded w-2/3" />
                  <div className="h-3 bg-white/30 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">
        Voucher của tôi
      </h1>

      {/* Tabs */}
      <div className="glass-card p-1.5 mb-6 inline-flex rounded-xl">
        <button
          onClick={() => setTab('available')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'available'
              ? 'bg-violet-500 text-white shadow-lg shadow-violet-300/25'
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Voucher có sẵn
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === 'available'
                  ? 'bg-white/20'
                  : 'bg-violet-100 text-violet-600'
              }`}
            >
              {availableVouchers.length}
            </span>
          </span>
        </button>
        <button
          onClick={() => setTab('saved')}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'saved'
              ? 'bg-violet-500 text-white shadow-lg shadow-violet-300/25'
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Đã thu thập
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === 'saved'
                  ? 'bg-white/20'
                  : 'bg-violet-100 text-violet-600'
              }`}
            >
              {myVouchers.length}
            </span>
          </span>
        </button>
      </div>

      {/* Available Vouchers */}
      {tab === 'available' && (
        <div className="space-y-4">
          {availableVouchers.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Gift className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Hiện chưa có voucher nào</p>
            </div>
          ) : (
            availableVouchers.map((voucher) => {
              const isSaved = savedCodes.has(voucher.code);
              const remaining = getRemainingPercent(voucher);
              return (
                <div
                  key={voucher.id}
                  className="glass-card overflow-hidden hover:bg-white/75 transition-all duration-300 group"
                >
                  <div className="flex">
                    {/* Left — Discount Badge */}
                    <div className="w-32 sm:w-36 shrink-0 bg-gradient-to-br from-violet-500 to-purple-600 flex flex-col items-center justify-center p-4 relative">
                      <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <Sparkles className="w-20 h-20 absolute -top-2 -right-2 text-white" />
                      </div>
                      <div className="text-white text-center relative z-10">
                        {voucher.discountType ===
                        VoucherDiscountType.PERCENT ? (
                          <Percent className="w-5 h-5 mx-auto mb-1 opacity-80" />
                        ) : (
                          <Banknote className="w-5 h-5 mx-auto mb-1 opacity-80" />
                        )}
                        <p className="text-2xl sm:text-3xl font-bold leading-tight">
                          {voucher.discountType === VoucherDiscountType.PERCENT
                            ? `${voucher.discountValue}%`
                            : `${Math.round(voucher.discountValue / 1000)}K`}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider opacity-80 mt-1">
                          Giảm giá
                        </p>
                      </div>
                      {/* Coupon notches */}
                      <div className="absolute top-1/2 -right-3 w-6 h-6 bg-background rounded-full -translate-y-1/2" />
                    </div>

                    {/* Right — Details */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                              {voucher.name}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {voucher.description}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-mono bg-violet-50 text-violet-600 px-2.5 py-1 rounded-lg border border-violet-200">
                            {voucher.code}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
                          {voucher.minOrderValue > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              Đơn tối thiểu{' '}
                              {formatCurrency(voucher.minOrderValue)}
                            </span>
                          )}
                          {voucher.maxDiscount && (
                            <span className="flex items-center gap-1">
                              <Banknote className="w-3 h-3" />
                              Giảm tối đa {formatCurrency(voucher.maxDiscount)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            HSD: {formatDate(voucher.endDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/30">
                        {/* Usage progress */}
                        <div className="flex-1 mr-4">
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                            <span>
                              Đã dùng {voucher.usedCount}/{voucher.usageLimit}
                            </span>
                            <span>{Math.round(remaining)}% còn lại</span>
                          </div>
                          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${remaining}%` }}
                            />
                          </div>
                        </div>

                        {/* Save button */}
                        {isSaved ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã lưu
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSave(voucher.code)}
                            disabled={savingCode === voucher.code}
                            className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
                          >
                            {savingCode === voucher.code
                              ? 'Đang lưu...'
                              : 'Thu thập'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* My Vouchers */}
      {tab === 'saved' && (
        <div className="space-y-4">
          {myVouchers.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Ticket className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                Bạn chưa thu thập voucher nào
              </p>
              <button
                onClick={() => setTab('available')}
                className="btn-primary inline-block text-sm"
              >
                Xem voucher có sẵn
              </button>
            </div>
          ) : (
            myVouchers.map((uv) => {
              const voucher = uv.voucher;
              const isExpired = new Date(voucher.endDate) < new Date();
              const remaining = getRemainingPercent(voucher);
              return (
                <div
                  key={uv.id}
                  className={`glass-card overflow-hidden transition-all duration-300 ${
                    uv.isUsed || isExpired ? 'opacity-60' : 'hover:bg-white/75'
                  }`}
                >
                  <div className="flex">
                    {/* Left — Discount Badge */}
                    <div
                      className={`w-32 sm:w-36 shrink-0 flex flex-col items-center justify-center p-4 relative ${
                        uv.isUsed || isExpired
                          ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                          : 'bg-gradient-to-br from-violet-500 to-purple-600'
                      }`}
                    >
                      <div className="text-white text-center">
                        {voucher.discountType ===
                        VoucherDiscountType.PERCENT ? (
                          <Percent className="w-5 h-5 mx-auto mb-1 opacity-80" />
                        ) : (
                          <Banknote className="w-5 h-5 mx-auto mb-1 opacity-80" />
                        )}
                        <p className="text-2xl sm:text-3xl font-bold leading-tight">
                          {voucher.discountType === VoucherDiscountType.PERCENT
                            ? `${voucher.discountValue}%`
                            : `${Math.round(voucher.discountValue / 1000)}K`}
                        </p>
                        <p className="text-[10px] uppercase tracking-wider opacity-80 mt-1">
                          Giảm giá
                        </p>
                      </div>
                      {/* Overlay for used/expired */}
                      {(uv.isUsed || isExpired) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/40 px-3 py-1 rounded-full">
                            {uv.isUsed ? 'Đã dùng' : 'Hết hạn'}
                          </span>
                        </div>
                      )}
                      <div className="absolute top-1/2 -right-3 w-6 h-6 bg-background rounded-full -translate-y-1/2" />
                    </div>

                    {/* Right — Details */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-heading font-semibold text-foreground">
                            {voucher.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {voucher.description}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-mono bg-violet-50 text-violet-600 px-2.5 py-1 rounded-lg border border-violet-200">
                          {voucher.code}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-3">
                        {voucher.minOrderValue > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Đơn tối thiểu{' '}
                            {formatCurrency(voucher.minOrderValue)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          HSD: {formatDate(voucher.endDate)}
                        </span>
                      </div>

                      {/* Status & Usage */}
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/30">
                        <div className="flex-1 mr-4">
                          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                uv.isUsed || isExpired
                                  ? 'bg-gray-400'
                                  : 'bg-gradient-to-r from-violet-400 to-purple-500'
                              }`}
                              style={{ width: `${remaining}%` }}
                            />
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-3 py-1.5 rounded-xl ${
                            uv.isUsed
                              ? 'bg-gray-100 text-gray-500'
                              : isExpired
                                ? 'bg-orange-50 text-orange-500'
                                : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          {uv.isUsed
                            ? 'Đã sử dụng'
                            : isExpired
                              ? 'Đã hết hạn'
                              : 'Sẵn sàng dùng'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
