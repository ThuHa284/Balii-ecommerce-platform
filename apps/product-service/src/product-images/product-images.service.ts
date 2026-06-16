import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductImage } from '../entities/product-image.entity';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProductImageDto } from './dto/update-product-image.dto';

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
    dto: UpdateProductImageDto,
  ) {
    if (dto.isPrimary) {
      await this.productImageRepo.update({ productId }, { isPrimary: false });
    }

    const result = await this.cloudinaryService.uploadProductImage(file);

    const image = this.productImageRepo.create({
      productId,
      variantId: dto.variantId || undefined,
      url: result.secure_url,
      publicId: result.public_id,
      altText: dto.altText?.trim() || undefined,
      isPrimary: dto.isPrimary ?? false,
      sortOrder: dto.sortOrder ?? 0,
    });

    return this.productImageRepo.save(image);
  }

  async findByProduct(productId: string) {
    return this.productImageRepo.find({
      where: { productId },
      order: {
        isPrimary: 'DESC',
        sortOrder: 'ASC',
      },
    });
  }

  async deleteImage(id: string) {
    const image = await this.productImageRepo.findOne({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    if (image.publicId) {
      await this.cloudinaryService.deleteImage(image.publicId);
    }

    await this.productImageRepo.delete(id);

    return {
      success: true,
      message: 'Product image deleted successfully',
    };
  }

  async updateImage(id: string, dto: UpdateProductImageDto) {
    const image = await this.productImageRepo.findOne({
      where: { id },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    if (dto.isPrimary) {
      await this.productImageRepo.update(
        { productId: image.productId },
        { isPrimary: false },
      );
    }

    Object.assign(image, {
      variantId:
        dto.variantId === null ? undefined : (dto.variantId ?? image.variantId),
      altText: dto.altText ?? image.altText,
      sortOrder: dto.sortOrder ?? image.sortOrder,
      isPrimary: dto.isPrimary ?? image.isPrimary,
    });

    return this.productImageRepo.save(image);
  }
}
