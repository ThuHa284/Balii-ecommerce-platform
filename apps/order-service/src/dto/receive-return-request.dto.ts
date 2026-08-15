import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveReturnItemDto {
  @IsUUID()
  returnItemId!: string;

  @IsIn(['restock', 'damaged', 'rejected'])
  disposition!: 'restock' | 'damaged' | 'rejected';
}

export class ReceiveReturnRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiveReturnItemDto)
  items!: ReceiveReturnItemDto[];
}
