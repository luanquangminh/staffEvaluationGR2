import { IsInt, IsOptional, IsNumber, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Custom validator for evaluation points
function validateEvaluationPoints(evaluations: Record<string, number>): boolean {
  for (const point of Object.values(evaluations)) {
    if (typeof point !== 'number' || point < 0 || point > 10 || !Number.isFinite(point)) {
      return false;
    }
  }
  return true;
}

export class BulkEvaluationDto {
  @IsInt()
  groupId: number;

  @IsInt()
  victimId: number;

  @IsObject()
  @Transform(({ value }) => {
    // Validate all point values are numbers between 0-10
    if (typeof value !== 'object' || value === null) return value;
    if (!validateEvaluationPoints(value)) {
      throw new Error('All evaluation points must be numbers between 0 and 10');
    }
    return value;
  })
  evaluations: Record<number, number>; // questionId -> point (0-10)
}

export class EvaluationQueryDto {
  @IsOptional()
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsInt()
  reviewerId?: number;

  @IsOptional()
  @IsInt()
  victimId?: number;
}
