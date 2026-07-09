import {
  IsInt,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  recipientName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @IsInt()
  provinceId!: number;

  @IsInt()
  districtId!: number;

  @IsInt()
  wardId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  streetAddress!: string;
}
