import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';
export declare class StaffService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        organizationUnit: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        name: string | null;
        emailh: string | null;
        emails: string | null;
        staffcode: string | null;
        sex: number | null;
        birthday: string | null;
        mobile: string | null;
        academicrank: string | null;
        academicdegree: string | null;
        organizationunitid: number | null;
        bidv: string | null;
    })[]>;
    findOne(id: number): Promise<{
        organizationUnit: {
            id: number;
            name: string;
        } | null;
        staffGroups: ({
            group: {
                id: number;
                name: string;
                organizationunitid: number | null;
            };
        } & {
            id: number;
            staffid: number;
            groupid: number;
        })[];
    } & {
        id: number;
        name: string | null;
        emailh: string | null;
        emails: string | null;
        staffcode: string | null;
        sex: number | null;
        birthday: string | null;
        mobile: string | null;
        academicrank: string | null;
        academicdegree: string | null;
        organizationunitid: number | null;
        bidv: string | null;
    }>;
    create(dto: CreateStaffDto): Promise<{
        organizationUnit: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        name: string | null;
        emailh: string | null;
        emails: string | null;
        staffcode: string | null;
        sex: number | null;
        birthday: string | null;
        mobile: string | null;
        academicrank: string | null;
        academicdegree: string | null;
        organizationunitid: number | null;
        bidv: string | null;
    }>;
    update(id: number, dto: UpdateStaffDto, user: any): Promise<{
        organizationUnit: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        name: string | null;
        emailh: string | null;
        emails: string | null;
        staffcode: string | null;
        sex: number | null;
        birthday: string | null;
        mobile: string | null;
        academicrank: string | null;
        academicdegree: string | null;
        organizationunitid: number | null;
        bidv: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        name: string | null;
        emailh: string | null;
        emails: string | null;
        staffcode: string | null;
        sex: number | null;
        birthday: string | null;
        mobile: string | null;
        academicrank: string | null;
        academicdegree: string | null;
        organizationunitid: number | null;
        bidv: string | null;
    }>;
}
