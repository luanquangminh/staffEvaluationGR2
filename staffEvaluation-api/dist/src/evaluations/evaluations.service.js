"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EvaluationsService = class EvaluationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const where = {};
        if (query?.groupId)
            where.groupid = query.groupId;
        if (query?.reviewerId)
            where.reviewerid = query.reviewerId;
        if (query?.victimId)
            where.victimid = query.victimId;
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
    async findByReviewer(staffId, groupId) {
        const where = { reviewerid: staffId };
        if (groupId)
            where.groupid = groupId;
        return this.prisma.evaluation.findMany({
            where,
            include: {
                victim: true,
                question: true,
            },
        });
    }
    async findGroupsByStaff(staffId) {
        const staffGroups = await this.prisma.staff2Group.findMany({
            where: { staffid: staffId },
            include: {
                group: true,
            },
        });
        return staffGroups.map((sg) => sg.group);
    }
    async findColleagues(groupId, myStaffId) {
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
    async bulkUpsert(dto, reviewerStaffId) {
        if (!reviewerStaffId) {
            throw new common_1.ForbiddenException('Staff ID is required');
        }
        if (reviewerStaffId === dto.victimId) {
            throw new common_1.ForbiddenException('Cannot evaluate yourself');
        }
        const reviewerInGroup = await this.prisma.staff2Group.findFirst({
            where: { staffid: reviewerStaffId, groupid: dto.groupId },
        });
        if (!reviewerInGroup) {
            throw new common_1.ForbiddenException('You are not a member of this group');
        }
        const victimInGroup = await this.prisma.staff2Group.findFirst({
            where: { staffid: dto.victimId, groupid: dto.groupId },
        });
        if (!victimInGroup) {
            throw new common_1.BadRequestException('Target staff is not a member of this group');
        }
        for (const point of Object.values(dto.evaluations)) {
            if (typeof point !== 'number' || point < 0 || point > 10 || !Number.isFinite(point)) {
                throw new common_1.BadRequestException('All evaluation points must be numbers between 0 and 10');
            }
        }
        const results = await this.prisma.$transaction(Object.entries(dto.evaluations).map(([questionIdStr, point]) => {
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
        }));
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
};
exports.EvaluationsService = EvaluationsService;
exports.EvaluationsService = EvaluationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EvaluationsService);
//# sourceMappingURL=evaluations.service.js.map