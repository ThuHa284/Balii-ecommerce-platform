import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'product_service', name: 'products' })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @Column({ type: 'varchar', length: 255 })
  name: string | undefined;

  @Column({ type: 'varchar', length: 280, unique: true })
  slug: string | undefined;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'base_price', type: 'numeric', precision: 12, scale: 2 })
  basePrice: number | undefined;

  @Column({ name: 'original_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  originalPrice?: number | null;

  @Column({ name: 'sale_price', type: 'numeric', precision: 12, scale: 2, nullable: true })
  salePrice?: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  material?: string;

  @Column({ name: 'target_gender', type: 'varchar', length: 20, default: 'unisex' })
  targetGender?: string;

  @Column({ name: 'recommended_age_groups', type: 'text', array: true, nullable: true })
  recommendedAgeGroups?: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean | undefined;

  @Column({ name: 'es_sync_status', type: 'boolean', default: false })
  esSyncStatus: boolean | undefined;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date | undefined;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date | undefined;
}
