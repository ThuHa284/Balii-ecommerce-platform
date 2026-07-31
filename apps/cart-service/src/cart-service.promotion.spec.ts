import { RedisService } from '@app/redis';
import { CartService } from './cart-service.service';
import { ProductClientService } from './clients/product-client.service';
import { CartItem } from './types/cart.types';
import { DataSource } from 'typeorm';

describe('CartService gift campaigns', () => {
  const giftSnapshot = (variantId: string) => ({
    variantId,
    productId: `gift-product-${variantId}`,
    productName: `Gift ${variantId}`,
    productSlug: `gift-${variantId}`,
    sku: `SKU-${variantId}`,
    variantLabel: 'Free size',
    unitPrice: 0,
    stockQuantity: 100,
    reservedQuantity: 0,
    isActive: true,
  });

  const item = (productId: string, quantity: number): CartItem => ({
    variantId: `variant-${productId}`,
    productId,
    productName: productId,
    sku: `SKU-${productId}`,
    unitPrice: 100000,
    quantity,
    subtotal: 100000 * quantity,
  });

  function createService(campaigns: Array<Record<string, unknown>>) {
    const productClient = {
      getActiveCampaigns: jest.fn().mockResolvedValue(campaigns),
      validateVariantStock: jest
        .fn()
        .mockImplementation((variantId: string) =>
          Promise.resolve(giftSnapshot(variantId)),
        ),
    };
    const service = new CartService(
      {} as RedisService,
      productClient as unknown as ProductClientService,
      {} as DataSource,
    );
    return {
      productClient,
      promotionService: service as unknown as {
        buildPromotionItems(items: CartItem[]): Promise<CartItem[]>;
      },
    };
  }

  it('applies independent campaigns to disjoint product groups', async () => {
    const { promotionService } = createService([
      {
        id: 'campaign-a',
        name: 'Mua 2 tặng 1',
        productIds: ['product-a'],
        discountType: 'GIFT',
        priorityOrder: 10,
        minimumPurchaseQuantity: 2,
        giftVariantId: 'gift-a',
        giftQuantity: 1,
        giftUnitPrice: 0,
        repeatable: true,
        maxApplications: null,
      },
      {
        id: 'campaign-b',
        name: 'Mua 3 tặng 2',
        productIds: ['product-b'],
        discountType: 'GIFT',
        priorityOrder: 5,
        minimumPurchaseQuantity: 3,
        giftVariantId: 'gift-b',
        giftQuantity: 2,
        giftUnitPrice: 0,
        repeatable: true,
        maxApplications: null,
      },
    ]);

    const rewards = await promotionService.buildPromotionItems([
      item('product-a', 2),
      item('product-b', 3),
    ]);

    expect(rewards).toHaveLength(2);
    expect(rewards.map((reward) => reward.quantity)).toEqual([1, 2]);
  });

  it('repeats gifts by quantity multiples and respects maxApplications', async () => {
    const { promotionService, productClient } = createService([
      {
        id: 'campaign-repeat',
        name: 'Mua 2 tặng 1 tối đa 2 lần',
        productIds: ['product-a'],
        discountType: 'GIFT',
        priorityOrder: 10,
        minimumPurchaseQuantity: 2,
        giftVariantId: 'gift-a',
        giftQuantity: 1,
        giftUnitPrice: 0,
        repeatable: true,
        maxApplications: 2,
      },
    ]);

    const rewards = await promotionService.buildPromotionItems([
      item('product-a', 8),
    ]);

    expect(rewards[0].quantity).toBe(2);
    expect(productClient.validateVariantStock).toHaveBeenCalledWith(
      'gift-a',
      2,
    );
  });

  it('does not stack a gift campaign with sale items unless enabled', async () => {
    const campaign = {
      id: 'campaign-sale',
      name: 'Mua 2 tặng 1',
      productIds: ['product-a'],
      discountType: 'GIFT',
      priorityOrder: 10,
      minimumPurchaseQuantity: 2,
      giftVariantId: 'gift-a',
      giftQuantity: 1,
      giftUnitPrice: 0,
      repeatable: true,
      maxApplications: null,
      stackableWithSale: false,
    };
    const saleItem = { ...item('product-a', 2), isOnSale: true };
    const disabled = createService([campaign]);

    await expect(
      disabled.promotionService.buildPromotionItems([saleItem]),
    ).resolves.toEqual([]);

    const enabled = createService([{ ...campaign, stackableWithSale: true }]);
    const rewards = await enabled.promotionService.buildPromotionItems([
      saleItem,
    ]);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].quantity).toBe(1);
  });
});
