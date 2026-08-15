import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CompleteManualRefundDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  transactionReference!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
