/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
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
  thumbnailUrl?: string;
  unitPrice: number;
  stockQuantity: number;
  reservedQuantity: number;
  isActive: boolean;
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
}
