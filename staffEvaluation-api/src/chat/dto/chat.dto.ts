import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'], description: 'Message role' })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MaxLength(2000)
  content: string;
}

export class CreateChatDto {
  @ApiProperty({
    description: 'User message to the chatbot',
    example: 'Cho toi biet ve quy trinh danh gia',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Previous conversation messages for context (max 20)',
    type: [ConversationMessageDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  conversationHistory?: ConversationMessageDto[];

}
