import Link from "next/link";
import { Heart, Mail, Phone, MapPin, Globe, Camera } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-20">
      {/* Newsletter Section */}
      <div className="glass-card mx-4 sm:mx-8 lg:mx-auto max-w-5xl p-8 md:p-12 mb-12 text-center">
        <h3 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
          Đăng ký nhận tin
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Nhận ngay ưu đãi <span className="text-primary font-semibold">giảm 10%</span> cho đơn hàng đầu tiên và cập nhật bộ sưu tập mới nhất
        </p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Nhập email của bạn..."
            className="flex-1 px-5 py-3 rounded-xl bg-white/70 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm placeholder:text-muted-foreground/60"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Đăng ký
          </button>
        </form>
      </div>

      {/* Main Footer */}
      <div className="glass-navbar border-t-0 border-b-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <Link href="/" className="inline-block mb-4">
                <span className="font-heading text-3xl font-bold text-gradient">Balii</span>
                <span className="block text-xs tracking-[0.3em] text-muted-foreground uppercase mt-1">
                  Sleepwear
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Đồ ngủ lụa cao cấp dành cho những giấc ngủ ngọt ngào. 
                Chất liệu lụa tự nhiên, thiết kế thanh lịch, 
                giá cả hợp lý.
              </p>
              <div className="flex gap-3">
                <a href="#" className="p-2.5 rounded-xl bg-white/50 hover:bg-violet-50 transition-colors clickable">
                  <Globe className="w-4 h-4 text-foreground" />
                </a>
                <a href="#" className="p-2.5 rounded-xl bg-white/50 hover:bg-violet-50 transition-colors clickable">
                  <Camera className="w-4 h-4 text-foreground" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-heading text-lg font-semibold mb-4">Sản phẩm</h4>
              <ul className="space-y-2.5">
                {[
                  { href: "/categories/do-ngu-lua", label: "Đồ ngủ lụa" },
                  { href: "/categories/pyjama", label: "Pyjama" },
                  { href: "/categories/ao-choang", label: "Áo choàng" },
                  { href: "/categories/dam-ngu", label: "Đầm ngủ" },
                  { href: "/products", label: "Tất cả sản phẩm" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h4 className="font-heading text-lg font-semibold mb-4">Chính sách</h4>
              <ul className="space-y-2.5">
                {[
                  "Chính sách đổi trả",
                  "Chính sách vận chuyển",
                  "Chính sách bảo mật",
                  "Điều khoản sử dụng",
                  "Câu hỏi thường gặp",
                ].map((item) => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-heading text-lg font-semibold mb-4">Liên hệ</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">0901 234 567</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-muted-foreground">hello@balii.vn</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/30 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-muted-foreground">
              © 2024 Balii Sleepwear. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Thiết kế với</span>
              <Heart className="w-3 h-3 text-violet-500 fill-violet-500" />
              <span>tại Việt Nam</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
