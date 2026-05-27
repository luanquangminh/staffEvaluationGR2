import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatAuditService } from './chat-audit.service';
import type OpenAI from 'openai';

// ---------------------------------------------------------------------------
// Tool definitions sent to the LLM
// ---------------------------------------------------------------------------

export const ADMIN_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  // ---- Phase 1: Read-only queries ----
  {
    type: 'function',
    function: {
      name: 'getUnevaluatedStaff',
      description:
        'Lấy danh sách nhân viên chưa thực hiện đánh giá trong kỳ hiện tại (active period).',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getGroupMembers',
      description: 'Lấy danh sách thành viên của một nhóm theo tên nhóm.',
      parameters: {
        type: 'object',
        properties: {
          groupName: { type: 'string', description: 'Tên nhóm cần tra cứu' },
        },
        required: ['groupName'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getEvaluationStats',
      description:
        'Lấy thống kê đánh giá tổng hợp trong kỳ hiện tại: tổng số đánh giá, điểm trung bình, số người đã/chưa đánh giá.',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchStaff',
      description: 'Tìm kiếm nhân viên theo tên hoặc mã nhân viên.',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Từ khóa tìm kiếm (tên hoặc mã nhân viên)',
          },
        },
        required: ['keyword'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listGroups',
      description: 'Liệt kê tất cả các nhóm trong hệ thống, kèm số lượng thành viên.',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getGroupEvaluationStats',
      description: 'Lấy thống kê đánh giá chi tiết cho một nhóm cụ thể.',
      parameters: {
        type: 'object',
        properties: {
          groupName: { type: 'string', description: 'Tên nhóm' },
        },
        required: ['groupName'],
        additionalProperties: false,
      },
    },
  },

  // ---- Phase 2: Write operations (require confirmation) ----
  {
    type: 'function',
    function: {
      name: 'assignStaffToGroup',
      description:
        'Thêm nhân viên vào một nhóm. Yêu cầu xác nhận từ admin trước khi thực thi.',
      parameters: {
        type: 'object',
        properties: {
          staffName: { type: 'string', description: 'Tên nhân viên' },
          groupName: { type: 'string', description: 'Tên nhóm' },
        },
        required: ['staffName', 'groupName'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'removeStaffFromGroup',
      description:
        'Xóa nhân viên khỏi một nhóm. Yêu cầu xác nhận từ admin trước khi thực thi.',
      parameters: {
        type: 'object',
        properties: {
          staffName: { type: 'string', description: 'Tên nhân viên' },
          groupName: { type: 'string', description: 'Tên nhóm' },
        },
        required: ['staffName', 'groupName'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'moveStaffBetweenGroups',
      description:
        'Chuyển nhân viên từ nhóm này sang nhóm khác. Yêu cầu xác nhận từ admin trước khi thực thi.',
      parameters: {
        type: 'object',
        properties: {
          staffName: { type: 'string', description: 'Tên nhân viên' },
          fromGroupName: { type: 'string', description: 'Nhóm hiện tại' },
          toGroupName: { type: 'string', description: 'Nhóm đích' },
        },
        required: ['staffName', 'fromGroupName', 'toGroupName'],
        additionalProperties: false,
      },
    },
  },
];

// ---------------------------------------------------------------------------
// User tools (available to all authenticated users — scoped to own data)
// ---------------------------------------------------------------------------

export const USER_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getMyReviewerCount',
      description:
        'Lấy số lượng người có quyền đánh giá người dùng hiện tại (những đồng nghiệp cùng nhóm).',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMyScores',
      description:
        'Lấy điểm đánh giá cá nhân của người dùng hiện tại qua tất cả các kỳ đánh giá, chi tiết theo từng tiêu chí.',
      parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
    },
  },
];

// Write tools that require confirmation
const WRITE_TOOLS = new Set([
  'assignStaffToGroup',
  'removeStaffFromGroup',
  'moveStaffBetweenGroups',
]);

export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name);
}

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: ChatAuditService,
  ) {}

  async execute(
    toolName: string,
    args: Record<string, unknown>,
    userId: string,
  ): Promise<string> {
    this.logger.log(`Executing tool=${toolName} args=${JSON.stringify(args)} user=${userId}`);

    switch (toolName) {
      // ---- Read tools ----
      case 'getUnevaluatedStaff':
        return this.getUnevaluatedStaff();
      case 'getGroupMembers':
        return this.getGroupMembers(args.groupName as string);
      case 'getEvaluationStats':
        return this.getEvaluationStats();
      case 'searchStaff':
        return this.searchStaff(args.keyword as string);
      case 'listGroups':
        return this.listGroups();
      case 'getGroupEvaluationStats':
        return this.getGroupEvaluationStats(args.groupName as string);

      // ---- Write tools ----
      case 'assignStaffToGroup':
        return this.assignStaffToGroup(
          args.staffName as string,
          args.groupName as string,
          userId,
        );
      case 'removeStaffFromGroup':
        return this.removeStaffFromGroup(
          args.staffName as string,
          args.groupName as string,
          userId,
        );
      case 'moveStaffBetweenGroups':
        return this.moveStaffBetweenGroups(
          args.staffName as string,
          args.fromGroupName as string,
          args.toGroupName as string,
          userId,
        );

      // ---- User tools (personal data) ----
      case 'getMyReviewerCount':
        return this.getMyReviewerCount(userId);
      case 'getMyScores':
        return this.getMyScores(userId);

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  }

  // =========================================================================
  // Phase 1: Read-only queries
  // =========================================================================

  private async getUnevaluatedStaff(): Promise<string> {
    const period = await this.prisma.evaluationPeriod.findFirst({
      where: { status: 'active' },
    });
    if (!period) return JSON.stringify({ message: 'Không có kỳ đánh giá đang hoạt động.' });

    const evaluatedIds = (
      await this.prisma.evaluation.findMany({
        where: { periodid: period.id },
        select: { reviewerid: true },
        distinct: ['reviewerid'],
      })
    ).map((e) => e.reviewerid);

    const [unevaluated, totalStaff] = await Promise.all([
      this.prisma.staff.findMany({
        where: evaluatedIds.length > 0 ? { id: { notIn: evaluatedIds } } : {},
        select: { name: true, staffcode: true },
        orderBy: { name: 'asc' },
        take: 50,
      }),
      this.prisma.staff.count(),
    ]);

    return JSON.stringify({
      period: period.name,
      totalStaff,
      evaluated: evaluatedIds.length,
      unevaluated: totalStaff - evaluatedIds.length,
      list: unevaluated.map((s) => ({ name: s.name, code: s.staffcode })),
    });
  }

  private async getGroupMembers(groupName: string): Promise<string> {
    const group = await this.prisma.group.findFirst({
      where: { name: { contains: groupName, mode: 'insensitive' } },
      include: {
        staffGroups: {
          include: {
            staff: {
              select: { id: true, name: true, staffcode: true, position: true },
            },
          },
        },
      },
    });

    if (!group)
      return JSON.stringify({ error: `Không tìm thấy nhóm "${groupName}".` });

    return JSON.stringify({
      groupName: group.name,
      memberCount: group.staffGroups.length,
      members: group.staffGroups.map((sg) => ({
        name: sg.staff.name,
        code: sg.staff.staffcode,
        position: sg.staff.position,
      })),
    });
  }

  private async getEvaluationStats(): Promise<string> {
    const period = await this.prisma.evaluationPeriod.findFirst({
      where: { status: 'active' },
    });
    if (!period) return JSON.stringify({ message: 'Không có kỳ đánh giá đang hoạt động.' });

    const [totalEvals, avgResult, totalStaff, reviewerCount] =
      await Promise.all([
        this.prisma.evaluation.count({ where: { periodid: period.id } }),
        this.prisma.evaluation.aggregate({
          where: { periodid: period.id },
          _avg: { point: true },
        }),
        this.prisma.staff.count(),
        this.prisma.evaluation
          .findMany({
            where: { periodid: period.id },
            select: { reviewerid: true },
            distinct: ['reviewerid'],
          })
          .then((r) => r.length),
      ]);

    return JSON.stringify({
      period: period.name,
      totalEvaluations: totalEvals,
      averageScore: avgResult._avg.point
        ? Number(avgResult._avg.point.toFixed(2))
        : null,
      totalStaff,
      staffEvaluated: reviewerCount,
      staffNotEvaluated: totalStaff - reviewerCount,
      completionRate: totalStaff
        ? `${((reviewerCount / totalStaff) * 100).toFixed(1)}%`
        : '0%',
    });
  }

  private async searchStaff(keyword: string): Promise<string> {
    const staff = await this.prisma.staff.findMany({
      where: {
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { staffcode: { contains: keyword, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        staffcode: true,
        position: true,
        academicrank: true,
        academicdegree: true,
        staffGroups: {
          include: { group: { select: { name: true } } },
        },
      },
      take: 20,
    });

    if (staff.length === 0)
      return JSON.stringify({ message: `Không tìm thấy nhân viên "${keyword}".` });

    return JSON.stringify({
      count: staff.length,
      results: staff.map((s) => ({
        name: s.name,
        code: s.staffcode,
        position: s.position,
        rank: s.academicrank,
        degree: s.academicdegree,
        groups: s.staffGroups.map((sg) => sg.group.name),
      })),
    });
  }

  private async listGroups(): Promise<string> {
    const groups = await this.prisma.group.findMany({
      include: {
        _count: { select: { staffGroups: true } },
        organizationUnit: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return JSON.stringify({
      totalGroups: groups.length,
      groups: groups.map((g) => ({
        name: g.name,
        unit: g.organizationUnit?.name ?? null,
        memberCount: g._count.staffGroups,
      })),
    });
  }

  private async getGroupEvaluationStats(groupName: string): Promise<string> {
    const period = await this.prisma.evaluationPeriod.findFirst({
      where: { status: 'active' },
    });
    if (!period) return JSON.stringify({ message: 'Không có kỳ đánh giá đang hoạt động.' });

    const group = await this.prisma.group.findFirst({
      where: { name: { contains: groupName, mode: 'insensitive' } },
    });
    if (!group)
      return JSON.stringify({ error: `Không tìm thấy nhóm "${groupName}".` });

    const [totalEvals, avgResult, members] = await Promise.all([
      this.prisma.evaluation.count({
        where: { periodid: period.id, groupid: group.id },
      }),
      this.prisma.evaluation.aggregate({
        where: { periodid: period.id, groupid: group.id },
        _avg: { point: true },
      }),
      this.prisma.staff2Group.count({ where: { groupid: group.id } }),
    ]);

    return JSON.stringify({
      group: group.name,
      period: period.name,
      totalMembers: members,
      totalEvaluations: totalEvals,
      averageScore: avgResult._avg.point
        ? Number(avgResult._avg.point.toFixed(2))
        : null,
    });
  }

  // =========================================================================
  // Phase 2: Write operations
  // =========================================================================

  private async findStaffByName(name: string) {
    return this.prisma.staff.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      select: { id: true, name: true, staffcode: true },
      take: 5,
    });
  }

  private async findGroupByName(name: string) {
    return this.prisma.group.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } },
      select: { id: true, name: true },
    });
  }

  private async assignStaffToGroup(
    staffName: string,
    groupName: string,
    userId: string,
  ): Promise<string> {
    const [staffList, group] = await Promise.all([
      this.findStaffByName(staffName),
      this.findGroupByName(groupName),
    ]);

    if (staffList.length === 0)
      return JSON.stringify({ error: `Không tìm thấy nhân viên "${staffName}".` });
    if (staffList.length > 1)
      return JSON.stringify({
        error: `Tìm thấy nhiều nhân viên khớp "${staffName}". Vui lòng chỉ rõ hơn.`,
        candidates: staffList.map((s) => `${s.name} (${s.staffcode})`),
      });
    if (!group)
      return JSON.stringify({ error: `Không tìm thấy nhóm "${groupName}".` });

    const staff = staffList[0];

    const existing = await this.prisma.staff2Group.findUnique({
      where: { staffid_groupid: { staffid: staff.id, groupid: group.id } },
    });
    if (existing)
      return JSON.stringify({
        message: `${staff.name} đã thuộc nhóm ${group.name} rồi.`,
      });

    await this.prisma.staff2Group.create({
      data: { staffid: staff.id, groupid: group.id },
    });

    await this.audit.log({
      userId,
      action: 'assignStaffToGroup',
      target: `staff:${staff.id}(${staff.name}) → group:${group.id}(${group.name})`,
      details: { staffId: staff.id, groupId: group.id },
    });

    return JSON.stringify({
      success: true,
      message: `Đã thêm ${staff.name} vào nhóm ${group.name}.`,
    });
  }

  private async removeStaffFromGroup(
    staffName: string,
    groupName: string,
    userId: string,
  ): Promise<string> {
    const [staffList, group] = await Promise.all([
      this.findStaffByName(staffName),
      this.findGroupByName(groupName),
    ]);

    if (staffList.length === 0)
      return JSON.stringify({ error: `Không tìm thấy nhân viên "${staffName}".` });
    if (staffList.length > 1)
      return JSON.stringify({
        error: `Tìm thấy nhiều nhân viên khớp "${staffName}". Vui lòng chỉ rõ hơn.`,
        candidates: staffList.map((s) => `${s.name} (${s.staffcode})`),
      });
    if (!group)
      return JSON.stringify({ error: `Không tìm thấy nhóm "${groupName}".` });

    const staff = staffList[0];

    const existing = await this.prisma.staff2Group.findUnique({
      where: { staffid_groupid: { staffid: staff.id, groupid: group.id } },
    });
    if (!existing)
      return JSON.stringify({
        error: `${staff.name} không thuộc nhóm ${group.name}.`,
      });

    await this.prisma.staff2Group.delete({
      where: { id: existing.id },
    });

    await this.audit.log({
      userId,
      action: 'removeStaffFromGroup',
      target: `staff:${staff.id}(${staff.name}) ← group:${group.id}(${group.name})`,
      details: { staffId: staff.id, groupId: group.id, rollbackId: existing.id },
    });

    return JSON.stringify({
      success: true,
      message: `Đã xóa ${staff.name} khỏi nhóm ${group.name}.`,
    });
  }

  private async moveStaffBetweenGroups(
    staffName: string,
    fromGroupName: string,
    toGroupName: string,
    userId: string,
  ): Promise<string> {
    const [staffList, fromGroup, toGroup] = await Promise.all([
      this.findStaffByName(staffName),
      this.findGroupByName(fromGroupName),
      this.findGroupByName(toGroupName),
    ]);

    if (staffList.length === 0)
      return JSON.stringify({ error: `Không tìm thấy nhân viên "${staffName}".` });
    if (staffList.length > 1)
      return JSON.stringify({
        error: `Tìm thấy nhiều nhân viên khớp "${staffName}". Vui lòng chỉ rõ hơn.`,
        candidates: staffList.map((s) => `${s.name} (${s.staffcode})`),
      });
    if (!fromGroup)
      return JSON.stringify({ error: `Không tìm thấy nhóm nguồn "${fromGroupName}".` });
    if (!toGroup)
      return JSON.stringify({ error: `Không tìm thấy nhóm đích "${toGroupName}".` });

    const staff = staffList[0];

    const existing = await this.prisma.staff2Group.findUnique({
      where: {
        staffid_groupid: { staffid: staff.id, groupid: fromGroup.id },
      },
    });
    if (!existing)
      return JSON.stringify({
        error: `${staff.name} không thuộc nhóm ${fromGroup.name}.`,
      });

    await this.prisma.$transaction([
      this.prisma.staff2Group.delete({ where: { id: existing.id } }),
      this.prisma.staff2Group.create({
        data: { staffid: staff.id, groupid: toGroup.id },
      }),
    ]);

    await this.audit.log({
      userId,
      action: 'moveStaffBetweenGroups',
      target: `staff:${staff.id}(${staff.name}) group:${fromGroup.id}(${fromGroup.name}) → group:${toGroup.id}(${toGroup.name})`,
      details: {
        staffId: staff.id,
        fromGroupId: fromGroup.id,
        toGroupId: toGroup.id,
      },
    });

    return JSON.stringify({
      success: true,
      message: `Đã chuyển ${staff.name} từ nhóm ${fromGroup.name} sang nhóm ${toGroup.name}.`,
    });
  }

  // =========================================================================
  // User tools (personal data — available to all authenticated users)
  // =========================================================================

  private async resolveStaffId(userId: string): Promise<number | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { staffId: true },
    });
    return profile?.staffId ?? null;
  }

  private async getMyReviewerCount(userId: string): Promise<string> {
    const staffId = await this.resolveStaffId(userId);
    if (!staffId)
      return JSON.stringify({ error: 'Không tìm thấy thông tin nhân viên của bạn.' });

    const myGroups = await this.prisma.staff2Group.findMany({
      where: { staffid: staffId },
      select: {
        group: {
          select: {
            id: true,
            name: true,
            staffGroups: {
              select: { staffid: true },
            },
          },
        },
      },
    });

    const groupDetails = myGroups.map((sg) => {
      const otherMembers = sg.group.staffGroups.filter((m) => m.staffid !== staffId);
      return {
        groupName: sg.group.name,
        reviewerCount: otherMembers.length,
      };
    });

    const uniqueReviewerIds = new Set<number>();
    for (const sg of myGroups) {
      for (const m of sg.group.staffGroups) {
        if (m.staffid !== staffId) uniqueReviewerIds.add(m.staffid);
      }
    }

    return JSON.stringify({
      totalUniqueReviewers: uniqueReviewerIds.size,
      byGroup: groupDetails,
    });
  }

  private async getMyScores(userId: string): Promise<string> {
    const staffId = await this.resolveStaffId(userId);
    if (!staffId)
      return JSON.stringify({ error: 'Không tìm thấy thông tin nhân viên của bạn.' });

    const evaluations = await this.prisma.evaluation.findMany({
      where: { evaluateeid: staffId },
      select: {
        point: true,
        period: { select: { id: true, name: true, status: true } },
        question: { select: { id: true, title: true } },
        group: { select: { name: true } },
      },
      orderBy: [{ periodid: 'desc' }, { questionid: 'asc' }],
    });

    if (evaluations.length === 0)
      return JSON.stringify({ message: 'Chưa có dữ liệu đánh giá nào cho bạn.' });

    const byPeriod = new Map<number, {
      name: string;
      status: string;
      criteria: Map<number, { title: string; points: number[]; groups: Set<string> }>;
    }>();

    for (const ev of evaluations) {
      if (!byPeriod.has(ev.period.id)) {
        byPeriod.set(ev.period.id, {
          name: ev.period.name,
          status: ev.period.status,
          criteria: new Map(),
        });
      }
      const period = byPeriod.get(ev.period.id)!;

      if (!period.criteria.has(ev.question.id)) {
        period.criteria.set(ev.question.id, {
          title: ev.question.title,
          points: [],
          groups: new Set(),
        });
      }
      const criterion = period.criteria.get(ev.question.id)!;
      criterion.points.push(ev.point);
      criterion.groups.add(ev.group.name);
    }

    const result = Array.from(byPeriod.values()).map((period) => {
      const criteria = Array.from(period.criteria.values()).map((c) => {
        const avg = c.points.reduce((a, b) => a + b, 0) / c.points.length;
        return {
          title: c.title,
          averageScore: Number(avg.toFixed(2)),
          reviewCount: c.points.length,
          groups: Array.from(c.groups),
        };
      });

      const allPoints = criteria.flatMap((c) =>
        Array(c.reviewCount).fill(c.averageScore),
      );
      const overallAvg =
        allPoints.length > 0
          ? Number(
              (allPoints.reduce((a, b) => a + b, 0) / allPoints.length).toFixed(2),
            )
          : null;

      return {
        period: period.name,
        status: period.status,
        overallAverage: overallAvg,
        criteria,
      };
    });

    return JSON.stringify({ periods: result });
  }
}
