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
  constructor(private evaluationsService: EvaluationsService) {}

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
  @Roles('admin', 'moderator')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get all evaluations (admin/moderator only)' })
  @ApiResponse({ status: 200, description: 'List of evaluations' })
  findAll(@Query() query: EvaluationQueryDto) {
    return this.evaluationsService.findAll(query);
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
    return this.evaluationsService.findByEvaluatee(staffId, query.groupId, query.periodId);
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
