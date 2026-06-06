import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VirtualTryonServiceController } from './virtual-tryon-service.controller';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';
import { MinioService } from './minio.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [VirtualTryonServiceController],
  providers: [VirtualTryonServiceService, MinioService],
})
export class VirtualTryonServiceModule {}
