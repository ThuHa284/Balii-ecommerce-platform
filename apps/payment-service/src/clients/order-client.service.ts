import {
  Injectable,
  BadGatewayException,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

type OrderPayload = {
  id: string;
  orderNumber?: string;
  totalAmount: number;
  paymentStatus: string;
  status: string;
};

@Injectable()
export class OrderClientService {
  private readonly orderServiceUrl =
    process.env.ORDER_SERVICE_URL || 'http://localhost:3004';

  constructor(private readonly httpService: HttpService) {}

  async getOrder(orderId: string, userId: string): Promise<OrderPayload> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OrderPayload>(
          `${this.orderServiceUrl}/orders/${orderId}`,
          {
            headers: {
              'x-user-id': userId,
              'x-internal-service-key':
                process.env.INTERNAL_SERVICE_SECRET ||
                (process.env.NODE_ENV === 'production'
                  ? ''
                  : 'balii-local-internal'),
            },
          },
        ),
      );

      return response.data;
    } catch (error) {
      if ((error as AxiosError | undefined)?.response?.status === 404) {
        throw new NotFoundException('Order not found');
      }

      throw new BadGatewayException('Unable to fetch order');
    }
  }

  async updateOrderPayment(
    orderId: string,
    paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded',
    status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded',
  ): Promise<Record<string, unknown>> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<Record<string, unknown>>(
          `${this.orderServiceUrl}/orders/${orderId}/payment-status`,
          {
            paymentStatus,
            status,
          },
          {
            headers: {
              'x-internal-service-key':
                process.env.INTERNAL_SERVICE_SECRET ||
                (process.env.NODE_ENV === 'production'
                  ? ''
                  : 'balii-local-internal'),
            },
          },
        ),
      );

      return response.data;
    } catch {
      throw new BadGatewayException('Unable to update order payment status');
    }
  }

  async updateReturnRefundResult(
    returnRequestId: string,
    result: 'completed' | 'failed',
  ): Promise<Record<string, unknown>> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<Record<string, unknown>>(
          `${this.orderServiceUrl}/orders/internal/return-requests/${returnRequestId}/refund-result`,
          { result },
          {
            headers: {
              'x-internal-service-key':
                process.env.INTERNAL_SERVICE_SECRET ||
                (process.env.NODE_ENV === 'production'
                  ? ''
                  : 'balii-local-internal'),
            },
          },
        ),
      );
      return response.data;
    } catch {
      throw new BadGatewayException(
        'Unable to update return request refund result',
      );
    }
  }
}
