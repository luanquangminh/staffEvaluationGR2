import { useAuth } from '@/hooks/useAuth';
import { useMyGroups, useActivePeriods, useStaff, useActiveQuestions, Evaluation, Staff2Group, Staff } from '@/hooks/useStaff';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Users, CheckCircle, AlertCircle, TrendingUp, CalendarDays, Clock, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

export default function Dashboard() {
  const { user, staffId, isAdmin, isModerator } = useAuth();
  const navigate = useNavigate();
  const { data: myGroups } = useMyGroups(staffId);
  const { data: activePeriods } = useActivePeriods();
  const canViewStaff2Groups = isAdmin || isModerator;
  const { data: staff2groups } = useQuery<Staff2Group[]>({
    queryKey: queryKeys.staff2groups,
    queryFn: () => api.get<Staff2Group[]>('/evaluations/staff2groups'),
    enabled: canViewStaff2Groups,
  });
  const { data: allStaff } = useStaff();
  const { data: questions } = useActiveQuestions();

  const activePeriod = activePeriods?.[0] ?? null;

  // For regular users: fetch colleagues per group to compute progress
  const groupIds = myGroups?.map(g => g.id) ?? [];
  const colleagueQueries = useQueries({
    queries: (!canViewStaff2Groups && staffId)
      ? groupIds.map(groupId => ({
          queryKey: queryKeys.colleagues(groupId, staffId),
          queryFn: () => api.get<Staff[]>(`/evaluations/colleagues/${groupId}`),
        }))
      : [],
  });

  // Map groupId -> colleague IDs (for regular users)
  const colleaguesByGroup = useMemo(() => {
    if (canViewStaff2Groups || !myGroups) return null;
    const map = new Map<number, number[]>();
    groupIds.forEach((groupId, index) => {
      const data = colleagueQueries[index]?.data;
      if (data) {
        map.set(groupId, data.map(s => s.id));
      }
    });
    return map;
  }, [canViewStaff2Groups, myGroups, groupIds, colleagueQueries]);

  // Fetch evaluations for the active period only (only MY evaluations)
  const { data: evaluations } = useQuery({
    queryKey: queryKeys.myEvaluationsForDashboard(staffId, activePeriod?.id),
    queryFn: () => {
      let path = '/evaluations/my';
      const params: string[] = [];
      if (activePeriod) params.push(`periodId=${activePeriod.id}`);
      if (params.length) path += '?' + params.join('&');
      return api.get<Evaluation[]>(path);
    },
    enabled: !!staffId && !!activePeriod,
  });

  // Fetch evaluations received by me (for my score)
  const { data: receivedEvaluations } = useQuery({
    queryKey: queryKeys.myReceivedEvaluations(staffId, activePeriod?.id),
    queryFn: () => {
      let path = '/evaluations/received';
      if (activePeriod) path += `?periodId=${activePeriod.id}`;
      return api.get<Evaluation[]>(path);
    },
    enabled: !!staffId && !!activePeriod,
  });

  const currentStaff = useMemo(() => {
    return allStaff?.find(s => s.id === staffId);
  }, [allStaff, staffId]);

  // Deadline countdown
  const deadline = useMemo(() => {
    if (!activePeriod) return null;
    const end = new Date(activePeriod.endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      endDate: end.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }),
      startDate: new Date(activePeriod.startDate).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }),
      daysLeft: diffDays,
      isUrgent: diffDays <= 7,
      isExpired: diffDays <= 0,
    };
  }, [activePeriod]);

  // Per-group progress — works for both admin/moderator (staff2groups) and regular users (colleaguesByGroup)
  const groupProgress = useMemo(() => {
    if (!staffId || !myGroups || !evaluations || !questions) return [];

    return myGroups.map(group => {
      let colleagueIds: number[];

      if (canViewStaff2Groups && staff2groups) {
        colleagueIds = staff2groups
          .filter(sg => sg.groupid === group.id && sg.staffid !== staffId)
          .map(sg => sg.staffid);
      } else if (colleaguesByGroup) {
        colleagueIds = colleaguesByGroup.get(group.id) || [];
      } else {
        return null;
      }

      const myEvalsInGroup = evaluations.filter(
        e => e.reviewerid === staffId && e.groupid === group.id
      );

      let evaluatedCount = 0;
      colleagueIds.forEach(cId => {
        const evalsForColleague = myEvalsInGroup.filter(e => e.evaluateeid === cId);
        if (evalsForColleague.length >= (questions?.length || 1)) {
          evaluatedCount++;
        }
      });

      const total = colleagueIds.length;
      const progress = total > 0 ? (evaluatedCount / total) * 100 : 0;

      return {
        group,
        total,
        evaluated: evaluatedCount,
        pending: total - evaluatedCount,
        progress,
      };
    }).filter((g): g is NonNullable<typeof g> => g !== null && g.total > 0);
  }, [staffId, myGroups, evaluations, staff2groups, colleaguesByGroup, questions, canViewStaff2Groups]);

  // Overall stats
  const stats = useMemo(() => {
    const totalColleagues = groupProgress.reduce((sum, g) => sum + g.total, 0);
    const evaluated = groupProgress.reduce((sum, g) => sum + g.evaluated, 0);
    const pending = totalColleagues - evaluated;
    const progress = totalColleagues > 0 ? (evaluated / totalColleagues) * 100 : 0;
    return { totalColleagues, evaluated, pending, progress };
  }, [groupProgress]);

  const myScore = useMemo(() => {
    if (!staffId || !receivedEvaluations) return null;
    const myEvals = receivedEvaluations.filter(e => e.point !== null);
    if (myEvals.length === 0) return null;
    return myEvals.reduce((sum, e) => sum + (e.point || 0), 0) / myEvals.length;
  }, [staffId, receivedEvaluations]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">
              Chào mừng, {currentStaff?.name || 'Giảng viên'}!
            </h2>
            <p className="text-muted-foreground mt-1">
              {currentStaff ? (
                <span className="flex items-center gap-2">
                  {currentStaff.staffcode && <Badge variant="outline">{currentStaff.staffcode}</Badge>}
                  {[currentStaff.academicrank, currentStaff.academicdegree].filter(Boolean).join(' - ')}
                </span>
              ) : (
                user?.email
              )}
            </p>
          </div>
          {isAdmin && (
            <Badge className="bg-primary">Admin</Badge>
          )}
        </div>

        {!staffId && (
          <div className="mt-4 flex items-center gap-2 text-warning">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Tài khoản chưa được liên kết với hồ sơ giảng viên. Vui lòng liên hệ Admin.</span>
          </div>
        )}
      </div>

      {/* Active Period & Deadline */}
      {activePeriod && deadline && (
        <Card className={deadline.isUrgent && !deadline.isExpired ? 'border-orange-400 bg-orange-50/50 dark:bg-orange-950/20' : deadline.isExpired ? 'border-destructive bg-red-50/50 dark:bg-red-950/20' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{activePeriod.name}</CardTitle>
                <Badge variant="default" className="bg-green-600">Đang mở</Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className={`h-4 w-4 ${deadline.isUrgent ? 'text-orange-500' : 'text-muted-foreground'}`} />
                {deadline.isExpired ? (
                  <span className="text-sm font-semibold text-destructive">Đã hết hạn</span>
                ) : (
                  <span className={`text-sm font-semibold ${deadline.isUrgent ? 'text-orange-600' : 'text-foreground'}`}>
                    Còn {deadline.daysLeft} ngày
                  </span>
                )}
              </div>
            </div>
            <CardDescription>
              {deadline.startDate} → {deadline.endDate}
            </CardDescription>
          </CardHeader>
          {!deadline.isExpired && deadline.daysLeft <= 14 && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className={`h-4 w-4 ${deadline.isUrgent ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className={deadline.isUrgent ? 'text-orange-600 font-medium' : 'text-muted-foreground'}>
                  {deadline.daysLeft <= 3
                    ? '⚠️ Sắp hết hạn! Hãy hoàn thành đánh giá ngay.'
                    : deadline.daysLeft <= 7
                      ? 'Gần hết hạn, hãy cố gắng hoàn thành sớm.'
                      : `Hạn chót: ${deadline.endDate}`}
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {!activePeriod && staffId && (
        <Card className="border-muted">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <CalendarDays className="h-5 w-5" />
              <span>Hiện tại không có đợt đánh giá nào đang mở.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Nhóm của tôi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myGroups?.length || 0}</div>
            <p className="text-xs text-muted-foreground">nhóm đã tham gia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đã đánh giá</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.evaluated}</div>
            <p className="text-xs text-muted-foreground">đồng nghiệp hoàn thành</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Chờ đánh giá</CardTitle>
            <ClipboardList className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">đồng nghiệp chưa đánh giá</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Điểm của tôi</CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myScore !== null ? myScore.toFixed(2) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">điểm trung bình nhận được</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      {staffId && stats.totalColleagues > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tiến độ đánh giá tổng thể</CardTitle>
            <CardDescription>
              Đã hoàn thành {stats.evaluated}/{stats.totalColleagues} đồng nghiệp
              {activePeriod ? ` — ${activePeriod.name}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={stats.progress} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {stats.progress.toFixed(0)}% hoàn thành
              {stats.progress >= 100 && ' 🎉'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Per-group Progress */}
      {groupProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tiến độ theo từng nhóm</CardTitle>
            <CardDescription>Chi tiết đánh giá từng nhóm của bạn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupProgress.map(({ group, total, evaluated, progress }) => (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{group.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {progress >= 100 ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Hoàn thành
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {evaluated}/{total}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card>
        <CardHeader>
          <CardTitle>Bắt đầu đánh giá</CardTitle>
          <CardDescription>
            {stats.pending > 0
              ? `Bạn còn ${stats.pending} đồng nghiệp chưa đánh giá`
              : stats.totalColleagues > 0
                ? 'Bạn đã hoàn thành đánh giá tất cả đồng nghiệp! 🎉'
                : 'Chọn nhóm và bắt đầu đánh giá đồng nghiệp của bạn'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/assessment')} disabled={!staffId}>
            <ClipboardList className="mr-2 h-4 w-4" />
            {stats.pending > 0 ? 'Tiếp tục đánh giá' : 'Đi đến trang đánh giá'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
