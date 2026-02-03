import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BulkEvaluationDto } from './dto/evaluations.dto';

@Injectable()
export class EvaluationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { groupId?: number; reviewerId?: number; victimId?: number }) {
    const where: any = {};
    if (query?.groupId) where.groupid = query.groupId;
    if (query?.reviewerId) where.reviewerid = query.reviewerId;
    if (query?.victimId) where.victimid = query.victimId;

    return this.prisma.evaluation.findMany({
      where,
      include: {
        reviewer: true,
        victim: true,
        group: true,
        question: true,
      },
    });
  }

  async findByReviewer(staffId: number, groupId?: number) {
    const where: any = { reviewerid: staffId };
    if (groupId) where.groupid = groupId;

    return this.prisma.evaluation.findMany({
      where,
      include: {
        victim: true,
        question: true,
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
    if (reviewerStaffId === dto.victimId) {
      throw new ForbiddenException('Cannot evaluate yourself');
    }

    // Authorization check: Verify reviewer is a member of the group
    const reviewerInGroup = await this.prisma.staff2Group.findFirst({
      where: { staffid: reviewerStaffId, groupid: dto.groupId },
    });
    if (!reviewerInGroup) {
      throw new ForbiddenException('You are not a member of this group');
    }

    // Authorization check: Verify victim is a member of the group
    const victimInGroup = await this.prisma.staff2Group.findFirst({
      where: { staffid: dto.victimId, groupid: dto.groupId },
    });
    if (!victimInGroup) {
      throw new BadRequestException('Target staff is not a member of this group');
    }

    // Validate point values (additional server-side validation)
    for (const point of Object.values(dto.evaluations)) {
      if (typeof point !== 'number' || point < 0 || point > 10 || !Number.isFinite(point)) {
        throw new BadRequestException('All evaluation points must be numbers between 0 and 10');
      }
    }

    // Use transaction for atomic upsert operations
    const results = await this.prisma.$transaction(
      Object.entries(dto.evaluations).map(([questionIdStr, point]) => {
        const questionId = parseInt(questionIdStr, 10);
        return this.prisma.evaluation.upsert({
          where: {
            reviewerid_victimid_groupid_questionid: {
              reviewerid: reviewerStaffId,
              victimid: dto.victimId,
              groupid: dto.groupId,
              questionid: questionId,
            },
          },
          update: {
            point,
            modifieddate: new Date(),
          },
          create: {
            reviewerid: reviewerStaffId,
            victimid: dto.victimId,
            groupid: dto.groupId,
            questionid: questionId,
            point,
            modifieddate: new Date(),
          },
        });
      })
    );

    return results;
  }

  async getStaff2Groups() {
    return this.prisma.staff2Group.findMany({
      include: {
        staff: true,
        group: true,
      },
    });
  }
}
