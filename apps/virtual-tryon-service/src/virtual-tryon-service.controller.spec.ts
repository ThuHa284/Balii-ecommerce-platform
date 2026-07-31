import { Test, TestingModule } from '@nestjs/testing';
import { VirtualTryonServiceController } from './virtual-tryon-service.controller';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';

describe('VirtualTryonServiceController', () => {
  let virtualTryonServiceController: VirtualTryonServiceController;
  const virtualTryonService = {
    createTryOn: jest.fn(),
    saveTryOnResult: jest.fn(),
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
  describe('createTryOn', () => {
    it('allows an anonymous request without forwarding a user id', async () => {
      const result = { success: true, data: { id: 'job-1' } };
      virtualTryonService.createTryOn.mockResolvedValue(result);

      await expect(
        virtualTryonServiceController.createTryOn({}, {}),
      ).resolves.toBe(result);
      expect(virtualTryonService.createTryOn).toHaveBeenCalledWith({}, {});
    });
  });

  describe('saveTryOnResult', () => {
    it('forwards the gateway-verified user id when saving', async () => {
      const result = { id: 'history-1', userId: 'user-1' };
      virtualTryonService.saveTryOnResult.mockResolvedValue(result);

      await expect(
        virtualTryonServiceController.saveTryOnResult('job-1', 'user-1'),
      ).resolves.toBe(result);
      expect(virtualTryonService.saveTryOnResult).toHaveBeenCalledWith(
        'job-1',
        'user-1',
      );
    });
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
