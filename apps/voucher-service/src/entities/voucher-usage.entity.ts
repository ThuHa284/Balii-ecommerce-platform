import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'voucher_service', name: 'voucher_usages' })
export class VoucherUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({
    name: 'discount_applied',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  discountApplied!: number;

  @CreateDateColumn({ name: 'used_at', type: 'timestamptz' })
  usedAt!: Date;
}
