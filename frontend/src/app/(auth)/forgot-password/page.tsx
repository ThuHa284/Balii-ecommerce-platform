"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSent(true);
    setIsLoading(false);
  };

  return (
    <div className="glass-card p-8">
      {isSent ? (
        <div className="text-center py-4">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Đã gửi email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư.
          </p>
          <Link href="/login" className="btn-primary inline-block">
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Quên mật khẩu</h1>
            <p className="text-sm text-muted-foreground">Nhập email để nhận link đặt lại mật khẩu</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all text-sm placeholder:text-muted-foreground/60" />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
              {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Đang gửi...</> : "Gửi link đặt lại"}
            </button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            <Link href="/login" className="text-primary hover:underline">← Quay lại đăng nhập</Link>
          </p>
        </>
      )}
    </div>
  );
}
