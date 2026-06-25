import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class StartRefundWorkflowDto {
  @IsUUID()
  paymentId!: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsNumber()
  @Min(1000)
  amount!: number;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}
