'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  QrCode,
} from 'lucide-react';
import { getOrderById } from '@/lib/api/orders.api';
import {
  getPaymentById,
  type PaymentDetailResponse,
} from '@/lib/api/payment.api';
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { PaymentStatus, type Order } from '@/types/order.types';

const POLL_INTERVAL_MS = 5000;
const QR_IMAGE_SIZE = 280;

function buildCheckoutResultUrl(input: {
  orderId: string;
  orderCode: string;
  paymentStatus: 'paid' | 'failed';
}) {
  const params = new URLSearchParams({
    orderId: input.orderId,
    orderCode: input.orderCode,
    paymentStatus: input.paymentStatus,
    checkoutMode: 'online',
  });

  return input.paymentStatus === 'paid'
    ? `/checkout/success?${params.toString()}`
    : `/checkout/result?${params.toString()}`;
}

export default function VnpayCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';
  const orderCode = searchParams.get('orderCode') ?? 'Khong xac dinh';
  const paymentId = searchParams.get('paymentId') ?? '';
  const transactionId = searchParams.get('transactionId') ?? '';

  const [payment, setPayment] = useState<PaymentDetailResponse | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !paymentId) {
      setError('Thieu thong tin giao dich VNPay.');
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPaymentContext = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [paymentData, orderData] = await Promise.all([
          getPaymentById(paymentId),
          getOrderById(orderId),
        ]);

        if (cancelled) {
          return;
        }

        if (!orderData) {
          throw new Error('Khong tim thay don hang.');
        }

        setPayment(paymentData);
        setOrder(orderData);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Khong the tai thong tin thanh toan.',
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPaymentContext();

    return () => {
      cancelled = true;
    };
  }, [orderId, paymentId]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let cancelled = false;

    const syncOrderStatus = async () => {
      try {
        const latestOrder = await getOrderById(orderId);

        if (!latestOrder || cancelled) {
          return;
        }

        setOrder(latestOrder);

        if (latestOrder.paymentStatus === PaymentStatus.PAID) {
          router.replace(
            buildCheckoutResultUrl({
              orderId: latestOrder.id,
              orderCode: latestOrder.orderCode,
              paymentStatus: 'paid',
            }),
          );
          return;
        }

        if (latestOrder.paymentStatus === PaymentStatus.FAILED) {
          router.replace(
            buildCheckoutResultUrl({
              orderId: latestOrder.id,
              orderCode: latestOrder.orderCode,
              paymentStatus: 'failed',
            }),
          );
        }
      } catch {
        // Keep polling quietly; a transient read failure should not break checkout.
      }
    };

    void syncOrderStatus();
    const timer = window.setInterval(() => {
      void syncOrderStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId, router]);

  const paymentUrl = payment?.paymentUrl ?? null;
  const paymentStatus = order?.paymentStatus ?? payment?.status ?? 'pending';
  const paymentStatusClass =
    PAYMENT_STATUS_COLORS[paymentStatus] || PAYMENT_STATUS_COLORS.pending;
  const paymentStatusLabel =
    PAYMENT_STATUS_LABELS[paymentStatus] || PAYMENT_STATUS_LABELS.pending;

  if (isLoading) {
    return (
      <div className="pt-28 pb-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="glass-card flex min-h-[420px] flex-col items-center justify-center gap-4 p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">
                Dang tao ma QR VNPay
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                He thong dang tai thong tin giao dich cho don hang {orderCode}.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payment || !order || !paymentUrl) {
    return (
      <div className="pt-28 pb-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="glass-card p-10 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Khong the hien thi ma QR
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {error ?? 'Giao dich VNPay khong co du lieu thanh toan hop le.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/account/orders" className="btn-outline">
                Xem don hang
              </Link>
              <Link href="/checkout" className="btn-primary">
                Quay lai thanh toan
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary/70">
            VNPay QR Checkout
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-foreground">
            Quet ma QR de thanh toan
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Ban van dang o giao dien cua Balii. Sau khi VNPay xac nhan, trang se
            tu dong cap nhat ket qua thanh toan.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-card p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <p className="font-heading text-xl font-semibold text-foreground">
                  Ma QR thanh toan VNPay
                </p>
                <p className="text-sm text-muted-foreground">
                  Su dung ung dung ngan hang hoac vi ho tro quet QR.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/40 bg-white/60 p-6 text-center">
              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-sm">
                <QRCodeSVG
                  value={paymentUrl}
                  size={QR_IMAGE_SIZE}
                  bgColor="#FFFFFF"
                  fgColor="#111827"
                  level="M"
                  includeMargin
                  title="Ma QR thanh toan VNPay"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Ma giao dich:{' '}
                <span className="font-semibold text-foreground">
                  {transactionId}
                </span>
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary inline-flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Mo VNPay
                </a>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="btn-outline"
                >
                  Xem don hang
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Trang thai thanh toan
              </h2>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${paymentStatusClass}`}
              >
                {paymentStatusLabel}
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                Trang nay tu dong kiem tra ket qua moi sau moi{' '}
                {POLL_INTERVAL_MS / 1000} giay.
              </p>
            </div>

            <div className="glass-card p-6">
              <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">
                Thong tin don hang
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Ma don hang</span>
                  <span className="font-medium text-foreground">
                    {order.orderCode}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Tong thanh toan</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Phuong thuc</span>
                  <span className="font-medium text-foreground">VNPay</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">
                Cach thanh toan
              </h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>1. Mo app ngan hang hoac vi co ho tro quet QR.</li>
                <li>2. Quet ma QR tren man hinh nay hoac bam Mo VNPay.</li>
                <li>3. Xac nhan giao dich trong ung dung cua ban.</li>
                <li>4. Quay lai trang nay neu can; he thong se tu cap nhat.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
