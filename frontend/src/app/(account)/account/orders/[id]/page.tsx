"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import { CheckCircle, Clock, Truck, Package, MapPin } from "lucide-react";

const timeline = [
  { status: "Đơn hàng đã đặt", date: "15/03/2024 10:30", icon: Clock, done: true },
  { status: "Đã xác nhận", date: "15/03/2024 11:00", icon: CheckCircle, done: true },
  { status: "Đang giao hàng", date: "16/03/2024 09:00", icon: Truck, done: true },
  { status: "Đã giao hàng", date: "18/03/2024 14:00", icon: Package, done: true },
];

export default function OrderDetailPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Chi tiết đơn hàng</h1>
      <div className="space-y-6">
        <div className="glass-card p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Mã đơn hàng</p>
              <p className="text-lg font-bold text-foreground">BL240315001</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-medium bg-green-100 text-green-800">Đã giao hàng</span>
          </div>
          {/* Timeline */}
          <div className="space-y-4">
            {timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${step.done ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                  <step.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${step.done ? "text-foreground" : "text-muted-foreground"}`}>{step.status}</p>
                  <p className="text-xs text-muted-foreground">{step.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-heading text-lg font-semibold mb-4">Địa chỉ giao hàng</h3>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Nguyễn Văn An</p>
              <p className="text-sm text-muted-foreground">0901234567</p>
              <p className="text-sm text-muted-foreground">123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-heading text-lg font-semibold mb-4">Sản phẩm</h3>
          <div className="flex justify-between items-center p-3 bg-white/40 rounded-xl">
            <div>
              <p className="font-medium text-foreground">Bộ Đồ Ngủ Lụa Hồng Pastel</p>
              <p className="text-xs text-muted-foreground">M / Hồng pastel x1</p>
            </div>
            <p className="font-bold text-primary">{formatCurrency(690000)}</p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/30 space-y-1">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tạm tính</span><span>{formatCurrency(690000)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vận chuyển</span><span>{formatCurrency(30000)}</span></div>
            <div className="flex justify-between font-semibold text-lg"><span>Tổng</span><span className="text-primary">{formatCurrency(720000)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
