import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'product_service', name: 'product_variants' })
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string | undefined;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string | undefined;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  price?: number;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number | undefined;

  @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
  reservedQuantity: number | undefined;

  @Column({ name: 'weight_gram', type: 'int', nullable: true })
  weightGram?: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean | undefined;

  @Column({ name: 'es_sync_status', type: 'boolean', default: false })
  esSyncStatus: boolean | undefined;

  @Column({ name: 'item_type', type: 'varchar', length: 20, default: 'TOP' })
  itemType: string | undefined;

  @Column({ name: 'size_label', type: 'varchar', length: 50, nullable: true })
  sizeLabel?: string;

  @Column({ name: 'color_name', type: 'varchar', length: 50, nullable: true })
  colorName?: string;
}
