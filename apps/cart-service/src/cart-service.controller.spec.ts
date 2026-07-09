import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart-service.controller';
import { CartService } from './cart-service.service';

describe('CartController', () => {
  let cartServiceController: CartController;
  const cartService = {
    getCart: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: cartService,
        },
      ],
    }).compile();

    cartServiceController = app.get<CartController>(CartController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should delegate to cart service', async () => {
      const cart = { items: [], totalAmount: 0 };
      cartService.getCart.mockResolvedValue(cart);

      await expect(
        cartServiceController.getCart('user-1', undefined),
      ).resolves.toBe(cart);
      expect(cartService.getCart).toHaveBeenCalledWith('user-1', undefined);
    });
  });
});
