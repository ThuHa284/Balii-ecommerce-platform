import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'user_service', name: 'districts' })
export class District {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'province_id' })
  provinceId!: number;

  @Column()
  name!: string;
}
