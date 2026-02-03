import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { LinkStaffDto, AddRoleDto } from './dto/users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('profiles')
  @Roles('admin')
  @UseGuards(RolesGuard)
  getProfiles() {
    return this.usersService.getProfiles();
  }

  @Get('profile')
  getMyProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Post('link-staff')
  @Roles('admin')
  @UseGuards(RolesGuard)
  linkStaff(@Body() dto: LinkStaffDto) {
    return this.usersService.linkStaff(dto);
  }

  @Get('roles')
  @Roles('admin')
  @UseGuards(RolesGuard)
  getUsersWithRoles() {
    return this.usersService.getUsersWithRoles();
  }

  @Post(':userId/roles')
  @Roles('admin')
  @UseGuards(RolesGuard)
  addRole(@Param('userId') userId: string, @Body() dto: AddRoleDto) {
    return this.usersService.addRole(userId, dto);
  }

  @Delete(':userId/roles/:role')
  @Roles('admin')
  @UseGuards(RolesGuard)
  removeRole(@Param('userId') userId: string, @Param('role') role: string) {
    return this.usersService.removeRole(userId, role);
  }
}
