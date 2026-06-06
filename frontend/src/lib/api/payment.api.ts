import apiClient from './client';

type PaymentApiResponse = {
  id: string;
  paymentUrl?: string | null;
  providerRef?: string | null;
  paymentCode?: string | null;
  transactionId?: string | null;
};

export type PaymentResponse = {
  id: string;
  paymentUrl: string;
  transactionId: string;
};

export async function createPayment(
  orderId: string,
  method: string,
  returnUrl: string,
): Promise<PaymentResponse> {
  const { data } = await apiClient.post<PaymentApiResponse>('/payments', {
    orderId,
    method: method === 'cod' ? 'cod' : 'mock_online',
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
