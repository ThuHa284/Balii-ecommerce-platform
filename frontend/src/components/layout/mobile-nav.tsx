"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const pathname = usePathname();
  const { isMobileNavOpen, setMobileNavOpen } = useUIStore();

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isMobileNavOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-72 glass-card rounded-none border-l-0 transition-transform duration-300 lg:hidden",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <span className="font-heading text-2xl font-bold text-gradient">Balii</span>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="p-2 rounded-xl hover:bg-white/40 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === link.href
                    ? "bg-gradient-to-r from-pink-100 to-rose-100 text-primary"
                    : "text-foreground/80 hover:bg-white/40"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Additional links */}
          <div className="mt-8 pt-6 border-t border-white/30 space-y-1">
            <Link
              href="/login"
              onClick={() => setMobileNavOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:bg-white/40 transition-all"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileNavOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-foreground/80 hover:bg-white/40 transition-all"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
