import { Injectable, BadGatewayException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

type CheckoutCartItem = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug?: string;
  sku: string;
  thumbnailUrl?: string;
  variantLabel: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

export type CheckoutCart = {
  ownerKey: string;
  items: CheckoutCartItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  updatedAt: string;
};

@Injectable()
export class CartClientService {
  private readonly cartServiceUrl =
    process.env.CART_SERVICE_URL || 'http://localhost:3003';

  constructor(private readonly httpService: HttpService) {}

  async getCheckoutCart(userId: string, sessionId?: string): Promise<CheckoutCart> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<CheckoutCart>(
          `${this.cartServiceUrl}/cart/internal/checkout`,
          {
            headers: {
              'x-user-id': userId,
              ...(sessionId ? { 'x-session-id': sessionId } : {}),
            },
          },
        ),
      );

      return response.data;
    } catch {
      throw new BadGatewayException('Unable to fetch checkout cart');
    }
  }

  async clearCart(userId: string, sessionId?: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.cartServiceUrl}/cart`, {
          headers: {
            'x-user-id': userId,
            ...(sessionId ? { 'x-session-id': sessionId } : {}),
          },
        }),
      );
    } catch {
      throw new BadGatewayException('Unable to clear cart after order creation');
    }
  }
}
