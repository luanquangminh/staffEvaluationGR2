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
exports.OrganizationUnitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let OrganizationUnitsService = class OrganizationUnitsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.organizationUnit.findMany({
            orderBy: { id: 'asc' },
        });
    }
    async findOne(id) {
        const unit = await this.prisma.organizationUnit.findUnique({
            where: { id },
        });
        if (!unit) {
            throw new common_1.NotFoundException(`Organization unit with ID ${id} not found`);
        }
        return unit;
    }
    async create(dto) {
        return this.prisma.organizationUnit.create({
            data: dto,
        });
    }
    async update(id, dto) {
        const unit = await this.prisma.organizationUnit.findUnique({ where: { id } });
        if (!unit) {
            throw new common_1.NotFoundException(`Organization unit with ID ${id} not found`);
        }
        return this.prisma.organizationUnit.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        const unit = await this.prisma.organizationUnit.findUnique({ where: { id } });
        if (!unit) {
            throw new common_1.NotFoundException(`Organization unit with ID ${id} not found`);
        }
        return this.prisma.organizationUnit.delete({ where: { id } });
    }
};
exports.OrganizationUnitsService = OrganizationUnitsService;
exports.OrganizationUnitsService = OrganizationUnitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrganizationUnitsService);
//# sourceMappingURL=organization-units.service.js.map