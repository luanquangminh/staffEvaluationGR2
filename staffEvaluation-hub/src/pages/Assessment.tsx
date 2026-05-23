import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMyGroups, useColleaguesInGroup, useActiveQuestions, useActivePeriods, useMyEvaluations, Staff, Evaluation } from '@/hooks/useStaff';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Users, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

const MAX_SCORE = 4;

interface EvaluationData {
  [questionId: number]: number;
}

function parseEvaluationMap(data: Evaluation[]) {
  const evalMap = new Map<string, Map<number, { id: number; point: number }>>();
  data.forEach(e => {
    if (!e.evaluateeid || !e.questionid) return;
    const key = `${e.evaluateeid}`;
    if (!evalMap.has(key)) evalMap.set(key, new Map());
    evalMap.get(key)!.set(e.questionid, { id: e.id, point: e.point ?? 0 });
  });
  return evalMap;
}

export default function Assessment() {
  const { staffId } = useAuth();
  const { data: myGroups, isLoading: loadingGroups, error: groupsError } = useMyGroups(staffId);
  const { data: activePeriods } = useActivePeriods();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const { data: colleagues, error: colleaguesError } = useColleaguesInGroup(selectedGroupId, staffId);
  const { data: questions, error: questionsError } = useActiveQuestions();
  const [selectedColleague, setSelectedColleague] = useState<Staff | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const queryClient = useQueryClient();

  const activePeriod = activePeriods?.[0] ?? null;

  // Use React Query for existing evaluations
  const { data: rawExistingEvals } = useMyEvaluations(selectedGroupId, activePeriod?.id);

  const existingEvaluations = useMemo(
    () => parseEvaluationMap(rawExistingEvals || []),
    [rawExistingEvals],
  );

  // Load existing scores when selecting a colleague
  useEffect(() => {
    if (!selectedColleague) {
      setEvaluations({});
      setIsDirty(false);
      return;
    }

    const colleagueEvals = existingEvaluations.get(`${selectedColleague.id}`);
    if (colleagueEvals) {
      const evalData: EvaluationData = {};
      colleagueEvals.forEach((data, qId) => {
        evalData[qId] = data.point;
      });
      setEvaluations(evalData);
    } else {
      setEvaluations({});
    }
    setIsDirty(false);
  }, [selectedColleague, existingEvaluations]);

  // Warn user before leaving with unsaved changes
  const hasUnsavedChanges = selectedColleague !== null && isDirty;
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  const isColleagueEvaluated = useCallback((colleagueId: number) => {
    return existingEvaluations.has(`${colleagueId}`);
  }, [existingEvaluations]);

  // Memoize sorted colleagues: unevaluated first, then evaluated
  const sortedColleagues = useMemo(() => {
    return [...(colleagues || [])].sort((a, b) => {
      const aEvaluated = isColleagueEvaluated(a.id);
      const bEvaluated = isColleagueEvaluated(b.id);
      if (aEvaluated === bEvaluated) return 0;
      return aEvaluated ? 1 : -1;
    });
  }, [colleagues, isColleagueEvaluated]);

  const handleSave = useCallback(async () => {
    if (!staffId || !selectedColleague || !selectedGroupId || !activePeriod) return;

    const unanswered = (questions || []).filter(q => evaluations[q.id] === undefined || evaluations[q.id] === null);
    if (unanswered.length > 0) {
      toast.error(`Vui lòng chấm điểm tất cả ${unanswered.length} tiêu chí còn thiếu`);
      return;
    }

    setIsSaving(true);

    try {
      const evalPayload: Record<number, number> = {};
      for (const q of questions || []) {
        evalPayload[q.id] = evaluations[q.id];
      }

      await api.post('/evaluations/bulk', {
        groupId: selectedGroupId,
        evaluateeId: selectedColleague.id,
        periodId: activePeriod.id,
        evaluations: evalPayload,
      });

      toast.success('Đã lưu đánh giá thành công!');
      setIsDirty(false);

      // Refresh cache — errors here are non-critical since save already succeeded
      try {
        await queryClient.refetchQueries({ queryKey: queryKeys.myEvaluations(selectedGroupId, activePeriod.id) });
        await queryClient.refetchQueries({ queryKey: queryKeys.myEvaluationsForDashboard(staffId, activePeriod.id) });
      } catch { /* refetch failure is non-critical */ }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Lỗi lưu đánh giá: ' + message);
    } finally {
      setIsSaving(false);
    }
  }, [staffId, selectedColleague, selectedGroupId, activePeriod, questions, evaluations, queryClient]);

  if (!staffId) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-warning">
            <AlertCircle className="h-5 w-5" />
            <p>Tài khoản chưa được liên kết với hồ sơ giảng viên. Vui lòng liên hệ Admin.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activePeriod) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>Hiện tại không có đợt đánh giá nào đang mở. Vui lòng liên hệ Admin.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (groupsError || questionsError) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Lỗi tải dữ liệu. Vui lòng thử lại sau.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 1: Select Group
  if (!selectedGroupId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Chọn nhóm đánh giá</CardTitle>
            <CardDescription>
              Đợt đánh giá: {activePeriod.name} | Bạn thuộc {myGroups?.length || 0} nhóm
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myGroups && myGroups.length > 0 ? (
              <div className="grid gap-3">
                {myGroups.map(g => (
                  <Button
                    key={g.id}
                    variant="outline"
                    className="justify-start h-auto p-4"
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    <Users className="mr-3 h-5 w-5 text-primary" />
                    <span className="font-medium">{g.name}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Bạn chưa được thêm vào nhóm nào</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Select Colleague
  if (!selectedColleague) {
    const currentGroup = myGroups?.find(g => g.id === selectedGroupId);
    const evaluatedCount = sortedColleagues.filter(c => isColleagueEvaluated(c.id)).length;
    const totalCount = sortedColleagues.length;
    const progressPercent = totalCount > 0 ? (evaluatedCount / totalCount) * 100 : 0;

    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => setSelectedGroupId(null)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại chọn nhóm
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Chọn đồng nghiệp để đánh giá</CardTitle>
                <CardDescription>{currentGroup?.name} — {totalCount} đồng nghiệp</CardDescription>
              </div>
              {totalCount > 0 && (
                <Badge variant={progressPercent >= 100 ? 'default' : 'secondary'} className={progressPercent >= 100 ? 'bg-green-600' : ''}>
                  {evaluatedCount}/{totalCount} đã đánh giá
                </Badge>
              )}
            </div>
            {totalCount > 0 && (
              <Progress value={progressPercent} className="h-2 mt-3" />
            )}
          </CardHeader>
          <CardContent>
            {colleaguesError ? (
              <div className="flex items-center gap-3 text-destructive py-4">
                <AlertCircle className="h-5 w-5" />
                <p>Lỗi tải danh sách đồng nghiệp. Vui lòng thử lại.</p>
              </div>
            ) : sortedColleagues.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {sortedColleagues.map(c => {
                  const evaluated = isColleagueEvaluated(c.id);
                  return (
                    <Button
                      key={c.id}
                      variant="outline"
                      className={`justify-start h-auto p-4 relative transition-all ${evaluated
                        ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20 opacity-75 hover:opacity-100'
                        : 'border-orange-300 bg-orange-50/30 dark:bg-orange-950/10 hover:border-primary'
                        }`}
                      onClick={() => setSelectedColleague(c)}
                    >
                      <UserAvatar staff={c} className="h-10 w-10 mr-3" />
                      <div className="text-left flex-1">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.staffcode}</p>
                      </div>
                      {evaluated ? (
                        <Badge variant="default" className="bg-green-600 text-xs gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Đã đánh giá
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Chưa đánh giá
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Không có đồng nghiệp nào trong nhóm này</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Evaluate
  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => setSelectedColleague(null)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <UserAvatar staff={selectedColleague} className="h-14 w-14 text-xl" />
            <div>
              <CardTitle>{selectedColleague.name}</CardTitle>
              <CardDescription>
                {[selectedColleague.academicrank, selectedColleague.academicdegree].filter(Boolean).join(' - ') || selectedColleague.staffcode}
              </CardDescription>
            </div>
            {isColleagueEvaluated(selectedColleague.id) && (
              <Badge variant="secondary" className="ml-auto">Đã đánh giá</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {questions?.map((q, idx) => (
            <div key={q.id} className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  {idx + 1}. {q.title}
                </Label>
                {q.description && (
                  <p className="text-sm text-muted-foreground mt-1">{q.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={evaluations[q.id] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      const newEvals = { ...evaluations };
                      delete newEvals[q.id];
                      setEvaluations(newEvals);
                      setIsDirty(true);
                      return;
                    }
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0 && num <= MAX_SCORE) {
                      setEvaluations({ ...evaluations, [q.id]: Math.round(num * 10) / 10 });
                      setIsDirty(true);
                    }
                  }}
                  min={0}
                  max={MAX_SCORE}
                  step={0.1}
                  placeholder="0 - 4"
                  className="w-24 text-center text-lg font-bold"
                />
                <span className="text-xs text-muted-foreground">/ {MAX_SCORE}.0</span>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <Button onClick={handleSave} className="w-full" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Lưu đánh giá
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
