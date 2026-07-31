import { BadGatewayException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export type ReturnRefundDispatch = {
  paymentId: string;
  refundId: string | null;
  reused: boolean;
  workflowStarted: boolean;
};

@Injectable()
export class PaymentClientService {
  private readonly paymentServiceUrl =
    process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';

  constructor(private readonly httpService: HttpService) {}

  async startReturnRefund(input: {
    returnRequestId: string;
    orderId: string;
    userId: string;
    reason: string;
    amount: number;
  }): Promise<ReturnRefundDispatch> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<ReturnRefundDispatch>(
          `${this.paymentServiceUrl}/payments/internal/returns/refund`,
          input,
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
    } catch (error) {
      const responseMessage = (error as AxiosError<{ message?: string }>)
        .response?.data?.message;
      throw new BadGatewayException(
        responseMessage || 'Không thể khởi tạo luồng hoàn tiền.',
      );
    }
  }
}
