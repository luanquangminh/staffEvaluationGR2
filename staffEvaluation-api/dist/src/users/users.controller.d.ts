import { UsersService } from './users.service';
import { LinkStaffDto, AddRoleDto } from './dto/users.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfiles(): Promise<({
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
        } | null;
        user: {
            id: string;
            email: string;
            createdAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        staffId: number | null;
    })[]>;
    getMyProfile(user: any): Promise<{
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
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        staffId: number | null;
    }>;
    linkStaff(dto: LinkStaffDto): Promise<{
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
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        staffId: number | null;
    }>;
    getUsersWithRoles(): Promise<({
        profile: ({
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
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            staffId: number | null;
        }) | null;
        roles: {
            id: string;
            createdAt: Date;
            userId: string;
            role: import("@prisma/client").$Enums.AppRole;
        }[];
    } & {
        id: string;
        email: string;
        passwordHash: string;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    addRole(userId: string, dto: AddRoleDto): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        role: import("@prisma/client").$Enums.AppRole;
    }>;
    removeRole(userId: string, role: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        role: import("@prisma/client").$Enums.AppRole;
    }>;
}
