import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProductVariant } from '../entities/product-variant.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

type InventoryMovementRow = {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  eventType: string;
  referenceType: string | null;
  referenceId: string | null;
  actorId: string | null;
  stockDelta: number;
  reservedDelta: number;
  stockAfter: number;
  reservedAfter: number;
  createdAt: Date;
};

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateProductVariantDto, actorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.setInventoryAuditContext(
        manager,
        'variant_created',
        dto.sku,
        actorId,
      );
      const variant = manager.getRepository(ProductVariant).create({
        ...dto,
        reservedQuantity: 0,
        isActive: dto.isActive ?? true,
        itemType: dto.itemType ?? 'TOP',
        esSyncStatus: false,
      });

      return manager.getRepository(ProductVariant).save(variant);
    });
  }

  findByProduct(productId: string, includeInactive = false) {
    return this.variantRepo.find({
      where: includeInactive ? { productId } : { productId, isActive: true },
      order: {
        sku: 'ASC',
      },
    });
  }

  async findOne(id: string, includeInactive = false) {
    const variant = await this.variantRepo.findOne({
      where: includeInactive ? { id } : { id, isActive: true },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  async update(id: string, dto: UpdateProductVariantDto, actorId?: string) {
    if (dto.reservedQuantity !== undefined) {
      throw new BadRequestException(
        'Không được điều chỉnh số lượng đang giữ chỗ bằng API quản trị.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const variant = await manager.getRepository(ProductVariant).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }
      if (
        dto.stockQuantity !== undefined &&
        dto.stockQuantity < Number(variant.reservedQuantity || 0)
      ) {
        throw new BadRequestException(
          'Tồn kho mới không được nhỏ hơn số lượng đang giữ chỗ.',
        );
      }

      await this.setInventoryAuditContext(
        manager,
        'admin_adjustment',
        id,
        actorId,
      );
      Object.assign(variant, dto, {
        esSyncStatus: false,
      });

      return manager.getRepository(ProductVariant).save(variant);
    });
  }

  async remove(id: string) {
    const variant = await this.findOne(id, true);

    variant.isActive = false;

    await this.variantRepo.save(variant);

    return {
      success: true,
      message: 'Product variant disabled successfully',
    };
  }

  async getInventoryMovements(variantId?: string, requestedLimit = 100) {
    const limit = Math.min(Math.max(requestedLimit, 1), 500);
    const params: Array<string | number> = [];
    const where = variantId
      ? `WHERE movement.variant_id = $${params.push(variantId)}`
      : '';
    params.push(limit);

    const rows = await this.dataSource.query<InventoryMovementRow[]>(
      `
      SELECT
        movement.id::text,
        movement.variant_id AS "variantId",
        variant.sku,
        product.name AS "productName",
        movement.event_type AS "eventType",
        movement.reference_type AS "referenceType",
        movement.reference_id AS "referenceId",
        movement.actor_id AS "actorId",
        movement.stock_delta AS "stockDelta",
        movement.reserved_delta AS "reservedDelta",
        movement.stock_after AS "stockAfter",
        movement.reserved_after AS "reservedAfter",
        movement.created_at AS "createdAt"
      FROM product_service.inventory_movements movement
      JOIN product_service.product_variants variant
        ON variant.id = movement.variant_id
      JOIN product_service.products product ON product.id = variant.product_id
      ${where}
      ORDER BY movement.id DESC
      LIMIT $${params.length}
      `,
      params,
    );
    return rows;
  }

  private async setInventoryAuditContext(
    manager: EntityManager,
    eventType: string,
    referenceId: string,
    actorId?: string,
  ) {
    await manager.query(
      `
      SELECT
        set_config('app.inventory_event_type', $1, TRUE),
        set_config('app.inventory_reference_type', 'product_variant', TRUE),
        set_config('app.inventory_reference_id', $2, TRUE),
        set_config('app.inventory_actor_id', $3, TRUE)
      `,
      [eventType, referenceId, actorId ?? ''],
    );
  }
}
