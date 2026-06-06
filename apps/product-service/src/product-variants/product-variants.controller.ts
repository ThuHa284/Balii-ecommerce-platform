import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { HeaderRolesGuard } from '../auth/header-roles.guard';

@Controller()
export class ProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @Post('products/:productId/variants')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  create(
    @Param('productId') productId: string,
    @Body() dto: Omit<CreateProductVariantDto, 'productId'>,
  ) {
    return this.variantsService.create({
      ...dto,
      productId,
    });
  }

  @Get('products/:productId/variants')
  findByProduct(@Param('productId') productId: string) {
    return this.variantsService.findByProduct(productId);
  }

  @Get('variants/:id')
  findOne(@Param('id') id: string) {
    return this.variantsService.findOne(id);
  }

  @Patch('variants/:id')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  update(@Param('id') id: string, @Body() dto: UpdateProductVariantDto) {
    return this.variantsService.update(id, dto);
  }

  @Delete('variants/:id')
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}
