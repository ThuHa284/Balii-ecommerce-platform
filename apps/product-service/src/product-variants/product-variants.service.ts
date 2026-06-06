import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariant } from '../entities/product-variant.entity';
import { Repository } from 'typeorm';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  create(dto: CreateProductVariantDto) {
    const variant = this.variantRepo.create({
      ...dto,
      reservedQuantity: dto.reservedQuantity ?? 0,
      isActive: dto.isActive ?? true,
      itemType: dto.itemType ?? 'TOP',
      esSyncStatus: false,
    });

    return this.variantRepo.save(variant);
  }

  findByProduct(productId: string) {
    return this.variantRepo.find({
      where: { productId },
      order: {
        sku: 'ASC',
      },
    });
  }

  async findOne(id: string) {
    const variant = await this.variantRepo.findOne({
      where: { id },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  async update(id: string, dto: UpdateProductVariantDto) {
    const variant = await this.findOne(id);

    Object.assign(variant, dto, {
      esSyncStatus: false,
    });

    return this.variantRepo.save(variant);
  }

  async remove(id: string) {
    const variant = await this.findOne(id);

    variant.isActive = false;

    await this.variantRepo.save(variant);

    return {
      success: true,
      message: 'Product variant disabled successfully',
    };
  }
}
