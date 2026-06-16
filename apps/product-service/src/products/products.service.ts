/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateProductDto) {
    const product = this.productRepo.create({
      ...dto,
      isActive: dto.isActive ?? true,
      esSyncStatus: false,
    });

    return this.productRepo.save(product);
  }

  findAll(keyword?: string) {
    return this.getProductsForFrontend(keyword);
  }

  async findOne(id: string) {
    const product = await this.productRepo.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string) {
    const products = await this.getProductsForFrontend(slug, true);
    const product = products.find((item) => item.slug === slug);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    Object.assign(product, dto, {
      esSyncStatus: false,
      updatedAt: new Date(),
    });

    return this.productRepo.save(product);
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    product.isActive = false;
    product.updatedAt = new Date();

    await this.productRepo.save(product);

    return {
      success: true,
      message: 'Product disabled successfully',
    };
  }

  async getVariantSnapshot(variantId: string) {
    const result = await this.dataSource.query(
      `
    SELECT
      pv.id AS "variantId",
      p.id AS "productId",
      p.name AS "productName",
      p.slug AS "productSlug",
      pv.sku AS "sku",
      COALESCE(pv.price, p.base_price) AS "unitPrice",
      pv.stock_quantity AS "stockQuantity",
      pv.reserved_quantity AS "reservedQuantity",
      pv.is_active AS "variantActive",
      p.is_active AS "productActive",
      pi.url AS "thumbnailUrl",
      STRING_AGG(av.value, ' / ' ORDER BY a.name) AS "variantLabel"
    FROM product_service.product_variants pv
    JOIN product_service.products p ON p.id = pv.product_id
    LEFT JOIN product_service.product_images pi
      ON pi.variant_id = pv.id AND pi.is_primary = TRUE
    LEFT JOIN product_service.variant_attribute_values vav
      ON vav.variant_id = pv.id
    LEFT JOIN product_service.attribute_values av
      ON av.id = vav.attribute_value_id
    LEFT JOIN product_service.attributes a
      ON a.id = av.attribute_id
    WHERE pv.id = $1
    GROUP BY pv.id, p.id, p.name, pv.sku, pv.price, p.base_price,
             pv.stock_quantity, pv.reserved_quantity,
             pv.is_active, p.is_active, pi.url
    `,
      [variantId],
    );

    if (!result.length) {
      throw new NotFoundException('Product variant not found');
    }

    const row = result[0];

    return {
      variantId: row.variantId,
      productId: row.productId,
      productName: row.productName,
      productSlug: row.productSlug,
      sku: row.sku,
      variantLabel: row.variantLabel || '',
      thumbnailUrl: row.thumbnailUrl || '',
      unitPrice: Number(row.unitPrice),
      stockQuantity: Number(row.stockQuantity),
      reservedQuantity: Number(row.reservedQuantity || 0),
      isActive: row.variantActive === true && row.productActive === true,
    };
  }

  private async getProductsForFrontend(keyword?: string, exactSlug = false) {
    const queryParams: string[] = [];
    let whereClause = 'WHERE p.is_active = TRUE';

    if (keyword) {
      queryParams.push(
        exactSlug ? keyword : `%${keyword}%`,
        exactSlug ? keyword : `%${keyword}%`,
      );
      whereClause += exactSlug
        ? ' AND (p.slug = $1 OR p.name = $2)'
        : ' AND (p.name ILIKE $1 OR p.slug ILIKE $2)';
    }

    const result = await this.dataSource.query(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        COALESCE(p.description, '') AS description,
        COALESCE(p.description, '') AS "shortDescription",
        p.base_price AS "basePrice",
        p.original_price AS "originalPrice",
        p.sale_price AS "salePrice",
        p.target_gender AS "targetGender",
        p.recommended_age_groups AS "recommendedAgeGroups",
        p.category_id AS "categoryId",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        c.id AS "category_id_ref",
        c.name AS "categoryName",
        c.slug AS "categorySlug",
        c.image_url AS "categoryImage",
        (
          SELECT COUNT(*)
          FROM product_service.products cp
          WHERE cp.category_id = c.id AND cp.is_active = TRUE
        ) AS "categoryProductCount",
        COALESCE(
          (
            SELECT json_agg(img.url ORDER BY img.sort_order ASC)
            FROM product_service.product_images img
            WHERE img.product_id = p.id
          ),
          '[]'::json
        ) AS images,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pv.id,
                'productId', pv.product_id,
                'size', COALESCE(pv.size_label, ''),
                'color', COALESCE(pv.color_name, ''),
                'colorCode', '',
                'sku', pv.sku,
                'price', COALESCE(pv.price, p.base_price),
                'salePrice', p.sale_price,
                'stock', pv.stock_quantity,
                'images', COALESCE(
                  (
                    SELECT json_agg(vi.url ORDER BY vi.sort_order ASC)
                    FROM product_service.product_images vi
                    WHERE vi.variant_id = pv.id
                  ),
                  '[]'::json
                )
              )
            )
            FROM product_service.product_variants pv
            WHERE pv.product_id = p.id AND pv.is_active = TRUE
          ),
          '[]'::json
        ) AS variants,
        COALESCE(
          (
            SELECT img.url
            FROM product_service.product_images img
            WHERE img.product_id = p.id
            ORDER BY img.is_primary DESC, img.sort_order ASC
            LIMIT 1
          ),
          ''
        ) AS thumbnail
      FROM product_service.products p
      LEFT JOIN product_service.categories c ON c.id = p.category_id
      ${whereClause}
      ORDER BY p.created_at DESC
      `,
      queryParams,
    );

    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      shortDescription: row.shortDescription,
      basePrice: Number(row.basePrice ?? 0),
      salePrice: row.salePrice != null ? Number(row.salePrice) : null,
      targetGender: row.targetGender ?? 'female',
      recommendedAgeGroups: row.recommendedAgeGroups ?? [],
      categoryId: row.categoryId,
      category: row.category_id_ref
        ? {
            id: row.category_id_ref,
            name: row.categoryName,
            slug: row.categorySlug,
            description: '',
            image: row.categoryImage ?? '',
            parentId: null,
            children: [],
            productCount: Number(row.categoryProductCount ?? 0),
          }
        : null,
      images: row.images ?? [],
      thumbnail: row.thumbnail ?? '',
      variants: (row.variants ?? []).map((variant: any) => ({
        ...variant,
        price: Number(variant.price ?? 0),
        salePrice: variant.salePrice != null ? Number(variant.salePrice) : null,
        stock: Number(variant.stock ?? 0),
      })),
      reviews: [],
      averageRating: 0,
      totalReviews: 0,
      isFeatured: false,
      isNew: false,
      tags: [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async recommendProducts(gender?: string, ageGroup?: string) {
    const params: string[] = [];
    let whereClause = 'WHERE p.is_active = TRUE';
    const normalizedGender = gender?.trim().toLowerCase();
    const normalizedAgeGroup = ageGroup?.trim();

    if (normalizedGender) {
      params.push(normalizedGender);
      whereClause += ` AND (p.target_gender = $${params.length} OR p.target_gender = 'unisex')`;
    }

    if (normalizedAgeGroup) {
      params.push(normalizedAgeGroup);
      whereClause += ` AND $${params.length} = ANY(p.recommended_age_groups)`;
    }

    const result = await this.dataSource.query(
      `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.base_price AS "basePrice",
      p.original_price AS "originalPrice",
      p.sale_price AS "salePrice",
      p.target_gender AS "targetGender",
      p.recommended_age_groups AS "recommendedAgeGroups",
      COALESCE(
        (
          SELECT img.url
          FROM product_service.product_images img
          WHERE img.product_id = p.id
          ORDER BY img.is_primary DESC, img.sort_order ASC
          LIMIT 1
        ),
        ''
      ) AS thumbnail
    FROM product_service.products p
    ${whereClause}
    ORDER BY p.created_at DESC
    `,
      params,
    );

    return {
      success: true,
      data: result.map((row: any) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description ?? '',
        basePrice: Number(row.basePrice ?? 0),
        originalPrice:
          row.originalPrice != null ? Number(row.originalPrice) : null,
        salePrice: row.salePrice != null ? Number(row.salePrice) : null,
        targetGender: row.targetGender,
        recommendedAgeGroups: row.recommendedAgeGroups ?? [],
        thumbnail: row.thumbnail ?? '',
      })),
    };
  }
}
