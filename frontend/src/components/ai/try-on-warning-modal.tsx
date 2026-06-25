'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Shirt, X } from 'lucide-react';
import { RecommendedProduct } from '@/lib/api/products.api';
import { formatCurrency } from '@/lib/utils';
import { TryOnSyncResponse } from '@/types/tryon.types';

interface TryOnWarningModalProps {
  open: boolean;
  warning: TryOnSyncResponse | null;
  recommendedProducts: RecommendedProduct[];
  isContinuing: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export default function TryOnWarningModal({
  open,
  warning,
  recommendedProducts,
  isContinuing,
  onClose,
  onContinue,
}: TryOnWarningModalProps) {
  if (!open || !warning) return null;

  const translateTryOnText = (value: string) =>
    value
      .replace(/\bmale\b/gi, 'nam')
      .replace(/\bfemale\b/gi, 'n\u1eef')
      .replace(/\bunisex\b/gi, 'unisex')
      .replace(/\badult\b/gi, 'ng\u01b0\u1eddi l\u1edbn')
      .replace(/\bteen\b/gi, 'thi\u1ebfu ni\u00ean')
      .replace(/\bmiddle_age\b/gi, 'trung ni\u00ean')
      .replace(/\bsenior\b/gi, 'l\u1edbn tu\u1ed5i')
      .replace(/\bchild\b/gi, 'tr\u1ebb em');

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-card max-h-[90vh] w-full max-w-5xl overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/30 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-foreground">
                Xác nhận tiếp tục thử đồ
              </h2>
              <p className="text-sm text-muted-foreground">
                Hệ thống phát hiện sản phẩm có thể không phù hợp. Bạn vẫn có thể
                tiếp tục nếu muốn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-white/40 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white/50 p-4 text-sm text-muted-foreground">
              Nếu bạn đồng ý, hệ thống sẽ tiếp tục tạo ảnh mặc thử với đúng ảnh
              và sản phẩm bạn đã chọn.
            </div>

            <div className="rounded-2xl bg-amber-50/80 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700">
                Cảnh báo
              </h3>
              <div className="space-y-2">
                {(warning.warnings ?? []).map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-amber-200 bg-white/70 px-4 py-3 text-sm text-amber-900"
                  >
                    {translateTryOnText(item)}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-violet-50/80 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-violet-700">
                Gợi ý
              </h3>
              <div className="space-y-2">
                {(warning.suggestions ?? []).map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-violet-200 bg-white/70 px-4 py-3 text-sm text-violet-900"
                  >
                    {translateTryOnText(item)}
                  </div>
                ))}
                {(!warning.suggestions || warning.suggestions.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    Bạn vẫn có thể tiếp tục để tự đánh giá kết quả mặc thử.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border-2 border-white/50 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/40"
              >
                Hủy
              </button>
              <button
                onClick={onContinue}
                disabled={isContinuing}
                className="btn-primary flex-1 py-3 text-sm disabled:opacity-60"
              >
                {isContinuing ? 'Đang tiếp tục...' : 'Vẫn tiếp tục'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white/50 p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Shirt className="h-4 w-4 text-violet-500" />
                Sản phẩm gợi ý
              </div>
              <p className="text-sm text-muted-foreground">
                Đây là các sản phẩm có thể phù hợp hơn nếu bạn muốn chọn lại
                trước khi tiếp tục.
              </p>
            </div>

            {recommendedProducts.length === 0 && (
              <div className="rounded-2xl bg-white/50 p-5 text-sm text-muted-foreground">
                Chưa có sản phẩm gợi ý phù hợp.
              </div>
            )}

            <div className="space-y-3">
              {recommendedProducts.map((product) => (
                <div
                  key={product.id}
                  className="glass-card flex items-center gap-4 overflow-hidden p-3"
                >
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-white/40">
                    <Image
                      src={product.thumbnail || '/images/placeholder.jpg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm font-bold text-primary">
                      {formatCurrency(product.salePrice ?? product.basePrice)}
                    </p>
                    <Link
                      href={`/products/${product.slug}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition-colors hover:text-violet-700"
                    >
                      Xem sản phẩm
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
