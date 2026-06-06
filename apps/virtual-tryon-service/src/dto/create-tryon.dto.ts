/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsIn, IsOptional } from 'class-validator';

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
}
