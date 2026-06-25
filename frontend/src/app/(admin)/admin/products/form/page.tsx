'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ImageIcon, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { createCategory, getCategories } from '@/lib/api/categories.api';
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
  updateProductImage,
  updateProductVariant,
  uploadProductImage,
} from '@/lib/api/products.api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { Category, Product } from '@/types/product.types';

interface VariantSizeRow {
  id?: string;
  clientId: string;
  size: string;
  stock: number;
  isExisting: boolean;
}

interface VariantGroupRow {
  clientId: string;
  name: string;
  colorCode: string;
  price: number;
  imageClientId?: string;
  imageId?: string;
  sizeRows: VariantSizeRow[];
}

interface ImageRow {
  id?: string;
  clientId: string;
  url: string;
  file?: File;
  isExisting: boolean;
  variantId?: string;
  variantClientId?: string;
  isPrimary?: boolean;
  altText?: string;
  sortOrder: number;
}

const WEIGHT_SIZE_PRESETS = [
  '43-49kg',
  '50-56kg',
  '57-63kg',
  '64-70kg',
  '71-78kg',
];

const PRODUCT_GENDER_OPTIONS = [
  { value: 'female', label: 'Nữ' },
  { value: 'male', label: 'Nam' },
  { value: 'unisex', label: 'Unisex' },
] as const;

