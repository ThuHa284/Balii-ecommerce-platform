"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Star, Truck, ShieldCheck, RotateCcw, Wand2 } from "lucide-react";
import ProductGrid from "@/components/product/product-grid";
import { MOCK_PRODUCTS } from "@/lib/api/mock-data";
import { MOCK_CATEGORIES } from "@/lib/api/mock-data";
import { formatCurrency } from "@/lib/utils";

const HERO_VIDEO_URL =
  "https://res.cloudinary.com/ddbnubhxr/video/upload/f_auto,q_auto,ac_none/v1777210564/video_background_ijdowe.mp4";

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  // 5-second timeout fallback for video
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 2) {
        setVideoError(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const featuredProducts = MOCK_PRODUCTS.filter((p) => p.isFeatured);
  const newProducts = MOCK_PRODUCTS.filter((p) => p.isNew);

  return (
    <div>
      {/* ============================================
          HERO SECTION — Full-screen Video Background
          ============================================ */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0 bg-violet-100" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
          <div className="fade-in-up">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-foreground mb-6">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Bộ sưu tập mới 2024
            </span>
          </div>

          <h1 className="fade-in-up fade-in-up-delay-1 font-heading text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
            Giấc Ngủ{" "}
            <span className="text-gradient">Ngọt Ngào</span>
            <br />
            Trong Lụa Mềm Mại
          </h1>

          <p className="fade-in-up fade-in-up-delay-2 text-lg md:text-xl text-foreground/80 mb-8 max-w-xl mx-auto leading-relaxed">
            Khám phá bộ sưu tập đồ ngủ lụa cao cấp — thiết kế thanh lịch, 
            chất liệu tự nhiên, giá cả hợp lý
          </p>

          <div className="fade-in-up fade-in-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/products" className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2">
              Khám phá ngay
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/categories/do-ngu-lua" className="btn-outline text-base px-8 py-3">
              Đồ ngủ lụa
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-foreground/30 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 rounded-full bg-foreground/40 animate-pulse" />
          </div>
        </div>
      </section>

      {/* ============================================
          FEATURES BAR
          ============================================ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="glass-card p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Truck, title: "Miễn phí vận chuyển", desc: "Cho đơn hàng từ 500.000đ" },
            { icon: ShieldCheck, title: "Cam kết chính hãng", desc: "100% lụa tự nhiên cao cấp" },
            { icon: RotateCcw, title: "Đổi trả 30 ngày", desc: "Đổi trả miễn phí, không lo rủi ro" },
          ].map((feature) => (
            <div key={feature.title} className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-violet-500 shadow-lg shadow-violet-300/20">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================
          CATEGORIES SECTION
          ============================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Danh Mục <span className="text-gradient">Nổi Bật</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Khám phá các dòng sản phẩm đồ ngủ lụa được yêu thích nhất
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {MOCK_CATEGORIES.map((cat, index) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="group glass-card-hover overflow-hidden fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-2xl">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-heading text-xl font-bold text-white mb-1">{cat.name}</h3>
                  <p className="text-sm text-white/80">{cat.productCount} sản phẩm</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================
          FEATURED PRODUCTS
          ============================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">
              Sản Phẩm <span className="text-gradient">Nổi Bật</span>
            </h2>
            <p className="text-muted-foreground">Những mẫu đồ ngủ được yêu thích nhất</p>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline clickable"
          >
            Xem tất cả <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <ProductGrid products={featuredProducts} columns={3} />
      </section>

      {/* ============================================
          ABOUT / BRAND STORY
          ============================================ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="glass-card p-8 md:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Câu Chuyện{" "}
              <span className="text-gradient">Balii</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Balii Sleepwear ra đời từ niềm đam mê tạo nên những bộ đồ ngủ lụa cao cấp với 
              giá cả hợp lý. Chúng tôi tin rằng mỗi người đều xứng đáng được tận hưởng 
              sự mềm mại và sang trọng của lụa mỗi đêm.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Với chất liệu lụa tự nhiên 100%, thiết kế thanh lịch và sự chú trọng đến từng 
              chi tiết, Balii mang đến cho bạn giấc ngủ ngọt ngào nhất.
            </p>
            <div className="flex gap-8">
              {[
                { value: "100%", label: "Lụa tự nhiên" },
                { value: "50+", label: "Mẫu thiết kế" },
                { value: "10K+", label: "Khách hàng" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=600"
              alt="Balii Sleepwear"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ============================================
          AI TRY-ON BANNER
          ============================================ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Link
          href="/try-on"
          className="block group"
        >
          <div className="relative overflow-hidden rounded-3xl tryon-banner-bg glass-card p-8 md:p-12 lg:p-16">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-300/30 text-xs font-semibold text-violet-600 mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  TÍNH NĂNG MỚI — AI
                </div>
                <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight">
                  Mặc Thử Quần Áo{" "}
                  <span className="text-gradient">Bằng AI</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed max-w-lg mb-6 text-sm md:text-base">
                  Xem trước sản phẩm trên chính bạn! Chỉ cần tải ảnh, chọn quần áo 
                  yêu thích — AI sẽ tạo ảnh mặc thử chân thực trong vài giây.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-500 text-white font-medium text-sm shadow-lg shadow-violet-300/25 group-hover:bg-violet-600 group-hover:scale-[1.02] active:scale-95 transition-all">
                  <Wand2 className="w-4 h-4" />
                  Thử ngay miễn phí
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Right side — decorative illustration */}
              <div className="hidden md:flex items-center justify-center">
                <div className="relative">
                  <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-3xl bg-gradient-to-br from-violet-400/20 to-purple-400/20 backdrop-blur-sm border border-violet-200/30 flex items-center justify-center rotate-6 group-hover:rotate-3 transition-transform duration-500">
                    <Wand2 className="w-14 h-14 lg:w-16 lg:h-16 text-violet-400" />
                  </div>
                  <div className="absolute -top-3 -left-3 w-16 h-16 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/40 flex items-center justify-center -rotate-12 group-hover:-rotate-6 transition-transform duration-500 shadow-lg">
                    <Sparkles className="w-7 h-7 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* ============================================
          NEW ARRIVALS
          ============================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-10">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-2">
            Hàng <span className="text-gradient">Mới Về</span>
          </h2>
          <p className="text-muted-foreground">Cập nhật xu hướng thời trang đồ ngủ mới nhất</p>
        </div>
        <ProductGrid products={newProducts} columns={3} />
      </section>

      {/* ============================================
          TESTIMONIALS
          ============================================ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-3">
            Khách Hàng <span className="text-gradient">Nói Gì</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Nguyễn Thị Mai", review: "Chất lụa mềm mại, mát lạnh trên da. Tôi rất hài lòng với sản phẩm của Balii!", rating: 5 },
            { name: "Trần Văn Hùng", review: "Mua tặng vợ, cô ấy rất thích. Đóng gói đẹp, giao hàng nhanh. Sẽ mua thêm!", rating: 5 },
            { name: "Lê Thị Hương", review: "Thiết kế đẹp, chất liệu tốt. Giá cả hợp lý so với chất lượng nhận được.", rating: 4 },
          ].map((t, i) => (
            <div key={i} className="glass-card p-6 fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${j < t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                  />
                ))}
              </div>
              <p className="text-sm text-foreground/80 mb-4 leading-relaxed">&ldquo;{t.review}&rdquo;</p>
              <p className="text-sm font-medium text-foreground">{t.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
