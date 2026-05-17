"use client";

import { DollarSign, Package, ShoppingCart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: "revenue" | "orders" | "customers" | "products";
  isCurrency?: boolean;
}

const iconMap = {
  revenue: DollarSign,
  orders: ShoppingCart,
  customers: Users,
  products: Package,
};

const gradientMap = {
  revenue: "from-emerald-400 to-teal-500",
  orders: "from-blue-400 to-indigo-500",
  customers: "from-purple-400 to-violet-500",
  products: "from-orange-400 to-amber-500",
};

export default function StatsCard({ title, value, change, icon, isCurrency }: StatsCardProps) {
  const Icon = iconMap[icon];
  const gradient = gradientMap[icon];
  const isPositive = change && change > 0;

  return (
    <div className="glass-card p-6 hover:scale-[1.02] transition-transform duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">
            {isCurrency ? formatCurrency(value as number) : value}
          </p>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", isPositive ? "text-emerald-600" : "text-red-500")}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isPositive ? "+" : ""}{change}%</span>
              <span className="text-muted-foreground">so với tháng trước</span>
            </div>
          )}
        </div>
        <div className={cn("p-3 rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
