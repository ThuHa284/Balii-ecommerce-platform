import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'payment_service', name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'provider_id', type: 'int' })
  providerId!: number;

  @Column({ name: 'status_id', type: 'int' })
  statusId!: number;

  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 })
  amount!: number;

  @Column({ name: 'currency', type: 'varchar', length: 5, default: 'VND' })
  currency!: string;

  @Column({
    name: 'provider_txn_id',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  providerTransactionId?: string | null;

  @Column({ name: 'provider_ref', type: 'varchar', length: 200, nullable: true })
  providerRef?: string | null;

  @Column({ name: 'payment_url', type: 'text', nullable: true })
  paymentUrl?: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
