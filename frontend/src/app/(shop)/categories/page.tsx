import Link from "next/link";
import { LayoutGrid } from "lucide-react";

export default function CategoriesPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="glass-card p-10 text-center max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-violet-100/80 mb-6">
          <LayoutGrid className="w-10 h-10 text-violet-400" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-3">
          Danh mục sản phẩm
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          Tính năng này đang được Balii hoàn thiện. Bạn quay lại sau nhé! ♥
        </p>
        <Link href="/products" className="btn-primary inline-flex items-center gap-2">
          Xem tất cả sản phẩm
        </Link>
      </div>
    </div>
  );
}
