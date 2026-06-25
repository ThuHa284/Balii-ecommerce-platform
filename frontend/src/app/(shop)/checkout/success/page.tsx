import Link from 'next/link';
import { CheckCircle, Home, Package } from 'lucide-react';

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    orderId?: string;
    orderCode?: string;
    paymentStatus?: string;
    checkoutMode?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = (await searchParams) ?? {};
  const orderCode = params.orderCode ?? 'Không xác định';
  const paymentStatus = params.paymentStatus ?? 'pending';
  const checkoutMode = params.checkoutMode ?? 'cod';
  const isPaid = paymentStatus === 'paid';

  return (
    <div className="pt-28 pb-16">
      <div className="mx-auto max-w-lg px-4 text-center">
        <div className="glass-card p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="mb-3 font-heading text-3xl font-bold text-foreground">
            {isPaid ? 'Thanh toán thành công!' : 'Đặt hàng thành công!'}
          </h1>
          <p className="mb-2 text-muted-foreground">
            {isPaid
              ? 'Đơn hàng của bạn đã được thanh toán và ghi nhận trong hệ thống.'
              : 'Đơn hàng của bạn đã được ghi nhận. Bạn sẽ thanh toán khi nhận hàng.'}
          </p>
          <p className="mb-2 text-sm text-muted-foreground">
            Mã đơn hàng:{' '}
            <span className="font-bold text-primary">{orderCode}</span>
          </p>
          <p className="mb-8 text-xs text-muted-foreground">
            Hình thức:{' '}
            {checkoutMode === 'online'
              ? 'Thanh toán online VNPay'
              : 'Thanh toán khi nhận hàng'}
          </p>

          <div className="mb-8 glass-card p-4 text-left">
            <div className="flex items-center gap-3 text-sm">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Dự kiến giao hàng</p>
                <p className="text-muted-foreground">3-5 ngày làm việc</p>
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
