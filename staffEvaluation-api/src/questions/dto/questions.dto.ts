import { IsString, IsOptional } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateQuestionDto extends CreateQuestionDto {}
