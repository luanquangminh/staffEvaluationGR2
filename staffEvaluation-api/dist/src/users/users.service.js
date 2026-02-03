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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfiles() {
        return this.prisma.profile.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        createdAt: true,
                    },
                },
                staff: true,
            },
        });
    }
    async getProfile(userId) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            include: {
                staff: true,
            },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return profile;
    }
    async linkStaff(dto) {
        const profile = await this.prisma.profile.findUnique({
            where: { id: dto.profileId },
        });
        if (!profile) {
            throw new common_1.NotFoundException('Profile not found');
        }
        const existingLink = await this.prisma.profile.findUnique({
            where: { staffId: dto.staffId },
        });
        if (existingLink && existingLink.id !== dto.profileId) {
            throw new common_1.ConflictException('Staff is already linked to another profile');
        }
        return this.prisma.profile.update({
            where: { id: dto.profileId },
            data: { staffId: dto.staffId },
            include: {
                staff: true,
            },
        });
    }
    async getUsersWithRoles() {
        return this.prisma.user.findMany({
            include: {
                roles: true,
                profile: {
                    include: {
                        staff: true,
                    },
                },
            },
        });
    }
    async addRole(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const existingRole = await this.prisma.userRole.findUnique({
            where: {
                userId_role: {
                    userId,
                    role: dto.role,
                },
            },
        });
        if (existingRole) {
            throw new common_1.ConflictException('User already has this role');
        }
        return this.prisma.userRole.create({
            data: {
                userId,
                role: dto.role,
            },
        });
    }
    async removeRole(userId, role) {
        const userRole = await this.prisma.userRole.findUnique({
            where: {
                userId_role: {
                    userId,
                    role: role,
                },
            },
        });
        if (!userRole) {
            throw new common_1.NotFoundException('Role not found for this user');
        }
        return this.prisma.userRole.delete({
            where: { id: userRole.id },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map