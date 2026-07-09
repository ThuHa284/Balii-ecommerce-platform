import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity({ schema: 'order_service', name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'variant_id', type: 'uuid' })
  variantId!: string;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName!: string;

  @Column({ name: 'sku', type: 'varchar', length: 100 })
  sku!: string;

  @Column({
    name: 'variant_label',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  variantLabel?: string | null;

  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl?: string | null;

  @Column({ name: 'campaign_id', type: 'uuid', nullable: true })
  campaignId?: string | null;

  @Column({
    name: 'campaign_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  campaignName?: string | null;

  @Column({
    name: 'campaign_discount_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  campaignDiscountType?: 'PERCENT' | 'AMOUNT' | 'GIFT' | null;

  @Column({
    name: 'campaign_discount_value',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  campaignDiscountValue?: number | null;

  @Column({
    name: 'campaign_badge_text',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  campaignBadgeText?: string | null;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2 })
  unitPrice!: number;

  @Column({ name: 'quantity', type: 'int' })
  quantity!: number;

  @Column({ name: 'subtotal', type: 'numeric', precision: 12, scale: 2 })
  subtotal!: number;
}
