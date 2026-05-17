"use client";

import { useState } from "react";
import { MapPin, CreditCard, FileText, Loader2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart.store";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    clearCart();
    router.push("/checkout/success");
  };

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">
          Thanh toán <span className="text-gradient">đơn hàng</span>
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Address */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <MapPin className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold">Địa chỉ giao hàng</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1.5">Họ và tên</label><input type="text" required placeholder="Nguyễn Văn An" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Số điện thoại</label><input type="tel" required placeholder="0901234567" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Tỉnh/Thành phố</label><input type="text" required placeholder="TP. Hồ Chí Minh" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Quận/Huyện</label><input type="text" required placeholder="Quận 1" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm" /></div>
                  <div className="sm:col-span-2"><label className="block text-sm font-medium mb-1.5">Địa chỉ cụ thể</label><input type="text" required placeholder="Số nhà, đường..." className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm" /></div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold">Phương thức thanh toán</h2>
                </div>
                <div className="space-y-3">
                  {(["cod", "vnpay", "momo"] as const).map((method) => (
                    <label key={method} className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${paymentMethod === method ? "bg-violet-50 border-2 border-primary" : "bg-white/40 border-2 border-transparent hover:bg-white/60"}`}>
                      <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{PAYMENT_METHOD_LABELS[method]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-5">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="font-heading text-lg font-semibold">Ghi chú</h2>
                </div>
                <textarea placeholder="Ghi chú cho đơn hàng (không bắt buộc)..." rows={3} className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm resize-none" />
              </div>
            </div>

            {/* Order Summary */}
            <div className="glass-card p-6 h-fit sticky top-28">
              <h2 className="font-heading text-lg font-semibold mb-4">Đơn hàng ({items.length} sản phẩm)</h2>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">{item.productName} x{item.quantity}</span>
                    <span className="font-medium shrink-0">{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/30 pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tạm tính</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vận chuyển</span><span>{shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}</span></div>
                <div className="flex justify-between font-semibold text-lg border-t border-white/30 pt-2"><span>Tổng</span><span className="text-primary">{formatCurrency(total)}</span></div>
              </div>
              <button type="submit" disabled={isLoading || items.length === 0} className="btn-primary w-full flex items-center justify-center gap-2">
                {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Đang xử lý...</> : <>Đặt hàng <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
