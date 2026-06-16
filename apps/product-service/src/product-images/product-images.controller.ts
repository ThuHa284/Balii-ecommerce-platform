import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductImagesService } from './product-images.service';
import { HeaderRolesGuard } from '../auth/header-roles.guard';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@Controller('products')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post(':productId/images')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  @UseInterceptors(FileInterceptor('file'))
  uploadProductImage(
    @Param('productId') productId: string,
    @Body() dto: UpdateProductImageDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productImagesService.uploadProductImage(productId, file, dto);
  }

  @Get(':productId/images')
  findByProduct(@Param('productId') productId: string) {
    return this.productImagesService.findByProduct(productId);
  }

  @Patch('images/:id')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  updateImage(@Param('id') id: string, @Body() dto: UpdateProductImageDto) {
    return this.productImagesService.updateImage(id, dto);
  }

  @Delete('images/:id')
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  deleteImage(@Param('id') id: string) {
    return this.productImagesService.deleteImage(id);
  }
}
