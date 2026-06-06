import Link from "next/link";
import { Compass, Home, ShoppingBag } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background">
      {/* Decorative gradient blur background elements */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-violet-400/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

      <div className="glass-card p-8 md:p-12 text-center max-w-lg w-full relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Animated Compass Icon */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 mb-8 mx-auto shadow-md">
          <Compass className="w-10 h-10 text-violet-500 animate-[spin_10s_linear_infinite]" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
          </span>
        </div>

        {/* 404 text */}
        <div className="font-heading text-8xl font-black tracking-tight text-gradient mb-4 leading-none">
          404
        </div>

        <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-3">
          Không tìm thấy trang yêu cầu
        </h1>

        <p className="text-muted-foreground mb-8 text-sm md:text-base leading-relaxed max-w-sm mx-auto">
          Đường dẫn này không tồn tại hoặc đã bị thay đổi. Hãy để Balii đồng hành cùng bạn tìm lại giấc ngủ trọn vẹn.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/"
            className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium"
          >
            <Home className="w-4 h-4" />
            Về Trang chủ
          </Link>
          <Link
            href="/products"
            className="btn-outline w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium"
          >
            <ShoppingBag className="w-4 h-4" />
            Xem Sản phẩm
          </Link>
        </div>
      </div>
    </div>
  );
}
