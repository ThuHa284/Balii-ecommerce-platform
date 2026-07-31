import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ProductVariantSnapshot {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  variantLabel: string;
  variantSize?: string;
  variantColor?: string;
  thumbnailUrl?: string;
  campaignId?: string | null;
  campaignName?: string | null;
  campaignDiscountType?: 'PERCENT' | 'AMOUNT' | 'GIFT' | null;
  campaignDiscountValue?: number | null;
  campaignBadgeText?: string | null;
  unitPrice: number;
  regularUnitPrice: number;
  isOnSale: boolean;
  stockQuantity: number;
  reservedQuantity: number;
  isActive: boolean;
}

export interface ActiveCampaign {
  id: string;
  name: string;
  productIds: string[];
  discountType: 'PERCENT' | 'AMOUNT' | 'GIFT';
  badgeText?: string;
  priorityOrder: number;
  minimumPurchaseQuantity: number;
  giftVariantId?: string | null;
  giftQuantity: number;
  giftUnitPrice: number;
  repeatable: boolean;
  maxApplications?: number | null;
  stackableWithSale: boolean;
}

@Injectable()
export class ProductClientService {
  private readonly productServiceUrl =
    process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

  constructor(private readonly httpService: HttpService) {}

  async getVariantSnapshot(variantId: string): Promise<ProductVariantSnapshot> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<ProductVariantSnapshot>(
          `${this.productServiceUrl}/products/variants/${variantId}/snapshot`,
          { headers: this.internalHeaders() },
        ),
      );

      return res.data;
    } catch {
      throw new BadRequestException('Product variant not found');
    }
  }

  async validateVariantStock(variantId: string, quantity: number) {
    const variant = await this.getVariantSnapshot(variantId);

    if (!variant.isActive) {
      throw new BadRequestException('Product variant is inactive');
    }

    const availableStock = variant.stockQuantity - variant.reservedQuantity;

    if (quantity > availableStock) {
      throw new BadRequestException(
        `Not enough stock. Available: ${availableStock}`,
      );
    }

    return variant;
  }

  async getActiveCampaigns(): Promise<ActiveCampaign[]> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<ActiveCampaign[]>(
          `${this.productServiceUrl}/campaigns/active`,
          { headers: this.internalHeaders() },
        ),
      );

      return res.data;
    } catch {
      throw new BadRequestException('Unable to load active campaigns');
    }
  }

  private internalHeaders() {
    return {
      'x-internal-service-key':
        process.env.INTERNAL_SERVICE_SECRET ||
        (process.env.NODE_ENV === 'production' ? '' : 'balii-local-internal'),
    };
  }
}
