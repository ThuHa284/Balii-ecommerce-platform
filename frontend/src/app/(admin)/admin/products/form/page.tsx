'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  GripVertical,
  ImageIcon,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createCategory,
  getCategories,
} from '@/lib/api/categories.api';
import { canDeleteAdminResource } from '@/lib/api/admin.utils';
import {
  createProduct,
  createProductVariant,
  deleteProductImage,
  deleteProductVariant,
  getAdminProducts,
  getProductImages,
  ProductImageRecord,
  updateProduct,
  updateProductVariant,
  uploadProductImage,
} from '@/lib/api/products.api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Category, Product } from '@/types/product.types';

interface VariantRow {
  id?: string;
  clientId: string;
  size: string;
  color: string;
  colorCode: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  isExisting: boolean;
}

interface ImageRow {
  id?: string;
  url: string;
  file?: File;
  isExisting: boolean;
}

const WEIGHT_SIZE_PRESETS = [
  '43-49kg',
  '50-56kg',
  '57-63kg',
  '64-70kg',
  '71-78kg',
];

function buildInitials(value: string) {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function normalizeSkuPart(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ProductFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get('id');
  const legacyEditSlug = searchParams.get('edit');
  const userRole = useAuthStore((state) => state.user?.role);
  const canDelete = canDeleteAdminResource(userRole);

  const [existingProduct, setExistingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [material, setMaterial] = useState('');
  const [images, setImages] = useState<ImageRow[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!existingProduct;

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [categoryData, productData] = await Promise.all([
          getCategories(),
          productId || legacyEditSlug
            ? getAdminProducts()
            : Promise.resolve([]),
        ]);

        setCategories(categoryData);

        const matchedProduct =
          productData.find((product) => product.id === productId) ??
          productData.find((product) => product.slug === legacyEditSlug) ??
          null;

        if (matchedProduct) {
          const imageData = await getProductImages(matchedProduct.id);
          hydrateForm(matchedProduct, imageData);
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Không tải được dữ liệu sản phẩm.',
        );
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [legacyEditSlug, productId]);

  const hydrateForm = (product: Product, imageData: ProductImageRecord[]) => {
    setExistingProduct(product);
    setName(product.name);
    setSlug(product.slug);
    setDescription(product.description || '');
    setShortDescription(product.shortDescription || '');
    setCategoryId(product.categoryId || '');
    setBasePrice(product.basePrice ? String(product.basePrice) : '');
    setSalePrice(product.salePrice != null ? String(product.salePrice) : '');
    setMaterial('');
    setImages(
      imageData.map((image) => ({
        id: image.id,
        url: image.url,
        isExisting: true,
      })),
    );
    setVariants(
      product.variants.map((variant) => ({
        id: variant.id,
        clientId: variant.id,
        size: variant.size,
        color: variant.color,
        colorCode: variant.colorCode,
        sku: variant.sku,
        price: variant.price,
        salePrice: variant.salePrice,
        stock: variant.stock,
        isExisting: true,
      })),
    );
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setVariants((current) =>
      current.map((variant) => ({
        ...variant,
        sku: generateVariantSku(value, variant.color, variant.size),
      })),
    );
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim(),
      );
    }
  };

  const handleCategoryNameChange = (value: string) => {
    setNewCategoryName(value);
    setNewCategorySlug(
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
      .trim(),
    );
  };

  const generateVariantSku = (
    productName: string,
    color: string,
    size: string,
  ) => {
    const productPart = buildInitials(productName || 'SP');
    const colorPart = buildInitials(color || 'MAU');
    const sizePart = normalizeSkuPart(size || 'SIZE');
    return [productPart || 'SP', colorPart || 'MAU', sizePart || 'SIZE'].join('-');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const nextImages: ImageRow[] = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} quá lớn (tối đa 10MB).`);
        continue;
      }

      nextImages.push({
        url: URL.createObjectURL(file),
        file,
        isExisting: false,
      });
    }

    setImages((current) => [...current, ...nextImages]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeImage = async (index: number) => {
    const target = images[index];
    if (!target) return;

    if (target.isExisting) {
      if (!canDelete) {
        toast.error('Chỉ super admin mới có quyền xóa ảnh đã lưu.');
        return;
      }

      try {
        await deleteProductImage(target.id!);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Xóa ảnh thất bại.',
        );
        return;
      }
    } else if (target.url.startsWith('blob:')) {
      URL.revokeObjectURL(target.url);
    }

    setImages((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const addVariant = () => {
    setVariants((current) => [
      ...current,
      {
        clientId: `new-${Date.now()}-${current.length}`,
        size: WEIGHT_SIZE_PRESETS[0],
        color: 'Hồng pastel',
        colorCode: '#f8b4c7',
        sku: generateVariantSku(name, 'Hồng pastel', WEIGHT_SIZE_PRESETS[0]),
        price: Number(basePrice) || 0,
        salePrice: salePrice ? Number(salePrice) : null,
        stock: 0,
        isExisting: false,
      },
    ]);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !newCategorySlug.trim()) {
      toast.error('Vui lòng nhập tên và slug danh mục mới.');
      return;
    }

    try {
      setCreatingCategory(true);
      const created = await createCategory({
        name: newCategoryName.trim(),
        slug: newCategorySlug.trim(),
        isActive: true,
      });

      setCategories((current) => [...current, created]);
      setCategoryId(created.id);
      setShowCategoryCreator(false);
      setNewCategoryName('');
      setNewCategorySlug('');
      toast.success('Đã tạo danh mục mới.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Tạo danh mục thất bại.',
      );
    } finally {
      setCreatingCategory(false);
    }
  };

  const updateVariantField = (
    index: number,
    field: keyof VariantRow,
    value: string | number | null | boolean,
  ) => {
    setVariants((current) =>
      current.map((variant, currentIndex) => {
        if (currentIndex !== index) {
          return variant;
        }

        const nextVariant = { ...variant, [field]: value } as VariantRow;
        nextVariant.sku = generateVariantSku(
          name,
          nextVariant.color,
          nextVariant.size,
        );
        return nextVariant;
      }),
    );
  };

  const removeVariant = async (index: number) => {
    const target = variants[index];
    if (!target) return;

    if (target.isExisting) {
      if (!canDelete) {
        toast.error('Chỉ super admin mới có quyền xóa biến thể đã lưu.');
        return;
      }

      try {
        await deleteProductVariant(target.id!);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Xóa biến thể thất bại.',
        );
        return;
      }
    }

    setVariants((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const validateForm = () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm.');
      return false;
    }
    if (!slug.trim()) {
      toast.error('Vui lòng nhập slug.');
      return false;
    }
    if (!categoryId) {
      toast.error('Vui lòng chọn danh mục.');
      return false;
    }
    if (!basePrice) {
      toast.error('Vui lòng nhập giá gốc.');
      return false;
    }
    if (variants.some((variant) => !variant.sku.trim())) {
      toast.error('Mỗi biến thể phải có SKU.');
      return false;
    }
    return true;
  };

  const syncVariants = async (savedProductId: string) => {
    for (const variant of variants) {
      const payload = {
        sku: variant.sku.trim(),
        price: variant.price || Number(basePrice),
        stockQuantity: variant.stock,
        itemType: 'SET' as const,
        sizeLabel: variant.size,
        colorName: variant.color,
      };

      if (variant.isExisting && variant.id) {
        await updateProductVariant(variant.id, payload);
      } else {
        await createProductVariant(savedProductId, payload);
      }
    }
  };

  const syncImages = async (savedProductId: string) => {
    for (const image of images) {
      if (image.file) {
        await uploadProductImage(savedProductId, image.file);
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);

      const payload = {
        categoryId,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        basePrice: Number(basePrice),
        originalPrice: Number(basePrice),
        salePrice: salePrice ? Number(salePrice) : null,
        material: material.trim() || undefined,
        isActive: true,
      };

      const savedProduct =
        isEdit && existingProduct
          ? await updateProduct(existingProduct.id, payload)
          : await createProduct(payload);

      await syncVariants(savedProduct.id);
      await syncImages(savedProduct.id);

      toast.success(
        isEdit ? 'Cập nhật sản phẩm thành công.' : 'Thêm sản phẩm thành công.',
      );
      router.push('/admin/products');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Lưu sản phẩm thất bại.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const previewPrice = useMemo(
    () => formatCurrency(Number(salePrice) || Number(basePrice) || 0),
    [basePrice, salePrice],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-2 border-violet-300 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
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
              {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
            </h1>
            {isEdit && existingProduct ? (
              <p className="text-sm text-muted-foreground mt-0.5">
                {existingProduct.name}
              </p>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo sản phẩm'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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
              {images.map((img, index) => (
                <div
                  key={`${img.id ?? 'new'}-${img.url}-${index}`}
                  className="relative aspect-square rounded-xl overflow-hidden glass-card group"
                >
                  <Image
                    src={img.url}
                    alt={`Ảnh ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                  {index === 0 ? (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-violet-500 text-white text-[10px] font-bold">
                      Chính
                    </span>
                  ) : null}
                  <button
                    onClick={() => void removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 active:scale-90"
                    title={
                      img.isExisting && !canDelete
                        ? 'Chỉ super admin mới được xóa ảnh đã lưu'
                        : 'Xóa ảnh'
                    }
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-2 left-2 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3" />
                  </div>
                </div>
              ))}
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
            <p className="mb-4 text-xs text-muted-foreground">
              Mỗi biến thể có tồn kho riêng và SKU riêng. SKU được tự sinh từ tên sản phẩm, màu và size.
            </p>

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
                {variants.map((variant, index) => (
                  <div
                    key={variant.clientId}
                    className="p-4 rounded-xl bg-white/40 border border-white/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Biến thể #{index + 1}
                      </span>
                      <button
                        onClick={() => void removeVariant(index)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title={
                          variant.isExisting && !canDelete
                            ? 'Chỉ super admin mới được xóa biến thể đã lưu'
                            : 'Xóa biến thể'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {WEIGHT_SIZE_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => updateVariantField(index, 'size', preset)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            variant.size === preset
                              ? 'bg-violet-500 text-white'
                              : 'bg-white/60 text-slate-700 hover:bg-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Khoảng cân nặng / size
                        </label>
                        <input
                          type="text"
                          value={variant.size}
                          onChange={(e) =>
                            updateVariantField(index, 'size', e.target.value)
                          }
                          placeholder="VD: 43-49kg"
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Màu
                        </label>
                        <input
                          type="text"
                          value={variant.color}
                          onChange={(e) =>
                            updateVariantField(index, 'color', e.target.value)
                          }
                          placeholder="VD: Hồng phấn"
                          className="w-full px-3 py-2 rounded-lg bg-white/60 border border-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Mã màu
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-white/50 bg-white/60 px-3 py-2">
                          <input
                            type="color"
                            value={variant.colorCode || '#f8b4c7'}
                            onChange={(e) =>
                              updateVariantField(index, 'colorCode', e.target.value)
                            }
                            className="h-8 w-10 rounded border-0 bg-transparent p-0"
                          />
                          <input
                            type="text"
                            value={variant.colorCode}
                            onChange={(e) =>
                              updateVariantField(index, 'colorCode', e.target.value)
                            }
                            placeholder="#f8b4c7"
                            className="w-full bg-transparent text-sm focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          SKU biến thể
                        </label>
                        <input
                          type="text"
                          value={variant.sku}
                          readOnly
                          placeholder="Tự sinh theo tên + màu + size"
                          className="w-full cursor-not-allowed px-3 py-2 rounded-lg bg-slate-100 border border-white/50 text-sm text-slate-600 focus:outline-none"
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
                            updateVariantField(
                              index,
                              'stock',
                              Number(e.target.value),
                            )
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
                            updateVariantField(
                              index,
                              'price',
                              Number(e.target.value),
                            )
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
                          value={variant.salePrice ?? ''}
                          onChange={(e) =>
                            updateVariantField(
                              index,
                              'salePrice',
                              e.target.value ? Number(e.target.value) : null,
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

        <div className="space-y-6">
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
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <div className="mt-3 rounded-xl border border-white/40 bg-white/30 p-3">
                  <button
                    type="button"
                    onClick={() => setShowCategoryCreator((current) => !current)}
                    className="text-sm font-medium text-violet-600 hover:text-violet-700"
                  >
                    {showCategoryCreator
                      ? 'Ẩn tạo danh mục mới'
                      : '+ Tạo danh mục ngay tại đây'}
                  </button>

                  {showCategoryCreator ? (
                    <div className="mt-3 space-y-3">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => handleCategoryNameChange(e.target.value)}
                        placeholder="Tên danh mục mới"
                        className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                      <input
                        type="text"
                        value={newCategorySlug}
                        onChange={(e) => setNewCategorySlug(e.target.value)}
                        placeholder="slug-danh-muc"
                        className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateCategory()}
                        disabled={creatingCategory}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {creatingCategory ? 'Đang tạo...' : 'Lưu danh mục'}
                      </button>
                    </div>
                  ) : null}
                </div>
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
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Chất liệu
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="VD: Lụa satin"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/50 focus:outline-none focus:ring-2 focus:ring-violet-300 text-sm"
                />
              </div>
              {basePrice ? (
                <div className="p-3 rounded-xl bg-violet-50/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    Hiển thị:
                  </p>
                  <p className="text-lg font-bold text-primary">
                    {previewPrice}
                  </p>
                  {salePrice ? (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(Number(basePrice))}
                    </p>
                  ) : null}
                </div>
              ) : null}
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
