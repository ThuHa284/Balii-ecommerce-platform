import { IsIn, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['customer', 'admin', 'super_admin'])
  role!: 'customer' | 'admin' | 'super_admin';
}
