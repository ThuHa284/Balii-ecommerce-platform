import CheckoutResultStatus from '@/components/checkout/checkout-result-status';

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

  return (
    <CheckoutResultStatus
      orderId={params.orderId ?? ''}
      orderCode={orderCode === 'Khong xac dinh' ? 'Không xác định' : orderCode}
      initialPaymentStatus={paymentStatus}
      providerMessage={message || undefined}
    />
  );
}
