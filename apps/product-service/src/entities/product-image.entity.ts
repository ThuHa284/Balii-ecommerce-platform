import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'product_service', name: 'product_images' })
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string | undefined;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId?: string;

  @Column({ type: 'text' })
  url: string | undefined;

  @Column({ name: 'public_id', type: 'text', nullable: true })
  publicId?: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText?: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number | undefined;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean | undefined;
}
