'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import { registerApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await registerApi(formData);
      await login({ email: formData.email, password: formData.password });
      router.push('/');
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    {
      name: 'fullName',
      label: 'Họ và tên',
      type: 'text',
      icon: User,
      placeholder: 'Nguyễn Văn An',
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      icon: Mail,
      placeholder: 'email@example.com',
    },
    {
      name: 'phone',
      label: 'Số điện thoại',
      type: 'tel',
      icon: Phone,
      placeholder: '0901234567',
    },
    {
      name: 'password',
      label: 'Mật khẩu',
      type: showPassword ? 'text' : 'password',
      icon: Lock,
      placeholder: 'Ít nhất 6 ký tự',
    },
    {
      name: 'confirmPassword',
      label: 'Xác nhận mật khẩu',
      type: showPassword ? 'text' : 'password',
      icon: Lock,
      placeholder: 'Nhập lại mật khẩu',
    },
  ];

  return (
    <div className="glass-card p-6 max-w-2xl mx-auto w-full">
      <div className="text-center mb-5">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Đăng ký
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl mb-4">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {fields.map((field) => (
            <div
              key={field.name}
              className={
                field.name === 'confirmPassword' ? 'md:col-span-2' : ''
              }
            >
              <label className="block text-xs font-semibold text-foreground mb-1">
                {field.label}
              </label>
              <div className="relative">
                <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name as keyof typeof formData]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-white/60 border border-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:bg-white transition-all text-xs placeholder:text-muted-foreground/60"
                />
                {(field.name === 'password' ||
                  field.name === 'confirmPassword') &&
                  field.name === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-white/20 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 px-6 text-xs font-bold disabled:opacity-70 w-full md:w-auto md:min-w-[140px] shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Đang đăng ký...
              </>
            ) : (
              'Đăng ký'
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="text-violet-600 font-bold hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
