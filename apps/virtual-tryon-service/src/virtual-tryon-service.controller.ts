import {
  Body,
  Controller,
  Post,
  Headers,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateTryOnDto } from './dto/create-tryon.dto';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';
import { Param, Get } from '@nestjs/common';

type TryOnUploadFiles = {
  modelImage?: Express.Multer.File[];
  garmentImage?: Express.Multer.File[];
};

@Controller('try-on')
export class VirtualTryonServiceController {
  constructor(
    private readonly virtualTryonService: VirtualTryonServiceService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'modelImage', maxCount: 1 },
        { name: 'garmentImage', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 8 * 1024 * 1024,
        },
      },
    ),
  )
  createTryOn(
    @UploadedFiles() files: TryOnUploadFiles,
    @Body() dto: CreateTryOnDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.virtualTryonService.createTryOn(files, dto, userId);
  }

  @Get('history')
  getHistory(@Headers('x-user-id') userId?: string) {
    return this.virtualTryonService.getHistory(userId);
  }

  @Get('history/:id')
  getHistoryDetail(
    @Param('id') id: string,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.virtualTryonService.getHistoryDetail(id, userId);
  }

  @Get('stats')
  getStats(@Headers('x-user-id') userId?: string) {
    return this.virtualTryonService.getStats(userId);
  }

  @Get(':id')
  getTryOnResult(@Param('id') id: string) {
    return this.virtualTryonService.getTryOnResult(id);
  }

  @Post('sync')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'modelImage', maxCount: 1 },
        { name: 'garmentImage', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 8 * 1024 * 1024,
        },
      },
    ),
  )
  createTryOnSync(
    @UploadedFiles() files: TryOnUploadFiles,
    @Body() dto: CreateTryOnDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.virtualTryonService.createTryOnSync(files, dto, userId);
  }
}
