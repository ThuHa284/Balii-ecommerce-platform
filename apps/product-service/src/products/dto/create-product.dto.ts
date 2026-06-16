import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  basePrice!: number;

  @IsOptional()
  @IsNumber()
  originalPrice?: number;

  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'unisex'])
  targetGender?: 'male' | 'female' | 'unisex';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedAgeGroups?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
