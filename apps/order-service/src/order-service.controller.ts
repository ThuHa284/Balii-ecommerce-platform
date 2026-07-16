import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { OrderServiceService } from './order-service.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { HeaderRolesGuard } from './auth/header-roles.guard';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ReviewReturnRequestDto } from './dto/review-return-request.dto';

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

  @Get('admin/orders/:id/return-requests')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  findAdminReturnRequests(@Param('id') orderId: string) {
    return this.orderServiceService.findAdminReturnRequests(orderId);
  }

  @Get('admin/return-requests')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  findAllAdminReturnRequests(@Query('status') status?: string) {
    return this.orderServiceService.findAllAdminReturnRequests(status);
  }

  @Get(':id/return-requests')
  findMyReturnRequests(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') orderId: string,
  ) {
    return this.orderServiceService.findMyReturnRequests(userId, orderId);
  }

  @Post(':id/return-requests')
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
        ) {
          callback(
            new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  createReturnRequest(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') orderId: string,
    @Body() dto: CreateReturnRequestDto,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ) {
    return this.orderServiceService.createReturnRequest(
      userId,
      orderId,
      dto,
      images,
    );
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

  @Patch('admin/orders/:id/status')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  updateOrderStatus(
    @Param('id') orderId: string,
    @Body()
    body: {
      status:
        | 'pending'
        | 'confirmed'
        | 'processing'
        | 'shipping'
        | 'delivered'
        | 'cancelled';
      note?: string;
    },
  ) {
    return this.orderServiceService.updateOrderStatus(
      orderId,
      body.status,
      body.note,
    );
  }

  @Patch('admin/return-requests/:id')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  reviewReturnRequest(
    @Headers('x-user-id') reviewedBy: string | undefined,
    @Param('id') returnRequestId: string,
    @Body() dto: ReviewReturnRequestDto,
  ) {
    return this.orderServiceService.reviewReturnRequest(
      returnRequestId,
      reviewedBy,
      dto,
    );
  }
}
