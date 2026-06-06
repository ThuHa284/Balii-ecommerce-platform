"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, LogOut, Settings, Ticket, Library, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/collections", label: "Bộ sưu tập", icon: Library },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/vouchers", label: "Voucher", icon: Ticket },
  { href: "/admin/users", label: "Khách hàng", icon: Users },
  { href: "/admin/analytics", label: "Phân tích", icon: BarChart3 },
  { href: "/admin/ai-agent", label: "AI Agent", icon: Brain },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen glass-card rounded-none border-t-0 border-b-0 border-l-0 p-6 hidden lg:block">
      <Link href="/admin/dashboard" className="flex items-center gap-2 mb-6">
        <span className="font-heading text-2xl font-bold text-gradient">Balii</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          Admin
        </span>
      </Link>

      {/* Quick Search Trigger */}
      <div className="mb-6">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-500 bg-white/40 border border-slate-200/65 rounded-xl hover:bg-white hover:text-violet-600 transition-all cursor-pointer shadow-sm"
        >
          <span className="flex items-center gap-1.5">🔍 Tìm nhanh...</span>
          <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-200 border border-slate-300 rounded font-mono shadow-sm">Ctrl+K</kbd>
        </button>
      </div>

      <nav className="space-y-1">
        {adminLinks.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-violet-500 text-white shadow-lg shadow-violet-300/25"
                  : "text-foreground/70 hover:bg-white/50 hover:text-foreground"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-white/30 mt-8 space-y-1">
        <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-white/50 transition-all">
          <Settings className="w-5 h-5" />
          Cài đặt
        </Link>
        <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full">
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
