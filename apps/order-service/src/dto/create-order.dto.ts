import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['cod', 'bank_transfer', 'mock_online', 'vnpay', 'momo'])
  paymentMethod!: string;

  @IsObject()
  shippingAddress!: {
    recipientName: string;
    phone: string;
    provinceId: number;
    districtId: number;
    wardId: number;
    streetAddress: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
