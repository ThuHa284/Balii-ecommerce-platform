import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '@app/redis';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Cart, CartItem } from './types/cart.types';
import { ProductClientService } from './clients/product-client.service';
import { DataSource } from 'typeorm';

const CART_TTL_SECONDS = 7 * 24 * 60 * 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

@Injectable()
export class CartService {
  constructor(
    private readonly redisService: RedisService,
    private readonly productClientService: ProductClientService,
    private readonly dataSource: DataSource,
  ) {}

  private getCartKey(userId?: string, sessionId?: string): string {
    if (userId) return `cart:${userId}`;
    if (sessionId && isUuid(sessionId)) return `cart:guest:${sessionId}`;
    if (sessionId) {
      throw new BadRequestException('x-session-id must be a valid UUID');
    }

    throw new BadRequestException('Missing x-user-id or x-session-id');
  }

  private createEmptyCart(key: string): Cart {
    return {
      ownerKey: key,
      items: [],
      promotionItems: [],
      subtotal: 0,
      discountAmount: 0,
      shippingFee: 0,
      totalAmount: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  private async withCartLock<T>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const lockKey = `lock:${key}`;
    const token = randomUUID();
    let acquired = false;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      acquired = await this.redisService.acquireLock(lockKey, token, 5000);
      if (acquired) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }

    if (!acquired) {
      throw new ServiceUnavailableException(
        'Giỏ hàng đang được cập nhật, vui lòng thử lại.',
      );
    }

    try {
      return await operation();
    } finally {
      await this.redisService.releaseLock(lockKey, token);
    }
  }

  private async getRawCart(key: string): Promise<Cart> {
    const data = await this.redisService.get(key);

    if (!data) {
      return this.createEmptyCart(key);
    }

    const cart = JSON.parse(data) as Cart;
    cart.promotionItems ??= [];
    return cart;
  }

  private async calculateCart(cart: Cart): Promise<Cart> {
    cart.items = await Promise.all(
      cart.items.map(async (item) => {
        const variant = await this.productClientService.getVariantSnapshot(
          item.variantId,
        );
        const unitPrice = this.roundMoney(variant.unitPrice);
        return {
          ...item,
          productId: variant.productId,
          productName: variant.productName,
          productSlug: variant.productSlug,
          sku: variant.sku,
          thumbnailUrl: variant.thumbnailUrl,
          variantLabel: variant.variantLabel,
          variantSize: variant.variantSize,
          variantColor: variant.variantColor,
          unitPrice,
          isOnSale: variant.isOnSale,
          subtotal: this.roundMoney(unitPrice * item.quantity),
        };
      }),
    );

    cart.promotionItems = await this.buildPromotionItems(cart.items);
    cart.subtotal = this.roundMoney(
      [...cart.items, ...cart.promotionItems].reduce(
        (sum, item) => sum + item.subtotal,
        0,
      ),
    );
    const freeShippingMinimum = this.getMoneyConfig(
      'FREE_SHIPPING_MIN_AMOUNT',
      500000,
    );
    const baseShippingFee = await this.getDefaultShippingFee();
    cart.shippingFee =
      cart.items.length === 0 || cart.subtotal >= freeShippingMinimum
        ? 0
        : baseShippingFee;
    cart.discountAmount = this.roundMoney(cart.discountAmount);
    cart.totalAmount = this.roundMoney(
      Math.max(0, cart.subtotal - cart.discountAmount + cart.shippingFee),
    );
    cart.updatedAt = new Date().toISOString();

    return cart;
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private getMoneyConfig(name: string, fallback: number): number {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isFinite(value) || value < 0) {
      throw new ServiceUnavailableException(
        `Cấu hình ${name} phải là số không âm.`,
      );
    }
    return this.roundMoney(value);
  }

