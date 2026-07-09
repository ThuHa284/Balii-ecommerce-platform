'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  HardDriveUpload,
  Image as ImageIcon,
  Loader2,
  Search,
  SkipForward,
  Store,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminMarketImageSearchItem,
  searchAdminMarketByImage,
} from '@/lib/api/admin.api';
import { getAdminProducts } from '@/lib/api/products.api';
import { Product } from '@/types/product.types';
import { formatCurrency } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const RESULTS_PER_PAGE = 5;
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360"><rect width="480" height="360" fill="#f8fafc"/><rect x="96" y="72" width="288" height="216" rx="24" fill="#e2e8f0"/><circle cx="182" cy="156" r="28" fill="#cbd5e1"/><path d="M132 252l56-64 40 40 44-52 76 76H132z" fill="#94a3b8"/><text x="240" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#64748b">No image</text></svg>',
  );

type ImageSourceMode = 'upload' | 'shop';

function resolveImageUrl(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : FALLBACK_IMAGE;
}

/* ─── Pagination Component ─── */
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white/50 text-sm text-foreground/70 transition hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
              p === currentPage
                ? 'bg-violet-500 text-white shadow-md shadow-violet-300/30'
                : 'border border-white/60 bg-white/50 text-foreground/70 hover:bg-white/80'
            }`}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white/50 text-sm text-foreground/70 transition hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/50 px-4 py-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function AdminMarketAnalysisPage() {
  const [imageSourceMode, setImageSourceMode] = useState<ImageSourceMode>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [keyword, setKeyword] = useState('');
  const [limit, setLimit] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<AdminMarketImageSearchItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedShopImage, setSelectedShopImage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        const response = await getAdminProducts();
        if (!active) return;
        setProducts(response);
      } catch (error) {
        if (!active) return;
        toast.error(
          error instanceof Error
            ? error.message
            : 'Không thể tải danh sách sản phẩm của shop.',
        );
      } finally {
        if (active) setIsLoadingProducts(false);
      }
    };

    void loadProducts();
    return () => { active = false; };
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const selectedProductImages = useMemo(() => {
    if (!selectedProduct) return [];
    return Array.from(
      new Set(
        [selectedProduct.thumbnail, ...(selectedProduct.images ?? [])].filter(Boolean),
      ),
    );
  }, [selectedProduct]);
  const activeSelectedShopImage =
    selectedShopImage && selectedProductImages.includes(selectedShopImage)
      ? selectedShopImage
      : (selectedProductImages[0] ?? '');

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.slug, product.shortDescription]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [productSearch, products]);

  const previewUrl = useMemo(() => {
    if (imageSourceMode === 'upload') return imageFile ? URL.createObjectURL(imageFile) : null;
    return activeSelectedShopImage || null;
  }, [activeSelectedShopImage, imageFile, imageSourceMode]);

  useEffect(() => {
    if (!previewUrl || !previewUrl.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Pagination
  const totalPages = Math.ceil(results.length / RESULTS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * RESULTS_PER_PAGE;
    return results.slice(start, start + RESULTS_PER_PAGE);
  }, [results, currentPage]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) { setImageFile(null); return; }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('Kích thước ảnh tối đa là 5MB.');
      event.target.value = '';
      return;
    }
    setImageFile(file);
  };

  const handleSourceModeChange = (mode: ImageSourceMode) => {
    setImageSourceMode(mode);
    setResults([]);
    setSavedCount(0);
    setSkippedCount(0);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (imageSourceMode === 'upload' && !imageFile) {
      toast.error('Vui lòng chọn ảnh từ máy tính.');
      return;
    }
    if (imageSourceMode === 'shop' && !activeSelectedShopImage) {
      toast.error('Vui lòng chọn một ảnh sản phẩm của shop.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await searchAdminMarketByImage({
        image: imageSourceMode === 'upload' ? imageFile : undefined,
        imageUrl: imageSourceMode === 'shop' ? activeSelectedShopImage : undefined,
        keyword: keyword.trim() || undefined,
        limit,
      });
      setCurrentPage(1);
      setResults(response.items);
      setSavedCount(response.savedCount);
      setSkippedCount(response.skippedCount);
      if (!response.items.length) {
        toast.info('Không tìm thấy kết quả phù hợp.');
      } else {
        toast.success(`Đã nhận ${response.items.length} kết quả.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể phân tích thị trường bằng ảnh lúc này.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Phân tích thị trường</h1>
          <p className="text-xs text-muted-foreground">
            Tìm sản phẩm tương tự trên thị trường bằng hình ảnh
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ─── LEFT PANEL: Form ─── */}
        <form
          onSubmit={(event) => { void handleSubmit(event); }}
          className="glass-card space-y-4 p-4 lg:sticky lg:top-4 lg:h-fit"
        >
          {/* Source mode toggle */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nguồn ảnh</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { mode: 'upload' as const, icon: HardDriveUpload, label: 'Từ máy tính' },
                { mode: 'shop' as const, icon: Store, label: 'Ảnh của shop' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleSourceModeChange(mode)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    imageSourceMode === mode
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-white/60 bg-white/50 text-foreground/70 hover:bg-white/70'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Upload mode */}
          {imageSourceMode === 'upload' ? (
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-violet-300 bg-violet-50/40 px-3 py-4 text-sm font-medium text-violet-600 transition hover:bg-violet-100/50">
                <Upload className="h-4 w-4" />
                {imageFile ? imageFile.name : 'Chọn ảnh JPEG, PNG, WEBP'}
                <input
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="flex items-center gap-1 text-xs text-rose-500 transition hover:text-rose-700"
                >
                  <X className="h-3 w-3" /> Xóa ảnh
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Tìm sản phẩm..."
                className="w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-sm outline-none transition focus:border-violet-300"
              />
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/50 bg-white/30 p-1.5">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Không tìm thấy.</p>
                ) : (
                  filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProductId(product.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                        product.id === selectedProductId
                          ? 'bg-violet-50 ring-1 ring-violet-200'
                          : 'hover:bg-white/70'
                      }`}
                    >
                      <Image
                        src={resolveImageUrl(product.thumbnail)}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-lg border border-white/60 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(product.salePrice ?? product.basePrice)}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedProduct && selectedProductImages.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Chọn ảnh</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {selectedProductImages.map((imageUrl) => (
                      <button
                        key={imageUrl}
                        type="button"
                        onClick={() => setSelectedShopImage(imageUrl)}
                        className={`overflow-hidden rounded-lg border-2 transition ${
                          imageUrl === activeSelectedShopImage
                            ? 'border-violet-400 ring-1 ring-violet-200'
                            : 'border-transparent hover:border-violet-200'
                        }`}
                      >
                        <Image
                          src={resolveImageUrl(imageUrl)}
                          alt=""
                          width={96}
                          height={96}
                          className="aspect-square w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview thumbnail */}
          {previewUrl && (
            <div className="overflow-hidden rounded-xl border border-white/50 bg-slate-50">
              <Image
                src={resolveImageUrl(previewUrl)}
                alt="Preview"
                width={960}
                height={640}
                className="aspect-[3/2] w-full object-contain"
              />
            </div>
          )}

          {/* Keyword & Limit */}
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Từ khóa gợi ý..."
              className="w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-sm outline-none transition focus:border-violet-300"
            />
            <input
              type="number"
              min={1}
              max={20}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 10)}
              title="Số lượng kết quả"
              className="w-full rounded-lg border border-white/70 bg-white/60 px-3 py-2 text-center text-sm outline-none transition focus:border-violet-300"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Đang phân tích…</>
            ) : (
              <><Search className="h-4 w-4" /> Phân tích thị trường</>
            )}
          </button>
        </form>

        {/* ─── RIGHT PANEL: Results ─── */}
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={BarChart3} label="Kết quả" value={results.length} color="violet" />
            <StatCard icon={Database} label="Đã lưu" value={savedCount} color="emerald" />
            <StatCard icon={SkipForward} label="Bỏ qua" value={skippedCount} color="amber" />
          </div>

          {/* Results table */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/30 px-4 py-3">
              <h2 className="text-sm font-bold text-foreground">Kết quả phân tích</h2>
              {results.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Trang {currentPage}/{totalPages} · {results.length} kết quả
                </span>
              )}
            </div>

            {!results.length ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="rounded-full bg-violet-50 p-3 text-violet-400">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Chưa có dữ liệu</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Chọn ảnh và bấm &quot;Phân tích thị trường&quot; để bắt đầu.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Table header - desktop */}
                <div className="hidden border-b border-white/20 bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[48px_1fr_120px_100px_80px_80px]">
                  <span>Ảnh</span>
                  <span>Sản phẩm</span>
                  <span>Shop</span>
                  <span className="text-right">Giá</span>
                  <span className="text-center">Độ khớp</span>
                  <span className="text-center">Trạng thái</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-white/15">
                  {paginatedResults.map((item, index) => (
                    <div
                      key={`${item.productUrl ?? item.imageUrl ?? item.title}-${index}`}
                      className="group px-4 py-3 transition hover:bg-white/20 lg:grid lg:grid-cols-[48px_1fr_120px_100px_80px_80px] lg:items-center lg:gap-3"
                    >
                      {/* Image */}
                      <Image
                        src={resolveImageUrl(item.imageUrl)}
                        alt={item.title}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-lg border border-white/50 object-cover"
                      />

                      {/* Title + URL */}
                      <div className="mt-2 min-w-0 lg:mt-0">
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                        {item.productUrl ? (
                          <a
                            href={item.productUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 truncate text-xs text-violet-500 hover:text-violet-700 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{new URL(item.productUrl).hostname}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Không có link</span>
                        )}
                      </div>

                      {/* Shop */}
                      <p className="mt-1 truncate text-xs text-foreground/70 lg:mt-0">
                        {item.shopName ?? '—'}
                      </p>

                      {/* Price */}
                      <p className="mt-1 text-sm font-semibold text-foreground lg:mt-0 lg:text-right">
                        {item.price != null ? formatCurrency(item.price) : '—'}
                      </p>

                      {/* Confidence */}
                      <div className="mt-1 text-center lg:mt-0">
                        {item.confidenceScore != null ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            item.confidenceScore >= 0.7
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.confidenceScore >= 0.4
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(item.confidenceScore * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="mt-1 text-center lg:mt-0">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.isSaved
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.isSaved ? 'Đã lưu' : 'Chưa lưu'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="border-t border-white/20 px-4 py-3">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
