"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Search,
  ShoppingBag,
  Menu,
  Heart,
  X,
  User,
  Package,
  Ticket,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { useCartStore } from "@/store/cart.store";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import { cn } from "@/lib/utils";

// ─── Auth Section ────────────────────────────────────────────────────────────

/**
 * Renders either a "Đăng nhập" link (guest) or a user avatar + dropdown (auth).
 * Must be rendered only after mount to avoid SSR/localStorage hydration mismatch.
 */
function AuthSection() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Guest ──────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:text-pink-500 transition-colors relative group"
        aria-label="Đăng nhập"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Đăng nhập</span>
        {/* Subtle underline on hover */}
        <span className="absolute bottom-0.5 left-4 right-4 h-px bg-gradient-to-r from-pink-400 to-rose-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </Link>
    );
  }

  // ── Authenticated ──────────────────────────────────────────────────────────
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .slice(-2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "U";

  const displayName = user?.fullName ?? user?.email ?? "Tài khoản";

  return (
    <div ref={dropdownRef} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-white/30 transition-all clickable group"
        aria-label="Tài khoản"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white/60 group-hover:ring-pink-300 transition-all">
          {initials}
        </div>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-foreground/60 transition-transform duration-200 hidden sm:block",
            dropdownOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute right-0 top-full mt-2 w-56 rounded-2xl glass-card shadow-xl border border-white/20 overflow-hidden z-50",
          "transition-all duration-200 origin-top-right",
          dropdownOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        )}
        role="menu"
        aria-label="Tuỳ chọn tài khoản"
      >
        {/* User info header */}
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-xs text-muted-foreground">Xin chào 👋</p>
          <p className="font-semibold text-sm text-foreground truncate mt-0.5">
            {displayName}
          </p>
          {user?.email && user?.fullName && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user.email}
            </p>
          )}
        </div>

        {/* Menu items */}
        <nav className="py-1.5" role="none">
          <Link
            href="/account/profile"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-pink-500 hover:bg-pink-50/40 transition-colors group"
            role="menuitem"
          >
            <User className="w-4 h-4 text-muted-foreground group-hover:text-pink-400 transition-colors" />
            Hồ sơ cá nhân
          </Link>

          <Link
            href="/account/orders"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-pink-500 hover:bg-pink-50/40 transition-colors group"
            role="menuitem"
          >
            <Package className="w-4 h-4 text-muted-foreground group-hover:text-pink-400 transition-colors" />
            Đơn hàng của tôi
          </Link>

          <Link
            href="/account/vouchers"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/80 hover:text-pink-500 hover:bg-pink-50/40 transition-colors group"
            role="menuitem"
          >
            <Ticket className="w-4 h-4 text-muted-foreground group-hover:text-pink-400 transition-colors" />
            Kho Voucher
          </Link>
        </nav>

        {/* Logout */}
        <div className="border-t border-white/10 py-1.5">
          <button
            onClick={() => {
              setDropdownOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50/40 transition-colors group"
            role="menuitem"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Hydration-safe wrapper ───────────────────────────────────────────────────

/**
 * Renders a neutral skeleton until after the first client-side mount,
 * then renders the real auth section (which reads from localStorage via Zustand).
 * This prevents Next.js SSR hydration mismatches.
 */
function AuthSectionHydrated() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Skeleton placeholder — same size as the avatar button so layout doesn't shift
    return (
      <div
        className="w-9 h-9 rounded-xl bg-white/20 animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return <AuthSection />;
}

// ─── Header ──────────────────────────────────────────────────────────────────

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { items, toggleCartDrawer } = useCartStore();
  const { toggleMobileNav, isSearchOpen, setSearchOpen } = useUIStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled ? "glass-navbar py-3" : "bg-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileNav}
            className="lg:hidden p-2 rounded-xl hover:bg-white/40 transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 clickable">
            <span className="font-heading text-2xl md:text-3xl font-bold text-gradient">
              Balii
            </span>
            <span className="hidden sm:inline text-xs text-muted-foreground tracking-[0.3em] uppercase">
              Sleepwear
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-400 to-rose-500 group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            {/* Search Toggle */}
            <button
              onClick={() => setSearchOpen(!isSearchOpen)}
              className="p-2.5 rounded-xl hover:bg-white/40 transition-all clickable"
              aria-label="Tìm kiếm"
            >
              {isSearchOpen ? (
                <X className="w-5 h-5 text-foreground" />
              ) : (
                <Search className="w-5 h-5 text-foreground" />
              )}
            </button>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="hidden sm:flex p-2.5 rounded-xl hover:bg-white/40 transition-all clickable"
              aria-label="Yêu thích"
            >
              <Heart className="w-5 h-5 text-foreground" />
            </Link>

            {/* Cart */}
            <button
              onClick={toggleCartDrawer}
              className="p-2.5 rounded-xl hover:bg-white/40 transition-all clickable relative"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5 text-foreground" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-fade-in">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Auth — hydration-safe */}
            <AuthSectionHydrated />
          </div>
        </div>

        {/* Search Bar — Expandable */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-500",
            isSearchOpen ? "max-h-20 mt-4 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
              }
            }}
            className="relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm đồ ngủ..."
              className="w-full px-5 py-3 rounded-xl glass-card text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-muted-foreground/60"
              autoFocus={isSearchOpen}
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-gradient-to-r from-pink-400 to-rose-500 text-white hover:scale-105 active:scale-95 transition-transform"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
