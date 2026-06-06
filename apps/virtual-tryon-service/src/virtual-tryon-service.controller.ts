import {
  Body,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateTryOnDto } from './dto/create-tryon.dto';
import { VirtualTryonServiceService } from './virtual-tryon-service.service';
import { Param, Get } from '@nestjs/common';

type UploadedImageFile = {
  mimetype: string;
  buffer: Buffer;
  originalname?: string;
  size?: number;
};

type TryOnUploadFiles = {
  modelImage?: UploadedImageFile[];
  garmentImage?: UploadedImageFile[];
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
  ) {
    return this.virtualTryonService.createTryOn(files, dto);
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
  ) {
    return this.virtualTryonService.createTryOnSync(files, dto);
  }
}
