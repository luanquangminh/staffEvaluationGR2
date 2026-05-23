/**
 * Source of truth: staffEvaluation-api/prisma/schema.prisma
 * These interfaces mirror the shapes returned by the NestJS API.
 * Keep field names in sync with Prisma models (snake_case is preserved
 * for id fields like `groupid`, `reviewerid` to match the API response).
 *
 * If you add a field here, grep the matching Prisma model before editing
 * to make sure you're not introducing drift.
 */

export interface OrganizationUnit {
  id: number;
  name: string;
}

export interface Staff {
  id: number;
  name: string;
  homeEmail: string | null;
  schoolEmail: string | null;
  staffcode: string;
  gender: 'male' | 'female' | null;
  birthday: string | null;
  mobile: string | null;
  academicrank: string | null;
  academicdegree: string | null;
  position: string | null;
  avatar: string | null;
  isPartyMember: boolean;
  organizationunitid: number | null;
  bidv: string | null;
  organizationUnit?: OrganizationUnit | null;
}

export interface Group {
  id: number;
  name: string;
  organizationunitid: number | null;
  organizationUnit?: OrganizationUnit | null;
}

export interface Staff2Group {
  id: number;
  staffid: number;
  groupid: number;
  staff?: Staff;
  group?: Group;
}

export interface Question {
  id: number;
  title: string;
  description: string | null;
  isActive: boolean;
}

export type PeriodStatus = 'draft' | 'active' | 'closed';

export interface EvaluationPeriod {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  isAnonymous: boolean;
}

export interface Evaluation {
  id: number;
  reviewerid: number;
  evaluateeid: number;
  groupid: number;
  questionid: number;
  periodid: number;
  point: number | null;
  modifieddate: string | null;
}

export interface EvaluationWithRelations extends Evaluation {
  reviewer?: Staff;
  evaluatee?: Staff;
  question?: Question;
  group?: Group;
  period?: EvaluationPeriod;
}

export interface EvaluationsPage {
  data: EvaluationWithRelations[];
  total: number;
  truncated: boolean;
}
