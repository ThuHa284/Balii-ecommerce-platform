import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PaymentServiceService } from './payment-service.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentServiceController {
  constructor(private readonly paymentServiceService: PaymentServiceService) {}

  @Post()
  createPayment(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentServiceService.createPayment(userId, dto);
  }

  @Get()
  findMyPayments(@Headers('x-user-id') userId: string | undefined) {
    return this.paymentServiceService.findMyPayments(userId);
  }

  @Post(':id/complete')
  completePayment(
    @Param('id') paymentId: string,
    @Body() body: { providerTransactionId?: string },
  ) {
    return this.paymentServiceService.completePayment(
      paymentId,
      body.providerTransactionId,
    );
  }

  @Post(':id/fail')
  failPayment(@Param('id') paymentId: string) {
    return this.paymentServiceService.failPayment(paymentId);
  }
}
