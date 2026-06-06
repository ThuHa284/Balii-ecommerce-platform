'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Minus, Plus, ShoppingBag, Truck, X } from 'lucide-react';
import { CartPromoSuggestions } from '@/components/product/promo-notification';
import { isEligibleForFreeShipping } from '@/lib/combo-utils';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/store/cart.store';

export default function CartPage() {
  const { items, removeItem, updateQuantity, hydrateCart } = useCartStore();

  useEffect(() => {
    void hydrateCart();
  }, [hydrateCart]);

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const freeShip = isEligibleForFreeShipping(totalItems, subtotal);
  const shippingFee = freeShip ? 0 : 30000;
  const total = subtotal + shippingFee;

  if (items.length === 0) {
    return (
      <div className="pt-28 pb-16">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="glass-card inline-block p-12">
            <ShoppingBag className="mx-auto mb-6 h-20 w-20 text-muted-foreground/30" />
            <h1 className="mb-3 font-heading text-2xl font-bold text-foreground">
              Giỏ hàng trống
            </h1>
            <p className="mb-8 text-muted-foreground">
              Hãy thêm sản phẩm yêu thích vào giỏ hàng
            </p>
            <Link
              href="/products"
              className="btn-primary inline-flex items-center gap-2"
            >
              Khám phá sản phẩm <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h1 className="mb-8 font-heading text-3xl font-bold text-foreground">
          Giỏ hàng <span className="text-gradient">của bạn</span>
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <div key={item.id} className="glass-card flex gap-4 p-4">
                <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={item.thumbnail}
                    alt={item.productName}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.variant.size} / {item.variant.color}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        void removeItem(item.id);
                      }}
                      className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-red-50 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          void updateQuantity(item.id, item.quantity - 1);
                        }}
                        className="rounded-lg bg-white/60 p-1.5 transition-colors hover:bg-white"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          void updateQuantity(item.id, item.quantity + 1);
                        }}
                        className="rounded-lg bg-white/60 p-1.5 transition-colors hover:bg-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="font-bold text-primary">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card sticky top-28 h-fit p-6">
            <h2 className="mb-6 font-heading text-lg font-semibold">
              Tóm tắt đơn hàng
            </h2>

            <div className="mb-6">
              <CartPromoSuggestions />
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tạm tính</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span className="font-medium">
                  {shippingFee === 0 ? (
                    <span className="freeship-badge font-bold">
                      <Truck className="mr-1 inline h-3 w-3" />
                      MIỄN PHÍ
                    </span>
                  ) : (
                    formatCurrency(shippingFee)
                  )}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/30 pt-3">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="btn-primary block w-full text-center"
            >
              Tiến hành thanh toán
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
