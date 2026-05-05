import apiClient from "./client";
import { MOCK_PRODUCTS } from "./mock-data";

const USE_MOCK = true;

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  orderGrowth: number;
  revenueByMonth: { month: string; revenue: number }[];
  recentOrders: { id: string; orderCode: string; customerName: string; total: number; status: string; createdAt: string }[];
}

const mockStats: AdminStats = {
  totalRevenue: 125600000, totalOrders: 342, totalCustomers: 1280, totalProducts: 56,
  revenueGrowth: 12.5, orderGrowth: 8.3,
  revenueByMonth: [
    { month: "T1", revenue: 8500000 }, { month: "T2", revenue: 9200000 }, { month: "T3", revenue: 11000000 },
    { month: "T4", revenue: 10500000 }, { month: "T5", revenue: 12800000 }, { month: "T6", revenue: 14200000 },
    { month: "T7", revenue: 13500000 }, { month: "T8", revenue: 11800000 }, { month: "T9", revenue: 10200000 },
    { month: "T10", revenue: 9800000 }, { month: "T11", revenue: 11500000 }, { month: "T12", revenue: 12600000 },
  ],
  recentOrders: [
    { id: "ord_001", orderCode: "BL240315001", customerName: "Nguyễn Văn An", total: 720000, status: "delivered", createdAt: "2024-03-15T10:30:00Z" },
    { id: "ord_002", orderCode: "BL240316002", customerName: "Trần Thị Bình", total: 1380000, status: "shipping", createdAt: "2024-03-16T14:20:00Z" },
    { id: "ord_003", orderCode: "BL240317003", customerName: "Lê Văn Cường", total: 950000, status: "confirmed", createdAt: "2024-03-17T09:15:00Z" },
    { id: "ord_004", orderCode: "BL240318004", customerName: "Phạm Thị Dung", total: 2100000, status: "pending", createdAt: "2024-03-18T16:45:00Z" },
  ],
};

export async function getAdminStats(): Promise<AdminStats> {
  if (USE_MOCK) return new Promise((resolve) => setTimeout(() => resolve(mockStats), 700));
  const { data } = await apiClient.get("/admin/stats");
  return data.data;
}

export async function getAdminProducts() {
  if (USE_MOCK) return new Promise((resolve) => setTimeout(() => resolve(MOCK_PRODUCTS), 500));
  const { data } = await apiClient.get("/admin/products");
  return data.data;
}

export async function deleteProduct(id: string) {
  if (USE_MOCK) return new Promise((resolve) => setTimeout(resolve, 500));
  await apiClient.delete(`/admin/products/${id}`);
}
