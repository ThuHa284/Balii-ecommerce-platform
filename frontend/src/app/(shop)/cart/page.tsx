"use client";

import { useCartStore } from "@/store/cart.store";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ShoppingBag, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingFee = subtotal >= 500000 ? 0 : 30000;
  const total = subtotal + shippingFee;

  if (items.length === 0) {
    return (
      <div className="pt-28 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center py-20">
          <div className="glass-card p-12 inline-block">
            <ShoppingBag className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
            <h1 className="font-heading text-2xl font-bold text-foreground mb-3">Giỏ hàng trống</h1>
            <p className="text-muted-foreground mb-8">Hãy thêm sản phẩm yêu thích vào giỏ hàng</p>
            <Link href="/products" className="btn-primary inline-flex items-center gap-2">
              Khám phá sản phẩm <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-8">Giỏ hàng <span className="text-gradient">của bạn</span></h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="glass-card p-4 flex gap-4">
                <div className="relative w-24 h-28 rounded-xl overflow-hidden shrink-0">
                  <Image src={item.thumbnail} alt={item.productName} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <Link href={`/products/${item.productSlug}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {item.productName}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.variant.size} / {item.variant.color}</p>
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-bold text-primary">{formatCurrency(item.totalPrice)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="glass-card p-6 h-fit sticky top-28">
            <h2 className="font-heading text-lg font-semibold mb-6">Tóm tắt đơn hàng</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span className="font-medium">{shippingFee === 0 ? "Miễn phí" : formatCurrency(shippingFee)}</span>
              </div>
              <div className="border-t border-white/30 pt-3 flex justify-between">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
            {subtotal < 500000 && (
              <p className="text-xs text-muted-foreground mb-4 bg-pink-50 p-3 rounded-xl">
                💡 Mua thêm <strong>{formatCurrency(500000 - subtotal)}</strong> để được miễn phí vận chuyển
              </p>
            )}
            <Link href="/checkout" className="btn-primary w-full text-center block">
              Tiến hành thanh toán
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
