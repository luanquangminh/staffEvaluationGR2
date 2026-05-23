import { IsInt, IsOptional, IsObject, IsBoolean, ValidatorConstraint, ValidatorConstraintInterface, Validate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'evaluationPoints', async: false })
class IsValidEvaluationPoints implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'object' || value === null) return false;
    for (const point of Object.values(value as Record<string, unknown>)) {
      if (typeof point !== 'number' || point < 0 || point > 4 || !Number.isFinite(point)) {
        return false;
      }
    }
    return true;
  }

  defaultMessage(): string {
    return 'All evaluation points must be numbers between 0 and 4';
  }
}

export class BulkEvaluationDto {
  @ApiProperty({ example: 1, description: 'Group ID for the evaluation' })
  @IsInt()
  groupId: number;

  @ApiProperty({ example: 5, description: 'Staff ID of the person being evaluated' })
  @IsInt()
  evaluateeId: number;

  @ApiProperty({ example: 1, description: 'Evaluation period ID' })
  @IsInt()
  periodId: number;

  @ApiProperty({
    example: { '1': 3, '2': 4, '3': 2 },
    description: 'Map of questionId → point (0-4)',
  })
  @IsObject()
  @Validate(IsValidEvaluationPoints)
  evaluations: Record<number, number>; // questionId -> point (0-4)
}

export class EvaluationQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filter by group ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({ example: 2, description: 'Filter by reviewer staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reviewerId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Filter by evaluatee staff ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  evaluateeId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by period ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Page number (1-based). Omit to return all results up to hard cap.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ example: 100, description: 'Page size (max 1000). Omit to return all up to cap.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;
}

export class EvaluationMyQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Filter by group ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by period ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodId?: number;

  @ApiPropertyOptional({ example: false, description: 'Admin only: reveal reviewer identity even in anonymous periods' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  showReviewer?: boolean;
}
