import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatHistoryMessageDto {
  @IsString()
  @MaxLength(4000)
  id: string | undefined;

  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant' | undefined;

  @IsString()
  @MaxLength(4000)
  content: string | undefined;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class ChatRequestDto {
  @IsString()
  @MaxLength(1000)
  message: string | undefined;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history?: ChatHistoryMessageDto[];
}
