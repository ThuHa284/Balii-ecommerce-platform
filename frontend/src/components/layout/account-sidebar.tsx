"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, MapPin, Heart, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const accountLinks = [
  { href: "/account/profile", label: "Thông tin cá nhân", icon: User },
  { href: "/account/orders", label: "Đơn hàng của tôi", icon: Package },
  { href: "/account/addresses", label: "Sổ địa chỉ", icon: MapPin },
  { href: "/account/wishlist", label: "Sản phẩm yêu thích", icon: Heart },
];

export default function AccountSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="glass-card p-6">
        <h2 className="font-heading text-xl font-semibold mb-6">Tài khoản</h2>
        <nav className="space-y-1">
          {accountLinks.map((link) => {
            const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-pink-100 to-rose-100 text-primary"
                    : "text-foreground/70 hover:bg-white/40 hover:text-foreground"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 pt-4 border-t border-white/30">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all w-full">
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
}
