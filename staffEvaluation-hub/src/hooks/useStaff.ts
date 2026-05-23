import { useQuery, useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export type {
  Staff,
  OrganizationUnit,
  Group,
  Staff2Group,
  Question,
  Evaluation,
  EvaluationPeriod,
  EvaluationWithRelations,
  EvaluationsPage,
  PeriodStatus,
} from '@/types/api';

import type {
  Staff,
  OrganizationUnit,
  Group,
  Staff2Group,
  Question,
  Evaluation,
  EvaluationPeriod,
  EvaluationWithRelations,
  EvaluationsPage,
} from '@/types/api';

function buildQuery(base: string, params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) searchParams.set(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.staff,
    queryFn: () => api.get<Staff[]>('/staff'),
  });
}

export function useOrganizationUnits() {
  return useQuery({
    queryKey: queryKeys.organizationUnits,
    queryFn: () => api.get<OrganizationUnit[]>('/organization-units'),
  });
}

export function useGroups() {
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => api.get<Group[]>('/groups'),
  });
}

export function useStaff2Groups() {
  return useQuery({
    queryKey: queryKeys.staff2groups,
    queryFn: () => api.get<Staff2Group[]>('/evaluations/staff2groups'),
  });
}

export function useQuestions() {
  return useQuery({
    queryKey: queryKeys.questions,
    queryFn: () => api.get<Question[]>('/questions'),
  });
}

export function useActiveQuestions() {
  return useQuery({
    queryKey: queryKeys.activeQuestions,
    queryFn: () => api.get<Question[]>('/questions/active'),
  });
}

export function useActivePeriods() {
  return useQuery({
    queryKey: queryKeys.activePeriods,
    queryFn: () => api.get<EvaluationPeriod[]>('/evaluation-periods/active'),
  });
}

export function useMyGroups(staffId: number | null) {
  return useQuery({
    queryKey: queryKeys.myGroups(staffId),
    queryFn: () => api.get<Group[]>('/evaluations/my-groups'),
    enabled: !!staffId,
  });
}

export function useColleaguesInGroup(groupId: number | null, myStaffId: number | null) {
  return useQuery({
    queryKey: queryKeys.colleagues(groupId, myStaffId),
    queryFn: () => api.get<Staff[]>(`/evaluations/colleagues/${groupId}`),
    enabled: !!groupId && !!myStaffId,
  });
}

export function useMyEvaluations(groupId: number | null, periodId?: number | null) {
  return useQuery({
    queryKey: queryKeys.myEvaluations(groupId, periodId),
    queryFn: () => api.get<Evaluation[]>(buildQuery('/evaluations/my', { groupId, periodId })),
    enabled: !!groupId,
  });
}

export function useAllPeriods() {
  return useQuery({
    queryKey: queryKeys.allPeriods,
    queryFn: () => api.get<EvaluationPeriod[]>('/evaluation-periods'),
  });
}

export function useReceivedEvaluations(periodId: number | null, showReviewer = false) {
  return useQuery({
    queryKey: [...queryKeys.receivedEvaluations(periodId), showReviewer],
    queryFn: () => api.get<EvaluationWithRelations[]>(
      buildQuery('/evaluations/received', { periodId, ...(showReviewer ? { showReviewer: true } : {}) }),
    ),
    enabled: !!periodId,
  });
}

export function useGivenEvaluations(periodId: number | null, groupId?: number | null) {
  return useQuery({
    queryKey: queryKeys.givenEvaluations(periodId, groupId),
    queryFn: () => api.get<EvaluationWithRelations[]>(buildQuery('/evaluations/my', { periodId, groupId })),
    enabled: !!periodId,
  });
}

export function useAllEvaluations(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.allEvaluations(periodId),
    queryFn: () => api.get<EvaluationsPage>(buildQuery('/evaluations', { periodId })),
    enabled: !!periodId,
  });
}

export function useStaffReceivedEvaluations(staffId: number | null, periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.staffReceivedEvaluations(staffId, periodId),
    queryFn: () => api.get<EvaluationWithRelations[]>(buildQuery(`/evaluations/staff/${staffId}/received`, { periodId })),
    enabled: !!staffId && !!periodId,
  });
}

export function useMultiPeriodReceivedEvaluations(periodIds: number[], enabled = true) {
  return useQueries({
    queries: periodIds.map(periodId => ({
      queryKey: queryKeys.receivedEvaluations(periodId),
      queryFn: () => api.get<EvaluationWithRelations[]>(buildQuery('/evaluations/received', { periodId })),
      enabled: enabled && !!periodId,
    })),
  });
}
