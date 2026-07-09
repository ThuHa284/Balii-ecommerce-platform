import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'product_service', name: 'campaigns' })
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ type: 'varchar', length: 255 })
  name: string | undefined;

  @Column({ type: 'varchar', length: 280, unique: true })
  slug: string | undefined;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'short_description', type: 'text', nullable: true })
  shortDescription?: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ name: 'banner_image_url', type: 'text', nullable: true })
  bannerImageUrl?: string;

  @Column({
    name: 'product_ids',
    type: 'uuid',
    array: true,
    default: () => "'{}'",
  })
  productIds: string[] | undefined;

  @Column({
    name: 'discount_type',
    type: 'varchar',
    length: 20,
    default: 'PERCENT',
  })
  discountType: string | undefined;

  @Column({
    name: 'discount_value',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  discountValue?: number | null;

  @Column({ name: 'gift_name', type: 'varchar', length: 255, nullable: true })
  giftName?: string | null;

  @Column({ name: 'gift_description', type: 'text', nullable: true })
  giftDescription?: string | null;

  @Column({ name: 'badge_text', type: 'varchar', length: 120, nullable: true })
  badgeText?: string | null;

  @Column({ name: 'priority_order', type: 'int', default: 0 })
  priorityOrder: number | undefined;

  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date | undefined;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date | undefined;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean | undefined;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date | undefined;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date | undefined;
}
