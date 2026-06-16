import { Cart, CartItem } from '@/types/cart.types';
import { Order } from '@/types/order.types';
import {
  Category,
  Collection,
  Product,
  ProductVariant,
} from '@/types/product.types';
import { Address, User, UserRole } from '@/types/user.types';

type BackendCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  parentId?: string | null;
  children?: BackendCategory[];
  productCount?: number;
};

type BackendVariant = {
  id: string;
  productId: string;
  size?: string;
  sizeLabel?: string;
  color?: string;
  colorName?: string;
  colorCode?: string;
  sku: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  images?: string[];
};

type BackendProduct = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  basePrice: number;
  salePrice?: number | null;
  targetGender?: 'male' | 'female' | 'unisex';
  recommendedAgeGroups?: string[];
  categoryId?: string | null;
  category?: BackendCategory | null;
  images?: string[];
  thumbnail?: string;
  variants?: BackendVariant[];
  reviews?: unknown[];
  averageRating?: number;
  totalReviews?: number;
  isFeatured?: boolean;
  isNew?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

type BackendCart = {
  items: Array<{
    variantId: string;
    productId: string;
    productName: string;
    productSlug?: string;
    sku: string;
    thumbnailUrl?: string;
    variantLabel?: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
};

type BackendOrder = {
  id: string;
  orderNumber: string;
  userId?: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug?: string | null;
    thumbnailUrl?: string | null;
    variantLabel?: string;
    sku: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    subtotal?: number;
  }>;
  shippingAddress: Record<string, unknown>;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  customerNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackendUser = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role?: { name?: string } | string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
};

type BackendCollection = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  imageUrl?: string;
  bannerImage?: string;
  bannerImageUrl?: string;
  productIds?: string[];
  season?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
};

type BackendAddress = {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  provinceId: number;
  districtId: number;
  wardId: number;
  streetAddress: string;
  isDefault: boolean;
};

function humanizeLocation(label: string, id: number) {
  return `${label} ${id}`;
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function resolveColorCode(colorName: string, colorCode?: string) {
  if (colorCode && colorCode.trim()) {
    return colorCode;
  }

  const normalized = colorName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('trang')) return '#F8FAFC';
  if (normalized.includes('den')) return '#111827';
  if (normalized.includes('hong')) return '#F9A8D4';
  if (normalized.includes('do')) return '#EF4444';
  if (normalized.includes('xanh mint')) return '#A7F3D0';
  if (normalized.includes('xanh duong')) return '#60A5FA';
  if (normalized.includes('xanh')) return '#93C5FD';
  if (normalized.includes('tim')) return '#C4B5FD';
  if (normalized.includes('vang')) return '#FDE68A';
  if (normalized.includes('be')) return '#E7D3BE';
  if (normalized.includes('nau')) return '#A16207';
  if (normalized.includes('xam')) return '#9CA3AF';

  return '#E5E7EB';
}

export function mapCategory(input: BackendCategory): Category {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    description: input.description ?? '',
    image: input.image ?? input.imageUrl ?? '',
    parentId: input.parentId ?? null,
    children: (input.children ?? []).map(mapCategory),
    productCount: input.productCount ?? 0,
  };
}

export function mapProductVariant(input: BackendVariant): ProductVariant {
  return {
    id: input.id,
    productId: input.productId,
    size: input.sizeLabel ?? input.size ?? '',
    color: input.colorName ?? input.color ?? '',
    colorCode: resolveColorCode(
      input.colorName ?? input.color ?? '',
      input.colorCode,
    ),
    sku: input.sku,
    price: Number(input.price ?? 0),
    salePrice: input.salePrice != null ? Number(input.salePrice) : null,
    stock: Number(input.stock ?? 0),
    images: input.images ?? [],
  };
}

export function mapProduct(input: BackendProduct): Product {
  const category = input.category
    ? mapCategory(input.category)
    : {
        id: input.categoryId ?? '',
        name: 'Danh mục',
        slug: '',
        description: '',
        image: '',
        parentId: null,
        children: [],
        productCount: 0,
      };

  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    description: input.description ?? '',
    shortDescription: input.shortDescription ?? input.description ?? '',
    basePrice: Number(input.basePrice ?? 0),
    salePrice: input.salePrice != null ? Number(input.salePrice) : null,
    targetGender: input.targetGender ?? 'female',
    recommendedAgeGroups: input.recommendedAgeGroups ?? [],
    categoryId: input.categoryId ?? category.id,
    category,
    images: input.images ?? (input.thumbnail ? [input.thumbnail] : []),
    thumbnail: input.thumbnail ?? input.images?.[0] ?? '',
    variants: (input.variants ?? []).map(mapProductVariant),
    reviews: [],
    averageRating: input.averageRating ?? 0,
    totalReviews: input.totalReviews ?? 0,
    isFeatured: input.isFeatured ?? false,
    isNew: input.isNew ?? false,
    tags: input.tags ?? [],
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function mapCollection(input: BackendCollection): Collection {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    description: input.description ?? '',
    shortDescription: input.shortDescription ?? '',
    image: input.image ?? input.imageUrl ?? '',
    bannerImage: input.bannerImage ?? input.bannerImageUrl ?? '',
    productIds: input.productIds ?? [],
    season: input.season ?? '',
    isActive: input.isActive ?? true,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.createdAt,
  };
}

