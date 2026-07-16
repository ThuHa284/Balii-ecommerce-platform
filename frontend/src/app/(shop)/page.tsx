'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Wand2,
  X,
} from 'lucide-react';
import ComboBanner from '@/components/product/combo-banner';
import ProductGrid from '@/components/product/product-grid';
import { getActiveCampaigns } from '@/lib/api/campaigns.api';
import { getCollections } from '@/lib/api/collections.api';
import { getCategories } from '@/lib/api/categories.api';
import {
  getFeaturedProducts,
  getNewProducts,
  getProducts,
} from '@/lib/api/products.api';
import { formatCurrency } from '@/lib/utils';
import { Campaign, Category, Collection, Product } from '@/types/product.types';

const HERO_VIDEO_URL =
  'https://res.cloudinary.com/ddbnubhxr/video/upload/f_auto,q_auto,ac_none/v1777210564/video_background_ijdowe.mp4';
const SHOW_ACADEMIC_NOTICE =
  process.env.NEXT_PUBLIC_SHOW_ACADEMIC_NOTICE === 'true' ||
  (process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_SHOW_ACADEMIC_NOTICE !== 'false');

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [campaignProducts, setCampaignProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isAcademicNoticeOpen, setIsAcademicNoticeOpen] =
    useState(SHOW_ACADEMIC_NOTICE);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 2) {
        setVideoError(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      const [
        featured,
        newest,
        productResult,
        categoryList,
        campaignList,
        collectionList,
      ] = await Promise.all([
        getFeaturedProducts(),
        getNewProducts(),
        getProducts({ page: 1, limit: 50 }),
        getCategories(),
        getActiveCampaigns(),
        getCollections(),
      ]);

      setFeaturedProducts(featured);
      setNewProducts(newest);
      setCampaignProducts(productResult.products);
      setCategories(categoryList);
      setCampaigns(campaignList);
      setCollections(collectionList);
    }

    void loadData();
  }, []);

  const primaryCampaign = campaigns[0] ?? null;
  const primaryCampaignProducts = primaryCampaign
    ? campaignProducts
        .filter((product) => primaryCampaign.productIds.includes(product.id))
        .slice(0, 4)
    : [];

  function getCampaignOfferLabel(campaign: Campaign) {
    if (campaign.discountType === 'PERCENT') {
      return `Giảm thêm ${campaign.discountValue ?? 0}%`;
    }

    if (campaign.discountType === 'AMOUNT') {
      return `Giảm thêm ${formatCurrency(campaign.discountValue ?? 0)}`;
    }

    return campaign.giftName
      ? `Tặng kèm ${campaign.giftName}`
      : 'Tặng quà/phụ kiện';
  }

  return (
    <div>
      {isAcademicNoticeOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="academic-notice-title"
        >
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
            <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
            <button
              type="button"
              onClick={() => setIsAcademicNoticeOpen(false)}
              className="absolute right-4 top-5 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Đóng thông báo"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-7 sm:p-9">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
                Thông báo quan trọng
              </p>
              <h1
                id="academic-notice-title"
                className="mt-2 pr-8 font-heading text-2xl font-bold text-slate-950 sm:text-3xl"
              >
                Balii là hệ thống phục vụ đồ án tốt nghiệp
              </h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Website được xây dựng cho mục đích học thuật và trình diễn kỹ
                thuật, không phải kênh bán hàng thương mại chính thức. Chỉ thực
                hiện thanh toán thật khi bạn đã được chủ dự án xác nhận và hiểu
                rõ phạm vi thử nghiệm.
              </p>
              <button
                type="button"
                onClick={() => setIsAcademicNoticeOpen(false)}
                className="mt-7 w-full rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                Tôi đã hiểu và tiếp tục
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        {!videoError ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setVideoError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
        ) : (
          <div className="absolute inset-0 bg-violet-100" />
        )}

        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <div className="fade-in-up">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full glass-card px-4 py-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Bộ sưu tập mới 2026
            </span>
          </div>

          <h1 className="fade-in-up fade-in-up-delay-1 mb-6 font-heading text-4xl font-bold leading-tight text-foreground md:text-6xl lg:text-7xl">
            Giấc Ngủ <span className="text-gradient">Ngọt Ngào</span>
            <br />
            Trong Lụa Mềm Mại
          </h1>

          <p className="fade-in-up fade-in-up-delay-2 mx-auto mb-8 max-w-xl text-lg leading-relaxed text-foreground/80 md:text-xl">
            Khám phá bộ sưu tập đồ ngủ - thiết kế xinh xắn, chất liệu tự nhiên,
            giá cả hợp lý
          </p>

          <div className="fade-in-up fade-in-up-delay-3 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/products"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 text-base"
            >
              Khám phá ngay
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/categories/do-ngu-lua"
              className="btn-outline px-8 py-3 text-base"
            >
              Đồ ngủ mới nhất
            </Link>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-16 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 glass-card p-6 md:grid-cols-3 md:p-8">
          {[
            {
              icon: Truck,
              title: 'Miễn phí vận chuyển',
              desc: 'Cho đơn hàng từ 500.000đ',
            },
            {
              icon: ShieldCheck,
              title: 'Cam kết chính hãng',
              desc: '100% lụa tự nhiên cao cấp',
            },
            {
              icon: RotateCcw,
              title: 'Đổi trả 30 ngày',
              desc: 'Đổi trả miễn phí, không lo rủi ro',
            },
          ].map((feature) => (
            <div key={feature.title} className="flex items-center gap-4">
              <div className="rounded-xl bg-violet-500 p-3 shadow-lg shadow-violet-300/20">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="mb-3 font-heading text-3xl font-bold text-foreground md:text-4xl">
            Danh Mục <span className="text-gradient">Nổi Bật</span>
          </h2>
          <p className="mx-auto max-w-md text-muted-foreground">
            Khám phá các dòng sản phẩm đồ ngủ được yêu thích nhất
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group relative overflow-hidden rounded-full border border-violet-200/60 bg-white/60 backdrop-blur-sm px-6 py-3 font-medium text-foreground shadow-sm transition-all duration-300 hover:bg-violet-500 hover:text-white hover:border-violet-500 hover:shadow-lg hover:shadow-violet-300/25 hover:scale-[1.04] active:scale-95 fade-in-up"
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              <span className="relative z-10 text-sm sm:text-base">
                {category.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {primaryCampaign ? (
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[32px] border border-rose-200/60 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-8 md:p-10">
                <span className="inline-flex items-center rounded-full border border-rose-300/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                  {primaryCampaign.badgeText || 'Chiến dịch nổi bật'}
                </span>
                <h2 className="mt-4 font-heading text-3xl font-bold text-slate-900 md:text-4xl">
                  {primaryCampaign.name}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  {primaryCampaign.shortDescription ||
                    primaryCampaign.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full bg-rose-600 px-4 py-2 font-semibold text-white">
                    {getCampaignOfferLabel(primaryCampaign)}
                  </span>
                  <span className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-slate-700">
                    Kết thúc lúc{' '}
                    {new Date(primaryCampaign.endAt).toLocaleDateString(
                      'vi-VN',
                    )}
                  </span>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {primaryCampaignProducts.map((product) => {
                    const campaignPrice =
                      product.salePrice ?? product.basePrice;
                    const regularPrice = product.basePrice;

                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        className="group flex gap-4 rounded-2xl border border-white/70 bg-white/75 p-3 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          <Image
                            src={product.thumbnail}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                            {product.name}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-base font-bold text-rose-600">
                              {formatCurrency(campaignPrice)}
                            </span>
                            {campaignPrice < regularPrice ? (
                              <span className="text-xs text-slate-400 line-through">
                                {formatCurrency(regularPrice)}
                              </span>
                            ) : null}
                          </div>
                          {primaryCampaign.discountType === 'GIFT' ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {primaryCampaign.giftDescription ||
                                'Áp dụng quà tặng trong thời gian chiến dịch.'}
                            </p>
                          ) : (
                            <p className="mt-2 text-xs font-medium text-rose-700">
                              Ưu đãi chiến dịch áp dụng khi mua trong thời gian
                              diễn ra.
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="relative min-h-[320px] bg-slate-900">
                {primaryCampaign.bannerImage ? (
                  <Image
                    src={primaryCampaign.bannerImage}
                    alt={primaryCampaign.name}
                    fill
                    className="object-cover"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Ưu tiên hiển thị dưới danh mục nổi bật
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    {primaryCampaign.description ||
                      'Sản phẩm trong chiến dịch sẽ được áp dụng mức ưu đãi riêng trong khoảng thời gian đã cấu hình.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <ComboBanner />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Sản Phẩm <span className="text-gradient">Nổi Bật</span>
            </h2>
            <p className="text-muted-foreground">
              Những mẫu đồ ngủ được yêu thích nhất
            </p>
          </div>
          <Link
            href="/products"
            className="clickable inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ProductGrid products={featuredProducts} columns={3} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Bộ Sưu Tập <span className="text-gradient">Độc Quyền</span>
            </h2>
            <p className="text-muted-foreground">
              Khám phá phong cách thời trang lụa cao cấp theo mùa
            </p>
          </div>
          <Link
            href="/collections"
            className="clickable inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả BST <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {collections.slice(0, 4).map((collection, index) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="group relative block aspect-[16/10] overflow-hidden rounded-2xl glass-card-hover fade-in-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <Image
                src={collection.bannerImage}
                alt={collection.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute right-6 bottom-6 left-6 text-white">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-white/70">
                  {collection.season}
                </span>
                <h3 className="mb-2 font-heading text-2xl font-bold">
                  {collection.name}
                </h3>
                <p className="mb-4 line-clamp-1 max-w-md text-sm text-white/80">
                  {collection.shortDescription}
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-transform group-hover:translate-x-1">
                  Khám phá bộ sưu tập <ArrowRight className="h-4.5 w-4.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 glass-card p-8 md:p-12 lg:grid-cols-2 lg:p-16">
          <div>
            <h2 className="mb-4 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Câu Chuyện <span className="text-gradient">Balii</span>
            </h2>
            <p className="mb-4 leading-relaxed text-muted-foreground">
              Balii Sleepwear ra đời từ niềm đam mê tạo nên những bộ đồ ngủ xin
              xắn với giá cả hợp lý. Chúng tôi tin rằng mỗi người đều xứng đáng
              được tận hưởng sự mềm mại và dễ chịu của mỗi đêm.
            </p>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              Với chất liệu tự nhiên 100%, thiết kế thanh lịch và sự chú trọng
              đến từng chi tiết, Balii mang đến cho bạn giấc ngủ ngọt ngào nhất.
            </p>
            <div className="flex gap-8">
              {[
                { value: '100%', label: 'Lụa tự nhiên' },
                { value: '50+', label: 'Mẫu thiết kế' },
                { value: '10K+', label: 'Khách hàng' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold text-primary">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-2xl">
            <Image
              src="/images/placeholder.svg"
              alt="Balii Sleepwear"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <Link href="/try-on" className="group block">
          <div className="tryon-banner-bg glass-card relative overflow-hidden rounded-3xl p-8 md:p-12 lg:p-16">
            <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-purple-400/10 blur-3xl" />

            <div className="relative z-10 grid grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-600">
                  <Sparkles className="h-3.5 w-3.5" />
                  TÍNH NĂNG MỚI - AI
                </div>
                <h2 className="mb-3 font-heading text-2xl font-bold leading-tight text-foreground md:text-3xl lg:text-4xl">
                  Mặc Thử Quần Áo <span className="text-gradient">Bằng AI</span>
                </h2>
                <p className="mb-6 max-w-lg text-sm leading-relaxed text-muted-foreground md:text-base">
                  Xem trước sản phẩm trên chính bạn! Chỉ cần tải ảnh, chọn quần
                  áo yêu thích - AI sẽ tạo ảnh mặc thử chân thực trong vài giây.
                </p>
                <div className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-violet-300/25 transition-all group-hover:scale-[1.02] group-hover:bg-violet-600 active:scale-95">
                  <Wand2 className="h-4 w-4" />
                  Thử ngay miễn phí
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>

              <div className="hidden items-center justify-center md:flex">
                <div className="relative">
                  <div className="flex h-32 w-32 rotate-6 items-center justify-center rounded-3xl border border-violet-200/30 bg-gradient-to-br from-violet-400/20 to-purple-400/20 backdrop-blur-sm transition-transform duration-500 group-hover:rotate-3 lg:h-40 lg:w-40">
                    <Wand2 className="h-14 w-14 text-violet-400 lg:h-16 lg:w-16" />
                  </div>
                  <div className="absolute -top-3 -left-3 flex h-16 w-16 -rotate-12 items-center justify-center rounded-2xl border border-white/40 bg-white/50 shadow-lg backdrop-blur-sm transition-transform duration-500 group-hover:-rotate-6">
                    <Sparkles className="h-7 w-7 text-purple-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="mb-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
              Hàng <span className="text-gradient">Mới Về</span>
            </h2>
            <p className="text-muted-foreground">
              Cập nhật xu hướng thời trang đồ ngủ mới nhất
            </p>
          </div>
          <Link
            href="/products"
            className="clickable inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ProductGrid products={newProducts} columns={3} />
      </section>
    </div>
  );
}
