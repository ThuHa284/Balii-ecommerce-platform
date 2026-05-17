"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { UserRole } from "@/types/user.types";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // login() now handles API call + state update internally
      await login({ email, password });

      // Read the fresh user from the store after login succeeds
      const user = useAuthStore.getState().user;

      // Role-based redirect
      if (user?.role === UserRole.ADMIN) {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    }
  };

  return (
    <div className="glass-card p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Chào mừng bạn trở lại với Balii Sleepwear</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-6 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <div>
          <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoComplete="email"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/50 border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all text-sm placeholder:text-muted-foreground/60 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-foreground mb-1.5">
            Mật khẩu
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full pl-10 pr-12 py-3 rounded-xl bg-white/50 border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all text-sm placeholder:text-muted-foreground/60 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Forgot Password */}
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang đăng nhập...
            </>
          ) : (
            "Đăng nhập"
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-violet-100" />
          <span className="text-xs text-muted-foreground">hoặc</span>
          <div className="flex-1 h-px bg-violet-100" />
        </div>

        {/* Google OAuth */}
        <button
          id="login-google-btn"
          type="button"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl border-2 border-white/50 bg-white/40 hover:bg-white/60 transition-all text-sm font-medium text-foreground hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Đăng nhập với Google
        </button>
      </form>

      {/* Register Link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Đăng ký ngay
        </Link>
      </p>

      {/* Dev hint */}
      <div className="mt-6 p-3 rounded-xl bg-violet-50/60 border border-violet-100 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground/70">Tài khoản thử nghiệm:</p>
        <p>👤 User: <span className="font-mono">user@gmail.com</span> / <span className="font-mono">123456</span></p>
        <p>🛡️ Admin: <span className="font-mono">admin@gmail.com</span> / <span className="font-mono">123456</span></p>
      </div>
    </div>
  );
}
