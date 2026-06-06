import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'product_service', name: 'collections' })
export class Collection {
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

  @Column({ type: 'varchar', length: 100, nullable: true })
  season?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean | undefined;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date | undefined;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date | undefined;
}
