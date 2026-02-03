import { EvaluationsService } from './evaluations.service';
import { BulkEvaluationDto } from './dto/evaluations.dto';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
export declare class EvaluationsController {
    private evaluationsService;
    constructor(evaluationsService: EvaluationsService);
    private ensureStaffLinked;
    findAll(groupId?: string, reviewerId?: string, victimId?: string): Promise<({
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
    findMy(user: JwtPayload & {
        id: string;
    }, groupId?: string): Promise<({
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
    findMyGroups(user: JwtPayload & {
        id: string;
    }): Promise<{
        id: number;
        name: string;
        organizationunitid: number | null;
    }[]>;
    findColleagues(groupId: number, user: JwtPayload & {
        id: string;
    }): Promise<{
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
    bulkUpsert(dto: BulkEvaluationDto, user: JwtPayload & {
        id: string;
    }): Promise<{
        id: number;
        groupid: number | null;
        reviewerid: number | null;
        victimid: number | null;
        modifieddate: Date | null;
        point: number | null;
        questionid: number | null;
    }[]>;
}
