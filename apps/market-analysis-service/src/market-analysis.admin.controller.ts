import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { HeaderRolesGuard } from './auth/header-roles.guard';
import { SearchByImageDto } from './dto/search-by-image.dto';
import { MarketAnalysisServiceService } from './market-analysis-service.service';
import { SearchByKeywordDto } from './dto/search-by-keyword.dto';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

@Controller('admin/market-analysis')
export class MarketAnalysisAdminController {
  constructor(
    private readonly marketAnalysisService: MarketAnalysisServiceService,
  ) {}

  @Post('search-by-image')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException('Chỉ chấp nhận file JPEG, PNG hoặc WEBP'),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  searchByImage(
    @Body() dto: SearchByImageDto,
    @Req() request: Request,
    @Headers('x-user-id') userId?: string,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.marketAnalysisService.searchSimilarProductsByImage(
      dto,
      {
        request,
        userId,
      },
      image,
    );
  }

  @Post('search-by-keyword')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  searchByKeyword(
    @Body() dto: SearchByKeywordDto,
    @Req() request: Request,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.marketAnalysisService.searchProductsByKeyword(dto, {
      request,
      userId,
    });
  }
}
