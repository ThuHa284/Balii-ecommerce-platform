import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewReturnRequestDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
