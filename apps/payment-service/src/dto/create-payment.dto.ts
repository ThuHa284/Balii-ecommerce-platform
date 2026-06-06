import { IsIn, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  orderId!: string;

  @IsString()
  @IsIn(['cod', 'bank_transfer', 'mock_online', 'vnpay', 'momo'])
  method!: string;

  @IsOptional()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  returnUrl?: string;
}
