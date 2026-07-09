/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, Package } from 'lucide-react';
import { getOrders } from '@/lib/api/orders.api';
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Order } from '@/types/order.types';

const STATUS_TABS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'delivered', label: 'Đã giao' },
  { value: 'cancelled', label: 'Đã hủy' },
];

function getPaymentHint(order: Order) {
  const paymentMethod = String(order.paymentMethod);
  const paymentStatus = String(order.paymentStatus);

  if (paymentMethod !== 'vnpay') {
    return null;
  }

  if (paymentStatus === 'failed') {
    return 'Thanh toán VNPay thất bại. Vui lòng kiểm tra lại giao dịch.';
  }

  if (paymentStatus === 'pending') {
    return 'Đang chờ VNPay xác nhận giao dịch.';
  }

  return 'VNPay đã xác nhận thanh toán.';
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const loadOrders = useEffectEvent(async () => {
    setLoading(true);
    try {
      const { orders: data } = await getOrders(1, 20);
      setOrders(data);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    void loadOrders();
  }, []);

  const filteredOrders =
    activeTab === 'all'
      ? orders
      : orders.filter((order) => String(order.status) === activeTab);

  if (loading) {
    return (
      <div>
        <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
          Đơn hàng của tôi
        </h1>
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="glass-card animate-pulse p-6">
              <div className="flex gap-4">
                <div className="h-20 w-16 rounded-xl bg-white/50" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-1/3 rounded bg-white/50" />
                  <div className="h-3 w-1/2 rounded bg-white/40" />
                  <div className="h-3 w-1/4 rounded bg-white/30" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-bold text-foreground">
        Đơn hàng của tôi
      </h1>

      <div className="glass-card mb-6 overflow-x-auto p-1.5">
        <div className="flex min-w-max gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.value
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-300/25'
                  : 'text-foreground/70 hover:bg-white/50 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
          <p className="mb-4 text-muted-foreground">
            {activeTab === 'all'
              ? 'Bạn chưa có đơn hàng nào'
              : 'Không có đơn hàng nào ở trạng thái này'}
          </p>
          <Link href="/products" className="btn-primary inline-block text-sm">
            Mua sắm ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const paymentHint = getPaymentHint(order);
            const paymentStatus = String(order.paymentStatus);
            const orderStatus = String(order.status);

            return (
              <div
                key={order.id}
                className="glass-card group overflow-hidden transition-all duration-300 hover:bg-white/75"
              >
                <div className="flex items-center justify-between border-b border-white/30 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {order.orderCode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        PAYMENT_STATUS_COLORS[paymentStatus] ||
                        PAYMENT_STATUS_COLORS.pending
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[paymentStatus] || paymentStatus}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        ORDER_STATUS_COLORS[orderStatus]
                      }`}
                    >
                      {ORDER_STATUS_LABELS[orderStatus]}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-3">
                    {order.items.slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-white/40">
                          <Image
                            src={item.thumbnail}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.productName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.variantColor} / {item.variantSize} x{' '}
                            {item.quantity}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-primary">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>
                    ))}
                    {order.items.length > 2 ? (
                      <p className="pl-20 text-xs text-muted-foreground">
                        +{order.items.length - 2} sản phẩm khác
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/30 pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {order.items.length} sản phẩm
                      </p>
                      {paymentHint ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {paymentHint}
                        </p>
                      ) : null}
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm group-hover:border-violet-400"
                    >
                      <Eye className="h-4 w-4" />
                      Chi tiết
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
