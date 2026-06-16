'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Heart,
  LogOut,
  MapPin,
  Package,
  Sparkles,
  Ticket,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const accountLinks = [
  { href: '/account/profile', label: 'Thông tin cá nhân', icon: User },
  { href: '/account/orders', label: 'Đơn hàng của tôi', icon: Package },
  { href: '/account/vouchers', label: 'Voucher của tôi', icon: Ticket },
  { href: '/account/addresses', label: 'Sổ địa chỉ', icon: MapPin },
  { href: '/account/wishlist', label: 'Sản phẩm yêu thích', icon: Heart },
  {
    href: '/account/try-on-history',
    label: 'Lịch sử thử đồ AI',
    icon: Sparkles,
  },
];

export default function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 lg:w-64">
      <div className="glass-card p-6">
        <h2 className="mb-6 font-heading text-xl font-semibold">Tài khoản</h2>
        <nav className="space-y-1">
          {accountLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname?.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-violet-100 text-primary'
                    : 'text-foreground/70 hover:bg-white/40 hover:text-foreground',
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-white/30 pt-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-all hover:bg-red-50">
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}
