import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const RESULTS_ACCESS_VALUES = ['none', 'self', 'group', 'all'] as const;
export type ResultsAccess = typeof RESULTS_ACCESS_VALUES[number];

export class UpdateRolePermissionDto {
  @ApiProperty({ enum: RESULTS_ACCESS_VALUES, description: 'Level of access to the results page' })
  @IsIn(RESULTS_ACCESS_VALUES)
  resultsAccess: ResultsAccess;
}
