"use client";

import { useCartStore } from "@/store/cart.store";
import { X, Plus, Minus, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency, cn } from "@/lib/utils";

export default function CartDrawer() {
  const { items, isCartDrawerOpen, setCartDrawerOpen, removeItem, updateQuantity } = useCartStore();
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-300",
          isCartDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setCartDrawerOpen(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 glass-card rounded-none border-r-0 transition-transform duration-300 flex flex-col",
          isCartDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/30">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-xl font-semibold">Giỏ hàng</h2>
            <span className="text-sm text-muted-foreground">({itemCount})</span>
          </div>
          <button
            onClick={() => setCartDrawerOpen(false)}
            className="p-2 rounded-xl hover:bg-white/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium mb-2">Giỏ hàng trống</p>
              <p className="text-sm text-muted-foreground/70 mb-6">Hãy thêm sản phẩm yêu thích vào giỏ hàng</p>
              <Link
                href="/products"
                onClick={() => setCartDrawerOpen(false)}
                className="btn-primary inline-block"
              >
                Khám phá sản phẩm
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex gap-4 bg-white/40 rounded-xl p-3">
                <div className="relative w-20 h-24 rounded-lg overflow-hidden shrink-0">
                  <Image src={item.thumbnail} alt={item.productName} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.productSlug}`}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                    onClick={() => setCartDrawerOpen(false)}
                  >
                    {item.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.variant.size} / {item.variant.color}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">
                    {formatCurrency(item.price)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1 rounded-lg bg-white/60 hover:bg-white transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1 rounded-lg bg-white/60 hover:bg-white transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-white/30 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tạm tính:</span>
              <span className="text-lg font-bold text-foreground">{formatCurrency(subtotal)}</span>
            </div>
            <Link
              href="/cart"
              onClick={() => setCartDrawerOpen(false)}
              className="btn-outline block text-center w-full"
            >
              Xem giỏ hàng
            </Link>
            <Link
              href="/checkout"
              onClick={() => setCartDrawerOpen(false)}
              className="btn-primary block text-center w-full"
            >
              Thanh toán
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
