import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
    @Headers('x-user-id') actorId?: string,
  ) {
    return this.variantsService.create(
      {
        ...dto,
        productId,
      },
      actorId,
    );
  }

  @Get('products/:productId/variants')
  findByProduct(
    @Param('productId') productId: string,
    @Headers('x-user-role') role?: string,
  ) {
    return this.variantsService.findByProduct(
      productId,
      ['ADMIN', 'SUPER_ADMIN'].includes(role ?? ''),
    );
  }

  @Get('admin/inventory-movements')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  getInventoryMovements(
    @Query('variantId', new ParseUUIDPipe({ optional: true, version: '4' }))
    variantId?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit = 100,
  ) {
    return this.variantsService.getInventoryMovements(variantId, limit);
  }

  @Get('variants/:id')
  findOne(@Param('id') id: string, @Headers('x-user-role') role?: string) {
    return this.variantsService.findOne(
      id,
      ['ADMIN', 'SUPER_ADMIN'].includes(role ?? ''),
    );
  }

  @Patch('variants/:id')
  @UseGuards(new HeaderRolesGuard(['ADMIN', 'SUPER_ADMIN']))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantDto,
    @Headers('x-user-id') actorId?: string,
  ) {
    return this.variantsService.update(id, dto, actorId);
  }

  @Delete('variants/:id')
  @UseGuards(new HeaderRolesGuard(['SUPER_ADMIN']))
  remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}
