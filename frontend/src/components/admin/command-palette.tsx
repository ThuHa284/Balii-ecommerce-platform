'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  LayoutDashboard,
  Megaphone,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Ticket,
  Users,
} from 'lucide-react';
import { hasRoleAccess } from '@/lib/api/admin.utils';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/user.types';

interface NavOption {
  label: string;
  href: string;
  category: string;
  icon: React.ElementType;
  keywords: string;
  roles?: UserRole[];
}

const NAV_OPTIONS: NavOption[] = [
  {
    label: 'Tổng quan Dashboard',
    href: '/admin/dashboard',
    category: 'Bảng điều khiển',
    icon: LayoutDashboard,
    keywords: 'dashboard tong quan home trang chu',
  },
  {
    label: 'Quản lý Sản phẩm',
    href: '/admin/products',
    category: 'Bán hàng',
    icon: Package,
    keywords: 'san pham products hang hoa kho',
  },
  {
    label: 'Quản lý Chiến dịch',
    href: '/admin/campaigns',
    category: 'Khuyến mãi',
    icon: Megaphone,
    keywords: 'chien dich campaign sale promotion marketing bo suu tap mua',
  },
  {
    label: 'Quản lý Đơn hàng',
    href: '/admin/orders',
    category: 'Bán hàng',
    icon: ShoppingCart,
    keywords: 'don hang orders van don bill hoa don',
  },
  {
    label: 'Quản lý Voucher',
    href: '/admin/vouchers',
    category: 'Khuyến mãi',
    icon: Ticket,
    keywords: 'voucher discount giam gia khuyen mai',
  },
  {
    label: 'Quản lý Khách hàng',
    href: '/admin/users',
    category: 'Người dùng',
    icon: Users,
    keywords: 'khach hang users nguoi dung',
  },
  {
    label: 'Báo cáo Phân tích',
    href: '/admin/analytics',
    category: 'Báo cáo',
    icon: BarChart3,
    keywords: 'phan tich analytics bao cao doanh thu bieu do',
  },
  {
    label: 'Phân tích thị trường',
    href: '/admin/market-analysis',
    category: 'AI',
    icon: BarChart3,
    keywords:
      'phan tich thi truong market analysis tim bang anh google lens san pham tuong tu doi thu',
  },
  {
    label: 'Cài đặt hệ thống',
    href: '/admin/settings',
    category: 'Hệ thống',
    icon: Settings,
    keywords: 'cai dat settings cau hinh mat khau',
    roles: [UserRole.SUPER_ADMIN],
  },
];

export default function CommandPalette() {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role ?? null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPalette = () => {
    setIsOpen(true);
    setSearch('');
    setSelectedIndex(0);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          setIsOpen(false);
        } else {
          openPalette();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    const handleOpen = () => {
      openPalette();
    };

    window.addEventListener('open-command-palette', handleOpen);
    return () => window.removeEventListener('open-command-palette', handleOpen);
  }, []);

  const filtered = NAV_OPTIONS.filter((option) => {
    if (!hasRoleAccess(userRole, option.roles)) {
      return false;
    }

    const term = search.toLowerCase().trim();
    if (!term) return true;

    return (
      option.label.toLowerCase().includes(term) ||
      option.category.toLowerCase().includes(term) ||
      option.keywords.toLowerCase().includes(term)
    );
  });

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length),
      );
      return;
    }

    if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      router.push(filtered[selectedIndex].href);
      setIsOpen(false);
    }
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed left-1/2 top-1/4 z-50 flex max-h-[450px] w-full max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Tìm kiếm trang quản trị..."
            className="flex-1 border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
          />
          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 shadow-sm">
            ESC
          </span>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Không tìm thấy trang quản trị phù hợp.
            </div>
          ) : (
            filtered.map((option, index) => {
              const isSelected = index === selectedIndex;
              const Icon = option.icon;

              return (
                <div
                  key={option.href}
                  onClick={() => handleNavigate(option.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 transition-all ${
                    isSelected
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{option.label}</p>
                      <p
                        className={`text-[10px] ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}
                      >
                        {option.category}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[10px] font-bold opacity-80">
                      Đi tới <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-medium text-slate-400">
          <div className="flex items-center gap-2">
            <span>Phím</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono shadow-sm">
              Up
            </kbd>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono shadow-sm">
              Down
            </kbd>
            <span>để di chuyển,</span>
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono shadow-sm">
              Enter
            </kbd>
            <span>để chọn.</span>
          </div>
          <div>
            <span>Lối tắt:</span>
            <kbd className="ml-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono shadow-sm">
              Ctrl + K
            </kbd>
          </div>
        </div>
      </div>
    </>
  );
}
