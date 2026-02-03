import { IsString, IsInt, IsOptional } from 'class-validator';

export class LinkStaffDto {
  @IsString()
  profileId: string;

  @IsInt()
  staffId: number;
}

export class AddRoleDto {
  @IsString()
  role: 'admin' | 'moderator' | 'user';
}
