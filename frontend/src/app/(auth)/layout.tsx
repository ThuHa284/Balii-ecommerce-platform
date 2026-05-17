import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-4 py-12 bg-[url('/auth_background.jpg')] bg-cover bg-center bg-no-repeat"
    >
      {/* Soft dreamy overlay for readability */}
      <div className="absolute inset-0 bg-violet-50/30 backdrop-blur-sm" />

      {/* Content above overlay */}
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Logo */}
        <Link href="/" className="mb-8 text-center clickable">
          <span className="font-heading text-4xl font-bold drop-shadow-md"
            style={{ color: '#7c5cbf' }}>Balii</span>
          <span className="block text-sm tracking-[0.3em] text-violet-700/80 uppercase mt-1 drop-shadow-sm font-medium">
            Sleepwear
          </span>
        </Link>

        {/* Auth Form Container */}
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </div>

        {/* Back to home */}
        <Link
          href="/"
          className="mt-6 text-sm text-violet-700/70 hover:text-violet-800 transition-colors font-medium drop-shadow-sm"
        >
          ← Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}
