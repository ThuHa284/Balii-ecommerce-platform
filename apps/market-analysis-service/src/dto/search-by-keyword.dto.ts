import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Max, Min } from 'class-validator';

export class SearchByKeywordDto {
  @Transform(({ value }) => String(value ?? '').trim())
  @IsString()
  keyword!: string;

  @Transform(({ value }) =>
    value == null || value === '' ? 10 : Number(value),
  )
  @IsInt()
  @Min(1)
  @Max(20)
  limit = 10;

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
