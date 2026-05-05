"use client";

import { RefreshCcw, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-12 text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Warning icon with soft pink glow */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-rose-50/80 border-2 border-rose-100 mb-6 mx-auto">
          <AlertTriangle className="w-12 h-12 text-rose-400" />
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-3">
          Đã có lỗi xảy ra
        </h1>
        <p className="text-muted-foreground mb-2 text-sm leading-relaxed">
          Xin lỗi vì sự bất tiện này. Balii đã ghi nhận sự cố và đang khắc phục.
        </p>
        {error?.digest && (
          <p className="text-xs text-muted-foreground/60 mb-6 font-mono bg-pink-50/50 rounded-lg px-3 py-1.5">
            Mã lỗi: {error.digest}
          </p>
        )}
        {!error?.digest && <div className="mb-6" />}

        <button
          onClick={() => reset()}
          className="btn-primary inline-flex items-center gap-2 px-8"
        >
          <RefreshCcw className="w-4 h-4" />
          Thử lại
        </button>
      </div>
    </div>
  );
}
