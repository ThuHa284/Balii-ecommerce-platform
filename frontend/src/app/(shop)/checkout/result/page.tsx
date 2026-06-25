import Link from 'next/link';
import { AlertCircle, CheckCircle, Home, Package } from 'lucide-react';
import { PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/lib/constants';

type CheckoutResultPageProps = {
  searchParams?: Promise<{
    orderId?: string;
    orderCode?: string;
    paymentStatus?: string;
    checkoutMode?: string;
    message?: string;
  }>;
};

export default async function CheckoutResultPage({
  searchParams,
}: CheckoutResultPageProps) {
  const params = (await searchParams) ?? {};
  const orderCode = params.orderCode ?? 'Khong xac dinh';
  const paymentStatus = params.paymentStatus ?? 'pending';
  const message = params.message ?? '';
  const isPaid = paymentStatus === 'paid';
  const isFailed = paymentStatus === 'failed';
  const statusClass =
    PAYMENT_STATUS_COLORS[paymentStatus] || PAYMENT_STATUS_COLORS.pending;
  const statusLabel =
    PAYMENT_STATUS_LABELS[paymentStatus] || PAYMENT_STATUS_LABELS.pending;
  const providerMessage = message ? decodeURIComponent(message) : null;

  return (
    <div className="pt-28 pb-16">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="glass-card p-12">
          <div
            className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
              isFailed ? 'bg-rose-100' : 'bg-emerald-100'
            }`}
          >
            {isFailed ? (
              <AlertCircle className="h-10 w-10 text-rose-500" />
            ) : (
              <CheckCircle className="h-10 w-10 text-emerald-500" />
            )}
          </div>
          <h1 className="mb-3 font-heading text-3xl font-bold text-foreground">
            {isPaid
              ? 'Thanh toan thanh cong!'
              : isFailed
                ? 'Thanh toan that bai!'
                : 'Dang cho xac nhan thanh toan'}
          </h1>
          <p className="mb-2 text-muted-foreground">
            {isPaid
              ? 'Don hang cua ban da duoc thanh toan va ghi nhan trong he thong.'
              : isFailed
                ? 'VNPay chua xac nhan giao dich thanh cong. Ban co the thu lai tu trang don hang.'
                : 'He thong dang doi chieu giao dich. Vui long kiem tra lai trong lich su don hang.'}
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            Ma don hang:{' '}
            <span className="font-bold text-primary">{orderCode}</span>
          </p>
          <p className="mb-8 text-xs text-muted-foreground">
            Hinh thuc: Thanh toan online VNPay
          </p>

          <div className="mb-8 glass-card p-4 text-left">
            <div className="flex items-center gap-3 text-sm">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  Trang thai thanh toan
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
                    Ma phan hoi gateway: {providerMessage}
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
              <Package className="h-4 w-4" /> Xem don hang
            </Link>
            <Link
              href="/"
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2"
            >
              <Home className="h-4 w-4" /> Trang chu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
