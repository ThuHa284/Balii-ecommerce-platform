import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReturnRequestDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason!: string;

  /** JSON string because this endpoint consumes multipart/form-data. */
  @IsString()
  @MinLength(2)
  @MaxLength(10000)
  items!: string;
}
