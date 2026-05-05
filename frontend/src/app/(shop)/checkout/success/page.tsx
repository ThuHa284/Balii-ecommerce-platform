import Link from "next/link";
import { CheckCircle, Package, Home } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <div className="pt-28 pb-16">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="glass-card p-12">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground mb-3">
            Đặt hàng thành công!
          </h1>
          <p className="text-muted-foreground mb-2">
            Cảm ơn bạn đã mua sắm tại Balii Sleepwear
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Mã đơn hàng: <span className="font-bold text-primary">BL{Date.now().toString().slice(-8)}</span>
          </p>

          <div className="glass-card p-4 mb-8 text-left">
            <div className="flex items-center gap-3 text-sm">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">Dự kiến giao hàng</p>
                <p className="text-muted-foreground">3-5 ngày làm việc</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/orders" className="btn-outline flex-1 inline-flex items-center justify-center gap-2">
              <Package className="w-4 h-4" /> Xem đơn hàng
            </Link>
            <Link href="/" className="btn-primary flex-1 inline-flex items-center justify-center gap-2">
              <Home className="w-4 h-4" /> Trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
