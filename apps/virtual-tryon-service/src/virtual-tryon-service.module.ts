import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VirtualTryonServiceController } from './virtual-tryon-service.controller';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';
import { PersonAnalysisController } from './analysis/person-analysis.controller';
import { PersonAnalysisService } from './analysis/person-analysis.service';
import { CloudinaryService } from './cloudinary.service';
import { TryonHistory } from './entities/tryon-history.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from 'libs/database/src/database.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([TryonHistory]),
  ],
  controllers: [VirtualTryonServiceController, PersonAnalysisController],
  providers: [
    VirtualTryonServiceService,
    CloudinaryService,
    PersonAnalysisService,
  ],
})
export class VirtualTryonServiceModule {}
