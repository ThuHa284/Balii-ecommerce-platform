import { Order } from "@/types/order.types";
import { ApiResponse, PaginatedResponse } from "@/types/api.types";
import apiClient from "./client";

const USE_MOCK = true;

const mockOrders: Order[] = [
  {
    id: "ord_001", orderCode: "BL240315001", userId: "usr_001",
    items: [
      { id: "oi_001", productId: "prod_001", productName: "Bộ Đồ Ngủ Lụa Hồng Pastel", productSlug: "bo-do-ngu-lua-hong-pastel", thumbnail: "https://images.unsplash.com/photo-1631048835765-13e56e5f5ee4?w=200", variantSize: "M", variantColor: "Hồng pastel", sku: "BDN-HP-M", price: 690000, quantity: 1, totalPrice: 690000 },
    ],
    shippingAddress: { id: "addr_001", userId: "usr_001", fullName: "Nguyễn Văn An", phone: "0901234567", province: "TP. Hồ Chí Minh", district: "Quận 1", ward: "Phường Bến Nghé", street: "123 Nguyễn Huệ", isDefault: true },
    paymentMethod: "vnpay", paymentStatus: "paid" as never, status: "delivered" as never,
    subtotal: 690000, discount: 0, shippingFee: 30000, total: 720000, note: null,
    createdAt: "2024-03-15T10:30:00Z", updatedAt: "2024-03-18T14:00:00Z",
  },
];

export async function getOrders(page = 1, limit = 10): Promise<{ orders: Order[]; meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean } }> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ orders: mockOrders, meta: { page, limit, total: 1, totalPages: 1, hasNext: false, hasPrev: false } }), 500)
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
