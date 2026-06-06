import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductImage } from '../entities/product-image.entity';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadProductImage(productId: string, file: Express.Multer.File) {
    const result = await this.cloudinaryService.uploadProductImage(file);

    const image = this.productImageRepo.create({
      productId,
      url: result.secure_url,
      publicId: result.public_id,
      isPrimary: false,
      sortOrder: 0,
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
}
