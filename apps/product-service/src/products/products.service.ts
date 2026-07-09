/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly activeSalePriceSql = `
    CASE
      WHEN p.sale_price IS NOT NULL
        AND (p.sale_start_at IS NULL OR p.sale_start_at <= NOW())
        AND (p.sale_end_at IS NULL OR p.sale_end_at >= NOW())
      THEN p.sale_price
      ELSE NULL
    END
  `;

  private readonly activeCampaignJoinSql = `
    LEFT JOIN LATERAL (
      SELECT
        c.id,
        c.name,
        c.slug,
        c.discount_type,
        c.discount_value,
        c.gift_name,
        c.gift_description,
        c.badge_text,
        c.priority_order,
        c.start_at,
        c.end_at
      FROM product_service.campaigns c
      WHERE c.is_active = TRUE
        AND p.id = ANY(c.product_ids)
        AND c.start_at <= NOW()
        AND c.end_at >= NOW()
      ORDER BY c.priority_order DESC, c.start_at ASC, c.created_at DESC
      LIMIT 1
    ) ac ON TRUE
  `;

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  private buildCampaignAdjustedPriceSql(basePriceSql: string) {
    return `
      CASE
        WHEN ac.id IS NULL THEN ${basePriceSql}
        WHEN ac.discount_type = 'PERCENT'
          THEN ROUND(GREATEST(${basePriceSql} * (1 - COALESCE(ac.discount_value, 0) / 100.0), 0), 2)
        WHEN ac.discount_type = 'AMOUNT'
          THEN ROUND(GREATEST(${basePriceSql} - COALESCE(ac.discount_value, 0), 0), 2)
        ELSE ${basePriceSql}
      END
    `;
  }

  create(dto: CreateProductDto) {
    this.validateSaleWindow(dto);

    const product = this.productRepo.create({
      ...dto,
      saleStartAt: dto.saleStartAt ? new Date(dto.saleStartAt) : null,
      saleEndAt: dto.saleEndAt ? new Date(dto.saleEndAt) : null,
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
    const saleWindow = {
      salePrice:
        dto.salePrice !== undefined
          ? dto.salePrice
          : (product.salePrice ?? null),
      saleStartAt:
        dto.saleStartAt !== undefined
          ? dto.saleStartAt
          : (product.saleStartAt?.toISOString() ?? null),
      saleEndAt:
        dto.saleEndAt !== undefined
          ? dto.saleEndAt
          : (product.saleEndAt?.toISOString() ?? null),
    };

    this.validateSaleWindow(saleWindow);

    Object.assign(product, dto, {
      saleStartAt:
        dto.saleStartAt !== undefined
          ? dto.saleStartAt
            ? new Date(dto.saleStartAt)
            : null
          : product.saleStartAt,
      saleEndAt:
        dto.saleEndAt !== undefined
          ? dto.saleEndAt
            ? new Date(dto.saleEndAt)
            : null
          : product.saleEndAt,
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
    const variantBasePriceSql = `COALESCE(${this.activeSalePriceSql}, pv.price, p.base_price)`;
    const variantEffectivePriceSql =
      this.buildCampaignAdjustedPriceSql(variantBasePriceSql);

    const result = await this.dataSource.query(
      `
    SELECT
      pv.id AS "variantId",
      p.id AS "productId",
      p.name AS "productName",
      p.slug AS "productSlug",
      pv.sku AS "sku",
      COALESCE(pv.size_label, '') AS "variantSize",
      COALESCE(pv.color_name, '') AS "variantColor",
      ${variantEffectivePriceSql} AS "unitPrice",
      pv.stock_quantity AS "stockQuantity",
      pv.reserved_quantity AS "reservedQuantity",
      pv.is_active AS "variantActive",
      p.is_active AS "productActive",
      ac.id AS "campaignId",
      ac.name AS "campaignName",
      ac.discount_type AS "campaignDiscountType",
      ac.discount_value AS "campaignDiscountValue",
      ac.badge_text AS "campaignBadgeText",
      COALESCE(
        (
          SELECT img.url
          FROM product_service.product_images img
          WHERE img.variant_id = pv.id
          ORDER BY img.is_primary DESC, img.sort_order ASC
          LIMIT 1
        ),
        (
          SELECT img.url
          FROM product_service.product_images img
          JOIN product_service.product_variants linked_variant
            ON linked_variant.id = img.variant_id
          WHERE linked_variant.product_id = p.id
            AND COALESCE(linked_variant.color_name, '') = COALESCE(pv.color_name, '')
          ORDER BY img.is_primary DESC, img.sort_order ASC
          LIMIT 1
        ),
        (
          SELECT img.url
          FROM product_service.product_images img
          WHERE img.product_id = p.id
          ORDER BY img.is_primary DESC, img.sort_order ASC
          LIMIT 1
        ),
        ''
      ) AS "thumbnailUrl",
      STRING_AGG(av.value, ' / ' ORDER BY a.name) AS "variantLabel"
    FROM product_service.product_variants pv
    JOIN product_service.products p ON p.id = pv.product_id
    ${this.activeCampaignJoinSql}
    LEFT JOIN product_service.variant_attribute_values vav
      ON vav.variant_id = pv.id
    LEFT JOIN product_service.attribute_values av
      ON av.id = vav.attribute_value_id
    LEFT JOIN product_service.attributes a
      ON a.id = av.attribute_id
    WHERE pv.id = $1
    GROUP BY pv.id, p.id, p.name, p.slug, pv.sku, pv.price, p.sale_price, p.sale_start_at, p.sale_end_at, p.base_price,
             pv.stock_quantity, pv.reserved_quantity,
             pv.is_active, p.is_active, ac.id, ac.name, ac.discount_type, ac.discount_value, ac.badge_text
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
      variantSize: row.variantSize || '',
      variantColor: row.variantColor || '',
      thumbnailUrl: row.thumbnailUrl || '',
      unitPrice: Number(row.unitPrice),
      campaignId: row.campaignId ?? null,
      campaignName: row.campaignName ?? null,
      campaignDiscountType: row.campaignDiscountType ?? null,
      campaignDiscountValue:
        row.campaignDiscountValue != null
          ? Number(row.campaignDiscountValue)
          : null,
      campaignBadgeText: row.campaignBadgeText ?? null,
      stockQuantity: Number(row.stockQuantity),
      reservedQuantity: Number(row.reservedQuantity || 0),
      isActive: row.variantActive === true && row.productActive === true,
    };
  }

  private async getProductsForFrontend(keyword?: string, exactSlug = false) {
    const effectiveProductPriceSql = this.buildCampaignAdjustedPriceSql(
      `COALESCE(${this.activeSalePriceSql}, p.base_price)`,
    );
    const effectiveVariantPriceSql = this.buildCampaignAdjustedPriceSql(
      `COALESCE(${this.activeSalePriceSql}, pv.price, p.base_price)`,
    );

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
        ${effectiveProductPriceSql} AS "salePrice",
        p.sale_price AS "scheduledSalePrice",
        p.sale_start_at AS "saleStartAt",
        p.sale_end_at AS "saleEndAt",
        CASE
          WHEN ${effectiveProductPriceSql} < p.base_price THEN TRUE
          ELSE FALSE
        END AS "isSaleActive",
        ac.id AS "campaignId",
        ac.name AS "campaignName",
        ac.slug AS "campaignSlug",
        ac.discount_type AS "campaignDiscountType",
        ac.discount_value AS "campaignDiscountValue",
        ac.gift_name AS "campaignGiftName",
        ac.gift_description AS "campaignGiftDescription",
        ac.badge_text AS "campaignBadgeText",
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
                'salePrice', ${effectiveVariantPriceSql},
                'stock', pv.stock_quantity,
                'images', COALESCE(
                  (
                    SELECT json_agg(vi.url ORDER BY vi.sort_order ASC)
                    FROM product_service.product_images vi
                    JOIN product_service.product_variants linked_variant
                      ON linked_variant.id = vi.variant_id
                    WHERE linked_variant.product_id = p.id
                      AND COALESCE(linked_variant.color_name, '') = COALESCE(pv.color_name, '')
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
      ${this.activeCampaignJoinSql}
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
      scheduledSalePrice:
        row.scheduledSalePrice != null ? Number(row.scheduledSalePrice) : null,
      saleStartAt: row.saleStartAt ?? null,
      saleEndAt: row.saleEndAt ?? null,
      isSaleActive: row.isSaleActive === true,
      activeCampaign:
        row.campaignId != null
          ? {
              id: row.campaignId,
              name: row.campaignName ?? '',
              slug: row.campaignSlug ?? '',
              discountType: row.campaignDiscountType ?? 'PERCENT',
              discountValue:
                row.campaignDiscountValue != null
                  ? Number(row.campaignDiscountValue)
                  : null,
              giftName: row.campaignGiftName ?? '',
              giftDescription: row.campaignGiftDescription ?? '',
              badgeText: row.campaignBadgeText ?? '',
            }
          : null,
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
    const effectiveProductPriceSql = this.buildCampaignAdjustedPriceSql(
      `COALESCE(${this.activeSalePriceSql}, p.base_price)`,
    );

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
      ${effectiveProductPriceSql} AS "salePrice",
      p.sale_price AS "scheduledSalePrice",
      p.sale_start_at AS "saleStartAt",
      p.sale_end_at AS "saleEndAt",
      CASE
        WHEN ${effectiveProductPriceSql} < p.base_price THEN TRUE
        ELSE FALSE
      END AS "isSaleActive",
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
    ${this.activeCampaignJoinSql}
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
        scheduledSalePrice:
          row.scheduledSalePrice != null
            ? Number(row.scheduledSalePrice)
            : null,
        saleStartAt: row.saleStartAt ?? null,
        saleEndAt: row.saleEndAt ?? null,
        isSaleActive: row.isSaleActive === true,
        targetGender: row.targetGender,
        recommendedAgeGroups: row.recommendedAgeGroups ?? [],
        thumbnail: row.thumbnail ?? '',
      })),
    };
  }

  private validateSaleWindow(input: {
    salePrice?: number | null;
    saleStartAt?: string | null;
    saleEndAt?: string | null;
  }) {
    if (
      input.salePrice != null &&
      Number.isFinite(input.salePrice) &&
      input.salePrice < 0
    ) {
      throw new BadRequestException(
        'Sale price must be greater than or equal to 0',
      );
    }

    const hasSalePrice = input.salePrice != null;
    const hasSaleStart = input.saleStartAt != null && input.saleStartAt !== '';
    const hasSaleEnd = input.saleEndAt != null && input.saleEndAt !== '';

    if ((hasSaleStart || hasSaleEnd) && !hasSalePrice) {
      throw new BadRequestException(
        'Sale price is required when configuring a sale period',
      );
    }

    if (hasSaleStart !== hasSaleEnd) {
      throw new BadRequestException(
        'Sale start time and end time must both be provided',
      );
    }

    if (hasSaleStart && hasSaleEnd) {
      const saleStartAt = new Date(input.saleStartAt!);
      const saleEndAt = new Date(input.saleEndAt!);

      if (
        Number.isNaN(saleStartAt.getTime()) ||
        Number.isNaN(saleEndAt.getTime())
      ) {
        throw new BadRequestException('Sale period is invalid');
      }

      if (saleStartAt >= saleEndAt) {
        throw new BadRequestException(
          'Sale end time must be after sale start time',
        );
      }
    }
  }
}
