import { mapOrder } from './adapters';
import apiClient from './client';
import { Order, ReturnRequest } from '@/types/order.types';
import { Address } from '@/types/user.types';

type BackendOrder = Parameters<typeof mapOrder>[0];

export async function getOrders(
  page = 1,
  limit = 10,
): Promise<{
  orders: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const { data } = await apiClient.get<BackendOrder[]>('/orders');
  const orders = data.map(mapOrder);
  const start = (page - 1) * limit;
  const paged = orders.slice(start, start + limit);

  return {
    orders: paged,
    meta: {
      page,
      limit,
      total: orders.length,
      totalPages: Math.max(1, Math.ceil(orders.length / limit)),
      hasNext: start + limit < orders.length,
      hasPrev: page > 1,
    },
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const { data } = await apiClient.get<BackendOrder>(`/orders/${id}`);
    return mapOrder(data);
  } catch {
    return null;
  }
}

export async function createOrder(orderData: {
  address: Address;
  paymentMethod: string;
  note?: string;
}): Promise<Order> {
  const { data } = await apiClient.post<BackendOrder>('/orders', {
    paymentMethod: orderData.paymentMethod,
    customerNote: orderData.note,
    shippingAddress: {
      recipientName: orderData.address.fullName,
      phone: orderData.address.phone,
      provinceId: orderData.address.provinceId,
      districtId: orderData.address.districtId,
      wardId: orderData.address.wardId,
      province: orderData.address.province,
      district: orderData.address.district,
      ward: orderData.address.ward,
      streetAddress: orderData.address.street,
    },
  });

  return mapOrder(data);
}

export async function getOrderReturnRequests(
  orderId: string,
): Promise<ReturnRequest[]> {
  const { data } = await apiClient.get<ReturnRequest[]>(
    `/orders/${orderId}/return-requests`,
  );
  return data;
}

export async function createOrderReturnRequest(
  orderId: string,
  payload: {
    reason: string;
    images: File[];
  },
): Promise<ReturnRequest> {
  const formData = new FormData();
  formData.append('reason', payload.reason);
  payload.images.forEach((image) => formData.append('images', image));

  const { data } = await apiClient.post<ReturnRequest>(
    `/orders/${orderId}/return-requests`,
    formData,
  );
  return data;
}
