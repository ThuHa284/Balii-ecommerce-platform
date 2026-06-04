import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'user_service', name: 'wards' })
export class Ward {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'district_id' })
  districtId!: number;

  @Column()
  name!: string;
}