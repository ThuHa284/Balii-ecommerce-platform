import Link from 'next/link';
import { Camera, Globe, Heart, Mail, MapPin, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-20">
      <div className="glass-card mx-4 mb-12 max-w-5xl p-8 text-center sm:mx-8 md:p-12 lg:mx-auto">
        <h3 className="mb-3 font-heading text-2xl font-bold text-foreground md:text-3xl">
          Đăng ký nhận tin
        </h3>
        <p className="mx-auto mb-6 max-w-md text-muted-foreground">
          Nhận ngay ưu đãi{' '}
          <span className="font-semibold text-primary">giảm 10%</span> cho đơn
          hàng đầu tiên và cập nhật bộ sưu tập mới nhất
        </p>
        <form className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="email"
            placeholder="Nhập email của bạn..."
            className="flex-1 rounded-xl border border-white/50 bg-white/70 px-5 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Đăng ký
          </button>
        </form>
      </div>

      <div className="glass-navbar border-b-0 border-t-0">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="mb-4 inline-block">
                <span className="font-heading text-3xl font-bold text-gradient">
                  Balii
                </span>
                <span className="mt-1 block text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Sleepwear
                </span>
              </Link>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Đồ ngủ dành cho những giấc ngủ ngọt ngào. Chất liệu
                lụa tự nhiên, thiết kế thanh lịch, giá cả hợp lý.
              </p>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="clickable rounded-xl bg-white/50 p-2.5 transition-colors hover:bg-violet-50"
                >
                  <Globe className="h-4 w-4 text-foreground" />
                </a>
                <a
                  href="#"
                  className="clickable rounded-xl bg-white/50 p-2.5 transition-colors hover:bg-violet-50"
                >
                  <Camera className="h-4 w-4 text-foreground" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="mb-4 font-heading text-lg font-semibold">
                Sản phẩm
              </h4>
              <ul className="space-y-2.5">
                {[
                  { href: '/categories/do-ngu', label: 'Đồ ngủ' },
                  { href: '/categories/dam-ngu', label: 'Đầm ngủ' },
                  { href: '/products', label: 'Tất cả sản phẩm' },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-heading text-lg font-semibold">
                Hỗ trợ & Chính sách
              </h4>
              <ul className="space-y-2.5">
                {[
                  { href: '/faq', label: 'Câu hỏi thường gặp (FAQ)' },
                  { href: '/contact', label: 'Liên hệ trực tuyến' },
                  { href: '#', label: 'Chính sách đổi trả' },
                  { href: '#', label: 'Chính sách vận chuyển' },
                  { href: '#', label: 'Chính sách bảo mật' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-heading text-lg font-semibold">
                Liên hệ
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Quận Gò Vấp, TP. Hồ Chí Minh
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    0966 967 440
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    hello@balii.vn
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/30 pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © 2026 Balii Sleepwear. Tất cả quyền được bảo lưu.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Thiết kế với</span>
              <Heart className="h-3 w-3 fill-violet-500 text-violet-500" />
              <span>tại Việt Nam</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
