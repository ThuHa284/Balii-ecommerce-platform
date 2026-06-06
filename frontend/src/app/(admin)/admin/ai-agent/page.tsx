'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Brain,
  ChevronRight,
  Cpu,
  Database,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { MOCK_PRODUCTS } from '@/lib/api/mock-data';
import { formatCurrency } from '@/lib/utils';

interface ScrapedProduct {
  id: string;
  name: string;
  platform:
    | 'Shopee'
    | 'Lazada'
    | 'TikTok Shop'
    | 'Mia Sleepwear'
    | 'Lụa Vy'
    | 'Competitor Brand';
  price: number;
  sales: string;
  similarity: number;
  link: string;
}

interface ProductAnalysis {
  similarProducts: ScrapedProduct[];
  insights: {
    positioning: string;
    seo: string[];
    strategy: string;
  };
}

const ANALYSIS_DATA: Record<string, ProductAnalysis> = {
  prod_001: {
    similarProducts: [
      {
        id: 'scraped_1_1',
        name: 'Váy ngủ lụa 2 dây hồng pastel',
        platform: 'Shopee',
        price: 320000,
        sales: 'Đã bán 2.4k',
        similarity: 92,
        link: 'https://shopee.vn',
      },
      {
        id: 'scraped_1_2',
        name: 'Đầm ngủ lụa phối ren hồng đào',
        platform: 'Lazada',
        price: 450000,
        sales: 'Đã bán 820',
        similarity: 88,
        link: 'https://lazada.vn',
      },
      {
        id: 'scraped_1_3',
        name: 'Váy ngủ lụa Mulberry cao cấp',
        platform: 'Mia Sleepwear',
        price: 790000,
        sales: 'Đã bán 120',
        similarity: 95,
        link: 'https://miasleepwear.com',
      },
    ],
    insights: {
      positioning:
        'Sản phẩm cạnh tranh trực tiếp ở phân khúc trung cao cấp. Balii đang giữ mức giá hợp lý hơn nhóm thương hiệu boutique nhưng vẫn cần nhấn mạnh lợi thế chất liệu lụa tự nhiên và cảm giác mặc thoáng mát.',
      seo: [
        'Đầm ngủ lụa Mulberry cao cấp',
        'Váy ngủ lụa hồng pastel quyến rũ',
        'Váy ngủ lụa thoáng mát cho mùa hè',
      ],
      strategy:
        'Nên đẩy mạnh cụm từ “lụa tự nhiên” ở tiêu đề và mô tả đầu trang sản phẩm. Có thể thử gói quà tặng cao cấp để tăng giá trị cảm nhận mà không cần giảm sâu giá bán.',
    },
  },
  prod_002: {
    similarProducts: [
      {
        id: 'scraped_2_1',
        name: 'Bộ ngủ pyjama satin dài tay',
        platform: 'Shopee',
        price: 189000,
        sales: 'Đã bán 12k',
        similarity: 85,
        link: 'https://shopee.vn',
      },
      {
        id: 'scraped_2_2',
        name: 'Bộ pyjama lụa ngọc trai form rộng',
        platform: 'TikTok Shop',
        price: 590000,
        sales: 'Đã bán 1.8k',
        similarity: 93,
        link: 'https://tiktok.com',
      },
      {
        id: 'scraped_2_3',
        name: 'Pyjama lụa tơ tằm thêu tên riêng',
        platform: 'Lụa Vy',
        price: 1350000,
        sales: 'Đã bán 90',
        similarity: 90,
        link: 'https://luavy.vn',
      },
    ],
    insights: {
      positioning:
        'Thị trường pyjama giá rẻ rất đông, nhưng phần lớn dùng satin pha. Balii có thể định vị ở nhóm mua hàng quan tâm chất liệu thật và trải nghiệm mặc lâu dài.',
      seo: [
        'Pyjama lụa trắng ngà sang trọng',
        'Bộ ngủ lụa dài tay cao cấp',
        'Đồ ngủ lụa tự nhiên mềm mát',
      ],
      strategy:
        'Nên gắn nội dung AI Try-On vào các bài quảng bá để khách hàng thấy phom dáng rõ hơn. Truyền thông tập trung vào độ mềm, thoáng và ít nhăn sẽ hiệu quả hơn chỉ nói về kiểu dáng.',
    },
  },
  prod_003: {
    similarProducts: [
      {
        id: 'scraped_3_1',
        name: 'Áo choàng ngủ lụa gợi cảm',
        platform: 'Shopee',
        price: 299000,
        sales: 'Đã bán 1.1k',
        similarity: 90,
        link: 'https://shopee.vn',
      },
      {
        id: 'scraped_3_2',
        name: 'Áo choàng lụa viền ren tay rộng',
        platform: 'Lazada',
        price: 520000,
        sales: 'Đã bán 340',
        similarity: 92,
        link: 'https://lazada.vn',
      },
      {
        id: 'scraped_3_3',
        name: 'Luxury Lavender Silk Robe',
        platform: 'Competitor Brand',
        price: 1250000,
        sales: 'Đã bán 50',
        similarity: 94,
        link: 'https://competitor.com',
      },
    ],
    insights: {
      positioning:
        'Màu lavender đang là điểm khác biệt tốt của Balii. Ở nhóm này, đối thủ cạnh tranh trực tiếp ít hơn nên giá có thể giữ ổn định nếu hình ảnh sản phẩm đủ cao cấp.',
      seo: [
        'Áo choàng ngủ lụa tím lavender',
        'Áo choàng kimono lụa cao cấp',
        'Áo khoác ngủ lụa sang trọng',
      ],
      strategy:
        'Nên tạo combo áo choàng với đầm ngủ cùng tông để tăng AOV. Hình ảnh chụp theo set sẽ dễ bán hơn so với trưng riêng từng món.',
    },
  },
  prod_004: {
    similarProducts: [
      {
        id: 'scraped_4_1',
        name: 'Váy ngủ lụa đen phối ren',
        platform: 'Shopee',
        price: 245000,
        sales: 'Đã bán 4.5k',
        similarity: 95,
        link: 'https://shopee.vn',
      },
      {
        id: 'scraped_4_2',
        name: 'Đầm ngủ đen hở lưng phối ren',
        platform: 'TikTok Shop',
        price: 380000,
        sales: 'Đã bán 2.1k',
        similarity: 91,
        link: 'https://tiktok.com',
      },
      {
        id: 'scraped_4_3',
        name: 'Sexy Black Silk Slip Dress Premium',
        platform: 'Competitor Brand',
        price: 850000,
        sales: 'Đã bán 180',
        similarity: 89,
        link: 'https://competitor.com',
      },
    ],
    insights: {
      positioning:
        'Phân khúc đầm đen hai dây cạnh tranh rất mạnh. Balii cần lấy lợi thế từ chất liệu và độ hoàn thiện thay vì cạnh tranh trực tiếp bằng giá.',
      seo: [
        'Váy ngủ lụa đen phối ren gợi cảm',
        'Đầm ngủ lụa đen cao cấp',
        'Váy ngủ hai dây hở lưng',
      ],
      strategy:
        'Có thể triển khai ưu đãi nhẹ cuối tuần hoặc quà tặng nhỏ đi kèm để tăng chuyển đổi. Ảnh chi tiết phần ren và đường may sẽ thuyết phục hơn ảnh toàn thân đơn thuần.',
    },
  },
  prod_005: {
    similarProducts: [
      {
        id: 'scraped_5_1',
        name: 'Set đồ ngủ lụa cộc tay xanh mint',
        platform: 'Shopee',
        price: 150000,
        sales: 'Đã bán 8.9k',
        similarity: 88,
        link: 'https://shopee.vn',
      },
      {
        id: 'scraped_5_2',
        name: 'Bộ ngủ lụa xanh mint thêu hoa',
        platform: 'Lazada',
        price: 320000,
        sales: 'Đã bán 1.2k',
        similarity: 91,
        link: 'https://lazada.vn',
      },
      {
        id: 'scraped_5_3',
        name: 'Mint Green Silk PJ Short Set',
        platform: 'Competitor Brand',
        price: 680000,
        sales: 'Đã bán 210',
        similarity: 96,
        link: 'https://competitor.com',
      },
    ],
    insights: {
      positioning:
        'Màu xanh mint đang hợp xu hướng mùa hè. Balii có thể đứng ở nhóm giá giữa, cao hơn hàng chợ nhưng vẫn dễ tiếp cận hơn boutique premium.',
      seo: [
        'Bộ đồ ngủ lụa xanh mint cộc tay',
        'Set đồ ngủ lụa quần ngắn',
        'Pyjama lụa xanh pastel mùa hè',
      ],
      strategy:
        'Nên giữ mức giá hiện tại nhưng tăng thông điệp về độ hoàn thiện đường may, độ co giãn thoải mái và cách bảo quản lụa để khác biệt với hàng giá rẻ.',
    },
  },
  prod_006: {
    similarProducts: [
      {
        id: 'scraped_6_1',
        name: 'Bộ pyjama lụa màu kem dáng dài',
        platform: 'Shopee',
        price: 219000,
        sales: 'Đã bán 3.8k',
        similarity: 90,
        link: 'https://shopee.vn',
      },
      {
        id: 'scraped_6_2',
        name: 'Bộ ngủ satin tay dài màu nude',
        platform: 'Lazada',
        price: 280000,
        sales: 'Đã bán 670',
        similarity: 87,
        link: 'https://lazada.vn',
      },
      {
        id: 'scraped_6_3',
        name: 'Pyjama lụa viền be cao cấp',
        platform: 'Lụa Vy',
        price: 1200000,
        sales: 'Đã bán 110',
        similarity: 93,
        link: 'https://luavy.vn',
      },
    ],
    insights: {
      positioning:
        'Tông be nude phù hợp nhóm khách hàng thích phong cách tối giản. Đây là dòng có tiềm năng truyền thông theo lifestyle tốt hơn là chạy quảng cáo giảm giá.',
      seo: [
        'Bộ pyjama lụa be nude tối giản',
        'Đồ ngủ lụa màu be cao cấp',
        'Pyjama lụa dài tay phong cách Hàn Quốc',
      ],
      strategy:
        'Nên làm lookbook theo phong cách nghỉ dưỡng và nội dung tập trung vào cảm giác thư giãn, tinh tế. Đây là nhóm sản phẩm hợp để xây hình ảnh thương hiệu.',
    },
  },
};

