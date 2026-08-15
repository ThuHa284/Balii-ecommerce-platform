import {
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  recipientName!: string;

  @IsPhoneNumber('VN')
  phone!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  provinceId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  districtId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  wardId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  streetAddress!: string;
}

export class CreateOrderDto {
  @IsUUID()
  idempotencyKey!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['cod', 'bank_transfer', 'mock_online', 'vnpay'])
  paymentMethod!: string;

  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress!: ShippingAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voucherCode?: string;
}
