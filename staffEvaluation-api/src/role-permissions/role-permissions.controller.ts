import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolePermissionsService } from './role-permissions.service';
import { UpdateRolePermissionDto } from './dto/role-permission.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('role-permissions')
@ApiBearerAuth()
@Controller('role-permissions')
@UseGuards(JwtAuthGuard)
export class RolePermissionsController {
  constructor(private service: RolePermissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all role permissions (any authenticated user)' })
  findAll() {
    return this.service.findAll();
  }

  @Patch(':role')
  @Roles('admin')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update results access for a role (admin only)' })
  update(@Param('role') role: string, @Body() dto: UpdateRolePermissionDto) {
    return this.service.update(role, dto.resultsAccess);
  }
}
