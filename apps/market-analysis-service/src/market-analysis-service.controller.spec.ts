import { Test, TestingModule } from '@nestjs/testing';
import { MarketAnalysisServiceController } from './market-analysis-service.controller';
import { MarketAnalysisServiceService } from './market-analysis-service.service';
import { beforeEach, describe, it, expect } from '@jest/globals';

describe('MarketAnalysisServiceController', () => {
  let marketAnalysisServiceController: MarketAnalysisServiceController;
  const marketAnalysisService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MarketAnalysisServiceController],
      providers: [
        {
          provide: MarketAnalysisServiceService,
          useValue: marketAnalysisService,
        },
      ],
    }).compile();

    marketAnalysisServiceController = app.get<MarketAnalysisServiceController>(
      MarketAnalysisServiceController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should delegate to market analysis service', async () => {
      const products = [{ id: 'market-1' }];
      marketAnalysisService.findAll.mockResolvedValue(products);

      await expect(marketAnalysisServiceController.findAll()).resolves.toBe(
        products,
      );
      expect(marketAnalysisService.findAll).toHaveBeenCalled();
    });
  });
});
