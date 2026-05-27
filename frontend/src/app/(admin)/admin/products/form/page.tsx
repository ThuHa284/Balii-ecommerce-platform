"use client";

import { useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Plus,
  Trash2,
  ImageIcon,
  GripVertical,
} from "lucide-react";
import Link from "next/link";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "@/lib/api/mock-data";
import { SIZES, COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface VariantRow {
  id: string;
  size: string;
  color: string;
  colorCode: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
}

function ProductFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editSlug = searchParams.get("edit");
  const existingProduct = editSlug
    ? MOCK_PRODUCTS.find((p) => p.slug === editSlug)
    : null;
  const isEdit = !!existingProduct;

  // Form state
  const [name, setName] = useState(existingProduct?.name || "");
  const [slug, setSlug] = useState(existingProduct?.slug || "");
  const [description, setDescription] = useState(
    existingProduct?.description || ""
  );
  const [shortDescription, setShortDescription] = useState(
    existingProduct?.shortDescription || ""
  );
  const [categoryId, setCategoryId] = useState(
    existingProduct?.categoryId || ""
  );
  const [basePrice, setBasePrice] = useState(
    existingProduct?.basePrice?.toString() || ""
  );
  const [salePrice, setSalePrice] = useState(
    existingProduct?.salePrice?.toString() || ""
  );
  const [tags, setTags] = useState(existingProduct?.tags?.join(", ") || "");
  const [isFeatured, setIsFeatured] = useState(
    existingProduct?.isFeatured || false
  );
  const [isNew, setIsNew] = useState(existingProduct?.isNew || false);

  // Images
  const [images, setImages] = useState<string[]>(
    existingProduct?.images || []
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Variants
  const [variants, setVariants] = useState<VariantRow[]>(
    existingProduct?.variants?.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorCode: v.colorCode,
      sku: v.sku,
      price: v.price,
      salePrice: v.salePrice,
      stock: v.stock,
    })) || []
  );

  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/[^a-z0-9\s]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim()
      );
    }
  };

  // Image handling
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const newImages: string[] = [];
      Array.from(files).forEach((file) => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} quá lớn (tối đa 10MB)`);
          return;
        }
        newImages.push(URL.createObjectURL(file));
      });
      setImages((prev) => [...prev, ...newImages]);
      if (imageInputRef.current) imageInputRef.current.value = "";
    },
    []
  );

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Variant handling
  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `new_var_${Date.now()}`,
        size: "M",
        color: "Hồng pastel",
        colorCode: "#F8BBD0",
        sku: "",
        price: Number(basePrice) || 0,
        salePrice: salePrice ? Number(salePrice) : null,
        stock: 0,
      },
    ]);
  };

  const updateVariant = (
    index: number,
    field: keyof VariantRow,
    value: string | number | null
  ) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Save
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (!categoryId) {
      toast.error("Vui lòng chọn danh mục");
      return;
    }
    if (!basePrice) {
      toast.error("Vui lòng nhập giá gốc");
      return;
    }

    setIsSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1500));
    setIsSaving(false);
    toast.success(
      isEdit ? "Cập nhật sản phẩm thành công!" : "Thêm sản phẩm thành công!"
    );
    router.push("/admin/products");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="p-2.5 rounded-xl bg-white/60 border border-white/50 hover:bg-white/80 transition-all active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              {isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}
            </h1>
            {isEdit && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {existingProduct?.name}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo sản phẩm"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-5">
              Thông tin cơ bản
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="VD: Bộ Đồ Ngủ Lụa Hồng Pastel"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/40 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm text-muted-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Mô tả ngắn hiển thị trên card sản phẩm"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Mô tả chi tiết sản phẩm..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-5">
              Hình ảnh sản phẩm
            </h2>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden glass-card group"
                >
                  <Image
                    src={img}
                    alt={`Ảnh ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                  {i === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-violet-500 text-white text-[10px] font-bold">
                      Chính
                    </span>
                  )}
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 active:scale-90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-2 left-2 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3" />
                  </div>
                </div>
              ))}

              {/* Add button */}
              <button
                onClick={() => imageInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-violet-300/50 hover:border-violet-400 flex flex-col items-center justify-center gap-2 transition-all hover:bg-white/40 active:scale-95"
              >
                <div className="p-2 rounded-lg bg-violet-100">
                  <ImageIcon className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-xs text-muted-foreground">Thêm ảnh</span>
              </button>
            </div>
          </div>

          {/* Variants */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Biến thể (Size & Màu)
              </h2>
              <button
                onClick={addVariant}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-500 text-white text-xs font-medium hover:bg-violet-600 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm biến thể
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Chưa có biến thể nào
                </p>
                <button
                  onClick={addVariant}
                  className="text-sm text-violet-500 hover:text-violet-600 font-medium"
                >
                  + Thêm biến thể đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {variants.map((variant, idx) => (
                  <div
                    key={variant.id}
                    className="p-4 rounded-xl bg-white/40 border border-white/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Biến thể #{idx + 1}
                      </span>
                      <button
                        onClick={() => removeVariant(idx)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Size
                        </label>
                        <select
                          value={variant.size}
                          onChange={(e) =>
                            updateVariant(idx, "size", e.target.value)
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        >
                          {SIZES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Màu
                        </label>
                        <select
                          value={variant.color}
                          onChange={(e) => {
                            const color = COLORS.find(
                              (c) => c.name === e.target.value
                            );
                            updateVariant(idx, "color", e.target.value);
                            if (color)
                              updateVariant(idx, "colorCode", color.value);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        >
                          {COLORS.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          SKU
                        </label>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) =>
                            updateVariant(idx, "sku", e.target.value)
                          }
                          placeholder="BDN-HP-M"
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Tồn kho
                        </label>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) =>
                            updateVariant(idx, "stock", Number(e.target.value))
                          }
                          min={0}
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Giá
                        </label>
                        <input
                          type="number"
                          value={variant.price}
                          onChange={(e) =>
                            updateVariant(idx, "price", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Giá sale
                        </label>
                        <input
                          type="number"
                          value={variant.salePrice ?? ""}
                          onChange={(e) =>
                            updateVariant(
                              idx,
                              "salePrice",
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          placeholder="Bỏ trống nếu không sale"
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Sidebar */}
        <div className="space-y-6">
          {/* Category & Price */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-5">
              Phân loại & Giá
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                >
                  <option value="">Chọn danh mục</option>
                  {MOCK_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Giá gốc (VND) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="890000"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Giá sale (VND)
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="Bỏ trống nếu không sale"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                />
              </div>
              {basePrice && (
                <div className="p-3 rounded-xl bg-violet-50/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Hiển thị:
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(
                      Number(salePrice) || Number(basePrice)
                    )}
                  </p>
                  {salePrice && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(Number(basePrice))}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tags & Flags */}
          <div className="glass-card p-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-5">
              Tags & Đánh dấu
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Tags (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="lụa, cao cấp, hồng"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/40 cursor-pointer hover:bg-white/60 transition-colors">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-violet-300 text-violet-500 focus:ring-violet-300"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Sản phẩm nổi bật
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Hiển thị trên trang chủ
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-white/40 cursor-pointer hover:bg-white/60 transition-colors">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                  className="w-4 h-4 rounded border-violet-300 text-violet-500 focus:ring-violet-300"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Hàng mới về
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Badge &quot;Mới&quot; trên card
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-2 border-violet-300 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }
    >
      <ProductFormContent />
    </Suspense>
  );
}
