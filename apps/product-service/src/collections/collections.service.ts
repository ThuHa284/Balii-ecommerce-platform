import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Collection } from '../entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private readonly collectionRepo: Repository<Collection>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  create(dto: CreateCollectionDto) {
    const collection = this.collectionRepo.create({
      ...dto,
      productIds: dto.productIds ?? [],
      isActive: dto.isActive ?? true,
    });

    return this.collectionRepo.save(collection);
  }

  async findAll() {
    const collections = await this.collectionRepo.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return collections.map((collection) =>
      this.toFrontendCollection(collection),
    );
  }

  async findOne(id: string) {
    const collection = await this.collectionRepo.findOne({ where: { id } });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return this.toFrontendCollection(collection);
  }

  async findBySlug(slug: string) {
    const collection = await this.collectionRepo.findOne({
      where: { slug, isActive: true },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return this.toFrontendCollection(collection);
  }

  async update(id: string, dto: UpdateCollectionDto) {
    const collection = await this.collectionRepo.findOne({ where: { id } });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    Object.assign(collection, dto, {
      productIds: dto.productIds ?? collection.productIds ?? [],
      updatedAt: new Date(),
    });

    const saved = await this.collectionRepo.save(collection);
    return this.toFrontendCollection(saved);
  }

  async remove(id: string) {
    const collection = await this.collectionRepo.findOne({ where: { id } });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    await this.collectionRepo.delete(id);

    return {
      success: true,
      message: 'Collection deleted successfully',
    };
  }

  async uploadImage(file: Express.Multer.File, kind: 'cover' | 'banner') {
    const folder =
      kind === 'banner'
        ? process.env.CLOUDINARY_COLLECTION_BANNER_FOLDER ||
          'balii/collections/banners'
        : process.env.CLOUDINARY_COLLECTION_FOLDER || 'balii/collections';

    const uploaded = await this.cloudinaryService.uploadImage(file, folder);

    return {
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
    };
  }

  private toFrontendCollection(collection: Collection) {
    return {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description ?? '',
      shortDescription: collection.shortDescription ?? '',
      image: collection.imageUrl ?? '',
      bannerImage: collection.bannerImageUrl ?? '',
      productIds: collection.productIds ?? [],
      season: collection.season ?? '',
      isActive: collection.isActive ?? true,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }
}
