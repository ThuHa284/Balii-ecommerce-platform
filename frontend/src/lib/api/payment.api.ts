import { PaymentResponse } from "@/types/payment.types";
import { ApiResponse } from "@/types/api.types";
import apiClient from "./client";

const USE_MOCK = true;

export async function createPayment(orderId: string, method: string, returnUrl: string): Promise<PaymentResponse> {
  if (USE_MOCK) {
    return new Promise((resolve) =>
      setTimeout(() => resolve({ paymentUrl: "/checkout/success", transactionId: "txn_mock_001" }), 800)
    );
  }
  const { data } = await apiClient.post<ApiResponse<PaymentResponse>>("/payment/create", { orderId, method, returnUrl });
  return data.data;
}
