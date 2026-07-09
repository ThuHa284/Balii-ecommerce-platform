import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
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
