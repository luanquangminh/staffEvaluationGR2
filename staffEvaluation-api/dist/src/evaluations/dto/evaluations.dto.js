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
exports.EvaluationQueryDto = exports.BulkEvaluationDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
function validateEvaluationPoints(evaluations) {
    for (const point of Object.values(evaluations)) {
        if (typeof point !== 'number' || point < 0 || point > 10 || !Number.isFinite(point)) {
            return false;
        }
    }
    return true;
}
class BulkEvaluationDto {
    groupId;
    victimId;
    evaluations;
}
exports.BulkEvaluationDto = BulkEvaluationDto;
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BulkEvaluationDto.prototype, "groupId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], BulkEvaluationDto.prototype, "victimId", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (typeof value !== 'object' || value === null)
            return value;
        if (!validateEvaluationPoints(value)) {
            throw new Error('All evaluation points must be numbers between 0 and 10');
        }
        return value;
    }),
    __metadata("design:type", Object)
], BulkEvaluationDto.prototype, "evaluations", void 0);
class EvaluationQueryDto {
    groupId;
    reviewerId;
    victimId;
}
exports.EvaluationQueryDto = EvaluationQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], EvaluationQueryDto.prototype, "groupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], EvaluationQueryDto.prototype, "reviewerId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], EvaluationQueryDto.prototype, "victimId", void 0);
//# sourceMappingURL=evaluations.dto.js.map