const CRAWL_SUBSTEPS = [
  'Khởi động AI Agent và trích xuất dữ liệu hình ảnh sản phẩm...',
  'Lập chỉ mục từ khóa tương quan trên các sàn thương mại điện tử...',
  'Đang cào dữ liệu sản phẩm tương tự trên Shopee...',
  'Đang cào dữ liệu sản phẩm tương tự trên Lazada và TikTok Shop...',
  'Đang quét thông tin từ các thương hiệu cùng phân khúc...',
  'Đang so sánh giá, lượt bán và độ tương đồng phom dáng...',
  'Hoàn tất tổng hợp khuyến nghị từ AI Agent...',
];

export default function AIAgentPage() {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlStepIndex, setCrawlStepIndex] = useState(0);
  const [hasCrawled, setHasCrawled] = useState<Record<string, boolean>>({});

  const selectedProduct = useMemo(
    () => MOCK_PRODUCTS.find((product) => product.id === selectedProductId),
    [selectedProductId],
  );

  const currentAnalysis = selectedProductId
    ? ANALYSIS_DATA[selectedProductId]
    : null;
  const alreadyCrawled = Boolean(
    selectedProductId && hasCrawled[selectedProductId],
  );

  const handleStartCrawl = () => {
    if (!selectedProductId) {
      toast.warning('Vui lòng chọn một sản phẩm trước khi cào dữ liệu.');
      return;
    }

    setIsCrawling(true);
    setCrawlProgress(0);
    setCrawlStepIndex(0);
  };

  useEffect(() => {
    if (!isCrawling) return;

    const totalSteps = CRAWL_SUBSTEPS.length;
    const interval = setInterval(() => {
      setCrawlProgress((prev) => {
        const next = prev + Math.floor(100 / totalSteps);
        if (next >= 100) {
          clearInterval(interval);
          setIsCrawling(false);
          setHasCrawled((prevState) => ({
            ...prevState,
            [selectedProductId]: true,
          }));
          toast.success(
            `Đã cập nhật dữ liệu cạnh tranh cho "${selectedProduct?.name}".`,
          );
          return 100;
        }

        setCrawlStepIndex((index) => Math.min(index + 1, totalSteps - 1));
        return next;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [isCrawling, selectedProductId, selectedProduct]);

  return (
    <div className="space-y-6">
      <div className="border-b border-white/20 pb-4">
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold text-foreground">
          <Brain className="h-8 w-8 shrink-0 animate-pulse text-violet-500" />
          AI Agent Phân Tích Cạnh Tranh & Khuyến Nghị
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn một sản phẩm của Balii để AI quét các mẫu tương tự trên thị
          trường và gợi ý hướng tối ưu nội dung, giá bán và định vị.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-card flex min-h-[180px] flex-col justify-between p-5 lg:col-span-1">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-foreground">
              <ShoppingBag className="h-5 w-5 text-violet-500" />
              1. Chọn sản phẩm cần phân tích
            </h2>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={isCrawling}
              className="w-full cursor-pointer rounded-xl border border-white/80 bg-white/60 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="">-- Chọn sản phẩm --</option>
              {MOCK_PRODUCTS.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (
                  {formatCurrency(product.salePrice || product.basePrice)})
                </option>
              ))}
            </select>
          </div>

          {selectedProductId && (
            <button
              disabled={isCrawling}
              onClick={handleStartCrawl}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold shadow-md"
            >
              {isCrawling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang quét đối thủ ({crawlProgress}%)
                </>
              ) : alreadyCrawled ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Quét lại dữ liệu mới
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Bắt đầu cào dữ liệu
                </>
              )}
            </button>
          )}
        </div>

        <div className="glass-card flex min-h-[180px] flex-col justify-between bg-white/40 p-5 lg:col-span-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-heading text-base font-bold text-foreground">
              <Cpu className="h-5 w-5 text-violet-500" />
              2. Trạng thái AI Agent & Hướng dẫn
            </h2>

            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div className="space-y-1 text-muted-foreground">
                <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Các bước thực hiện:
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs">
                  <li>Chọn một sản phẩm ở khung bên trái.</li>
                  <li>Nhấn nút để AI bắt đầu cào dữ liệu cạnh tranh.</li>
                  <li>Xem báo cáo định vị, giá và từ khóa đề xuất.</li>
                </ul>
              </div>

              <div className="flex flex-col justify-center border-t border-white/40 pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      Dữ liệu hệ thống
                    </span>
                    <span className="flex items-center gap-1 text-lg font-bold text-foreground">
                      <Database className="h-4 w-4 text-violet-500" />
                      1.540 sản phẩm
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase text-muted-foreground">
                      Độ tin cậy thuật toán
                    </span>
                    <span className="flex items-center gap-1 text-lg font-bold text-violet-600">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      98.4%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedProduct && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-violet-100 bg-white/70 p-2 text-xs">
              <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded border border-white/80">
                <Image
                  src={selectedProduct.thumbnail}
                  alt=""
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-foreground">
                  {selectedProduct.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {selectedProduct.shortDescription}
                </p>
              </div>
              <span className="shrink-0 font-bold text-primary">
                {formatCurrency(
                  selectedProduct.salePrice || selectedProduct.basePrice,
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {isCrawling && (
        <div className="glass-card animate-fade-in space-y-2 border-l-4 border-l-violet-500 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-violet-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI Agent đang cào quét dữ liệu trực tuyến...
            </span>
            <span className="font-mono text-sm font-bold">
              {crawlProgress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-300"
              style={{ width: `${crawlProgress}%` }}
            />
          </div>
          <p className="pl-1 text-xs italic leading-relaxed text-foreground/80">
            “{CRAWL_SUBSTEPS[crawlStepIndex]}”
          </p>
        </div>
      )}

      <div className="space-y-6">
        {!selectedProductId && (
          <div className="glass-card flex min-h-[260px] flex-col items-center justify-center space-y-4 border-dashed bg-white/30 p-12 text-center">
            <div className="rounded-full bg-violet-50 p-4 text-violet-500">
              <Brain className="h-10 w-10 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Sẵn sàng phân tích dữ liệu
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Hãy chọn một sản phẩm ở bước 1 để bắt đầu quét và xem khuyến
                nghị từ AI Agent.
              </p>
            </div>
          </div>
        )}

        {selectedProductId && !alreadyCrawled && !isCrawling && (
          <div className="glass-card flex min-h-[260px] flex-col items-center justify-center space-y-4 border-dashed bg-white/30 p-12 text-center">
            <div className="rounded-full bg-amber-50 p-4 text-amber-500">
              <Database className="h-10 w-10" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Chưa có dữ liệu thị trường
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Dữ liệu cho sản phẩm này chưa được tải. Nhấn nút cào quét để AI
                cập nhật thông tin mới nhất.
              </p>
              <button
                onClick={handleStartCrawl}
                className="btn-primary mt-4 inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold shadow-md"
              >
                <Play className="h-4 w-4" />
                Bắt đầu cào dữ liệu ngay
              </button>
            </div>
          </div>
        )}

        {alreadyCrawled && !isCrawling && currentAnalysis && (
          <div className="animate-fade-in space-y-6">
            <div className="glass-card overflow-hidden border-2 border-violet-100 shadow-xl shadow-violet-100/10">
              <div className="flex items-center justify-between border-b border-white/40 bg-gradient-to-r from-violet-500/10 to-purple-500/10 p-4">
                <h3 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  Báo cáo định vị sản phẩm & khuyến nghị từ AI Agent
                </h3>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                  Phân tích độc quyền
                </span>
              </div>

              <div className="grid grid-cols-1 gap-6 p-6 text-sm leading-relaxed text-foreground/85 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                    <h4 className="mb-2 flex items-center gap-1.5 border-b border-violet-100 pb-1.5 text-sm font-bold text-violet-900">
                      <ChevronRight className="h-4 w-4 shrink-0 text-violet-500" />
                      1. Vị thế cạnh tranh trên thị trường
                    </h4>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {currentAnalysis.insights.positioning}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-100/80 bg-amber-50/50 p-4">
                    <h4 className="mb-2 flex items-center gap-1.5 border-b border-amber-200 pb-1.5 text-sm font-bold text-amber-900">
                      <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
                      2. Chiến lược hành động đề xuất
                    </h4>
                    <p className="mb-3 text-sm leading-relaxed text-foreground/90">
                      {currentAnalysis.insights.strategy}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/80 bg-white/50 p-4">
                    <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-violet-900">
                      <Search className="h-4 w-4 shrink-0 text-violet-500" />
                      Từ khóa tiếp thị (SEO) khuyên dùng
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {currentAnalysis.insights.seo.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card overflow-hidden shadow-xl">
              <div className="border-b border-white/30 bg-white/10 p-5">
                <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground">
                  <Database className="h-5 w-5 text-violet-500" />
                  Sản phẩm tương tự quét được trên thị trường
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hiển thị các sản phẩm có độ tương đồng cao về phom dáng, chất
                  liệu và định vị giá.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/30 bg-white/20 font-bold text-muted-foreground">
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider">
                        Sản phẩm đối thủ
                      </th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider">
                        Nền tảng
                      </th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider">
                        Giá bán
                      </th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider">
                        So với Balii
                      </th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider">
                        Lượt bán
                      </th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-wider">
                        Độ tương đồng
                      </th>
                      <th className="px-5 py-3 text-right text-xs uppercase tracking-wider">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAnalysis.similarProducts.map((item) => {
                      const baliiPrice =
                        selectedProduct?.salePrice ||
                        selectedProduct?.basePrice ||
                        0;
                      const priceDiff = baliiPrice - item.price;
                      const pctDiff = Math.round(
                        (Math.abs(priceDiff) / item.price) * 100,
                      );

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-white/10 text-foreground transition-colors hover:bg-white/20"
                        >
                          <td className="px-5 py-3.5">
                            <p className="max-w-[280px] line-clamp-1 text-sm font-bold text-foreground">
                              {item.name}
                            </p>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                              {item.platform}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-sm font-bold text-foreground">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-5 py-3.5 text-sm">
                            {priceDiff === 0 ? (
                              <span className="font-semibold text-gray-500">
                                Bằng giá
                              </span>
                            ) : priceDiff < 0 ? (
                              <span className="font-bold text-emerald-600">
                                Balii rẻ hơn {pctDiff}%
                              </span>
                            ) : (
                              <span className="font-bold text-rose-600">
                                Balii đắt hơn {pctDiff}%
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {item.sales}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-violet-500"
                                  style={{ width: `${item.similarity}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs font-bold text-violet-600">
                                {item.similarity}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 hover:underline"
                            >
                              Xem trang ngoài{' '}
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
