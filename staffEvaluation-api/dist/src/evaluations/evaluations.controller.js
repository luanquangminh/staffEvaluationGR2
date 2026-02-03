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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluationsController = void 0;
const common_1 = require("@nestjs/common");
const evaluations_service_1 = require("./evaluations.service");
const evaluations_dto_1 = require("./dto/evaluations.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const swagger_1 = require("@nestjs/swagger");
let EvaluationsController = class EvaluationsController {
    evaluationsService;
    constructor(evaluationsService) {
        this.evaluationsService = evaluationsService;
    }
    ensureStaffLinked(user) {
        if (!user.staffId) {
            throw new common_1.ForbiddenException('User is not linked to a staff member. Please link your account to a staff profile first.');
        }
        return user.staffId;
    }
    findAll(groupId, reviewerId, victimId) {
        return this.evaluationsService.findAll({
            groupId: groupId ? parseInt(groupId, 10) : undefined,
            reviewerId: reviewerId ? parseInt(reviewerId, 10) : undefined,
            victimId: victimId ? parseInt(victimId, 10) : undefined,
        });
    }
    findMy(user, groupId) {
        const staffId = this.ensureStaffLinked(user);
        return this.evaluationsService.findByReviewer(staffId, groupId ? parseInt(groupId, 10) : undefined);
    }
    findMyGroups(user) {
        const staffId = this.ensureStaffLinked(user);
        return this.evaluationsService.findGroupsByStaff(staffId);
    }
    findColleagues(groupId, user) {
        const staffId = this.ensureStaffLinked(user);
        return this.evaluationsService.findColleagues(groupId, staffId);
    }
    getStaff2Groups() {
        return this.evaluationsService.getStaff2Groups();
    }
    bulkUpsert(dto, user) {
        const staffId = this.ensureStaffLinked(user);
        return this.evaluationsService.bulkUpsert(dto, staffId);
    }
};
exports.EvaluationsController = EvaluationsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('admin', 'moderator'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get all evaluations (admin/moderator only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of evaluations' }),
    __param(0, (0, common_1.Query)('groupId')),
    __param(1, (0, common_1.Query)('reviewerId')),
    __param(2, (0, common_1.Query)('victimId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], EvaluationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user evaluations' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of user evaluations' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'User not linked to staff' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], EvaluationsController.prototype, "findMy", null);
__decorate([
    (0, common_1.Get)('my-groups'),
    (0, swagger_1.ApiOperation)({ summary: 'Get groups the current user belongs to' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of groups' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'User not linked to staff' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EvaluationsController.prototype, "findMyGroups", null);
__decorate([
    (0, common_1.Get)('colleagues/:groupId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get colleagues in a group for evaluation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of colleagues' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'User not linked to staff' }),
    __param(0, (0, common_1.Param)('groupId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], EvaluationsController.prototype, "findColleagues", null);
__decorate([
    (0, common_1.Get)('staff2groups'),
    (0, roles_decorator_1.Roles)('admin', 'moderator'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get staff to groups mapping (admin/moderator only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Staff to groups mapping' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EvaluationsController.prototype, "getStaff2Groups", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit bulk evaluations' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Evaluations created/updated' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'User not linked to staff' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [evaluations_dto_1.BulkEvaluationDto, Object]),
    __metadata("design:returntype", void 0)
], EvaluationsController.prototype, "bulkUpsert", null);
exports.EvaluationsController = EvaluationsController = __decorate([
    (0, swagger_1.ApiTags)('evaluations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('evaluations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [evaluations_service_1.EvaluationsService])
], EvaluationsController);
//# sourceMappingURL=evaluations.controller.js.map