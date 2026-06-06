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
    <div className="glass-card p-6 max-w-md mx-auto w-full">
      {isSent ? (
        <div className="text-center py-4 space-y-4">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">Đã gửi email</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Chúng tôi đã gửi link đặt lại mật khẩu đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư của bạn.
            </p>
          </div>
          <Link href="/login" className="btn-primary text-xs py-2 px-4 inline-block shadow-md">
            Quay lại đăng nhập
          </Link>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <h1 className="font-heading text-2xl font-bold text-foreground">Quên mật khẩu</h1>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Email đăng ký</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="email@example.com" 
                  required 
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/60 border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all text-xs placeholder:text-muted-foreground/60" 
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading} 
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold shadow-md"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                "Gửi link đặt lại mật khẩu"
              )}
            </button>
          </form>
          
          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link href="/login" className="text-violet-600 font-bold hover:underline">
              ← Quay lại đăng nhập
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
