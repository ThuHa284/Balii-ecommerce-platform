import { Module } from '@nestjs/common';
import { VirtualTryonServiceController } from './virtual-tryon-service.controller';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';

@Module({
  imports: [],
  controllers: [VirtualTryonServiceController],
  providers: [VirtualTryonServiceService],
})
export class VirtualTryonServiceModule {}
