import { IsString, IsInt } from 'class-validator';

export class CreateOrganizationUnitDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;
}

export class UpdateOrganizationUnitDto {
  @IsString()
  name: string;
}
