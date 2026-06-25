/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { PaymentServiceService } from './payment-service.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { Response } from 'express';
import { CamundaClientService } from './camunda/camunda-client.service';
import { StartRefundWorkflowDto } from './dto/start-refund-workflow.dto';

@Controller('payments')
export class PaymentServiceController {
  constructor(
    private readonly paymentServiceService: PaymentServiceService,
    private readonly camundaClientService: CamundaClientService,
  ) {}

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

  @Get(':id')
  findPaymentDetail(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') paymentId: string,
  ) {
    return this.paymentServiceService.findPaymentDetail(userId, paymentId);
  }

  @Get('vnpay/return')
  async handleVnpayReturn(
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ) {
    const redirectUrl =
      await this.paymentServiceService.handleVnpayReturn(query);
    res.redirect(redirectUrl);
  }

  @Get('vnpay/ipn')
  handleVnpayIpn(@Query() query: Record<string, string | undefined>) {
    return this.paymentServiceService.handleVnpayIpn(query);
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

  @Post('workflow/start')
  async startPaymentWorkflow(
    @Body()
    body: {
      orderId: string;
      userId: string;
      amount: number;
      method: string;
      idempotencyKey?: string;
    },
  ) {
    const result = await this.camundaClientService.startPaymentProcessing({
      orderId: body.orderId,
      userId: body.userId,
      amount: Number(body.amount),
      method: body.method,
      idempotencyKey: body.idempotencyKey,
    });

    return {
      success: true,
      message: 'Payment workflow started',
      data: result,
    };
  }

  @Post('webhook/:provider')
  async handlePaymentWebhook(
    @Param('provider') provider: string,
    @Body() body: any,
    @Headers('x-payment-signature') signature?: string,
  ) {
    const orderId = body.orderId;

    const result = await this.camundaClientService.correlatePaymentCallback({
      orderId,
      provider,
      rawPayload: body,
      signature,
    });

    return {
      success: true,
      message: 'Payment callback correlated to Camunda',
      data: result,
    };
  }

  @Post('refunds/workflow/start')
  async startRefundWorkflow(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: StartRefundWorkflowDto,
  ) {
    const result = await this.camundaClientService.startRefundWorkflow({
      paymentId: dto.paymentId,
      orderId: dto.orderId,
      userId: dto.userId ?? userId,
      amount: Number(dto.amount),
      reason: dto.reason,
      idempotencyKey: dto.idempotencyKey,
    });

    return {
      success: true,
      message: 'Refund workflow started',
      data: result,
    };
  }

  @Get('admin/refunds')
  getAdminRefunds(): ReturnType<PaymentServiceService['getAdminRefunds']> {
    return this.paymentServiceService.getAdminRefunds();
  }

  @Post('refunds/webhook/:provider')
  async handleRefundWebhook(
    @Param('provider') provider: string,
    @Body()
    body: {
      paymentId: string;
      refundId?: string;
      refundResult?: string;
      providerRefundId?: string;
      rawPayload?: unknown;
    },
    @Headers('x-payment-signature') signature?: string,
  ) {
    const result = await this.camundaClientService.correlateRefundResult({
      paymentId: body.paymentId,
      provider,
      refundId: body.refundId,
      refundResult: body.refundResult,
      providerRefundId: body.providerRefundId,
      rawPayload: body.rawPayload ?? body,
      signature,
    });

    return {
      success: true,
      message: 'Refund callback correlated to Camunda',
      data: result,
    };
  }

  @Post('outbox/publish')
  async publishOutboxNow() {
    const result = await this.paymentServiceService.signalOutboxPublisher();

    return {
      success: true,
      message: 'Outbox publish triggered',
      data: result,
    };
  }
}
