export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4006';

export const ROUTES = {
  HOME: '/',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (slug: string) => `/products/${slug}`,
  CATEGORIES: '/categories',
  CATEGORY_DETAIL: (slug: string) => `/categories/${slug}`,
  CART: '/cart',
  CHECKOUT: '/checkout',
  CHECKOUT_SUCCESS: '/checkout/success',
  SEARCH: '/search',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  PROFILE: '/profile',
  ORDERS: '/orders',
  ORDER_DETAIL: (id: string) => `/orders/${id}`,
  ADDRESSES: '/addresses',
  WISHLIST: '/wishlist',
  ADMIN_DASHBOARD: '/dashboard',
  ADMIN_PRODUCTS: '/products',
  ADMIN_ORDERS: '/orders',
  ADMIN_USERS: '/users',
  ADMIN_ANALYTICS: '/analytics',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  shipping: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  vnpay: 'VNPay',
  momo: 'MoMo',
  cod: 'Thanh toán khi nhận hàng (COD)',
  mock_online: 'Thanh toán online',
  bank_transfer: 'Chuyển khoản',
};

export const VOUCHER_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  expired: 'Đã hết hạn',
  used_up: 'Đã hết lượt',
  inactive: 'Tạm ngưng',
};

export const VOUCHER_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  expired: 'bg-gray-100 text-gray-800',
  used_up: 'bg-orange-100 text-orange-800',
  inactive: 'bg-red-100 text-red-800',
};

export const VOUCHER_DISCOUNT_TYPE_LABELS: Record<string, string> = {
  percent: 'Giảm %',
  fixed: 'Giảm cố định',
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 12,
  ADMIN_LIMIT: 20,
} as const;

export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'best_seller', label: 'Bán chạy nhất' },
  { value: 'rating', label: 'Đánh giá cao' },
] as const;

export const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export const COLORS = [
  { name: 'Hồng pastel', value: '#F8BBD0' },
  { name: 'Trắng ngà', value: '#FFF8E7' },
  { name: 'Xám bạc', value: '#CFD8DC' },
  { name: 'Tím lavender', value: '#E1BEE7' },
  { name: 'Xanh mint', value: '#B2DFDB' },
  { name: 'Be nude', value: '#EFEBE9' },
  { name: 'Đen', value: '#212121' },
  { name: 'Đỏ đô', value: '#C62828' },
] as const;

export const NAV_LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/products', label: 'Sản phẩm' },
  { href: '/collections', label: 'Bộ sưu tập' },
  { href: '/faq', label: 'Hỏi đáp (FAQ)' },
  { href: '/contact', label: 'Liên hệ' },
] as const;

export const COMBO_SHORTS_BASE_PRICE = 99000;
export const COMBO_SHORTS_BUNDLE_PRICE = 20000;
export const FREESHIP_MIN_ITEMS = 2;
export const FREESHIP_MIN_AMOUNT = 500000;
