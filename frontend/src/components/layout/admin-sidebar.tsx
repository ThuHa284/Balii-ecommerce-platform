"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, LogOut, Settings, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/vouchers", label: "Voucher", icon: Ticket },
  { href: "/admin/users", label: "Khách hàng", icon: Users },
  { href: "/admin/analytics", label: "Phân tích", icon: BarChart3 },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen glass-card rounded-none border-t-0 border-b-0 border-l-0 p-6 hidden lg:block">
      <Link href="/admin/dashboard" className="flex items-center gap-2 mb-8">
        <span className="font-heading text-2xl font-bold text-gradient">Balii</span>
        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
          Admin
        </span>
      </Link>

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
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground/70 hover:bg-white/50 transition-all">
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
