'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getSafeInternalRedirect } from '@/lib/safe-redirect';
import { useCartStore } from '@/store/cart.store';
import { UserRole } from '@/types/user.types';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const hydrateCart = useCartStore((state) => state.hydrateCart);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      await hydrateCart().catch(() => undefined);
      const user = useAuthStore.getState().user;

      if (
        user?.role === UserRole.ADMIN ||
        user?.role === UserRole.SUPER_ADMIN
      ) {
        router.push('/admin/dashboard');
      } else {
        const redirectTo = getSafeInternalRedirect(
          searchParams.get('redirect'),
        );
        router.push(redirectTo);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
      );
    }
  };

  return (
    <div className="glass-card p-6 max-w-md mx-auto w-full">
      <div className="text-center mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Đăng nhập
        </h1>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl mb-4"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-foreground mb-1.5"
          >
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
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/60 border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all text-xs placeholder:text-muted-foreground/60 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label
              htmlFor="login-password"
              className="text-xs font-semibold text-foreground"
            >
              Mật khẩu
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-violet-600 hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/60 border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all text-xs placeholder:text-muted-foreground/60 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang đăng nhập...
              </>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </div>
      </form>

      <p className="text-center text-xs text-muted-foreground mt-4">
        Chưa có tài khoản?{' '}
        <Link
          href="/register"
          className="text-violet-600 font-bold hover:underline"
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}
