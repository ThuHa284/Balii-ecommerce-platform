import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadEnv } from '@app/common';
import { VirtualTryonServiceController } from './virtual-tryon-service.controller';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';
import { PersonAnalysisController } from './analysis/person-analysis.controller';
import { PersonAnalysisService } from './analysis/person-analysis.service';
import { CloudinaryService } from './cloudinary.service';

loadEnv();

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
  controllers: [VirtualTryonServiceController, PersonAnalysisController],
  providers: [
    VirtualTryonServiceService,
    CloudinaryService,
    PersonAnalysisService,
  ],
})
export class VirtualTryonServiceModule {}
