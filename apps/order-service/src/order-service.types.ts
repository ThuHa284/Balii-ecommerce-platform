export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  customerNote?: string | null;
  shippingAddress: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};
