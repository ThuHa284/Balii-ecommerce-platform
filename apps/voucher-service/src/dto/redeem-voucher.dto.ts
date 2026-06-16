import { IsNumber, IsString, Min } from 'class-validator';

export class RedeemVoucherDto {
  @IsString()
  code!: string;

  @IsString()
  orderId!: string;

  @IsNumber()
  @Min(0)
  orderAmount!: number;
}
