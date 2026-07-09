import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  schema: 'market_analysis_service',
  name: 'market_products',
})
export class MarketProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  platform!: string;

  @Column({ name: 'external_id', type: 'varchar', length: 255, nullable: true })
  externalId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  keyword?: string | null;

  @Column({ type: 'text' })
  name!: string;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  price?: number | null;

  @Column('decimal', {
    name: 'original_price',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  originalPrice?: number | null;

  @Column({ name: 'sold_count', type: 'int', nullable: true })
  soldCount?: number | null;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  rating?: number | null;

  @Column({ name: 'shop_name', type: 'varchar', length: 255, nullable: true })
  shopName?: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'product_url', type: 'text', nullable: true })
  productUrl?: string | null;

  @Column('jsonb', { name: 'raw_data', nullable: true })
  rawData?: Record<string, unknown> | null;

  @Column({ name: 'crawled_at', type: 'timestamptz', nullable: true })
  crawledAt?: Date | null;
}
