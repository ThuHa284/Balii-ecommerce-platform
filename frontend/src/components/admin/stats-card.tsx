'use client';

import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: 'revenue' | 'orders' | 'customers' | 'products';
  isCurrency?: boolean;
}

const iconMap = {
  revenue: DollarSign,
  orders: ShoppingCart,
  customers: Users,
  products: Package,
};

const gradientMap = {
  revenue: 'from-emerald-400 to-teal-500',
  orders: 'from-blue-400 to-indigo-500',
  customers: 'from-purple-400 to-violet-500',
  products: 'from-orange-400 to-amber-500',
};

export default function StatsCard({
  title,
  value,
  change,
  icon,
  isCurrency,
}: StatsCardProps) {
  const Icon = iconMap[icon];
  const gradient = gradientMap[icon];
  const isPositive = Boolean(change && change > 0);

  return (
    <div className="glass-card p-6 transition-transform duration-200 hover:scale-[1.02]">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">
            {isCurrency ? formatCurrency(value as number) : value}
          </p>
          {change !== undefined && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-emerald-600' : 'text-red-500',
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>
                {isPositive ? '+' : ''}
                {change}%
              </span>
              <span className="text-muted-foreground">so với tháng trước</span>
            </div>
          )}
        </div>
        <div
          className={cn('rounded-xl bg-gradient-to-br p-3 shadow-lg', gradient)}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}
