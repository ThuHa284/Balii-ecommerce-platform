'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Home, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

import { getOrderById } from '@/lib/api/orders.api';
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/constants';

const POLL_INTERVAL_MS = 3000;

type CheckoutResultStatusProps = {
  orderId: string;
  orderCode: string;
  initialPaymentStatus: string;
  providerMessage?: string;
};

export default function CheckoutResultStatus({
  orderId,
  orderCode,
  initialPaymentStatus,
  providerMessage,
}: CheckoutResultStatusProps) {
  const router = useRouter();
  const [paymentStatus, setPaymentStatus] = useState(initialPaymentStatus);

  useEffect(() => {
    if (!orderId || paymentStatus !== 'pending') {
      return;
    }

    let cancelled = false;

    const refreshPaymentStatus = async () => {
      const order = await getOrderById(orderId);
      if (!order || cancelled) {
        return;
      }

      if (order.paymentStatus === 'paid') {
        toast.success('Thanh toán thành công!');
        const params = new URLSearchParams({
          orderId: order.id,
          orderCode: order.orderCode,
          paymentStatus: 'paid',
          checkoutMode: 'online',
        });
        router.replace(`/checkout/success?${params.toString()}`);
        return;
      }

      if (order.paymentStatus === 'failed') {
        setPaymentStatus('failed');
      }
    };

    void refreshPaymentStatus();
    const timer = window.setInterval(() => {
      void refreshPaymentStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId, paymentStatus, router]);

  const isPaid = paymentStatus === 'paid';
  const isFailed = paymentStatus === 'failed';
  const statusClass =
    PAYMENT_STATUS_COLORS[paymentStatus] || PAYMENT_STATUS_COLORS.pending;
  const statusLabel =
    PAYMENT_STATUS_LABELS[paymentStatus] || PAYMENT_STATUS_LABELS.pending;

  return (
    <div className="pb-16 pt-28">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="glass-card p-12">
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
              isFailed
                ? 'bg-rose-100'
                : isPaid
                  ? 'bg-emerald-100'
                  : 'bg-amber-100'
            }`}
          >
            {isFailed ? (
              <AlertCircle className="h-10 w-10 text-rose-500" />
            ) : isPaid ? (
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            ) : (
              <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
            )}
          </div>
          <h1 className="mb-3 font-heading text-3xl font-bold text-foreground">
            {isPaid
              ? 'Thanh toán thành công!'
              : isFailed
                ? 'Thanh toán chưa thành công'
                : 'Đang xác nhận thanh toán'}
          </h1>
          <p className="mb-2 text-muted-foreground">
            {isPaid
              ? 'Đơn hàng của bạn đã được thanh toán và ghi nhận trong hệ thống.'
              : isFailed
                ? 'VNPay chưa xác nhận giao dịch thành công. Bạn có thể thử thanh toán lại từ trang đơn hàng.'
                : 'Hệ thống đang chờ IPN bảo mật từ VNPay. Trang sẽ tự động cập nhật khi giao dịch được xác nhận.'}
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            Mã đơn hàng:{' '}
            <span className="font-bold text-primary">{orderCode}</span>
          </p>
          <p className="mb-8 text-xs text-muted-foreground">
            Hình thức: Thanh toán online VNPay
          </p>

          <div className="glass-card mb-8 p-4 text-left">
            <div className="flex items-center gap-3 text-sm">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  Trạng thái thanh toán
                </p>
                <div className="mt-1">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                {providerMessage ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Mã phản hồi VNPay: {providerMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/account/orders"
              className="btn-outline inline-flex flex-1 items-center justify-center gap-2"
            >
              <Package className="h-4 w-4" /> Xem đơn hàng
            </Link>
            <Link
              href="/"
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" /> Trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
