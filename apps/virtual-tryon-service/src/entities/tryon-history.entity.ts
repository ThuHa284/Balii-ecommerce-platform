import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'tryon_service', name: 'tryon_histories' })
export class TryonHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string | undefined;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId?: string;

  @Column({
    name: 'fashn_job_id',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  fashnJobId?: string;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status?: string;

  @Column({ name: 'result_url', type: 'text', nullable: true })
  resultUrl?: string;

  @Column({ name: 'cloudinary_public_id', type: 'text', nullable: true })
  cloudinaryPublicId?: string;

  @Column({
    name: 'detected_gender',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  detectedGender?: string;

  @Column({
    name: 'gender_confidence',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  genderConfidence?: number;

  @Column({
    name: 'detected_age_group',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  detectedAgeGroup?: string;

  @Column({
    name: 'age_confidence',
    type: 'numeric',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  ageConfidence?: number;

  @Column({
    name: 'target_gender',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  targetGender?: string;

  @Column({
    name: 'recommended_age_groups',
    type: 'text',
    array: true,
    nullable: true,
  })
  recommendedAgeGroups?: string[];

  @Column({ name: 'need_confirmation', type: 'boolean', default: false })
  needConfirmation?: boolean;

  @Column({ name: 'user_confirmed', type: 'boolean', default: false })
  userConfirmed?: boolean;

  @Column({ type: 'jsonb', nullable: true })
  warnings?: string[];

  @Column({ type: 'jsonb', nullable: true })
  suggestions?: string[];

  @Column({ name: 'raw_analysis', type: 'jsonb', nullable: true })
  rawAnalysis?: Record<string, unknown>;

  @Column({ name: 'raw_provider_response', type: 'jsonb', nullable: true })
  rawProviderResponse?: Record<string, unknown>;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date | undefined;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
