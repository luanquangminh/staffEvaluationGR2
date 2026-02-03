"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationUnitsModule = void 0;
const common_1 = require("@nestjs/common");
const organization_units_service_1 = require("./organization-units.service");
const organization_units_controller_1 = require("./organization-units.controller");
let OrganizationUnitsModule = class OrganizationUnitsModule {
};
exports.OrganizationUnitsModule = OrganizationUnitsModule;
exports.OrganizationUnitsModule = OrganizationUnitsModule = __decorate([
    (0, common_1.Module)({
        controllers: [organization_units_controller_1.OrganizationUnitsController],
        providers: [organization_units_service_1.OrganizationUnitsService],
        exports: [organization_units_service_1.OrganizationUnitsService],
    })
], OrganizationUnitsModule);
//# sourceMappingURL=organization-units.module.js.map