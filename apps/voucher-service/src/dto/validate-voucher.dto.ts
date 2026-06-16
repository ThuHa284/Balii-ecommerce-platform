import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ValidateVoucherDto {
  @IsString()
  code!: string;

  @IsNumber()
  @Min(0)
  orderAmount!: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
