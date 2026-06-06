/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductService } from './product-service.service';

@Controller('products')
export class ProductServiceController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  findAll() {}

  @Get(':id')
  findOne() {}

  @Post()
  create() {}

  @Patch(':id')
  update() {}

  @Delete(':id')
  remove() {}

  @Get('variants/:variantId/snapshot')
  getVariantSnapshot(@Param('variantId') variantId: string) {
    return this.productService.getVariantSnapshot(variantId);
  }
}
