'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import { verifyEmailApi } from '@/lib/api/auth.api';
import { getUserErrorMessage } from '@/lib/error-utils';

type VerificationState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const started = useRef(false);
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('Đang xác thực địa chỉ email...');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      const timer = window.setTimeout(() => {
        setState('error');
        setMessage('Liên kết xác thực không hợp lệ hoặc đã bị thiếu token.');
      }, 0);
      return () => window.clearTimeout(timer);
    }

    void verifyEmailApi(token)
      .then((result) => {
        setState('success');
        setMessage(result.message || 'Email đã được xác thực thành công.');
      })
      .catch((reason: unknown) => {
        setState('error');
        setMessage(
          getUserErrorMessage(
            reason,
            'Không thể xác thực email. Liên kết có thể đã hết hạn.',
          ),
        );
      });
  }, []);

  return (
    <div
      className="glass-card p-8 max-w-lg mx-auto w-full text-center"
      aria-live="polite"
    >
      {state === 'loading' && (
        <Loader2 className="mx-auto mb-4 h-14 w-14 animate-spin text-violet-500" />
      )}
      {state === 'success' && (
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
      )}
      {state === 'error' && (
        <XCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
      )}
      <h1 className="font-heading text-2xl font-bold text-foreground mb-2">
        Xác thực email
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{message}</p>
      {state !== 'loading' && (
        <Link href="/login" className="btn-primary inline-flex">
          Đi tới đăng nhập
        </Link>
      )}
    </div>
  );
}
