import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  schema: 'market_analysis_service',
  name: 'market_products',
})
export class MarketProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  platform!: string;

  @Column()
  keyword!: string;

  @Column()
  name!: string;

  @Column('decimal')
  price!: number;

  @Column({ name: 'shop_name', nullable: true })
  shopName?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'product_url', nullable: true })
  productUrl?: string;
}
