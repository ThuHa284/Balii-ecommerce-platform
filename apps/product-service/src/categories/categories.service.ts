import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from '../entities/category.entity';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Product } from '../entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  create(dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({
      ...dto,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepo.save(category);
  }

  findAll() {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: {
        sortOrder: 'ASC',
        name: 'ASC',
      },
    });
  }

  async findOne(id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.categoryRepo.findOne({
      where: { slug, isActive: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      ...category,
      image: category.imageUrl ?? '',
      children: [],
      productCount: await this.categoryRepo.manager.count(Product, {
        where: { categoryId: category.id, isActive: true },
      }),
      description: '',
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    Object.assign(category, dto);

    return this.categoryRepo.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    category.isActive = false;

    await this.categoryRepo.save(category);

    return {
      success: true,
      message: 'Category disabled successfully',
    };
  }
}
