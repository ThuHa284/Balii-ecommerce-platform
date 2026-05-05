"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Loader2, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Mật khẩu xác nhận không khớp"); return; }
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSuccess(true);
    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="glass-card p-8 text-center">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Đặt lại thành công</h1>
        <p className="text-sm text-muted-foreground mb-6">Mật khẩu đã được cập nhật. Bạn có thể đăng nhập ngay bây giờ.</p>
        <Link href="/login" className="btn-primary inline-block">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-8">
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Đặt lại mật khẩu</h1>
        <p className="text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn</p>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Mật khẩu mới</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Ít nhất 6 ký tự" required className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all text-sm placeholder:text-muted-foreground/60" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Xác nhận mật khẩu</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu" required className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all text-sm placeholder:text-muted-foreground/60" />
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</> : "Đặt lại mật khẩu"}
        </button>
      </form>
    </div>
  );
}
