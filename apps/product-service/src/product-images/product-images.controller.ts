import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductImagesService } from './product-images.service';
import { HeaderRolesGuard } from '../auth/header-roles.guard';

@Controller('products')
export class ProductImagesController {
  constructor(private readonly productImagesService: ProductImagesService) {}

  @Post(':productId/images')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  @UseInterceptors(FileInterceptor('file'))
  uploadProductImage(
    @Param('productId') productId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productImagesService.uploadProductImage(productId, file);
  }

  @Get(':productId/images')
  findByProduct(@Param('productId') productId: string) {
    return this.productImagesService.findByProduct(productId);
  }

  @Delete('images/:id')
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  deleteImage(@Param('id') id: string) {
    return this.productImagesService.deleteImage(id);
  }
}
