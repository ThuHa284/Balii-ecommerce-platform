import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductImage } from '../entities/product-image.entity';
import { DataSource, Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ProductVariant } from '../entities/product-variant.entity';

@Injectable()
export class ProductImagesService {
  private readonly logger = new Logger(ProductImagesService.name);

  constructor(
    @InjectRepository(ProductImage)
    private readonly productImageRepo: Repository<ProductImage>,

    private readonly cloudinaryService: CloudinaryService,
    private readonly dataSource: DataSource,
  ) {}

  async uploadProductImage(
    productId: string,
    file: Express.Multer.File,
    dto: UpdateProductImageDto,
  ) {
    const result = await this.cloudinaryService.uploadProductImage(file);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(ProductImage);
        await this.assertVariantBelongsToProduct(
          manager,
          productId,
          dto.variantId,
        );
        if (dto.isPrimary) {
          await repository.update({ productId }, { isPrimary: false });
        }

        const image = repository.create({
          productId,
          variantId: dto.variantId || undefined,
          url: result.secure_url,
          publicId: result.public_id,
          altText: dto.altText?.trim() || undefined,
          isPrimary: dto.isPrimary ?? false,
          sortOrder: dto.sortOrder ?? 0,
        });

        const saved = await repository.save(image);
        await this.cloudinaryService.syncOwnerAssets(
          'product_image',
          String(saved.id),
          [saved.url],
        );
        return saved;
      });
    } catch (error) {
      await this.cloudinaryService.deleteImage(result.public_id);
      throw error;
    }
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

    await this.productImageRepo.delete(id);

    if (image.publicId) {
      try {
        await this.cloudinaryService.deleteImage(image.publicId);
      } catch (error) {
        this.logger.warn(
          `Ảnh ${image.publicId} đã xóa khỏi DB nhưng chưa xóa được trên Cloudinary: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    return {
      success: true,
      message: 'Product image deleted successfully',
    };
  }

  async updateImage(id: string, dto: UpdateProductImageDto) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProductImage);
      const image = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!image) {
        throw new NotFoundException('Product image not found');
      }

      await this.assertVariantBelongsToProduct(
        manager,
        String(image.productId),
        dto.variantId,
      );
      if (dto.isPrimary) {
        await repository.update(
          { productId: image.productId },
          { isPrimary: false },
        );
      }

      Object.assign(image, {
        variantId:
          dto.variantId === null
            ? undefined
            : (dto.variantId ?? image.variantId),
        altText: dto.altText ?? image.altText,
        sortOrder: dto.sortOrder ?? image.sortOrder,
        isPrimary: dto.isPrimary ?? image.isPrimary,
      });
      return repository.save(image);
    });
  }

  private async assertVariantBelongsToProduct(
    manager: import('typeorm').EntityManager,
    productId: string,
    variantId?: string | null,
  ) {
    if (!variantId) {
      return;
    }
    const variant = await manager.findOne(ProductVariant, {
      where: { id: variantId, productId },
    });
    if (!variant) {
      throw new BadRequestException(
        'Biến thể ảnh phải thuộc đúng sản phẩm đang được cập nhật.',
      );
    }
  }
}
