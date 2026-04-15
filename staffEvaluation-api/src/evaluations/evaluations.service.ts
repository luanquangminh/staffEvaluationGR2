import { Injectable, ForbiddenException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BulkEvaluationDto } from './dto/evaluations.dto';

const FIND_ALL_HARD_CAP = 50000;
const MAX_PAGE_SIZE = 1000;

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(private prisma: PrismaService) { }

  async findAll(query?: {
    groupId?: number;
    reviewerId?: number;
    evaluateeId?: number;
    periodId?: number;
    page?: number;
    pageSize?: number;
  }) {
    const where: Prisma.EvaluationWhereInput = {};
    if (query?.groupId) where.groupid = query.groupId;
    if (query?.reviewerId) where.reviewerid = query.reviewerId;
    if (query?.evaluateeId) where.evaluateeid = query.evaluateeId;
    if (query?.periodId) where.periodid = query.periodId;

    const paginated = query?.page !== undefined || query?.pageSize !== undefined;
    let take: number;
    let skip: number | undefined;

    if (paginated) {
      const pageSize = Math.min(Math.max(query?.pageSize ?? 100, 1), MAX_PAGE_SIZE);
      const page = Math.max(query?.page ?? 1, 1);
      take = pageSize;
      skip = (page - 1) * pageSize;
    } else {
      take = FIND_ALL_HARD_CAP;
    }

    const [results, total] = await this.prisma.$transaction([
      this.prisma.evaluation.findMany({
        where,
        take,
        skip,
        include: {
          reviewer: true,
          evaluatee: true,
          group: true,
          question: true,
          period: true,
        },
      }),
      this.prisma.evaluation.count({ where }),
    ]);

    const truncated = !paginated && total > FIND_ALL_HARD_CAP;
    if (truncated) {
      this.logger.warn(
        `findAll truncated at ${FIND_ALL_HARD_CAP} of ${total} rows. Filters: ${JSON.stringify(query)}`,
      );
    }

    return { data: results, total, truncated };
  }

  /**
   * Build a where clause scoped to a single staff role (reviewer OR evaluatee).
   * Shared by findByReviewer, findByEvaluatee, findByEvaluateeClosedPeriods
   * so filter semantics stay consistent across queries.
   */
  private buildEvalWhere(
    role: 'reviewerid' | 'evaluateeid',
    staffId: number,
    groupId?: number,
    periodId?: number,
  ): Prisma.EvaluationWhereInput {
    const where: Prisma.EvaluationWhereInput = { [role]: staffId };
    if (groupId) where.groupid = groupId;
    if (periodId) where.periodid = periodId;
    return where;
  }

  async findByReviewer(staffId: number, groupId?: number, periodId?: number) {
    return this.prisma.evaluation.findMany({
      where: this.buildEvalWhere('reviewerid', staffId, groupId, periodId),
      include: {
        evaluatee: true,
        question: true,
        period: true,
      },
    });
  }

  async findByEvaluatee(staffId: number, groupId?: number, periodId?: number) {
    return this.prisma.evaluation.findMany({
      where: this.buildEvalWhere('evaluateeid', staffId, groupId, periodId),
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        question: true,
        group: true,
        period: true,
      },
    });
  }

  async findByEvaluateeClosedPeriods(staffId: number, periodId?: number) {
    const where: Prisma.EvaluationWhereInput = {
      ...this.buildEvalWhere('evaluateeid', staffId, undefined, periodId),
      period: { status: 'closed' },
    };

    return this.prisma.evaluation.findMany({
      where,
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
        question: true,
        group: true,
        period: true,
      },
    });
  }

  async findGroupsByStaff(staffId: number) {
    const staffGroups = await this.prisma.staff2Group.findMany({
      where: { staffid: staffId },
      include: {
        group: true,
      },
    });

    return staffGroups.map((sg) => sg.group);
  }

  async findColleagues(groupId: number, myStaffId: number) {
    const staffGroups = await this.prisma.staff2Group.findMany({
      where: {
        groupid: groupId,
        NOT: { staffid: myStaffId },
      },
      include: {
        staff: true,
      },
    });

    return staffGroups.map((sg) => sg.staff);
  }

  async bulkUpsert(dto: BulkEvaluationDto, reviewerStaffId: number) {
    if (!reviewerStaffId) {
      throw new ForbiddenException('Staff ID is required');
    }

    // Authorization check: Prevent self-evaluation
    if (reviewerStaffId === dto.evaluateeId) {
      throw new ForbiddenException('Cannot evaluate yourself');
    }

    // Verify the period exists and is active
    const period = await this.prisma.evaluationPeriod.findUnique({
      where: { id: dto.periodId },
    });
    if (!period) {
      throw new NotFoundException('Evaluation period not found');
    }
    if (period.status !== 'active') {
      throw new BadRequestException('Evaluation period is not active');
    }

    // Verify current date is within the period's date range
    const now = new Date();
    if (now < new Date(period.startDate)) {
      throw new BadRequestException('Evaluation period has not started yet');
    }
    if (now > new Date(period.endDate)) {
      throw new BadRequestException('Evaluation period has ended');
    }

    // Authorization check: Verify reviewer is a member of the group
    const reviewerInGroup = await this.prisma.staff2Group.findFirst({
      where: { staffid: reviewerStaffId, groupid: dto.groupId },
    });
    if (!reviewerInGroup) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Authorization check: Verify evaluatee is a member of the group
    const evaluateeInGroup = await this.prisma.staff2Group.findFirst({
      where: { staffid: dto.evaluateeId, groupid: dto.groupId },
    });
    if (!evaluateeInGroup) {
      throw new BadRequestException('Target staff is not a member of this group');
    }

    // Validate point values (additional server-side validation)
    for (const point of Object.values(dto.evaluations)) {
      if (typeof point !== 'number' || point < 0 || point > 4 || !Number.isFinite(point)) {
        throw new BadRequestException('All evaluation points must be numbers between 0 and 4');
      }
    }

    // Verify all question IDs exist
    const questionIds = Object.keys(dto.evaluations).map(id => parseInt(id, 10));
    const existingQuestions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true },
    });
    if (existingQuestions.length !== questionIds.length) {
      const existingIds = new Set(existingQuestions.map(q => q.id));
      const invalidIds = questionIds.filter(id => !existingIds.has(id));
      throw new BadRequestException(`Question IDs not found: ${invalidIds.join(', ')}`);
    }

    // Use transaction for atomic upsert operations
    try {
      const results = await this.prisma.$transaction(
        Object.entries(dto.evaluations).map(([questionIdStr, point]) => {
          const questionId = parseInt(questionIdStr, 10);
          return this.prisma.evaluation.upsert({
            where: {
              reviewer_evaluatee_group_question_period: {
                reviewerid: reviewerStaffId,
                evaluateeid: dto.evaluateeId,
                groupid: dto.groupId,
                questionid: questionId,
                periodid: dto.periodId,
              },
            },
            update: {
              point,
            },
            create: {
              reviewerid: reviewerStaffId,
              evaluateeid: dto.evaluateeId,
              groupid: dto.groupId,
              questionid: questionId,
              periodid: dto.periodId,
              point,
            },
          });
        })
      );

      return results;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(
          `bulkUpsert Prisma error code=${error.code} reviewer=${reviewerStaffId} evaluatee=${dto.evaluateeId} group=${dto.groupId} period=${dto.periodId}: ${error.message}`,
          error.stack,
        );
        throw new BadRequestException('Failed to save evaluations. Please try again.');
      }
      throw error;
    }
  }

  async getStaff2Groups() {
    return this.prisma.staff2Group.findMany({
      include: {
        staff: true,
        group: true,
      },
    });
  }

  async getMyProgress(staffId: number) {
    // Find the active period
    const activePeriod = await this.prisma.evaluationPeriod.findFirst({
      where: { status: 'active' },
    });
    if (!activePeriod) {
      return { periodId: null, periodName: null, groups: [] };
    }

    // Find all groups the user belongs to
    const staffGroups = await this.prisma.staff2Group.findMany({
      where: { staffid: staffId },
      include: { group: true },
    });

    const groupIds = staffGroups.map(sg => sg.groupid);

    // Bulk: count colleagues per group (excluding self)
    const colleagueCounts = await this.prisma.staff2Group.groupBy({
      by: ['groupid'],
      where: { groupid: { in: groupIds }, NOT: { staffid: staffId } },
      _count: { staffid: true },
    });
    const colleagueMap = new Map(colleagueCounts.map(c => [c.groupid, c._count.staffid]));

    // Bulk: get distinct evaluatees per group for this reviewer/period
    const evaluatedRecords = await this.prisma.evaluation.findMany({
      where: {
        reviewerid: staffId,
        groupid: { in: groupIds },
        periodid: activePeriod.id,
      },
      select: { groupid: true, evaluateeid: true },
      distinct: ['groupid', 'evaluateeid'],
    });
    const evaluatedMap = new Map<number, number>();
    for (const rec of evaluatedRecords) {
      evaluatedMap.set(rec.groupid, (evaluatedMap.get(rec.groupid) || 0) + 1);
    }

    const groups = staffGroups.map(sg => {
      const totalColleagues = colleagueMap.get(sg.groupid) || 0;
      const evaluatedColleagues = evaluatedMap.get(sg.groupid) || 0;
      return {
        groupId: sg.groupid,
        groupName: sg.group.name,
        totalColleagues,
        evaluatedColleagues,
        isComplete: totalColleagues > 0 && evaluatedColleagues >= totalColleagues,
      };
    });

    return {
      periodId: activePeriod.id,
      periodName: activePeriod.name,
      groups,
    };
  }

  async getPendingEvaluations() {
    const activePeriod = await this.prisma.evaluationPeriod.findFirst({
      where: { status: 'active' },
    });
    if (!activePeriod) {
      return { periodId: null, periodName: null, pending: [] };
    }

    // Member count per group (DB aggregation, not in-memory)
    const memberCounts = await this.prisma.staff2Group.groupBy({
      by: ['groupid'],
      _count: { staffid: true },
    });
    const totalByGroup = new Map(memberCounts.map(m => [m.groupid, m._count.staffid]));
    const evaluableGroupIds = memberCounts
      .filter(m => m._count.staffid > 1)
      .map(m => m.groupid);

    if (evaluableGroupIds.length === 0) {
      return { periodId: activePeriod.id, periodName: activePeriod.name, pending: [] };
    }

    // Only fetch staff2group for groups that have >1 member, with trimmed select
    const staffGroups = await this.prisma.staff2Group.findMany({
      where: { groupid: { in: evaluableGroupIds } },
      select: {
        staffid: true,
        groupid: true,
        staff: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });

    const distinctEvals = await this.prisma.evaluation.findMany({
      where: { periodid: activePeriod.id, groupid: { in: evaluableGroupIds } },
      select: { reviewerid: true, groupid: true, evaluateeid: true },
      distinct: ['reviewerid', 'groupid', 'evaluateeid'],
    });

    const evalCountMap = new Map<string, number>();
    for (const ev of distinctEvals) {
      const key = `${ev.reviewerid}-${ev.groupid}`;
      evalCountMap.set(key, (evalCountMap.get(key) || 0) + 1);
    }

    const pending: Array<{
      staffId: number;
      staffName: string;
      groupId: number;
      groupName: string;
      totalColleagues: number;
      evaluatedColleagues: number;
    }> = [];

    for (const sg of staffGroups) {
      const totalColleagues = (totalByGroup.get(sg.groupid) ?? 0) - 1;
      if (totalColleagues <= 0) continue;

      const evaluatedColleagues = evalCountMap.get(`${sg.staffid}-${sg.groupid}`) ?? 0;
      if (evaluatedColleagues < totalColleagues) {
        pending.push({
          staffId: sg.staffid,
          staffName: sg.staff.name,
          groupId: sg.groupid,
          groupName: sg.group.name,
          totalColleagues,
          evaluatedColleagues,
        });
      }
    }

    return {
      periodId: activePeriod.id,
      periodName: activePeriod.name,
      pending,
    };
  }
}
