import { Test, TestingModule } from '@nestjs/testing';
import { MarketAnalysisServiceController } from './market-analysis-service.controller';
import { MarketAnalysisServiceService } from './market-analysis-service.service';
import { beforeEach, describe, it, expect } from '@jest/globals';

describe('MarketAnalysisServiceController', () => {
  let marketAnalysisServiceController: MarketAnalysisServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [MarketAnalysisServiceController],
      providers: [MarketAnalysisServiceService],
    }).compile();

    marketAnalysisServiceController = app.get<MarketAnalysisServiceController>(
      MarketAnalysisServiceController,
    );
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(marketAnalysisServiceController.getHello()).toBe('Hello World!');
    });
  });
});