const PRODUCT_AGE_OPTIONS = [
  { value: 'under_18', label: 'Dưới 18' },
  { value: '18_25', label: '18_25' },
  { value: '26_35', label: '26_35' },
  { value: '36_plus', label: '36_plus' },
] as const;

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

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function normalizeSkuPart(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSizeRows(groupClientId: string, sizes = WEIGHT_SIZE_PRESETS) {
  return sizes.map((size, index) => ({
    clientId: `${groupClientId}-size-${index}`,
    size,
    stock: 0,
    isExisting: false,
  }));
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
  const [targetGender, setTargetGender] = useState<
    'male' | 'female' | 'unisex'
  >('female');
  const [recommendedAgeGroups, setRecommendedAgeGroups] = useState<string[]>([
    'under_18',
    '18_25',
    '26_35',
  ]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [variantGroups, setVariantGroups] = useState<VariantGroupRow[]>([]);
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
    setTargetGender(product.targetGender ?? 'female');
    setRecommendedAgeGroups(
      product.recommendedAgeGroups?.length
        ? product.recommendedAgeGroups
        : ['under_18', '18_25', '26_35'],
    );

    const imagesState: ImageRow[] = imageData.map((image, index) => ({
      id: image.id,
      clientId: image.id,
      url: image.url,
      isExisting: true,
      variantId: image.variantId ?? undefined,
      variantClientId: undefined,
      isPrimary: image.isPrimary,
      altText: image.altText ?? '',
      sortOrder: image.sortOrder ?? index,
    }));

    const groupMap = new Map<string, VariantGroupRow>();
    const variantToGroupId = new Map<string, string>();

    for (const variant of product.variants) {
      const linkedImage = imageData.find(
        (image) => image.variantId === variant.id,
      );
      const groupKey = linkedImage
        ? `image:${linkedImage.id}`
        : `name:${variant.color || 'variant-default'}`;

      let group = groupMap.get(groupKey);
      if (!group) {
        group = {
          clientId: linkedImage?.id ?? `group-${variant.id}`,
          name: variant.color || `Biến thể ${groupMap.size + 1}`,
          colorCode: variant.colorCode || '#e5e7eb',
          price: variant.price || Number(product.basePrice) || 0,
          imageClientId: linkedImage?.id,
          imageId: linkedImage?.id,
          sizeRows: [],
        };
        groupMap.set(groupKey, group);
      }

      group.sizeRows.push({
        id: variant.id,
        clientId: variant.id,
        size: variant.size || `Size ${group.sizeRows.length + 1}`,
        stock: variant.stock,
        isExisting: true,
      });
      variantToGroupId.set(variant.id, group.clientId);
    }

    imagesState.forEach((image) => {
      if (image.variantId) {
        image.variantClientId = variantToGroupId.get(image.variantId);
      }
    });

    setImages(imagesState);
    setVariantGroups(Array.from(groupMap.values()));
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) {
      setSlug(normalizeSlug(value));
    }
  };

  const handleCategoryNameChange = (value: string) => {
    setNewCategoryName(value);
    setNewCategorySlug(normalizeSlug(value));
  };

  const generateVariantSku = (
    productName: string,
    variantName: string,
    size: string,
  ) => {
    const productPart = buildInitials(productName || 'SP');
    const variantPart = buildInitials(variantName || 'BT');
    const sizePart = normalizeSkuPart(size || 'SIZE');
    return [productPart || 'SP', variantPart || 'BT', sizePart || 'SIZE'].join(
      '-',
    );
  };

  const createVariantGroup = (
    groupClientId: string,
    imageClientId?: string,
  ): VariantGroupRow => ({
    clientId: groupClientId,
    name: `Biến thể ${variantGroups.length + 1}`,
    colorCode: '#e5e7eb',
    price: Number(basePrice) || 0,
    imageClientId,
    sizeRows: buildSizeRows(groupClientId),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const nextImages: ImageRow[] = [];
    const nextGroups: VariantGroupRow[] = [];
    const timestamp = Date.now();

    for (const [index, file] of files.entries()) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} quá lớn (tối đa 10MB).`);
        continue;
      }

      const imageClientId = `image-${timestamp}-${index}`;
      const groupClientId = `group-${timestamp}-${index}`;

      nextImages.push({
        clientId: imageClientId,
        url: URL.createObjectURL(file),
        file,
        isExisting: false,
        variantClientId: groupClientId,
        isPrimary: images.length + nextImages.length === 0,
        altText: '',
        sortOrder: images.length + nextImages.length,
      });

      nextGroups.push(createVariantGroup(groupClientId, imageClientId));
    }

    setImages((current) => [...current, ...nextImages]);
    setVariantGroups((current) => [...current, ...nextGroups]);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const setPrimaryImage = (index: number) => {
    setImages((current) =>
      current.map((image, currentIndex) => ({
        ...image,
        isPrimary: currentIndex === index,
      })),
    );
  };

  const assignImageVariantGroup = (index: number, groupClientId?: string) => {
    setImages((current) =>
      current.map((image, currentIndex) =>
        currentIndex === index
          ? {
              ...image,
              variantClientId: groupClientId,
            }
          : image,
      ),
    );

    const targetImage = images[index];
    if (!targetImage) return;

    setVariantGroups((current) =>
      current.map((group) => {
        if (group.imageClientId === targetImage.clientId) {
          return {
            ...group,
            imageClientId:
              group.clientId === groupClientId
                ? targetImage.clientId
                : undefined,
          };
        }

        if (group.clientId === groupClientId) {
          return {
            ...group,
            imageClientId: targetImage.clientId,
          };
        }

        return group;
      }),
    );
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
    setVariantGroups((current) =>
      current.map((group) =>
        group.imageClientId === target.clientId
          ? {
              ...group,
              imageClientId: undefined,
            }
          : group,
      ),
    );
  };

  const addVariantGroup = () => {
    const timestamp = Date.now();
    const groupClientId = `group-manual-${timestamp}`;
    setVariantGroups((current) => [
      ...current,
      createVariantGroup(groupClientId),
    ]);
  };

  const updateVariantGroupField = (
    groupIndex: number,
    field: keyof Omit<VariantGroupRow, 'clientId' | 'sizeRows'>,
    value: string | number | undefined,
  ) => {
    setVariantGroups((current) =>
      current.map((group, currentIndex) =>
        currentIndex === groupIndex
          ? {
              ...group,
              [field]: value,
            }
          : group,
      ),
    );
  };

  const updateVariantSizeField = (
    groupIndex: number,
    sizeIndex: number,
    field: keyof Omit<VariantSizeRow, 'clientId' | 'id' | 'isExisting'>,
    value: string | number,
  ) => {
    setVariantGroups((current) =>
      current.map((group, currentGroupIndex) => {
        if (currentGroupIndex !== groupIndex) {
          return group;
        }

        return {
          ...group,
          sizeRows: group.sizeRows.map((sizeRow, currentSizeIndex) =>
            currentSizeIndex === sizeIndex
              ? {
                  ...sizeRow,
                  [field]: value,
                }
              : sizeRow,
          ),
        };
      }),
    );
  };

  const addSizeRow = (groupIndex: number) => {
    setVariantGroups((current) =>
      current.map((group, currentIndex) => {
        if (currentIndex !== groupIndex) {
          return group;
        }

        return {
          ...group,
          sizeRows: [
            ...group.sizeRows,
            {
              clientId: `${group.clientId}-size-${Date.now()}-${group.sizeRows.length}`,
              size: '',
              stock: 0,
              isExisting: false,
            },
          ],
        };
      }),
    );
  };

  const removeSizeRow = async (groupIndex: number, sizeIndex: number) => {
    const targetGroup = variantGroups[groupIndex];
    const targetSizeRow = targetGroup?.sizeRows[sizeIndex];
    if (!targetGroup || !targetSizeRow) return;

    if (targetSizeRow.isExisting && targetSizeRow.id) {
      if (!canDelete) {
        toast.error('Chỉ super admin mới có quyền xóa size đã lưu.');
        return;
      }

      try {
        await deleteProductVariant(targetSizeRow.id);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Xóa size thất bại.',
        );
        return;
      }
    }

    setVariantGroups((current) =>
      current.map((group, currentIndex) =>
        currentIndex === groupIndex
          ? {
              ...group,
              sizeRows: group.sizeRows.filter(
                (_, currentSizeIndex) => currentSizeIndex !== sizeIndex,
              ),
            }
          : group,
      ),
    );
  };

  const removeVariantGroup = async (groupIndex: number) => {
    const target = variantGroups[groupIndex];
    if (!target) return;

    for (const sizeRow of target.sizeRows) {
      if (sizeRow.isExisting && sizeRow.id) {
        if (!canDelete) {
          toast.error('Chỉ super admin mới có quyền xóa biến thể đã lưu.');
          return;
        }

        try {
          await deleteProductVariant(sizeRow.id);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : 'Xóa biến thể thất bại.',
          );
          return;
        }
      }
    }

    setVariantGroups((current) =>
      current.filter((_, currentIndex) => currentIndex !== groupIndex),
    );
    setImages((current) =>
      current.map((image) =>
        image.variantClientId === target.clientId
          ? {
              ...image,
              variantClientId: undefined,
              variantId: undefined,
            }
          : image,
      ),
    );
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

  const toggleRecommendedAgeGroup = (ageGroup: string) => {
    setRecommendedAgeGroups((current) =>
      current.includes(ageGroup)
        ? current.filter((item) => item !== ageGroup)
        : [...current, ageGroup],
    );
  };

  const getGroupTotalStock = (group: VariantGroupRow) =>
    group.sizeRows.reduce(
      (sum, sizeRow) => sum + Number(sizeRow.stock || 0),
      0,
    );

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
    if (!recommendedAgeGroups.length) {
      toast.error('Vui lòng chọn ít nhất một nhóm tuổi phù hợp.');
      return false;
    }
    if (!variantGroups.length) {
      toast.error('Vui lòng tải lên ít nhất một biến thể.');
      return false;
    }
    if (variantGroups.some((group) => !group.name.trim())) {
      toast.error('Mỗi biến thể phải có tên riêng.');
      return false;
    }
    if (
      variantGroups.some(
        (group) =>
          group.sizeRows.length === 0 ||
          group.sizeRows.some((sizeRow) => !sizeRow.size.trim()),
      )
    ) {
      toast.error('Mỗi biến thể phải có ít nhất một size hợp lệ.');
      return false;
    }
    return true;
  };

  const syncVariants = async (savedProductId: string) => {
    const groupRepresentativeVariantIdMap = new Map<string, string>();

    for (const group of variantGroups) {
      for (const sizeRow of group.sizeRows) {
        const payload = {
          sku: generateVariantSku(name, group.name, sizeRow.size),
          price: group.price || Number(basePrice),
          stockQuantity: Number(sizeRow.stock || 0),
          itemType: 'SET' as const,
          sizeLabel: sizeRow.size.trim(),
          colorName: group.name.trim(),
        };

        const savedVariant =
          sizeRow.isExisting && sizeRow.id
            ? await updateProductVariant(sizeRow.id, payload)
            : await createProductVariant(savedProductId, payload);

        if (
          savedVariant.id &&
          !groupRepresentativeVariantIdMap.has(group.clientId)
        ) {
          groupRepresentativeVariantIdMap.set(group.clientId, savedVariant.id);
        }
      }
    }

    return groupRepresentativeVariantIdMap;
  };

  const syncImages = async (
    savedProductId: string,
    groupRepresentativeVariantIdMap: Map<string, string>,
  ) => {
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const resolvedVariantId = image.variantClientId
        ? groupRepresentativeVariantIdMap.get(image.variantClientId)
        : image.variantId;
      const payload = {
        variantId: resolvedVariantId || undefined,
        altText: image.altText?.trim() || undefined,
        sortOrder: index,
        isPrimary: image.isPrimary ?? index === 0,
      };

      if (image.file) {
        await uploadProductImage(savedProductId, image.file, payload);
      } else if (image.id) {
        await updateProductImage(image.id, payload);
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
        targetGender,
        recommendedAgeGroups,
        isActive: true,
      };

      const savedProduct =
        isEdit && existingProduct
          ? await updateProduct(existingProduct.id, payload)
          : await createProduct(payload);

      const groupRepresentativeVariantIdMap = await syncVariants(
        savedProduct.id,
      );
      await syncImages(savedProduct.id, groupRepresentativeVariantIdMap);

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
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-300 border-t-violet-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/products"
            className="rounded-xl border border-white/50 bg-white/60 p-2.5 transition-all hover:bg-white/80 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground md:text-3xl">
              {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
            </h1>
            {isEdit && existingProduct ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
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
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo sản phẩm'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card p-6">
            <h2 className="mb-5 font-heading text-lg font-semibold text-foreground">
              Thông tin cơ bản
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="VD: Bộ Đồ Ngủ Lụa Hồng Pastel"
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-xl border border-white/50 bg-white/40 px-4 py-2.5 text-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Mô tả ngắn
                </label>
                <input
                  type="text"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Mô tả ngắn hiển thị trên card sản phẩm"
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Mô tả chi tiết
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Mô tả chi tiết sản phẩm..."
                  className="w-full resize-none rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Ảnh và biến thể
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Mỗi ảnh sẽ tự tạo một biến thể. Sau đó chỉ cần đặt tên biến
                  thể và nhập số lượng cho từng size trong cùng một khối.
                </p>
              </div>
              <button
                type="button"
                onClick={addVariantGroup}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm biến thể thủ công
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img, index) => (
                <div
                  key={`${img.clientId}-${img.url}-${index}`}
                  className="glass-card group rounded-xl p-2"
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={img.url}
                      alt={`Ảnh ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                    {img.isPrimary ? (
                      <span className="absolute left-2 top-2 rounded-md bg-violet-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        Chính
                      </span>
                    ) : null}
                    <button
                      onClick={() => void removeImage(index)}
                      className="absolute right-2 top-2 rounded-lg bg-red-500/90 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                      title={
                        img.isExisting && !canDelete
                          ? 'Chỉ super admin mới được xóa ảnh đã lưu'
                          : 'Xóa ảnh'
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(index)}
                      className={`w-full rounded-lg px-2 py-1 text-xs font-medium transition ${
                        img.isPrimary
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/70 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {img.isPrimary
                        ? 'Đang là ảnh chính'
                        : 'Đặt làm ảnh chính'}
                    </button>
                    <select
                      value={img.variantClientId ?? ''}
                      onChange={(e) =>
                        assignImageVariantGroup(
                          index,
                          e.target.value || undefined,
                        )
                      }
                      className="w-full rounded-lg border border-white/50 bg-white/80 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300"
                    >
                      <option value="">Ảnh dùng chung cho toàn sản phẩm</option>
                      {variantGroups.map((group, groupIndex) => (
                        <option key={group.clientId} value={group.clientId}>
                          {group.name.trim() || `Biến thể ${groupIndex + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <button
                onClick={() => imageInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300/50 transition-all hover:border-violet-400 hover:bg-white/40 active:scale-95"
              >
                <div className="rounded-lg bg-violet-100 p-2">
                  <ImageIcon className="h-5 w-5 text-violet-400" />
                </div>
                <span className="text-xs text-muted-foreground">Thêm ảnh</span>
              </button>
            </div>

            {variantGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/50 bg-white/20 px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Chưa có biến thể nào. Tải ảnh lên để hệ thống tự tạo biến thể.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {variantGroups.map((group, groupIndex) => {
                  const previewImage = images.find(
                    (image) => image.clientId === group.imageClientId,
                  );

                  return (
                    <div
                      key={group.clientId}
                      className="rounded-2xl border border-white/40 bg-white/40 p-4"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                            {previewImage ? (
                              <Image
                                src={previewImage.url}
                                alt={group.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Biến thể #{groupIndex + 1}
                            </p>
                            <p className="text-sm text-slate-600">
                              Tổng tồn kho: {getGroupTotalStock(group)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => void removeVariantGroup(groupIndex)}
                          className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Xóa biến thể"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Tên biến thể
                          </label>
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) =>
                              updateVariantGroupField(
                                groupIndex,
                                'name',
                                e.target.value,
                              )
                            }
                            placeholder="VD: Hồng pastel / Mẫu 1"
                            className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Giá riêng cho biến thể
                          </label>
                          <input
                            type="number"
                            value={group.price}
                            onChange={(e) =>
                              updateVariantGroupField(
                                groupIndex,
                                'price',
                                Number(e.target.value),
                              )
                            }
                            className="w-full rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            Mã màu hiển thị
                          </label>
                          <div className="flex items-center gap-2 rounded-lg border border-white/60 bg-white/80 px-3 py-2">
                            <input
                              type="color"
                              value={group.colorCode || '#e5e7eb'}
                              onChange={(e) =>
                                updateVariantGroupField(
                                  groupIndex,
                                  'colorCode',
                                  e.target.value,
                                )
                              }
                              className="h-8 w-10 rounded border-0 bg-transparent p-0"
                            />
                            <input
                              type="text"
                              value={group.colorCode}
                              onChange={(e) =>
                                updateVariantGroupField(
                                  groupIndex,
                                  'colorCode',
                                  e.target.value,
                                )
                              }
                              placeholder="#e5e7eb"
                              className="w-full bg-transparent text-sm focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-foreground">
                            Size và số lượng
                          </h3>
                          <button
                            type="button"
                            onClick={() => addSizeRow(groupIndex)}
                            className="text-xs font-medium text-violet-600 hover:text-violet-700"
                          >
                            + Thêm size
                          </button>
                        </div>

                        {group.sizeRows.map((sizeRow, sizeIndex) => (
                          <div
                            key={sizeRow.clientId}
                            className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/70 p-3 md:grid-cols-[1.2fr_0.9fr_1.2fr_auto]"
                          >
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                Size / khoảng cân nặng
                              </label>
                              <input
                                type="text"
                                value={sizeRow.size}
                                onChange={(e) =>
                                  updateVariantSizeField(
                                    groupIndex,
                                    sizeIndex,
                                    'size',
                                    e.target.value,
                                  )
                                }
                                placeholder="VD: 43-49kg"
                                className="w-full rounded-lg border border-white/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                Số lượng
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={sizeRow.stock}
                                onChange={(e) =>
                                  updateVariantSizeField(
                                    groupIndex,
                                    sizeIndex,
                                    'stock',
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full rounded-lg border border-white/60 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-foreground">
                                SKU tự sinh
                              </label>
                              <input
                                type="text"
                                value={generateVariantSku(
                                  name,
                                  group.name,
                                  sizeRow.size,
                                )}
                                readOnly
                                className="w-full cursor-not-allowed rounded-lg border border-white/50 bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() =>
                                  void removeSizeRow(groupIndex, sizeIndex)
                                }
                                className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                title="Xóa size"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="mb-5 font-heading text-lg font-semibold text-foreground">
              Phân loại và giá
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
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
                    onClick={() =>
                      setShowCategoryCreator((current) => !current)
                    }
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
                        onChange={(e) =>
                          handleCategoryNameChange(e.target.value)
                        }
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
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Giá gốc (VND) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="890000"
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Giá sale (VND)
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="Bỏ trống nếu không sale"
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Chất liệu
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="VD: Lụa satin"
                  className="w-full rounded-xl border border-white/50 bg-white/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Giới tính phù hợp
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUCT_GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTargetGender(option.value)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        targetGender === option.value
                          ? 'bg-violet-500 text-white'
                          : 'bg-white/60 text-foreground hover:bg-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Độ tuổi phù hợp
                </label>
                <div className="space-y-2">
                  {PRODUCT_AGE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 rounded-xl bg-white/50 px-3 py-2 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={recommendedAgeGroups.includes(option.value)}
                        onChange={() => toggleRecommendedAgeGroup(option.value)}
                        className="h-4 w-4 rounded border-white/50 text-violet-500 focus:ring-violet-300"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {basePrice ? (
                <div className="rounded-xl bg-violet-50/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">
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
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-300 border-t-violet-500" />
        </div>
      }
    >
      <ProductFormContent />
    </Suspense>
  );
}
