import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export enum CampaignDiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
  GIFT = 'GIFT',
}

export class CreateCampaignDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @IsEnum(CampaignDiscountType)
  discountType!: CampaignDiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  giftName?: string;

  @IsOptional()
  @IsString()
  giftDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  minimumPurchaseQuantity?: number;

  @IsOptional()
  @IsUUID('4')
  giftVariantId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  giftQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  giftUnitPrice?: number;

  @IsOptional()
  @IsBoolean()
  repeatable?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxApplications?: number | null;

  @IsOptional()
  @IsBoolean()
  stackableWithSale?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  badgeText?: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priorityOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
