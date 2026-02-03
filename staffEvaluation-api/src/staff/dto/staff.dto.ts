import { IsString, IsOptional, IsInt, IsEmail, IsMobilePhone } from 'class-validator';

export class CreateStaffDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address for emailh' })
  emailh?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address for emails' })
  emails?: string;

  @IsOptional()
  @IsString()
  staffcode?: string;

  @IsOptional()
  @IsInt()
  sex?: number;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  academicrank?: string;

  @IsOptional()
  @IsString()
  academicdegree?: string;

  @IsOptional()
  @IsInt()
  organizationunitid?: number;

  @IsOptional()
  @IsString()
  bidv?: string;
}

export class UpdateStaffDto extends CreateStaffDto {}
