import { PrismaService } from '../prisma/prisma.service';
import { BulkEvaluationDto } from './dto/evaluations.dto';
export declare class EvaluationsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query?: {
        groupId?: number;
        reviewerId?: number;
        victimId?: number;
    }): Promise<({
        group: {
            id: number;
            name: string;
            organizationunitid: number | null;
        } | null;
        question: {
            id: number;
            title: string;
            description: string | null;
        } | null;
        reviewer: {
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
        victim: {
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
        id: number;
        groupid: number | null;
        reviewerid: number | null;
        victimid: number | null;
        modifieddate: Date | null;
        point: number | null;
        questionid: number | null;
    })[]>;
    findByReviewer(staffId: number, groupId?: number): Promise<({
        question: {
            id: number;
            title: string;
            description: string | null;
        } | null;
        victim: {
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
        id: number;
        groupid: number | null;
        reviewerid: number | null;
        victimid: number | null;
        modifieddate: Date | null;
        point: number | null;
        questionid: number | null;
    })[]>;
    findGroupsByStaff(staffId: number): Promise<{
        id: number;
        name: string;
        organizationunitid: number | null;
    }[]>;
    findColleagues(groupId: number, myStaffId: number): Promise<{
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
    bulkUpsert(dto: BulkEvaluationDto, reviewerStaffId: number): Promise<{
        id: number;
        groupid: number | null;
        reviewerid: number | null;
        victimid: number | null;
        modifieddate: Date | null;
        point: number | null;
        questionid: number | null;
    }[]>;
    getStaff2Groups(): Promise<({
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
        group: {
            id: number;
            name: string;
            organizationunitid: number | null;
        };
    } & {
        id: number;
        staffid: number;
        groupid: number;
    })[]>;
}
