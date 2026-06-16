import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'voucher_service', name: 'vouchers' })
export class Voucher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ name: 'type_id', type: 'int' })
  typeId!: number;

  @Column({ name: 'discount_value', type: 'numeric', precision: 12, scale: 2 })
  discountValue!: number;

  @Column({
    name: 'max_discount_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maxDiscountAmount!: number | null;

  @Column({
    name: 'min_order_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  minOrderAmount!: number;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit!: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  @Column({ name: 'user_limit_per_user', type: 'int', default: 1 })
  userLimitPerUser!: number;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
