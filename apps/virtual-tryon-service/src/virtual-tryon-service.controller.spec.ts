import { Test, TestingModule } from '@nestjs/testing';
import { VirtualTryonServiceController } from './virtual-tryon-service.controller';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';

describe('VirtualTryonServiceController', () => {
  let virtualTryonServiceController: VirtualTryonServiceController;
  const virtualTryonService = {
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [VirtualTryonServiceController],
      providers: [
        {
          provide: VirtualTryonServiceService,
          useValue: virtualTryonService,
        },
      ],
    }).compile();

    virtualTryonServiceController = app.get<VirtualTryonServiceController>(
      VirtualTryonServiceController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should delegate to virtual try-on service', async () => {
      const stats = { total: 1, completed: 1, failed: 0, needConfirmation: 0 };
      virtualTryonService.getStats.mockResolvedValue(stats);

      await expect(
        virtualTryonServiceController.getStats('user-1'),
      ).resolves.toBe(stats);
      expect(virtualTryonService.getStats).toHaveBeenCalledWith('user-1');
    });
  });
});
