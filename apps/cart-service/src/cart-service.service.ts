import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RedisService } from '@app/redis';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart } from './types/cart.types';
import { ProductClientService } from './clients/product-client.service';

const CART_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class CartService {
  constructor(
    private readonly redisService: RedisService,
    private readonly productClientService: ProductClientService,
  ) {}

  private getCartKey(userId?: string, sessionId?: string): string {
    if (userId) return `cart:${userId}`;
    if (sessionId) return `cart:guest:${sessionId}`;

    throw new BadRequestException('Missing x-user-id or x-session-id');
  }

  private createEmptyCart(key: string): Cart {
    return {
      ownerKey: key,
      items: [],
      subtotal: 0,
      discountAmount: 0,
      shippingFee: 0,
      totalAmount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  private async getRawCart(key: string): Promise<Cart> {
    const data = await this.redisService.get(key);

    if (!data) {
      return this.createEmptyCart(key);
    }

    return JSON.parse(data) as Cart;
  }

  private calculateCart(cart: Cart): Cart {
    cart.items = cart.items.map((item) => ({
      ...item,
      subtotal: item.unitPrice * item.quantity,
    }));

    cart.subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalQuantity = cart.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    cart.shippingFee = totalQuantity === 0 ? 0 : totalQuantity >= 2 ? 0 : 30000;
    cart.totalAmount = cart.subtotal - cart.discountAmount + cart.shippingFee;
    cart.updatedAt = new Date().toISOString();

    return cart;
  }

  private async saveCart(key: string, cart: Cart): Promise<Cart> {
    const calculatedCart = this.calculateCart(cart);

    await this.redisService.set(
      key,
      JSON.stringify(calculatedCart),
      CART_TTL_SECONDS,
    );

    return calculatedCart;
  }

  async getCart(userId?: string, sessionId?: string): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    return this.getRawCart(key);
  }

  async addItem(
    userId: string | undefined,
    sessionId: string | undefined,
    dto: AddCartItemDto,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    const cart = await this.getRawCart(key);

    const existedItem = cart.items.find(
      (item) => item.variantId === dto.variantId,
    );

    const newQuantity = existedItem
      ? existedItem.quantity + dto.quantity
      : dto.quantity;

    const variant = await this.productClientService.validateVariantStock(
      dto.variantId,
      newQuantity,
    );

    if (existedItem) {
      existedItem.quantity = newQuantity;
      existedItem.unitPrice = variant.unitPrice;
      existedItem.productName = variant.productName;
      existedItem.productSlug = variant.productSlug;
      existedItem.sku = variant.sku;
      existedItem.thumbnailUrl = variant.thumbnailUrl;
      existedItem.variantLabel = variant.variantLabel;
      existedItem.variantSize = variant.variantSize;
      existedItem.variantColor = variant.variantColor;
      existedItem.campaignId = variant.campaignId ?? null;
      existedItem.campaignName = variant.campaignName ?? null;
      existedItem.campaignDiscountType = variant.campaignDiscountType ?? null;
      existedItem.campaignDiscountValue = variant.campaignDiscountValue ?? null;
      existedItem.campaignBadgeText = variant.campaignBadgeText ?? null;
    } else {
      cart.items.push({
        variantId: variant.variantId,
        productId: variant.productId,
        productName: variant.productName,
        productSlug: variant.productSlug,
        sku: variant.sku,
        thumbnailUrl: variant.thumbnailUrl,
        variantLabel: variant.variantLabel,
        variantSize: variant.variantSize,
        variantColor: variant.variantColor,
        campaignId: variant.campaignId ?? null,
        campaignName: variant.campaignName ?? null,
        campaignDiscountType: variant.campaignDiscountType ?? null,
        campaignDiscountValue: variant.campaignDiscountValue ?? null,
        campaignBadgeText: variant.campaignBadgeText ?? null,
        unitPrice: variant.unitPrice,
        quantity: dto.quantity,
        subtotal: variant.unitPrice * dto.quantity,
      });
    }

    return this.saveCart(key, cart);
  }

  async updateItem(
    userId: string | undefined,
    sessionId: string | undefined,
    variantId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    const cart = await this.getRawCart(key);

    const item = cart.items.find((item) => item.variantId === variantId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const variant = await this.productClientService.validateVariantStock(
      variantId,
      dto.quantity,
    );

    item.quantity = dto.quantity;
    item.unitPrice = variant.unitPrice;
    item.productName = variant.productName;
    item.productSlug = variant.productSlug;
    item.sku = variant.sku;
    item.thumbnailUrl = variant.thumbnailUrl;
    item.variantLabel = variant.variantLabel;
    item.variantSize = variant.variantSize;
    item.variantColor = variant.variantColor;
    item.campaignId = variant.campaignId ?? null;
    item.campaignName = variant.campaignName ?? null;
    item.campaignDiscountType = variant.campaignDiscountType ?? null;
    item.campaignDiscountValue = variant.campaignDiscountValue ?? null;
    item.campaignBadgeText = variant.campaignBadgeText ?? null;

    return this.saveCart(key, cart);
  }

  async removeItem(
    userId: string | undefined,
    sessionId: string | undefined,
    variantId: string,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    const cart = await this.getRawCart(key);

    cart.items = cart.items.filter((item) => item.variantId !== variantId);

    return this.saveCart(key, cart);
  }

  async clearCart(
    userId: string | undefined,
    sessionId: string | undefined,
  ): Promise<{ success: boolean }> {
    const key = this.getCartKey(userId, sessionId);
    await this.redisService.del(key);

    return { success: true };
  }

  async mergeGuestCartToUserCart(
    userId: string,
    sessionId: string,
  ): Promise<Cart> {
    if (!userId) {
      throw new BadRequestException('Missing x-user-id');
    }

    if (!sessionId) {
      throw new BadRequestException('Missing sessionId');
    }

    const guestKey = `cart:guest:${sessionId}`;
    const userKey = `cart:${userId}`;

    const guestCart = await this.getRawCart(guestKey);
    const userCart = await this.getRawCart(userKey);

    for (const guestItem of guestCart.items) {
      const existedItem = userCart.items.find(
        (item) => item.variantId === guestItem.variantId,
      );

      if (existedItem) {
        existedItem.quantity += guestItem.quantity;
      } else {
        userCart.items.push({
          ...guestItem,
        });
      }
    }

    userCart.ownerKey = userKey;

    await this.redisService.del(guestKey);

    return this.saveCart(userKey, userCart);
  }

  async validateCart(
    userId: string | undefined,
    sessionId: string | undefined,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    const cart = await this.getRawCart(key);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const variant = await this.productClientService.validateVariantStock(
        item.variantId,
        item.quantity,
      );

      item.unitPrice = variant.unitPrice;
      item.productName = variant.productName;
      item.productSlug = variant.productSlug;
      item.sku = variant.sku;
      item.thumbnailUrl = variant.thumbnailUrl;
      item.variantLabel = variant.variantLabel;
      item.variantSize = variant.variantSize;
      item.variantColor = variant.variantColor;
      item.campaignId = variant.campaignId ?? null;
      item.campaignName = variant.campaignName ?? null;
      item.campaignDiscountType = variant.campaignDiscountType ?? null;
      item.campaignDiscountValue = variant.campaignDiscountValue ?? null;
      item.campaignBadgeText = variant.campaignBadgeText ?? null;
    }

    return this.saveCart(key, cart);
  }
}
