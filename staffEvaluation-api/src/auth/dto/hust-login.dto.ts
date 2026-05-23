import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HustLoginDto {
  @ApiProperty({ example: 'user@sis.hust.edu.vn', description: 'HUST email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password', description: 'HUST account password (not stored)' })
  @IsString()
  @MinLength(1)
  password: string;
}
