import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrderServiceService } from './order-service.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { HeaderRolesGuard } from './auth/header-roles.guard';

@Controller('orders')
export class OrderServiceController {
  constructor(private readonly orderServiceService: OrderServiceService) {}

  @Post()
  createOrder(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderServiceService.createOrder(userId, dto);
  }

  @Get()
  findMyOrders(@Headers('x-user-id') userId: string | undefined) {
    return this.orderServiceService.findMyOrders(userId);
  }

  @Get('admin/dashboard')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getAdminDashboard() {
    return this.orderServiceService.getAdminDashboardStats();
  }

  @Get('admin/analytics')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getAdminAnalytics() {
    return this.orderServiceService.getAdminAnalyticsStats();
  }

  @Get('admin/orders')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  findAdminOrders() {
    return this.orderServiceService.findAdminOrders();
  }

  @Get(':id')
  findMyOrderById(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') orderId: string,
  ) {
    return this.orderServiceService.findMyOrderById(userId, orderId);
  }

  @Patch(':id/payment-status')
  updatePaymentStatus(
    @Param('id') orderId: string,
    @Body()
    body: {
      paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
      status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
    },
  ) {
    return this.orderServiceService.updatePaymentStatus(
      orderId,
      body.paymentStatus,
      body.status,
    );
  }
}
