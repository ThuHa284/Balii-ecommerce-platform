import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './user.entity';

@Entity({ schema: 'user_service', name: 'oauth_accounts' })
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ length: 30 })
  provider!: string;

  @Column({ name: 'provider_user_id', length: 255 })
  providerUserId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
