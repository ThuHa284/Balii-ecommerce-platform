import Link from "next/link";
import { Cat, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-12 text-center max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Cute Cat Icon with bounce */}
        <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-full bg-violet-100/80 mb-6 mx-auto">
          <Cat className="w-14 h-14 text-violet-400 animate-bounce" />
          {/* Little sparkles */}
          <span className="absolute top-1 right-1 text-xl">✨</span>
          <span className="absolute bottom-1 left-2 text-lg">💕</span>
        </div>

        {/* Giant 404 */}
        <div className="font-heading text-7xl font-bold text-gradient mb-2 leading-none">
          404
        </div>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-4 mt-2">
          Meo! Lạc đường mất rồi...
        </h1>

        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          Trang bạn đang tìm kiếm không tồn tại hoặc chú mèo Balii đã giấu nó
          đi mất rồi. Hãy để chúng mình đưa bạn về nhà nhé.
        </p>

        <Link
          href="/"
          className="btn-primary inline-flex items-center gap-2 px-8"
        >
          <Home className="w-4 h-4" />
          Về lại Trang chủ
        </Link>

        {/* Decorative paw prints */}
        <div className="mt-8 flex justify-center gap-3 text-violet-300/60 text-xl select-none">
          <span>🐾</span>
          <span>🐾</span>
          <span>🐾</span>
        </div>
      </div>
    </div>
  );
}
