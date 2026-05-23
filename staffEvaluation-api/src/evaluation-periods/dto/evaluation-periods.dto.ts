import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PeriodStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TrimString = () => Transform(({ value }) => typeof value === 'string' ? value.trim() : value);

export class CreateEvaluationPeriodDto {
  @ApiProperty({ example: 'Đợt đánh giá HK1 2025-2026', description: 'Period name' })
  @IsString()
  @MaxLength(200)
  @TrimString()
  name: string;

  @ApiPropertyOptional({ example: 'Đánh giá đợt 1 năm học 2025-2026', description: 'Period description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @TrimString()
  description?: string;

  @ApiProperty({ example: '2025-09-01', description: 'Start date (ISO format)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31', description: 'End date (ISO format)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: false, description: 'If true, reviewer identities are hidden from evaluatees. Admins can still reveal them on demand.' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class UpdateEvaluationPeriodDto {
  @ApiPropertyOptional({ example: 'Đợt đánh giá HK1 2025-2026 (Updated)', description: 'Period name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @TrimString()
  name?: string;

  @ApiPropertyOptional({ description: 'Period description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @TrimString()
  description?: string;

  @ApiPropertyOptional({ example: '2025-09-01', description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: ['draft', 'active', 'closed'], description: 'Period status (activating auto-deactivates others)' })
  @IsOptional()
  @IsEnum(PeriodStatus, { message: 'Status must be draft, active, or closed' })
  status?: PeriodStatus;

  @ApiPropertyOptional({ example: false, description: 'If true, reviewer identities are hidden from evaluatees.' })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
