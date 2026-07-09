import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ schema: 'user_service', name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description!: string;
}
