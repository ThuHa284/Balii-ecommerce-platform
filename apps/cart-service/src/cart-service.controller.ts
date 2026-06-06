import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CartService } from './cart-service.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(
    @Headers('x-user-id') userId?: string,
    @Headers('x-session-id') sessionId?: string,
  ) {
    return this.cartService.getCart(userId, sessionId);
  }

  @Post('items')
  addItem(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-session-id') sessionId: string | undefined,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(userId, sessionId, dto);
  }

  @Patch('items/:variantId')
  updateItem(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-session-id') sessionId: string | undefined,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(userId, sessionId, variantId, dto);
  }

  @Delete('items/:variantId')
  removeItem(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-session-id') sessionId: string | undefined,
    @Param('variantId') variantId: string,
  ) {
    return this.cartService.removeItem(userId, sessionId, variantId);
  }

  @Delete()
  clearCart(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-session-id') sessionId: string | undefined,
  ) {
    return this.cartService.clearCart(userId, sessionId);
  }

  @Post('merge')
  mergeCart(@Headers('x-user-id') userId: string, @Body() dto: MergeCartDto) {
    return this.cartService.mergeGuestCartToUserCart(userId, dto.sessionId);
  }

  @Post('validate')
  validateCart(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-session-id') sessionId: string | undefined,
  ) {
    return this.cartService.validateCart(userId, sessionId);
  }

  @Get('internal/checkout')
  getCartForCheckout(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-session-id') sessionId: string | undefined,
  ) {
    return this.cartService.validateCart(userId, sessionId);
  }
}
