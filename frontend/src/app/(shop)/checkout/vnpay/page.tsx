/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
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
  simulateVnpaySuccess,
  type PaymentDetailResponse,
} from '@/lib/api/payment.api';
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/constants';
import { getUserErrorMessage } from '@/lib/error-utils';
import { formatCurrency } from '@/lib/utils';
import { PaymentStatus, type Order } from '@/types/order.types';

const POLL_INTERVAL_MS = 5000;
const QR_IMAGE_SIZE = 280;
const ENABLE_VNPAY_SIMULATION =
  process.env.NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION === 'true';

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
  const orderCode = searchParams.get('orderCode') ?? 'Không xác định';
  const paymentId = searchParams.get('paymentId') ?? '';
  const transactionId = searchParams.get('transactionId') ?? '';

  const [payment, setPayment] = useState<PaymentDetailResponse | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !paymentId) {
      setError('Thiếu thông tin giao dịch VNPay.');
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
          throw new Error('Không tìm thấy đơn hàng.');
        }

        setPayment(paymentData);
        setOrder(orderData);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Không thể tải thông tin thanh toán.',
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

  const handleSimulateSuccess = async () => {
    if (!payment || isSimulatingPayment) {
      return;
    }

    try {
      setIsSimulatingPayment(true);
      const updatedPayment = await simulateVnpaySuccess(payment.id);
      setPayment((current) =>
        current
          ? {
              ...current,
              status: updatedPayment.status ?? 'paid',
              paidAt: updatedPayment.paidAt ?? current.paidAt,
            }
          : current,
      );
      toast.success('Đã giả lập thanh toán VNPay thành công.');
    } catch (simulateError) {
      toast.error(
        getUserErrorMessage(
          simulateError,
          'Không thể giả lập thanh toán VNPay thành công.',
        ),
      );
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="pb-16 pt-28">
        <div className="mx-auto max-w-xl px-4">
          <div className="glass-card flex min-h-[420px] flex-col items-center justify-center gap-4 p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-heading text-2xl font-bold text-foreground">
                Đang tạo mã QR VNPay
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Hệ thống đang tải thông tin giao dịch cho đơn hàng {orderCode}.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !payment || !order || !paymentUrl) {
    return (
      <div className="pb-16 pt-28">
        <div className="mx-auto max-w-xl px-4">
          <div className="glass-card p-10 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-500" />
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Không thể hiển thị mã QR
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {error ?? 'Giao dịch VNPay không có dữ liệu thanh toán hợp lệ.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/account/orders" className="btn-outline">
                Xem đơn hàng
              </Link>
              <Link href="/checkout" className="btn-primary">
                Quay lại thanh toán
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-primary/70">
            Thanh toán QR VNPay
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-foreground">
            Quét mã QR để thanh toán
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Bạn vẫn đang ở giao diện của Balii. Sau khi VNPay xác nhận, trang sẽ
            tự động cập nhật kết quả thanh toán.
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
                  Mã QR thanh toán VNPay
                </p>
                <p className="text-sm text-muted-foreground">
                  Sử dụng ứng dụng ngân hàng hoặc ví hỗ trợ quét QR.
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
                Mã giao dịch:{' '}
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
                  Mở VNPay
                </a>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="btn-outline"
                >
                  Xem đơn hàng
                </Link>
                {ENABLE_VNPAY_SIMULATION &&
                payment.method === 'vnpay' &&
                paymentStatus === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => void handleSimulateSuccess()}
                    disabled={isSimulatingPayment}
                    className="btn-outline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSimulatingPayment
                      ? 'Đang giả lập thanh toán...'
                      : 'Giả lập thanh toán thành công'}
                  </button>
                ) : null}
              </div>
              {ENABLE_VNPAY_SIMULATION ? (
                <p className="mt-4 text-xs text-amber-700">
                  Chế độ test đang bật. Nút giả lập chỉ dùng cho môi trường dev
                  hoặc sandbox.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="mb-4 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Trạng thái thanh toán
              </h2>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${paymentStatusClass}`}
              >
                {paymentStatusLabel}
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                Trang này tự động kiểm tra kết quả mỗi {POLL_INTERVAL_MS / 1000}{' '}
                giây.
              </p>
            </div>

            <div className="glass-card p-6">
              <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">
                Thông tin đơn hàng
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Mã đơn hàng</span>
                  <span className="font-medium text-foreground">
                    {order.orderCode}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Tổng thanh toán</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(order.total)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Phương thức</span>
                  <span className="font-medium text-foreground">VNPay</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="mb-4 font-heading text-sm font-semibold text-foreground">
                Cách thanh toán
              </h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li>1. Mở app ngân hàng hoặc ví có hỗ trợ quét QR.</li>
                <li>2. Quét mã QR trên màn hình này hoặc bấm Mở VNPay.</li>
                <li>3. Xác nhận giao dịch trong ứng dụng của bạn.</li>
                <li>
                  4. Quay lại trang này nếu cần; hệ thống sẽ tự cập nhật kết
                  quả.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
