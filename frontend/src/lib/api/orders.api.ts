import { Order } from "@/types/order.types";
import { ApiResponse, PaginatedResponse } from "@/types/api.types";
import apiClient from "./client";

const USE_MOCK = true;

const mockOrders: Order[] = [
  {
    id: "ord_001", orderCode: "BL240315001", userId: "usr_001",
    items: [
      { id: "oi_001", productId: "prod_001", productName: "Bộ Đồ Ngủ Lụa Hồng Pastel", productSlug: "bo-do-ngu-lua-hong-pastel", thumbnail: "https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=200", variantSize: "M", variantColor: "Hồng pastel", sku: "BDN-HP-M", price: 690000, quantity: 1, totalPrice: 690000 },
      { id: "oi_002", productId: "prod_003", productName: "Áo Choàng Tắm Lụa Trắng", productSlug: "ao-choang-tam-lua-trang", thumbnail: "https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=200", variantSize: "L", variantColor: "Trắng ngà", sku: "ACT-TN-L", price: 890000, quantity: 1, totalPrice: 890000 },
    ],
    shippingAddress: { id: "addr_001", userId: "usr_001", fullName: "Nguyễn Văn An", phone: "0901234567", province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", street: "123 Nguyễn Huệ", isDefault: true },
    paymentMethod: "vnpay", paymentStatus: "paid" as never, status: "delivered" as never,
    subtotal: 1580000, discount: 100000, shippingFee: 0, total: 1480000, note: "Giao giờ hành chính",
    createdAt: "2024-03-15T10:30:00Z", updatedAt: "2024-03-18T14:00:00Z",
  },
  {
    id: "ord_002", orderCode: "BL240320002", userId: "usr_001",
    items: [
      { id: "oi_003", productId: "prod_002", productName: "Pyjama Lụa Lavender Premium", productSlug: "pyjama-lua-lavender-premium", thumbnail: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=200", variantSize: "S", variantColor: "Tím lavender", sku: "PJL-LV-S", price: 750000, quantity: 2, totalPrice: 1500000 },
    ],
    shippingAddress: { id: "addr_001", userId: "usr_001", fullName: "Nguyễn Văn An", phone: "0901234567", province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", street: "123 Nguyễn Huệ", isDefault: true },
    paymentMethod: "momo", paymentStatus: "paid" as never, status: "shipping" as never,
    subtotal: 1500000, discount: 0, shippingFee: 30000, total: 1530000, note: null,
    createdAt: "2024-03-20T08:15:00Z", updatedAt: "2024-03-21T09:00:00Z",
  },
  {
    id: "ord_003", orderCode: "BL240322003", userId: "usr_001",
    items: [
      { id: "oi_004", productId: "prod_004", productName: "Bộ Đồ Ngủ Cotton Xanh Mint", productSlug: "bo-do-ngu-cotton-xanh-mint", thumbnail: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=200", variantSize: "M", variantColor: "Xanh mint", sku: "BDN-XM-M", price: 520000, quantity: 1, totalPrice: 520000 },
      { id: "oi_005", productId: "prod_005", productName: "Quần Ngủ Lụa Đen Sang Trọng", productSlug: "quan-ngu-lua-den-sang-trong", thumbnail: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=200", variantSize: "M", variantColor: "Đen", sku: "QNL-D-M", price: 380000, quantity: 1, totalPrice: 380000 },
      { id: "oi_006", productId: "prod_006", productName: "Áo Ngủ Hai Dây Satin Rose", productSlug: "ao-ngu-hai-day-satin-rose", thumbnail: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=200", variantSize: "S", variantColor: "Hồng pastel", sku: "AND-HP-S", price: 450000, quantity: 1, totalPrice: 450000 },
    ],
    shippingAddress: { id: "addr_001", userId: "usr_001", fullName: "Nguyễn Văn An", phone: "0901234567", province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", street: "123 Nguyễn Huệ", isDefault: true },
    paymentMethod: "cod", paymentStatus: "pending" as never, status: "pending" as never,
    subtotal: 1350000, discount: 50000, shippingFee: 30000, total: 1330000, note: "Gọi trước khi giao",
    createdAt: "2024-03-22T16:45:00Z", updatedAt: "2024-03-22T16:45:00Z",
  },
  {
    id: "ord_004", orderCode: "BL240318004", userId: "usr_001",
    items: [
      { id: "oi_007", productId: "prod_007", productName: "Set Đồ Ngủ Couple Lụa Trắng", productSlug: "set-do-ngu-couple-lua-trang", thumbnail: "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?w=200", variantSize: "L", variantColor: "Trắng ngà", sku: "SDC-TN-L", price: 1290000, quantity: 1, totalPrice: 1290000 },
    ],
    shippingAddress: { id: "addr_001", userId: "usr_001", fullName: "Nguyễn Văn An", phone: "0901234567", province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", street: "123 Nguyễn Huệ", isDefault: true },
    paymentMethod: "vnpay", paymentStatus: "paid" as never, status: "processing" as never,
    subtotal: 1290000, discount: 0, shippingFee: 0, total: 1290000, note: null,
    createdAt: "2024-03-18T11:20:00Z", updatedAt: "2024-03-19T08:30:00Z",
  },
  {
    id: "ord_005", orderCode: "BL240310005", userId: "usr_001",
    items: [
      { id: "oi_008", productId: "prod_008", productName: "Bộ Đồ Ngủ Pyjama Kẻ Sọc", productSlug: "bo-do-ngu-pyjama-ke-soc", thumbnail: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=200", variantSize: "XL", variantColor: "Xám bạc", sku: "BDN-XB-XL", price: 480000, quantity: 1, totalPrice: 480000 },
    ],
    shippingAddress: { id: "addr_001", userId: "usr_001", fullName: "Nguyễn Văn An", phone: "0901234567", province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", street: "123 Nguyễn Huệ", isDefault: true },
    paymentMethod: "cod", paymentStatus: "pending" as never, status: "cancelled" as never,
    subtotal: 480000, discount: 0, shippingFee: 30000, total: 510000, note: null,
    createdAt: "2024-03-10T09:00:00Z", updatedAt: "2024-03-11T15:00:00Z",
  },
];

export async function getOrders(page = 1, limit = 10): Promise<{ orders: Order[]; meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ orders: mockOrders, meta: { page, limit, total: mockOrders.length, totalPages: 1, hasNext: false, hasPrev: false } }), 500)
    );
  }
  const { data } = await apiClient.get<PaginatedResponse<Order>>("/orders", { params: { page, limit } });
  return { orders: data.data, meta: data.meta };
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve(mockOrders.find((o) => o.id === id) || mockOrders[0]), 500)
    );
  }
  const { data } = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
  return data.data;
}

export async function createOrder(orderData: { addressId: string; paymentMethod: string; note?: string }): Promise<Order> {
  if (USE_MOCK) {
    return new Promise((resolve) => setTimeout(() => resolve(mockOrders[0]), 800));
  }
  const { data } = await apiClient.post<ApiResponse<Order>>("/orders", orderData);
  return data.data;
}
