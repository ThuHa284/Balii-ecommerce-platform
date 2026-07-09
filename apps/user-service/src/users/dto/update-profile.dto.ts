import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @Matches(/^(0|\+84)[0-9]{9,10}$/)
  phone?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
