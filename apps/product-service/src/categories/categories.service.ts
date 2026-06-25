import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryWithCount = Category & {
  productCount?: number;
};

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({
      ...dto,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.categoryRepo.save(category);
    return this.toFrontendCategory(saved, 0);
  }

  async findAll() {
    const rows = await this.categoryRepo
      .createQueryBuilder('category')
      .leftJoin(
        Product,
        'product',
        'product.categoryId = category.id AND product.isActive = :isActive',
        { isActive: true },
      )
      .select('category.id', 'id')
      .addSelect('category.parentId', 'parentId')
      .addSelect('category.name', 'name')
      .addSelect('category.slug', 'slug')
      .addSelect('category.imageUrl', 'imageUrl')
      .addSelect('category.sortOrder', 'sortOrder')
      .addSelect('category.isActive', 'isActive')
      .addSelect('COUNT(product.id)', 'productCount')
      .where('category.isActive = :isActive', { isActive: true })
      .groupBy('category.id')
      .addGroupBy('category.parentId')
      .addGroupBy('category.name')
      .addGroupBy('category.slug')
      .addGroupBy('category.imageUrl')
      .addGroupBy('category.sortOrder')
      .addGroupBy('category.isActive')
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getRawMany<{
        id: string;
        parentId: string | null;
        name: string;
        slug: string;
        imageUrl: string | null;
        sortOrder: number | string;
        isActive: boolean;
        productCount: string;
      }>();

    return rows.map((row) =>
      this.toFrontendCategory(
        {
          id: row.id,
          parentId: row.parentId ?? undefined,
          name: row.name,
          slug: row.slug,
          imageUrl: row.imageUrl ?? undefined,
          sortOrder: Number(row.sortOrder ?? 0),
          isActive: row.isActive,
        },
        Number(row.productCount ?? 0),
      ),
    );
  }

  async findOne(id: string) {
    const category = await this.findEntity(id);
    const productCount = await this.getProductCount(category.id);
    return this.toFrontendCategory(category, productCount);
  }

  async findBySlug(slug: string) {
    const category = await this.categoryRepo.findOne({
      where: { slug, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const productCount = await this.getProductCount(category.id);
    return this.toFrontendCategory(category, productCount);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findEntity(id);

    Object.assign(category, dto);

    const saved = await this.categoryRepo.save(category);
    const productCount = await this.getProductCount(saved.id);
    return this.toFrontendCategory(saved, productCount);
  }

  async remove(id: string) {
    const category = await this.findEntity(id);

    category.isActive = false;
    await this.categoryRepo.save(category);

    return {
      success: true,
      message: 'Category disabled successfully',
    };
  }

  private async findEntity(id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async getProductCount(categoryId: string) {
    return this.categoryRepo.manager.count(Product, {
      where: { categoryId, isActive: true },
    });
  }

  private toFrontendCategory(category: CategoryWithCount, productCount = 0) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: '',
      image: category.imageUrl ?? '',
      parentId: category.parentId ?? null,
      children: [],
      productCount: category.productCount ?? productCount,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    };
  }
}
