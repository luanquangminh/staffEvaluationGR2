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
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StaffService = class StaffService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.staff.findMany({
            orderBy: { id: 'asc' },
            include: {
                organizationUnit: true,
            },
        });
    }
    async findOne(id) {
        const staff = await this.prisma.staff.findUnique({
            where: { id },
            include: {
                organizationUnit: true,
                staffGroups: {
                    include: {
                        group: true,
                    },
                },
            },
        });
        if (!staff) {
            throw new common_1.NotFoundException(`Staff with ID ${id} not found`);
        }
        return staff;
    }
    async create(dto) {
        return this.prisma.staff.create({
            data: dto,
            include: {
                organizationUnit: true,
            },
        });
    }
    async update(id, dto, user) {
        const staff = await this.prisma.staff.findUnique({ where: { id } });
        if (!staff) {
            throw new common_1.NotFoundException(`Staff with ID ${id} not found`);
        }
        const isAdmin = user.roles?.includes('admin');
        const isOwnProfile = user.staffId === id;
        if (!isAdmin && !isOwnProfile) {
            throw new common_1.ForbiddenException('You can only update your own profile');
        }
        return this.prisma.staff.update({
            where: { id },
            data: dto,
            include: {
                organizationUnit: true,
            },
        });
    }
    async remove(id) {
        const staff = await this.prisma.staff.findUnique({ where: { id } });
        if (!staff) {
            throw new common_1.NotFoundException(`Staff with ID ${id} not found`);
        }
        return this.prisma.staff.delete({ where: { id } });
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StaffService);
//# sourceMappingURL=staff.service.js.map