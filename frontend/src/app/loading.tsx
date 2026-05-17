export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        {/* Pulsing spinner stack */}
        <div className="relative w-20 h-20 mx-auto mb-5">
          {/* Outer soft ring */}
          <div className="absolute inset-0 rounded-full border-2 border-violet-200 animate-ping opacity-30" />
          {/* Spinner ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-400 border-r-violet-300 animate-spin" />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl animate-pulse select-none">✨</span>
          </div>
        </div>

        <p className="text-sm font-medium text-violet-400/80 animate-pulse tracking-widest uppercase">
          Đang tải...
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Balii đang chuẩn bị cho bạn ♥
        </p>
      </div>
    </div>
  );
}
