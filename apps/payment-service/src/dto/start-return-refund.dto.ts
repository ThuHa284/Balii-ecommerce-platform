import { IsNumber, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class StartReturnRefundDto {
  @IsUUID()
  returnRequestId!: string;

  @IsUUID()
  orderId!: string;

  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}