  private async getDefaultShippingFee(): Promise<number> {
    let rows: Array<{ base_fee: number | string }>;
    try {
      rows = await this.dataSource.query(
        `SELECT base_fee
         FROM order_service.shipping_methods
         WHERE is_active = TRUE
         ORDER BY id ASC
         LIMIT 1`,
      );
    } catch {
      throw new ServiceUnavailableException(
        'Không thể tải cấu hình vận chuyển, vui lòng thử lại.',
      );
    }

    if (!rows.length) {
      throw new ServiceUnavailableException(
        'Chưa có phương thức vận chuyển đang hoạt động.',
      );
    }

    const fee = Number(rows[0].base_fee);
    if (!Number.isFinite(fee) || fee < 0) {
      throw new ServiceUnavailableException(
        'Phí vận chuyển trong hệ thống không hợp lệ.',
      );
    }

    return this.roundMoney(fee);
  }

  private async saveCart(key: string, cart: Cart): Promise<Cart> {
    const calculatedCart = await this.calculateCart(cart);

    await this.redisService.set(
      key,
      JSON.stringify(calculatedCart),
      CART_TTL_SECONDS,
    );

    return calculatedCart;
  }

  async getCart(userId?: string, sessionId?: string): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    return this.withCartLock(key, async () =>
      this.saveCart(key, await this.getRawCart(key)),
    );
  }

  async addItem(
    userId: string | undefined,
    sessionId: string | undefined,
    dto: AddCartItemDto,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    return this.withCartLock(key, async () => {
      const cart = await this.getRawCart(key);

      const existedItem = cart.items.find(
        (item) => item.variantId === dto.variantId,
      );
      if (!existedItem && cart.items.length >= 50) {
        throw new BadRequestException(
          'Giỏ hàng chỉ được chứa tối đa 50 sản phẩm khác nhau.',
        );
      }

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
        existedItem.campaignDiscountValue =
          variant.campaignDiscountValue ?? null;
        existedItem.campaignBadgeText = variant.campaignBadgeText ?? null;
        existedItem.isOnSale = variant.isOnSale;
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
          isOnSale: variant.isOnSale,
          quantity: dto.quantity,
          subtotal: variant.unitPrice * dto.quantity,
        });
      }

      return this.saveCart(key, cart);
    });
  }

  private async buildPromotionItems(items: CartItem[]): Promise<CartItem[]> {
    if (!items.length) {
      return [];
    }

    const campaigns = (await this.productClientService.getActiveCampaigns())
      .filter(
        (campaign) =>
          campaign.discountType === 'GIFT' &&
          campaign.giftVariantId &&
          campaign.giftQuantity > 0,
      )
      .map((campaign) => ({
        campaign,
        eligibleQuantity: items
          .filter(
            (item) =>
              campaign.productIds.includes(item.productId) &&
              (campaign.stackableWithSale || !item.isOnSale),
          )
          .reduce((sum, item) => sum + item.quantity, 0),
      }))
      .filter(
        ({ campaign, eligibleQuantity }) =>
          eligibleQuantity >= campaign.minimumPurchaseQuantity,
      )
      .sort(
        (left, right) =>
          right.campaign.priorityOrder - left.campaign.priorityOrder ||
          right.campaign.minimumPurchaseQuantity -
            left.campaign.minimumPurchaseQuantity,
      );

    const promotionItems: CartItem[] = [];
    const claimedProductIds = new Set<string>();

    for (const { campaign, eligibleQuantity } of campaigns) {
      if (!campaign.giftVariantId) {
        continue;
      }

      const eligibleProductIds = campaign.productIds.filter((productId) =>
        items.some((item) => item.productId === productId),
      );
      if (
        eligibleProductIds.some((productId) => claimedProductIds.has(productId))
      ) {
        continue;
      }

      const rawApplications = campaign.repeatable
        ? Math.floor(eligibleQuantity / campaign.minimumPurchaseQuantity)
        : 1;
      const applications = campaign.maxApplications
        ? Math.min(rawApplications, campaign.maxApplications)
        : rawApplications;
      const giftQuantity = campaign.giftQuantity * applications;
      if (giftQuantity < 1) {
        continue;
      }

      const gift = await this.productClientService.validateVariantStock(
        campaign.giftVariantId,
        giftQuantity,
      );
      const unitPrice = Math.max(0, Number(campaign.giftUnitPrice || 0));

      promotionItems.push({
        variantId: gift.variantId,
        productId: gift.productId,
        productName: gift.productName,
        productSlug: gift.productSlug,
        sku: gift.sku,
        thumbnailUrl: gift.thumbnailUrl,
        variantLabel: gift.variantLabel,
        variantSize: gift.variantSize,
        variantColor: gift.variantColor,
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignDiscountType: 'GIFT',
        campaignDiscountValue: 0,
        campaignBadgeText: campaign.badgeText ?? null,
        unitPrice,
        isOnSale: gift.isOnSale,
        quantity: giftQuantity,
        subtotal: unitPrice * giftQuantity,
        isPromotionReward: true,
        sourceCampaignId: campaign.id,
      });
      eligibleProductIds.forEach((productId) =>
        claimedProductIds.add(productId),
      );
    }

    return promotionItems;
  }

  async updateItem(
    userId: string | undefined,
    sessionId: string | undefined,
    variantId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    return this.withCartLock(key, async () => {
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
      item.isOnSale = variant.isOnSale;

      return this.saveCart(key, cart);
    });
  }

  async removeItem(
    userId: string | undefined,
    sessionId: string | undefined,
    variantId: string,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    return this.withCartLock(key, async () => {
      const cart = await this.getRawCart(key);

      cart.items = cart.items.filter((item) => item.variantId !== variantId);

      return this.saveCart(key, cart);
    });
  }

  async clearCart(
    userId: string | undefined,
    sessionId: string | undefined,
    expectedUpdatedAt?: string,
  ): Promise<{ success: boolean; reason?: string }> {
    const key = this.getCartKey(userId, sessionId);
    const cleared = await this.withCartLock(key, async () => {
      if (expectedUpdatedAt) {
        const cart = await this.getRawCart(key);
        if (cart.updatedAt !== expectedUpdatedAt) {
          return false;
        }
      }
      await this.redisService.del(key);
      return true;
    });

    return cleared
      ? { success: true }
      : { success: false, reason: 'cart_changed_after_checkout_snapshot' };
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
    if (!isUuid(sessionId)) {
      throw new BadRequestException('sessionId must be a valid UUID');
    }

    const guestKey = `cart:guest:${sessionId}`;
    const userKey = `cart:${userId}`;
    const [firstKey, secondKey] = [guestKey, userKey].sort();

    return this.withCartLock(firstKey, () =>
      this.withCartLock(secondKey, async () => {
        const guestCart = await this.getRawCart(guestKey);
        const userCart = await this.getRawCart(userKey);

        for (const guestItem of guestCart.items) {
          const existedItem = userCart.items.find(
            (item) => item.variantId === guestItem.variantId,
          );

          if (existedItem) {
            existedItem.quantity += guestItem.quantity;
          } else {
            if (userCart.items.length >= 50) {
              throw new BadRequestException(
                'Giỏ hàng chỉ được chứa tối đa 50 sản phẩm khác nhau.',
              );
            }
            userCart.items.push({
              ...guestItem,
            });
          }
        }

        for (const item of userCart.items) {
          await this.productClientService.validateVariantStock(
            item.variantId,
            item.quantity,
          );
        }

        userCart.ownerKey = userKey;
        await this.redisService.del(guestKey);

        return this.saveCart(userKey, userCart);
      }),
    );
  }

  async validateCart(
    userId: string | undefined,
    sessionId: string | undefined,
  ): Promise<Cart> {
    const key = this.getCartKey(userId, sessionId);
    return this.withCartLock(key, async () => {
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
        item.isOnSale = variant.isOnSale;
      }

      return this.saveCart(key, cart);
    });
  }
}
