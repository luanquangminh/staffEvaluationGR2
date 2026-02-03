import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationUnitDto, UpdateOrganizationUnitDto } from './dto/organization-units.dto';
export declare class OrganizationUnitsService {
    private prisma;
    constructor(prisma: PrismaService);
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
