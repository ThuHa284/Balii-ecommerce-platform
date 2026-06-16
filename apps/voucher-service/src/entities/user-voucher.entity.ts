import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'voucher_service', name: 'user_vouchers' })
export class UserVoucher {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'voucher_id', type: 'uuid' })
  voucherId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ name: 'saved_at', type: 'timestamptz' })
  savedAt!: Date;
}