function parseVariantLabel(label?: string) {
  const [color = '', size = ''] = (label ?? '').split(' / ');
  return { color, size };
}

export function mapCart(input: BackendCart): Cart {
  const items: CartItem[] = input.items.map((item) => {
    const parsed = parseVariantLabel(item.variantLabel);
    return {
      id: item.variantId,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug ?? item.productId,
      thumbnail: item.thumbnailUrl ?? '',
      variant: {
        id: item.variantId,
        productId: item.productId,
        size: parsed.size,
        color: parsed.color,
        colorCode: '#E5E7EB',
        sku: item.sku,
        price: Number(item.unitPrice),
        salePrice: null,
        stock: 0,
        images: [],
      },
      quantity: item.quantity,
      price: Number(item.unitPrice),
      totalPrice: Number(item.subtotal),
    };
  });

  return {
    items,
    subtotal: Number(input.subtotal ?? 0),
    discount: Number(input.discountAmount ?? 0),
    shippingFee: Number(input.shippingFee ?? 0),
    total: Number(input.totalAmount ?? 0),
    coupon: null,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function mapAddress(input: BackendAddress): Address {
  return {
    id: input.id,
    userId: input.userId,
    fullName: input.recipientName,
    phone: input.phone,
    province: humanizeLocation('Tỉnh/TP', input.provinceId),
    district: humanizeLocation('Quận/Huyện', input.districtId),
    ward: humanizeLocation('Phường/Xã', input.wardId),
    street: input.streetAddress,
    isDefault: input.isDefault,
  };
}

export function mapUser(input: BackendUser, addresses: Address[] = []): User {
  const roleValue =
    typeof input.role === 'string'
      ? input.role
      : (input.role?.name ?? 'CUSTOMER');

  return {
    id: input.id,
    email: input.email,
    fullName: input.fullName,
    phone: input.phone ?? '',
    avatar: input.avatarUrl ?? null,
    role:
      roleValue.toLowerCase() === 'super_admin' || roleValue === 'SUPER_ADMIN'
        ? UserRole.SUPER_ADMIN
        : roleValue.toLowerCase() === 'admin' || roleValue === 'ADMIN'
          ? UserRole.ADMIN
          : UserRole.CUSTOMER,
    isActive: input.isActive ?? true,
    addresses,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}

export function mapOrder(input: BackendOrder): Order {
  return {
    id: input.id,
    orderCode: input.orderNumber,
    userId: input.userId ?? '',
    items: (input.items ?? []).map((item) => {
      const parsed = parseVariantLabel(item.variantLabel);
      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug ?? item.productId,
        thumbnail: item.thumbnailUrl ?? '',
        variantSize: parsed.size,
        variantColor: parsed.color,
        sku: item.sku,
        price: Number(item.unitPrice),
        quantity: item.quantity,
        totalPrice: Number(item.lineTotal ?? item.subtotal ?? 0),
      };
    }),
    shippingAddress: {
      id: '',
      userId: input.userId ?? '',
      fullName: safeString(input.shippingAddress.recipientName),
      phone: safeString(input.shippingAddress.phone),
      province: humanizeLocation(
        'Tỉnh/TP',
        Number(input.shippingAddress.provinceId ?? 0),
      ),
      district: humanizeLocation(
        'Quận/Huyện',
        Number(input.shippingAddress.districtId ?? 0),
      ),
      ward: humanizeLocation(
        'Phường/Xã',
        Number(input.shippingAddress.wardId ?? 0),
      ),
      street: safeString(input.shippingAddress.streetAddress),
      isDefault: false,
    },
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus as Order['paymentStatus'],
    status: input.status as Order['status'],
    subtotal: Number(input.subtotal ?? 0),
    discount: Number(input.discountAmount ?? 0),
    shippingFee: Number(input.shippingFee ?? 0),
    total: Number(input.totalAmount ?? 0),
    note: input.customerNote ?? null,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
