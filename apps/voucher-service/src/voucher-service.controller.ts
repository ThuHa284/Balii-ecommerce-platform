import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HeaderRolesGuard } from './auth/header-roles.guard';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { RedeemVoucherDto } from './dto/redeem-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { VoucherServiceService } from './voucher-service.service';

@Controller()
export class VoucherServiceController {
  constructor(private readonly voucherService: VoucherServiceService) {}

  @Get('vouchers')
  findAvailable(
    @Query('orderAmount') orderAmount?: string,
    @Headers('x-user-id') userId?: string,
  ) {
    const parsedOrderAmount =
      orderAmount != null ? Number(orderAmount) : undefined;

    if (orderAmount != null && Number.isNaN(parsedOrderAmount)) {
      throw new BadRequestException('orderAmount must be a number');
    }

    return this.voucherService.findAvailable(parsedOrderAmount, userId);
  }

  @Get('vouchers/code/:code')
  findByCode(@Param('code') code: string) {
    return this.voucherService.findByCode(code);
  }

  @Post('vouchers/validate')
  validate(
    @Body() dto: ValidateVoucherDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.voucherService.validateVoucher(dto, userId);
  }

  @Post('vouchers/redeem')
  redeem(@Body() dto: RedeemVoucherDto, @Headers('x-user-id') userId?: string) {
    return this.voucherService.redeemVoucher(userId, dto);
  }

  @Get('vouchers/me')
  findMySavedVouchers(@Headers('x-user-id') userId?: string) {
    return this.voucherService.findMySavedVouchers(userId);
  }

  @Post('vouchers/:code/save')
  saveVoucher(
    @Param('code') code: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.voucherService.saveVoucher(userId, code);
  }

  @Get('vouchers/usages/me')
  findMyUsages(@Headers('x-user-id') userId?: string) {
    return this.voucherService.findMyUsages(userId);
  }

  @Get('admin/vouchers')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  findAllAdmin() {
    return this.voucherService.findAllAdmin();
  }

  @Get('admin/vouchers/:id')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  findOneAdmin(@Param('id') id: string) {
    return this.voucherService.findOneAdmin(id);
  }

  @Post('admin/vouchers')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  create(
    @Body() dto: CreateVoucherDto,
    @Headers('x-user-id') createdBy?: string,
  ) {
    return this.voucherService.create(dto, createdBy);
  }

  @Patch('admin/vouchers/:id')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  update(@Param('id') id: string, @Body() dto: UpdateVoucherDto) {
    return this.voucherService.update(id, dto);
  }

  @Delete('admin/vouchers/:id')
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  remove(@Param('id') id: string) {
    return this.voucherService.remove(id);
  }
}
