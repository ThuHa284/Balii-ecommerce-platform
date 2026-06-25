import apiClient from './client';
import { mapOrder } from './adapters';
import { Order, ReturnRequest } from '@/types/order.types';
import { User, UserRole } from '@/types/user.types';
import { mapUser } from './adapters';

export interface AdminRevenuePoint {
  month: string;
  revenue: number;
}

export interface AdminRecentOrder {
  id: string;
  orderCode: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface AdminTopProduct {
  productId: string;
  productName: string;
  thumbnail: string;
  quantitySold: number;
  revenue: number;
}

export interface AdminOrderStatusPoint {
  status: string;
  count: number;
}

export interface AdminOrder extends Order {
  customerName: string;
  customerEmail: string | null;
}

export interface AdminUser extends User {
  orderCount: number | null;
  totalSpent: number | null;
}

export interface AdminRefund {
  id: string;
  paymentId: string;
  orderId: string;
  userId: string;
  paymentAmount: number;
  refundAmount: number;
  paymentStatus: string;
  refundStatus: string;
  provider: string;
  providerRefundId: string | null;
  reason: string | null;
  failureReason: string | null;
  createdAt: string;
  refundedAt: string | null;
  gatewayStatus: string | null;
  workflowResolution: string | null;
  retryCount: number;
}

export interface AdminDashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  orderGrowth: number;
  revenueByMonth: AdminRevenuePoint[];
  recentOrders: AdminRecentOrder[];
}

export interface AdminAnalyticsStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  averageOrderValue: number;
  revenueGrowth: number;
  orderGrowth: number;
  monthlyRevenue: AdminRevenuePoint[];
  topProducts: AdminTopProduct[];
  orderStatusBreakdown: AdminOrderStatusPoint[];
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { data } = await apiClient.get<AdminDashboardStats>(
    '/orders/admin/dashboard',
  );
  return data;
}

export async function getAdminAnalyticsStats(): Promise<AdminAnalyticsStats> {
  const { data } = await apiClient.get<AdminAnalyticsStats>(
    '/orders/admin/analytics',
  );
  return data;
}

type BackendAdminOrder = Parameters<typeof mapOrder>[0] & {
  customerName: string;
  customerEmail?: string | null;
};

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const { data } = await apiClient.get<BackendAdminOrder[]>(
    '/orders/admin/orders',
  );
  return data.map((item) => ({
    ...mapOrder(item),
    customerName: item.customerName,
    customerEmail: item.customerEmail ?? null,
  }));
}

export async function updateAdminOrderStatus(
  orderId: string,
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipping'
    | 'delivered'
    | 'cancelled',
  note?: string,
): Promise<AdminOrder> {
  const { data } = await apiClient.patch<BackendAdminOrder>(
    `/orders/admin/orders/${orderId}/status`,
    { status, note },
  );

  return {
    ...mapOrder(data),
    customerName: data.customerName,
    customerEmail: data.customerEmail ?? null,
  };
}

export async function getAdminOrderReturnRequests(
  orderId: string,
): Promise<ReturnRequest[]> {
  const { data } = await apiClient.get<ReturnRequest[]>(
    `/orders/admin/orders/${orderId}/return-requests`,
  );
  return data;
}

export async function reviewAdminReturnRequest(
  returnRequestId: string,
  payload: {
    status: 'approved' | 'rejected';
    adminNote?: string;
  },
): Promise<ReturnRequest> {
  const { data } = await apiClient.patch<ReturnRequest>(
    `/orders/admin/return-requests/${returnRequestId}`,
    payload,
  );
  return data;
}

type BackendAdminUser = Parameters<typeof mapUser>[0];

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<BackendAdminUser[]>('/users');
  return data.map((item) => ({
    ...mapUser(item, []),
    orderCount: null,
    totalSpent: null,
  }));
}

export async function updateAdminUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUser> {
  const { data } = await apiClient.patch<BackendAdminUser>(
    `/users/${userId}/role`,
    { role },
  );

  return {
    ...mapUser(data, []),
    orderCount: null,
    totalSpent: null,
  };
}

export async function getAdminRefunds(): Promise<AdminRefund[]> {
  const { data } = await apiClient.get<AdminRefund[]>(
    '/payments/admin/refunds',
  );
  return data;
}
