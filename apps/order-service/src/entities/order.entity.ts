import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity({ schema: 'order_service', name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'order_code', type: 'varchar', length: 30, unique: true })
  orderCode!: string;

  @Column({ name: 'status_id', type: 'int' })
  statusId!: number;

  @Column({ name: 'subtotal', type: 'numeric', precision: 12, scale: 2 })
  subtotal!: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 12, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ name: 'shipping_fee', type: 'numeric', precision: 12, scale: 2, default: 0 })
  shippingFee!: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress!: Record<string, unknown>;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @Column({ name: 'shipping_method_id', type: 'int', nullable: true })
  shippingMethodId?: number | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];
}
