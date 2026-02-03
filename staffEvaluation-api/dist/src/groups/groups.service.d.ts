import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto, UpdateGroupMembersDto } from './dto/groups.dto';
export declare class GroupsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        organizationUnit: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        name: string;
        organizationunitid: number | null;
    })[]>;
    findOne(id: number): Promise<{
        organizationUnit: {
            id: number;
            name: string;
        } | null;
        staffGroups: ({
            staff: {
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
            };
        } & {
            id: number;
            staffid: number;
            groupid: number;
        })[];
    } & {
        id: number;
        name: string;
        organizationunitid: number | null;
    }>;
    getMembers(id: number): Promise<{
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
    }[]>;
    create(dto: CreateGroupDto): Promise<{
        organizationUnit: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        name: string;
        organizationunitid: number | null;
    }>;
    update(id: number, dto: UpdateGroupDto): Promise<{
        organizationUnit: {
            id: number;
            name: string;
        } | null;
    } & {
        id: number;
        name: string;
        organizationunitid: number | null;
    }>;
    updateMembers(id: number, dto: UpdateGroupMembersDto): Promise<{
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
    }[]>;
    remove(id: number): Promise<{
        id: number;
        name: string;
        organizationunitid: number | null;
    }>;
}
