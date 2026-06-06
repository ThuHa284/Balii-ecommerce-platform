import { mapOrder } from './adapters';
import apiClient from './client';
import { Order } from '@/types/order.types';
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
    paymentMethod:
      orderData.paymentMethod === 'vnpay' || orderData.paymentMethod === 'momo'
        ? 'mock_online'
        : orderData.paymentMethod,
    customerNote: orderData.note,
    shippingAddress: {
      recipientName: orderData.address.fullName,
      phone: orderData.address.phone,
      provinceId: extractNumericId(orderData.address.province),
      districtId: extractNumericId(orderData.address.district),
      wardId: extractNumericId(orderData.address.ward),
      streetAddress: orderData.address.street,
    },
  });

  return mapOrder(data);
}

function extractNumericId(label: string) {
  const matched = label.match(/(\d+)/);
  return matched ? Number(matched[1]) : 0;
}
