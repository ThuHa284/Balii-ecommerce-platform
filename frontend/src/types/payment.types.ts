export interface PaymentMethod {
  id: string;
  name: string;
  code: "vnpay" | "momo" | "cod";
  icon: string;
  description: string;
}

export interface CreatePaymentRequest {
  orderId: string;
  method: string;
  returnUrl: string;
}

export interface PaymentResponse {
  paymentUrl: string;
  transactionId: string;
}

export interface PaymentResult {
  success: boolean;
  orderId: string;
  transactionId: string;
  message: string;
}
