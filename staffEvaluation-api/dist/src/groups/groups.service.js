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
exports.GroupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GroupsService = class GroupsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.group.findMany({
            orderBy: { id: 'asc' },
            include: {
                organizationUnit: true,
            },
        });
    }
    async findOne(id) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                organizationUnit: true,
                staffGroups: {
                    include: {
                        staff: true,
                    },
                },
            },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Group with ID ${id} not found`);
        }
        return group;
    }
    async getMembers(id) {
        const group = await this.prisma.group.findUnique({
            where: { id },
            include: {
                staffGroups: {
                    include: {
                        staff: true,
                    },
                },
            },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Group with ID ${id} not found`);
        }
        return group.staffGroups.map((sg) => sg.staff);
    }
    async create(dto) {
        return this.prisma.group.create({
            data: dto,
            include: {
                organizationUnit: true,
            },
        });
    }
    async update(id, dto) {
        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) {
            throw new common_1.NotFoundException(`Group with ID ${id} not found`);
        }
        return this.prisma.group.update({
            where: { id },
            data: dto,
            include: {
                organizationUnit: true,
            },
        });
    }
    async updateMembers(id, dto) {
        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) {
            throw new common_1.NotFoundException(`Group with ID ${id} not found`);
        }
        await this.prisma.staff2Group.deleteMany({
            where: { groupid: id },
        });
        if (dto.staffIds.length > 0) {
            await this.prisma.staff2Group.createMany({
                data: dto.staffIds.map((staffid) => ({
                    staffid,
                    groupid: id,
                })),
            });
        }
        return this.getMembers(id);
    }
    async remove(id) {
        const group = await this.prisma.group.findUnique({ where: { id } });
        if (!group) {
            throw new common_1.NotFoundException(`Group with ID ${id} not found`);
        }
        return this.prisma.group.delete({ where: { id } });
    }
};
exports.GroupsService = GroupsService;
exports.GroupsService = GroupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GroupsService);
//# sourceMappingURL=groups.service.js.map