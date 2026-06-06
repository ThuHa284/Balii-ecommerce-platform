/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProductVariantSnapshotDto } from './dto/product-variant-snapshot.dto';

@Injectable()
export class ProductService {
  constructor(private readonly dataSource: DataSource) {}

  async getVariantSnapshot(
    variantId: string,
  ): Promise<ProductVariantSnapshotDto> {
    const result = await this.dataSource.query(
      `
      SELECT
        pv.id AS "variantId",
        p.id AS "productId",
        p.name AS "productName",
        pv.sku AS "sku",
        COALESCE(pv.price, p.base_price) AS "unitPrice",
        pv.stock_quantity AS "stockQuantity",
        pv.reserved_quantity AS "reservedQuantity",
        pv.is_active AS "variantActive",
        p.is_active AS "productActive",
        pi.url AS "thumbnailUrl",
        STRING_AGG(av.value, ' / ' ORDER BY a.name) AS "variantLabel"
      FROM product_service.product_variants pv
      JOIN product_service.products p
        ON p.id = pv.product_id
      LEFT JOIN product_service.product_images pi
        ON pi.variant_id = pv.id
        AND pi.is_primary = TRUE
      LEFT JOIN product_service.variant_attribute_values vav
        ON vav.variant_id = pv.id
      LEFT JOIN product_service.attribute_values av
        ON av.id = vav.attribute_value_id
      LEFT JOIN product_service.attributes a
        ON a.id = av.attribute_id
      WHERE pv.id = $1
      GROUP BY
        pv.id,
        p.id,
        p.name,
        pv.sku,
        pv.price,
        p.base_price,
        pv.stock_quantity,
        pv.reserved_quantity,
        pv.is_active,
        p.is_active,
        pi.url
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
      sku: row.sku,
      variantLabel: row.variantLabel || '',
      thumbnailUrl: row.thumbnailUrl || '',
      unitPrice: Number(row.unitPrice),
      stockQuantity: Number(row.stockQuantity),
      reservedQuantity: Number(row.reservedQuantity || 0),
      isActive: row.variantActive === true && row.productActive === true,
    };
  }
}
