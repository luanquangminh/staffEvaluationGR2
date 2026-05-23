import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EvaluationsService } from './evaluations.service';
import { RolePermissionsService } from '../role-permissions/role-permissions.service';
import { BulkEvaluationDto, EvaluationQueryDto, EvaluationMyQueryDto } from './dto/evaluations.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('evaluations')
@ApiBearerAuth()
@Controller('evaluations')
@UseGuards(JwtAuthGuard)
export class EvaluationsController {
  constructor(
    private evaluationsService: EvaluationsService,
    private rolePermissionsService: RolePermissionsService,
  ) {}

  private ensureStaffLinked(user: JwtPayload & { id: string }): number {
    if (!user.staffId) {
      throw new ForbiddenException('User is not linked to a staff member. Please link your account to a staff profile first.');
    }
    return user.staffId;
  }

  @Get('pending')
  @Roles('admin', 'moderator')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get staff who have not completed evaluations in the active period (admin/moderator only)' })
  @ApiResponse({ status: 200, description: 'List of pending evaluations per staff' })
  getPendingEvaluations() {
    return this.evaluationsService.getPendingEvaluations();
  }

  @Get('my-progress')
  @ApiOperation({ summary: 'Get current user evaluation progress for the active period' })
  @ApiResponse({ status: 200, description: 'Evaluation progress per group' })
  @ApiResponse({ status: 403, description: 'User not linked to staff' })
  getMyProgress(@CurrentUser() user: JwtPayload & { id: string }) {
    const staffId = this.ensureStaffLinked(user);
    return this.evaluationsService.getMyProgress(staffId);
  }

  @Get()
  @ApiOperation({ summary: 'Get evaluations — scope depends on role permission config' })
  @ApiResponse({ status: 200, description: 'List of evaluations (filtered by role permission)' })
  @ApiResponse({ status: 403, description: 'Role has no results access' })
  async findAll(
    @Query() query: EvaluationQueryDto,
    @CurrentUser() user: JwtPayload & { id: string },
  ) {
    // Admin always sees everything
    if (user.roles?.includes('admin')) {
      return this.evaluationsService.findAll(query);
    }

    // Determine effective access level from DB config for this role
    const primaryRole = user.roles?.includes('moderator') ? 'moderator' : 'user';
    const access = await this.rolePermissionsService.findOne(primaryRole);

    if (access === 'none') {
      throw new ForbiddenException('Your role does not have access to evaluation results');
    }

    if (access === 'all') {
      return this.evaluationsService.findAll(query);
    }

    const staffId = this.ensureStaffLinked(user);

    if (access === 'self') {
      return this.evaluationsService.findAll({ ...query, evaluateeId: staffId });
    }

    // 'group': show evaluations for all staff in the same group(s) as this user
    const groupMemberIds = await this.evaluationsService.getGroupMemberIds(staffId);
    return this.evaluationsService.findAll({ ...query, evaluateeIds: groupMemberIds });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get evaluations given by current user' })
  @ApiResponse({ status: 200, description: 'List of evaluations given' })
  @ApiResponse({ status: 403, description: 'User not linked to staff' })
  findMy(
    @CurrentUser() user: JwtPayload & { id: string },
    @Query() query: EvaluationMyQueryDto,
  ) {
    const staffId = this.ensureStaffLinked(user);
    return this.evaluationsService.findByReviewer(staffId, query.groupId, query.periodId);
  }

  @Get('received')
  @ApiOperation({ summary: 'Get evaluations received by current user' })
  @ApiResponse({ status: 200, description: 'List of evaluations received with reviewer info' })
  @ApiResponse({ status: 403, description: 'User not linked to staff' })
  findReceived(
    @CurrentUser() user: JwtPayload & { id: string },
    @Query() query: EvaluationMyQueryDto,
  ) {
    const staffId = this.ensureStaffLinked(user);
    // showReviewer is admin-only: non-admin users always see anonymous results when period.isAnonymous=true
    const showReviewer = !!query.showReviewer && user.roles?.includes('admin');
    return this.evaluationsService.findByEvaluatee(staffId, query.groupId, query.periodId, showReviewer);
  }

  @Get('my-groups')
  @ApiOperation({ summary: 'Get groups the current user belongs to' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  @ApiResponse({ status: 403, description: 'User not linked to staff' })
  findMyGroups(@CurrentUser() user: JwtPayload & { id: string }) {
    const staffId = this.ensureStaffLinked(user);
    return this.evaluationsService.findGroupsByStaff(staffId);
  }

  @Get('colleagues/:groupId')
  @ApiOperation({ summary: 'Get colleagues in a group for evaluation' })
  @ApiResponse({ status: 200, description: 'List of colleagues' })
  @ApiResponse({ status: 403, description: 'User not linked to staff' })
  findColleagues(
    @Param('groupId', ParseIntPipe) groupId: number,
    @CurrentUser() user: JwtPayload & { id: string },
  ) {
    const staffId = this.ensureStaffLinked(user);
    return this.evaluationsService.findColleagues(groupId, staffId);
  }

  @Get('staff/:staffId/received')
  @Roles('admin', 'moderator')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get evaluations received by a specific staff member (closed periods only, admin/moderator)' })
  @ApiResponse({ status: 200, description: 'List of evaluations received by the staff member' })
  findStaffReceived(
    @Param('staffId', ParseIntPipe) staffId: number,
    @Query() query: EvaluationMyQueryDto,
  ) {
    return this.evaluationsService.findByEvaluateeClosedPeriods(staffId, query.periodId);
  }

  @Get('staff2groups')
  @Roles('admin', 'moderator')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get staff to groups mapping (admin/moderator only)' })
  @ApiResponse({ status: 200, description: 'Staff to groups mapping' })
  getStaff2Groups() {
    return this.evaluationsService.getStaff2Groups();
  }

  @Post('bulk')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit bulk evaluations for an active period' })
  @ApiResponse({ status: 201, description: 'Evaluations created/updated' })
  @ApiResponse({ status: 403, description: 'User not linked to staff' })
  bulkUpsert(@Body() dto: BulkEvaluationDto, @CurrentUser() user: JwtPayload & { id: string }) {
    const staffId = this.ensureStaffLinked(user);
    return this.evaluationsService.bulkUpsert(dto, staffId);
  }
}
