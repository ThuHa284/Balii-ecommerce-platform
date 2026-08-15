/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PaymentServiceService } from './payment-service.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { Response } from 'express';
import { CamundaClientService } from './camunda/camunda-client.service';
import { StartRefundWorkflowDto } from './dto/start-refund-workflow.dto';
import { PaymentWebhookSecurityService } from './payment-webhook-security.service';
import { HeaderRolesGuard } from './auth/header-roles.guard';
import { KafkaDemoService, PaymentOutboxPublisher } from './kafka';
import { InternalServiceGuard } from './auth/internal-service.guard';
import { StartReturnRefundDto } from './dto/start-return-refund.dto';

@Controller('payments')
export class PaymentServiceController {
  constructor(
    private readonly paymentServiceService: PaymentServiceService,
    private readonly camundaClientService: CamundaClientService,
    private readonly paymentWebhookSecurityService: PaymentWebhookSecurityService,
    private readonly paymentOutboxPublisher: PaymentOutboxPublisher,
    private readonly kafkaDemoService: KafkaDemoService,
  ) {}

  @Post()
  createPayment(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-forwarded-for') forwardedFor: string | undefined,
    @Headers('x-real-ip') realIp: string | undefined,
    @Ip() requestIp: string,
    @Body() dto: CreatePaymentDto,
  ) {
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || requestIp;
    return this.paymentServiceService.createPayment(userId, dto, clientIp);
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

  // SePay bank-transfer webhook. Authenticated by the `Authorization: Apikey ...`
  // header (checked against SEPAY_WEBHOOK_API_KEY inside the service).
  @Post('webhook/sepay')
  handleSepayWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body()
    body: Parameters<PaymentServiceService['handleSepayWebhook']>[0],
  ): ReturnType<PaymentServiceService['handleSepayWebhook']> {
    return this.paymentServiceService.handleSepayWebhook(body, authorization);
  }

  @Post(':id/complete')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
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
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  failPayment(@Param('id') paymentId: string) {
    return this.paymentServiceService.failPayment(paymentId);
  }

  @Post(':id/simulate-success')
  simulatePaymentSuccess(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') paymentId: string,
  ) {
    return this.paymentServiceService.simulatePaymentSuccess(userId, paymentId);
  }

  @Post('workflow/start')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
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
    // Endpoint này khởi động Camunda workflow thay vì xử lý thanh toán ngay trong request đồng bộ.
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
    // Callback được correlate vào workflow để toàn bộ kiểm tra idempotency/transaction đi chung một luồng.
    const orderId = body.orderId;
    this.paymentWebhookSecurityService.validateGenericWebhookRequest({
      provider,
      flow: 'payment',
      businessKey: orderId,
      rawPayload: body,
      signature,
    });

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
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
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

  @Post('internal/returns/refund')
  @UseGuards(InternalServiceGuard)
  startApprovedReturnRefund(@Body() dto: StartReturnRefundDto) {
    return this.paymentServiceService.startApprovedReturnRefund(dto);
  }

  @Get('admin/refunds')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getAdminRefunds(): ReturnType<PaymentServiceService['getAdminRefunds']> {
    return this.paymentServiceService.getAdminRefunds();
  }

  @Get('admin/workflow-contexts')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getAdminWorkflowContexts(
    @Query('limit') limit?: string,
  ): ReturnType<PaymentServiceService['getAdminWorkflowContexts']> {
    return this.paymentServiceService.getAdminWorkflowContexts(Number(limit));
  }

  @Get('admin/workflow-overview')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getAdminWorkflowOverview(): ReturnType<
    CamundaClientService['getWorkflowOverview']
  > {
    return this.camundaClientService.getWorkflowOverview();
  }

  @Get('admin/kafka-overview')
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  getAdminKafkaOverview(): ReturnType<
    PaymentOutboxPublisher['getAdminKafkaOverview']
  > {
    return this.paymentOutboxPublisher.getAdminKafkaOverview();
  }

  // --- Kafka vs non-Kafka demo (same action done two ways) -----------------
  @Post('admin/kafka-demo/sync')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  runKafkaDemoSync(
    @Body() body: { recipient?: string; message?: string },
  ): ReturnType<KafkaDemoService['runSync']> {
    return this.kafkaDemoService.runSync({
      recipient: body.recipient?.trim() || 'khach-hang@balii.vn',
      message: body.message?.trim() || 'Đơn hàng của bạn đã được xác nhận.',
    });
  }

  @Post('admin/kafka-demo/async')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  runKafkaDemoAsync(
    @Body() body: { recipient?: string; message?: string },
  ): ReturnType<KafkaDemoService['runAsync']> {
    return this.kafkaDemoService.runAsync({
      recipient: body.recipient?.trim() || 'khach-hang@balii.vn',
      message: body.message?.trim() || 'Đơn hàng của bạn đã được xác nhận.',
    });
  }

  @Get('admin/kafka-demo/status')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getKafkaDemoStatus(): ReturnType<KafkaDemoService['getStatus']> {
    return this.kafkaDemoService.getStatus();
  }

  @Post('admin/workflow-demo')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  runAdminWorkflowDemo(
    @Body()
    body: {
      action: 'start_wait_callback' | 'start_service_incident';
      orderId?: string;
      paymentId?: string;
      faultTopic?: string;
    },
  ): ReturnType<PaymentServiceService['runAdminWorkflowDemo']> {
    return this.paymentServiceService.runAdminWorkflowDemo(body);
  }
  @Post('admin/workflow-demo/resolve')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  resolveAdminWorkflowDemoIncident(
    @Body()
    body: {
      processInstanceId: string;
      orderId?: string;
      paymentId?: string;
    },
  ): ReturnType<PaymentServiceService['resolveAdminWorkflowDemoIncident']> {
    return this.paymentServiceService.resolveAdminWorkflowDemoIncident(body);
  }

  @Get('admin/workflows')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getAdminWorkflows(
    @Query('orderId') orderId?: string,
    @Query('paymentId') paymentId?: string,
  ): ReturnType<PaymentServiceService['getAdminWorkflowMonitor']> {
    return this.paymentServiceService.getAdminWorkflowMonitor({
      orderId,
      paymentId,
    });
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
    // Refund webhook cũng đi qua Camunda để dùng lại logic retry, manual review và outbox.
    if (!body.paymentId) {
      throw new BadRequestException('Missing paymentId');
    }

    this.paymentWebhookSecurityService.validateGenericWebhookRequest({
      provider,
      flow: 'refund',
      businessKey: body.paymentId,
      rawPayload: body.rawPayload ?? body,
      signature,
    });

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
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  async publishOutboxNow() {
    const result = await this.paymentServiceService.signalOutboxPublisher();

    return {
      success: true,
      message: 'Outbox publish triggered',
      data: result,
    };
  }
}
