'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Grid2x2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Settings,
  ShoppingCart,
  Ticket,
  Users,
} from 'lucide-react';

import { hasRoleAccess } from '@/lib/api/admin.utils';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/user.types';

type AdminLink = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[];
};

const adminLinks: AdminLink[] = [
  { href: '/admin/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Sản phẩm', icon: Package },
  { href: '/admin/categories', label: 'Danh mục', icon: Grid2x2 },
  { href: '/admin/campaigns', label: 'Chiến dịch', icon: Megaphone },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingCart },
  { href: '/admin/vouchers', label: 'Voucher', icon: Ticket },
  { href: '/admin/users', label: 'Khách hàng', icon: Users },
  {
    href: '/admin/market-analysis',
    label: 'Phân tích thị trường',
    icon: BarChart3,
  },
  {
    href: '/admin/settings',
    label: 'Cài đặt hệ thống',
    icon: Settings,
    roles: [UserRole.SUPER_ADMIN],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const userRole = useAuthStore((state) => state.user?.role ?? null);
  const visibleLinks = adminLinks.filter((link) =>
    hasRoleAccess(userRole, link.roles),
  );

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="hidden min-h-screen w-64 rounded-none border-b-0 border-l-0 border-t-0 glass-card p-6 lg:block">
      <Link href="/admin/dashboard" className="mb-6 flex items-center gap-2">
        <span className="font-heading text-2xl font-bold text-gradient">
          Balii
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {userRole === UserRole.SUPER_ADMIN
            ? 'Quản trị hệ thống'
            : 'Quản trị viên'}
        </span>
      </Link>

      <div className="mb-6">
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent('open-command-palette'))
          }
          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200/65 bg-white/40 px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm transition-all hover:bg-white hover:text-violet-600"
        >
          <span className="flex items-center gap-1.5">Tìm nhanh...</span>
          <kbd className="rounded border border-slate-300 bg-slate-200 px-1.5 py-0.5 font-mono text-[9px] shadow-sm">
            Ctrl+K
          </kbd>
        </button>
      </div>

      <nav className="space-y-1">
        {visibleLinks.map((link) => {
          const isActive =
            pathname === link.href || pathname?.startsWith(link.href + '/');

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-300/25'
                  : 'text-foreground/70 hover:bg-white/50 hover:text-foreground',
              )}
            >
              <link.icon className="h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 mt-auto space-y-1 border-t border-white/30 pt-8">
        <button
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 transition-all hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
