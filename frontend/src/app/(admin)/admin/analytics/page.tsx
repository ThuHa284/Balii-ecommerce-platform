"use client";

import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Phân tích</h1>
      <p className="text-muted-foreground mb-8">Thống kê chi tiết hoạt động kinh doanh</p>
      <div className="glass-card p-12 text-center">
        <BarChart3 className="w-16 h-16 text-violet-300/50 mx-auto mb-4" />
        <p className="font-medium text-foreground mb-2">Phân tích chi tiết</p>
        <p className="text-sm text-muted-foreground">
          Tính năng này đang được Balii hoàn thiện. Bạn quay lại sau nhé! ♥
        </p>
      </div>
    </div>
  );
}
