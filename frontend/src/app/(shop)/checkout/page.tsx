'use client';

import { useEffect, useState } from 'react';
import {
  ChevronRight,
  CreditCard,
  FileText,
  Gift,
  Loader2,
  MapPin,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import AddressSelectorModal from '@/components/checkout/address-selector-modal';
import { formatAddressLine } from '@/lib/address-utils';
import { createOrder } from '@/lib/api/orders.api';
import { createPayment } from '@/lib/api/payment.api';
import { getComboTier, isEligibleForFreeShipping } from '@/lib/combo-utils';
import { PAYMENT_METHOD_LABELS } from '@/lib/constants';
import { getUserErrorMessage } from '@/lib/error-utils';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore, useSelectedAddress } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { hydrateAddresses, isAuthenticated } = useAuthStore();
  const selectedAddress = useSelectedAddress();
  const [isLoading, setIsLoading] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login?redirect=/checkout');
      return;
    }

    void hydrateAddresses();
  }, [hydrateAddresses, isAuthenticated, router]);

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const freeShip = isEligibleForFreeShipping(totalItems, subtotal);
  const shippingFee = freeShip ? 0 : subtotal >= 500000 ? 0 : 30000;
  const comboTier = getComboTier(totalItems);
  const total = subtotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Giỏ hàng đang trống.');
      return;
    }

    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }

    setIsLoading(true);

    try {
      if (!selectedAddress) {
        throw new Error('Vui lòng chọn địa chỉ giao hàng.');
      }

      const order = await createOrder({
        address: selectedAddress,
        paymentMethod,
        note,
      });

      const paymentStatus = 'pending';
      const checkoutMode = 'cod';

      if (paymentMethod !== 'cod') {
        const payment = await createPayment(
          order.id,
          paymentMethod,
          `${window.location.origin}/checkout/result`,
        );

        if (!payment.paymentUrl) {
          throw new Error('Không nhận được đường dẫn thanh toán VNPay.');
        }

        await clearCart();
        const params = new URLSearchParams({
          orderId: order.id,
          orderCode: order.orderCode,
          paymentId: payment.id,
          transactionId: payment.transactionId,
        });
        router.push(`/checkout/vnpay?${params.toString()}`);
        return;
      }

      await clearCart();

      const params = new URLSearchParams({
        orderId: order.id,
        orderCode: order.orderCode,
        paymentStatus,
        checkoutMode,
      });

      router.push(`/checkout/success?${params.toString()}`);
    } catch (error) {
      toast.error(getUserErrorMessage(error, 'Không thể hoàn tất đặt hàng.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pb-16 pt-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 font-heading text-3xl font-bold text-foreground">
          Thanh toán <span className="text-gradient">đơn hàng</span>
        </h1>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="glass-card p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="font-heading text-lg font-semibold">
                      Địa chỉ giao hàng
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-violet-100/70"
                  >
                    Thêm địa chỉ khác
                  </button>
                </div>

                {selectedAddress ? (
                  <div className="rounded-xl border border-white/40 bg-white/40 p-4 text-sm">
                    <p className="font-semibold">{selectedAddress.fullName}</p>
                    <p className="text-muted-foreground">
                      {selectedAddress.phone}
                    </p>
                    <p className="text-muted-foreground">
                      {formatAddressLine(selectedAddress)}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    Chưa có địa chỉ. Nhấn <strong>Thêm địa chỉ khác</strong> để
                    thêm và chọn địa chỉ giao hàng ngay tại đây.
                  </div>
                )}
              </div>

              <div className="glass-card p-6">
                <div className="mb-5 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold">
                    Phương thức thanh toán
                  </h2>
                </div>
                <div className="space-y-3">
                  {(['cod', 'vnpay', 'momo'] as const).map((method) => (
                    <label
                      key={method}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-all ${
                        paymentMethod === method
                          ? 'border-2 border-primary bg-violet-50'
                          : 'border-2 border-transparent bg-white/40 hover:bg-white/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-4 w-4 text-primary"
                      />
                      <span className="text-sm font-medium">
                        {PAYMENT_METHOD_LABELS[method]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="mb-5 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold">
                    Ghi chú
                  </h2>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú cho đơn hàng (không bắt buộc)..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/50 bg-white/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>

            <div className="glass-card sticky top-28 h-fit p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold">
                Đơn hàng ({items.length} sản phẩm)
              </h2>

              <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="mr-2 truncate text-muted-foreground">
                      {item.productName} x{item.quantity}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mb-6 space-y-2 border-t border-white/30 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vận chuyển</span>
                  <span>
                    {shippingFee === 0 ? (
                      <span className="flex items-center gap-1">
                        <span className="freeship-badge">
                          <Truck className="h-3 w-3" />
                          MIỄN PHÍ
                        </span>
                      </span>
                    ) : (
                      formatCurrency(shippingFee)
                    )}
                  </span>
                </div>
                {freeShip && totalItems >= 2 && (
                  <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                    <Truck className="h-4 w-4" />
                    Mua từ 2 sản phẩm sẽ được miễn phí vận chuyển!
                  </div>
                )}
                {comboTier && comboTier.freeShorts > 0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700">
                    <Gift className="h-4 w-4" />
                    {comboTier.badge} {comboTier.description}
                  </div>
                )}
                <div className="flex justify-between border-t border-white/30 pt-2 text-lg font-semibold">
                  <span>Tổng</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || items.length === 0}
                className="btn-primary flex w-full items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đặt hàng <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <AddressSelectorModal
        open={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </div>
  );
}
