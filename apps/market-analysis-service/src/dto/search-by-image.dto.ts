import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class SearchByImageDto {
  @IsOptional()
  @IsUrl(
    {
      require_tld: false,
    },
    {
      message: 'imageUrl phải là URL hợp lệ',
    },
  )
  imageUrl?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? undefined : String(value).trim(),
  )
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === '' ? 10 : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 10;

  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') {
      return true;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return ['true', '1', 'on', 'yes'].includes(String(value).toLowerCase());
  })
  @IsBoolean()
  saveResults = true;
}
