import { OrganizationUnitsService } from './organization-units.service';
import { CreateOrganizationUnitDto, UpdateOrganizationUnitDto } from './dto/organization-units.dto';
export declare class OrganizationUnitsController {
    private organizationUnitsService;
    constructor(organizationUnitsService: OrganizationUnitsService);
    findAll(): Promise<{
        id: number;
        name: string;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        name: string;
    }>;
    create(dto: CreateOrganizationUnitDto): Promise<{
        id: number;
        name: string;
    }>;
    update(id: number, dto: UpdateOrganizationUnitDto): Promise<{
        id: number;
        name: string;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string;
    }>;
}
