import { Test, TestingModule } from '@nestjs/testing';
import { VirtualTryonServiceController } from './virtual-tryon-service.controller';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';

describe('VirtualTryonServiceController', () => {
  let virtualTryonServiceController: VirtualTryonServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VirtualTryonServiceController],
      providers: [VirtualTryonServiceService],
    }).compile();

    virtualTryonServiceController = app.get<VirtualTryonServiceController>(VirtualTryonServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(virtualTryonServiceController.getHello()).toBe('Hello World!');
    });
  });
});
