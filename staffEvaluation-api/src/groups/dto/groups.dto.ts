import { IsString, IsOptional, IsInt, IsArray } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  organizationunitid?: number;
}

export class UpdateGroupDto extends CreateGroupDto {}

export class UpdateGroupMembersDto {
  @IsArray()
  @IsInt({ each: true })
  staffIds: number[];
}
