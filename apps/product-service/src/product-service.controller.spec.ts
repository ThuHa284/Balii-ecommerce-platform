import { Test, TestingModule } from '@nestjs/testing';
import { ProductServiceController } from './product-service.controller';
import { ProductService } from './product-service.service';

describe('ProductServiceController', () => {
  let productServiceController: ProductServiceController;
  const productService = {
    getVariantSnapshot: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ProductServiceController],
      providers: [
        {
          provide: ProductService,
          useValue: productService,
        },
      ],
    }).compile();

    productServiceController = app.get<ProductServiceController>(
      ProductServiceController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVariantSnapshot', () => {
    it('should delegate to product service', async () => {
      const snapshot = { variantId: 'variant-1' };
      productService.getVariantSnapshot.mockResolvedValue(snapshot);

      await expect(
        productServiceController.getVariantSnapshot('variant-1'),
      ).resolves.toBe(snapshot);
      expect(productService.getVariantSnapshot).toHaveBeenCalledWith(
        'variant-1',
      );
    });
  });
});
