import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateTryOnDto {
  @IsOptional()
  @IsIn(['auto', 'tops', 'bottoms', 'one-pieces'])
  category?: 'auto' | 'tops' | 'bottoms' | 'one-pieces';

  @IsOptional()
  @IsIn(['performance', 'balanced', 'quality'])
  mode?: 'performance' | 'balanced' | 'quality';

  @IsOptional()
  @IsIn(['auto', 'model', 'flat-lay'])
  garmentPhotoType?: 'auto' | 'model' | 'flat-lay';

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsIn(['male', 'female', 'unisex'])
  targetGender?: 'male' | 'female' | 'unisex';

  @IsOptional()
  @IsString()
  recommendedAgeGroups?: string;
  // ví dụ: "18_25,26_35"

  @IsOptional()
  @IsBooleanString()
  confirmWarnings?: string;
}

export class CreateProductDesignDto {
  @IsOptional()
  @IsString()
  productId?: string;
}
