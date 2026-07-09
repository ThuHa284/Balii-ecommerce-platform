import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'user_service', name: 'user_addresses' })
export class UserAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'recipient_name' })
  recipientName!: string;

  @Column()
  phone!: string;

  @Column({ name: 'province_id' })
  provinceId!: number;

  @Column({ name: 'district_id' })
  districtId!: number;

  @Column({ name: 'ward_id' })
  wardId!: number;

  @Column({ name: 'street_address' })
  streetAddress!: string;

  @Column({ name: 'is_default', default: false })
  isDefault!: boolean;
}
