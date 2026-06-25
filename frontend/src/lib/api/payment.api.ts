import apiClient from './client';

type PaymentApiResponse = {
  id: string;
  orderId?: string;
  method?: string;
  status?: string;
  amount?: number;
  currency?: string;
  paymentUrl?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
  providerRef?: string | null;
  paymentCode?: string | null;
  transactionId?: string | null;
};

export type PaymentResponse = {
  id: string;
  paymentUrl: string;
  transactionId: string;
};

export type PaymentDetailResponse = {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  paymentUrl: string | null;
  transactionId: string;
  paidAt: string | null;
  expiresAt: string | null;
};

export async function createPayment(
  orderId: string,
  method: string,
  returnUrl: string,
): Promise<PaymentResponse> {
  const { data } = await apiClient.post<PaymentApiResponse>('/payments', {
    orderId,
    method,
    returnUrl,
  });

  return {
    id: data.id,
    paymentUrl: data.paymentUrl ?? returnUrl,
    transactionId:
      data.transactionId ?? data.providerRef ?? data.paymentCode ?? data.id,
  };
}

export async function completePayment(
  paymentId: string,
): Promise<PaymentApiResponse> {
  const { data } = await apiClient.post<PaymentApiResponse>(
    `/payments/${paymentId}/complete`,
    {},
  );
  return data;
}

export async function simulateVnpaySuccess(
  paymentId: string,
): Promise<PaymentApiResponse> {
  const { data } = await apiClient.post<PaymentApiResponse>(
    `/payments/${paymentId}/simulate-success`,
    {},
  );
  return data;
}

export async function getPaymentById(
  paymentId: string,
): Promise<PaymentDetailResponse> {
  const { data } = await apiClient.get<PaymentApiResponse>(
    `/payments/${paymentId}`,
  );

  return {
    id: data.id,
    orderId: data.orderId ?? '',
    method: data.method ?? 'cod',
    status: data.status ?? 'pending',
    amount: Number(data.amount ?? 0),
    currency: data.currency ?? 'VND',
    paymentUrl: data.paymentUrl ?? null,
    transactionId:
      data.transactionId ?? data.providerRef ?? data.paymentCode ?? data.id,
    paidAt: data.paidAt ?? null,
    expiresAt: data.expiresAt ?? null,
  };
}
