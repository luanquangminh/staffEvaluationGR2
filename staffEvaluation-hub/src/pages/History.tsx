import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Leaderboard, LeaderboardSortField, LeaderboardSortDir } from '@/components/history/Leaderboard';
import {
    useAllPeriods,
    useReceivedEvaluations,
    useAllEvaluations,
    useQuestions,
    useStaff,
    useStaffReceivedEvaluations,
    useMultiPeriodReceivedEvaluations,
    EvaluationWithRelations,
    EvaluationPeriod,
    Staff,
} from '@/hooks/useStaff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/TableSkeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, History as HistoryIcon, TrendingUp, Star, Users, BarChart3, GitCompareArrows, Search, Building, ArrowLeft, EyeOff } from 'lucide-react';

type SortField = LeaderboardSortField;
type SortDir = LeaderboardSortDir;
import { Button } from '@/components/ui/button';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = [
    '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea',
    '#0891b2', '#e11d48', '#65a30d', '#c026d3', '#ea580c',
];

export default function HistoryPage() {
    const { staffId, isAdmin } = useAuth();
    const { data: periods, isLoading: loadingPeriods } = useAllPeriods();
    const { data: questions } = useQuestions();
    const { data: allStaff } = useStaff();
    const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
    const [showReviewer, setShowReviewer] = useState(false);

    const { data: receivedEvals, isLoading: loadingReceived } = useReceivedEvaluations(selectedPeriodId, isAdmin && showReviewer);
    const { data: allEvalsPage, isLoading: loadingAll } = useAllEvaluations(isAdmin ? selectedPeriodId : null);
    const allEvals = allEvalsPage?.data;

    // Staff lookup state
    const [lookupStaffId, setLookupStaffId] = useState<number | null>(null);
    const [lookupPeriodId, setLookupPeriodId] = useState<number | null>(null);
    const [lookupSearch, setLookupSearch] = useState('');
    const [evSortField, setEvSortField] = useState<SortField>('avg');
    const [evSortDir, setEvSortDir] = useState<SortDir>('desc');
    const { data: lookupEvals, isLoading: loadingLookup } = useStaffReceivedEvaluations(lookupStaffId, lookupPeriodId);

    const toggleEvSort = useCallback((field: SortField) => {
        if (evSortField === field) {
            setEvSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setEvSortField(field);
            setEvSortDir(field === 'name' ? 'asc' : 'desc');
        }
    }, [evSortField]);

    const lookupStaff = allStaff?.find(s => s.id === lookupStaffId) ?? null;

    const filteredStaffList = useMemo(() => {
        if (!allStaff || !lookupSearch.trim()) return [];
        const q = lookupSearch.toLowerCase().trim();
        return allStaff
            .filter(s => s.id !== staffId && (
                s.name?.toLowerCase().includes(q) ||
                s.staffcode?.toLowerCase().includes(q) ||
                s.schoolEmail?.toLowerCase().includes(q)
            ))
            .slice(0, 10);
    }, [allStaff, lookupSearch, staffId]);

    // Process lookup evaluations
    const lookupSummary = useMemo(() => {
        if (!lookupEvals || !questions) return null;

        const byQuestion = new Map<number, { total: number; count: number; title: string }>();
        questions.forEach(q => byQuestion.set(q.id, { total: 0, count: 0, title: q.title }));

        lookupEvals.forEach(e => {
            if (e.questionid && e.point !== null) {
                const entry = byQuestion.get(e.questionid);
                if (entry) {
                    entry.total += e.point;
                    entry.count += 1;
                }
            }
        });

        const questionAvgs = Array.from(byQuestion.entries()).map(([id, data]) => ({
            id,
            title: data.title,
            avg: data.count > 0 ? data.total / data.count : null,
            count: data.count,
        }));

        const overallTotal = questionAvgs.reduce((sum, q) => sum + (q.avg ?? 0), 0);
        const overallCount = questionAvgs.filter(q => q.avg !== null).length;
        const overallAvg = overallCount > 0 ? overallTotal / overallCount : null;

        const reviewerIds = new Set(lookupEvals.map(e => e.reviewerid));

        return { questionAvgs, overallAvg, totalReviewers: reviewerIds.size };
    }, [lookupEvals, questions]);

    const selectedPeriod = periods?.find(p => p.id === selectedPeriodId);

    // Process received evaluations: group by question + by reviewer
    const receivedSummary = useMemo(() => {
        if (!receivedEvals || !questions) return null;

        const byQuestion = new Map<number, { total: number; count: number; title: string }>();
        questions.forEach(q => byQuestion.set(q.id, { total: 0, count: 0, title: q.title }));

        receivedEvals.forEach(e => {
            if (e.questionid && e.point !== null) {
                const entry = byQuestion.get(e.questionid);
                if (entry) {
                    entry.total += e.point;
                    entry.count += 1;
                }
            }
        });

        const questionAvgs = Array.from(byQuestion.entries()).map(([id, data]) => ({
            id,
            title: data.title,
            avg: data.count > 0 ? data.total / data.count : null,
            count: data.count,
        }));

        const overallTotal = questionAvgs.reduce((sum, q) => sum + (q.avg ?? 0), 0);
        const overallCount = questionAvgs.filter(q => q.avg !== null).length;
        const overallAvg = overallCount > 0 ? overallTotal / overallCount : null;

        // Group by reviewer
        const byReviewer = new Map<number, { name: string; avatar?: string | null; evals: EvaluationWithRelations[] }>();
        receivedEvals.forEach(e => {
            if (!e.reviewerid) return;
            if (!byReviewer.has(e.reviewerid)) {
                byReviewer.set(e.reviewerid, {
                    name: e.reviewer?.name || `GV${e.reviewerid}`,
                    avatar: e.reviewer?.avatar,
                    evals: [],
                });
            }
            byReviewer.get(e.reviewerid)!.evals.push(e);
        });

        return { questionAvgs, overallAvg, totalReviewers: byReviewer.size, byReviewer };
    }, [receivedEvals, questions]);

    // Process all evaluations: group by evaluatee, compute averages
    const everyoneSummary = useMemo(() => {
        if (!allEvals || !questions) return null;

        const byEvaluatee = new Map<number, {
            name: string;
            avatar?: string | null;
            totalPoints: number;
            count: number;
            reviewers: Set<number>;
            byQuestion: Map<number, { total: number; count: number }>;
        }>();

        allEvals.forEach(e => {
            if (!e.evaluateeid || e.point === null) return;

            if (!byEvaluatee.has(e.evaluateeid)) {
                byEvaluatee.set(e.evaluateeid, {
                    name: e.evaluatee?.name || `GV${e.evaluateeid}`,
                    avatar: e.evaluatee?.avatar,
                    totalPoints: 0,
                    count: 0,
                    reviewers: new Set(),
                    byQuestion: new Map(),
                });
            }

            const staff = byEvaluatee.get(e.evaluateeid)!;
            staff.totalPoints += e.point;
            staff.count += 1;
            if (e.reviewerid) staff.reviewers.add(e.reviewerid);

            if (e.questionid) {
                if (!staff.byQuestion.has(e.questionid)) {
                    staff.byQuestion.set(e.questionid, { total: 0, count: 0 });
                }
                const qEntry = staff.byQuestion.get(e.questionid)!;
                qEntry.total += e.point;
                qEntry.count += 1;
            }
        });

        // Convert to sorted array
        const staffList = Array.from(byEvaluatee.entries())
            .map(([id, data]) => ({
                id,
                name: data.name,
                avatar: data.avatar,
                avg: data.count > 0 ? data.totalPoints / data.count : 0,
                reviewCount: data.reviewers.size,
                byQuestion: data.byQuestion,
            }))
            .sort((a, b) => b.avg - a.avg); // Sort by highest score

        return { staffList };
    }, [allEvals, questions]);

    const sortedEveryoneList = useMemo(() => {
        if (!everyoneSummary) return [];
        const sorted = [...everyoneSummary.staffList];
        const dir = evSortDir === 'asc' ? 1 : -1;
        sorted.sort((a, b) => {
            if (evSortField === 'name') {
                return dir * (a.name).localeCompare(b.name, 'vi');
            } else if (evSortField === 'reviewCount') {
                return dir * (a.reviewCount - b.reviewCount);
            } else if (evSortField === 'avg') {
                return dir * (a.avg - b.avg);
            } else if (evSortField.startsWith('q_')) {
                const qid = parseInt(evSortField.slice(2));
                const aData = a.byQuestion.get(qid);
                const bData = b.byQuestion.get(qid);
                const aVal = aData && aData.count > 0 ? aData.total / aData.count : -1;
                const bVal = bData && bData.count > 0 ? bData.total / bData.count : -1;
                return dir * (aVal - bVal);
            }
            return 0;
        });
        return sorted;
    }, [everyoneSummary, evSortField, evSortDir]);

    // ═══════ Compare across periods ═══════
    const closedPeriodsSorted = useMemo(() => {
        return (periods?.filter(p => p.status === 'closed') || [])
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [periods]);

    const closedPeriodIds = useMemo(() => closedPeriodsSorted.slice(-10).map(p => p.id), [closedPeriodsSorted]);
    const multiPeriodResults = useMultiPeriodReceivedEvaluations(closedPeriodIds, !!staffId);

    const comparisonData = useMemo(() => {
        if (!questions || closedPeriodsSorted.length === 0) return null;

        const periodsData: {
            period: EvaluationPeriod;
            questionAvgs: Map<number, number | null>;
            overallAvg: number | null;
        }[] = [];

        closedPeriodsSorted.forEach((period, idx) => {
            const result = multiPeriodResults[idx];
            if (!result || result.isLoading || !result.data) {
                periodsData.push({ period, questionAvgs: new Map(), overallAvg: null });
                return;
            }

            const evals = result.data;
            const byQuestion = new Map<number, { total: number; count: number }>();
            questions.forEach(q => byQuestion.set(q.id, { total: 0, count: 0 }));

            evals.forEach(e => {
                if (e.questionid && e.point !== null) {
                    const entry = byQuestion.get(e.questionid);
                    if (entry) {
                        entry.total += e.point;
                        entry.count += 1;
                    }
                }
            });

            const questionAvgs = new Map<number, number | null>();
            let totalAvg = 0;
            let countAvg = 0;
            questions.forEach(q => {
                const entry = byQuestion.get(q.id);
                if (entry && entry.count > 0) {
                    const avg = entry.total / entry.count;
                    questionAvgs.set(q.id, avg);
                    totalAvg += avg;
                    countAvg += 1;
                } else {
                    questionAvgs.set(q.id, null);
                }
            });

            periodsData.push({
                period,
                questionAvgs,
                overallAvg: countAvg > 0 ? totalAvg / countAvg : null,
            });
        });

        return periodsData;
    }, [questions, closedPeriodsSorted, multiPeriodResults]);

    const isCompareLoading = multiPeriodResults.some(r => r.isLoading);

    // Chart data for recharts
    const chartData = useMemo(() => {
        if (!comparisonData || !questions) return [];
        return comparisonData.map(pd => {
            const point: Record<string, string | number | null> = {
                name: pd.period.name,
                'Trung bình chung': pd.overallAvg !== null ? parseFloat(pd.overallAvg.toFixed(2)) : null,
            };
            questions.forEach(q => {
                const avg = pd.questionAvgs.get(q.id) ?? null;
                point[q.title] = avg !== null ? parseFloat(avg.toFixed(2)) : null;
            });
            return point;
        });
    }, [comparisonData, questions]);

    if (!staffId) {
        return (
            <Card className="max-w-lg mx-auto mt-8">
                <CardContent className="pt-6">
                    <div className="flex items-center gap-3 text-warning">
                        <AlertCircle className="h-5 w-5" />
                        <p>Tài khoản chưa được liên kết với hồ sơ giảng viên.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (loadingPeriods) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const closedPeriods = periods?.filter(p => p.status === 'closed') || [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-3">
                <HistoryIcon className="h-7 w-7 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Tra cứu kết quả</h1>
                    <p className="text-muted-foreground text-sm">Xem lại kết quả đánh giá từ các đợt trước</p>
                </div>
            </div>

            {/* Period Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Chọn đợt đánh giá</CardTitle>
                    <CardDescription>
                        {closedPeriods.length > 0
                            ? `Có ${closedPeriods.length} đợt đánh giá đã kết thúc`
                            : 'Chưa có đợt đánh giá nào đã kết thúc'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {closedPeriods.length > 0 ? (
                        <Select
                            value={selectedPeriodId?.toString() || ''}
                            onValueChange={(val) => setSelectedPeriodId(parseInt(val, 10))}
                        >
                            <SelectTrigger className="w-full max-w-md">
                                <SelectValue placeholder="Chọn đợt đánh giá..." />
                            </SelectTrigger>
                            <SelectContent>
                                {closedPeriods.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            {p.name}
                                            <Badge variant="secondary" className="text-xs">
                                                {new Date(p.startDate).toLocaleDateString('vi-VN')} - {new Date(p.endDate).toLocaleDateString('vi-VN')}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">
                            <HistoryIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Chưa có đợt đánh giá nào được đóng</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results */}
            {/* ═══════ Compare Tab (always visible if there are closed periods) ═══════ */}
            {closedPeriodsSorted.length >= 2 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <GitCompareArrows className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">So sánh giữa các đợt</CardTitle>
                        </div>
                        <CardDescription>
                            Xu hướng điểm số của bạn qua {closedPeriodsSorted.length} đợt đánh giá
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {isCompareLoading ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : comparisonData && chartData.length > 0 ? (
                            <>
                                {/* Line Chart */}
                                <div className="w-full h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" fontSize={12} />
                                            <YAxis domain={[0, 4]} fontSize={12} />
                                            <Tooltip />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                dataKey="Trung bình chung"
                                                stroke="#000"
                                                strokeWidth={3}
                                                dot={{ r: 5 }}
                                                connectNulls
                                            />
                                            {questions?.map((q, idx) => (
                                                <Line
                                                    key={q.id}
                                                    type="monotone"
                                                    dataKey={q.title}
                                                    stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                                                    strokeWidth={1.5}
                                                    dot={{ r: 3 }}
                                                    connectNulls
                                                    strokeDasharray={idx % 2 === 0 ? undefined : '5 5'}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Comparison Table */}
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="min-w-[180px]">Tiêu chí</TableHead>
                                                {comparisonData.map(pd => (
                                                    <TableHead key={pd.period.id} className="text-center min-w-[100px]">
                                                        {pd.period.name}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {/* Overall row */}
                                            <TableRow className="font-semibold bg-muted/50">
                                                <TableCell>Trung bình chung</TableCell>
                                                {comparisonData.map((pd, idx) => {
                                                    const prev = idx > 0 ? comparisonData[idx - 1].overallAvg : null;
                                                    const curr = pd.overallAvg;
                                                    const trend = curr !== null && prev !== null
                                                        ? curr > prev + 0.05 ? '↑' : curr < prev - 0.05 ? '↓' : '→'
                                                        : '';
                                                    const colorClass = curr !== null
                                                        ? curr >= 3 ? 'text-green-600' : curr >= 2 ? 'text-yellow-600' : 'text-red-500'
                                                        : 'text-muted-foreground';
                                                    return (
                                                        <TableCell key={pd.period.id} className={`text-center ${colorClass}`}>
                                                            {curr !== null ? curr.toFixed(2) : '—'}
                                                            {trend && <span className="ml-1">{trend}</span>}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                            {/* Per-question rows */}
                                            {questions?.map(q => (
                                                <TableRow key={q.id}>
                                                    <TableCell className="text-sm">{q.title}</TableCell>
                                                    {comparisonData.map((pd, idx) => {
                                                        const curr = pd.questionAvgs.get(q.id) ?? null;
                                                        const prev = idx > 0 ? (comparisonData[idx - 1].questionAvgs.get(q.id) ?? null) : null;
                                                        const trend = curr !== null && prev !== null
                                                            ? curr > prev + 0.05 ? '↑' : curr < prev - 0.05 ? '↓' : '→'
                                                            : '';
                                                        const colorClass = curr !== null
                                                            ? curr >= 3 ? 'text-green-600' : curr >= 2 ? 'text-yellow-600' : 'text-red-500'
                                                            : 'text-muted-foreground';
                                                        return (
                                                            <TableCell key={pd.period.id} className={`text-center ${colorClass}`}>
                                                                {curr !== null ? curr.toFixed(2) : '—'}
                                                                {trend && <span className="ml-1">{trend}</span>}
                                                            </TableCell>
                                                        );
                                                    })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p>Chưa có đủ dữ liệu để so sánh</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {selectedPeriodId && (
                <Tabs defaultValue="received" className="space-y-4">
                    <TabsList className={`grid w-full max-w-2xl ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <TabsTrigger value="received">
                            <Users className="h-4 w-4 mr-2" />
                            Điểm của tôi
                        </TabsTrigger>
                        <TabsTrigger value="lookup">
                            <Search className="h-4 w-4 mr-2" />
                            Tra cứu giảng viên
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="everyone">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Tất cả mọi người
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* ═══════ Tab 1: Người đã đánh giá mình ═══════ */}
                    <TabsContent value="received" className="space-y-4">
                        {loadingReceived ? (
                            <div className="flex items-center justify-center h-32">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : receivedSummary && receivedSummary.questionAvgs.some(q => q.count > 0) ? (
                            <>
                                {/* Overall Score Card */}
                                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Điểm trung bình tổng của bạn</p>
                                                <p className="text-4xl font-bold text-primary mt-1">
                                                    {receivedSummary.overallAvg?.toFixed(2) ?? '—'}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Từ {receivedSummary.totalReviewers} người đánh giá • {selectedPeriod?.name}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                                                <TrendingUp className="h-8 w-8 text-primary" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Per-Question Breakdown */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Chi tiết theo tiêu chí</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>#</TableHead>
                                                    <TableHead>Tiêu chí</TableHead>
                                                    <TableHead className="text-center">Số lượt</TableHead>
                                                    <TableHead className="text-center">Điểm TB</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {receivedSummary.questionAvgs.map((q, idx) => (
                                                    <TableRow key={q.id}>
                                                        <TableCell className="font-medium">{idx + 1}</TableCell>
                                                        <TableCell>{q.title}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant="outline">{q.count}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {q.avg !== null ? (
                                                                <Badge
                                                                    variant={q.avg >= 3 ? 'default' : q.avg >= 2 ? 'secondary' : 'destructive'}
                                                                    className="text-sm font-bold px-3"
                                                                >
                                                                    {q.avg.toFixed(2)}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* Per-Reviewer Breakdown */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-lg">Chi tiết theo người đánh giá</CardTitle>
                                                <CardDescription>
                                                    {selectedPeriod?.isAnonymous && !showReviewer
                                                        ? 'Đợt này đánh giá ẩn danh — danh tính người chấm được bảo mật'
                                                        : 'Điểm trung bình mà mỗi đồng nghiệp đã cho bạn'}
                                                </CardDescription>
                                            </div>
                                            {isAdmin && selectedPeriod?.isAnonymous && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Switch
                                                        id="showReviewer"
                                                        checked={showReviewer}
                                                        onCheckedChange={setShowReviewer}
                                                    />
                                                    <Label htmlFor="showReviewer" className="text-sm cursor-pointer whitespace-nowrap">
                                                        Hiện tên người chấm
                                                    </Label>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {selectedPeriod?.isAnonymous && !showReviewer ? (
                                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                                                <EyeOff className="h-8 w-8 opacity-50" />
                                                <p className="text-sm">Danh tính người đánh giá được ẩn trong đợt này</p>
                                                {!isAdmin && (
                                                    <p className="text-xs">Chỉ admin mới có thể xem thông tin này</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                {Array.from(receivedSummary.byReviewer.entries()).map(([reviewerId, data]) => {
                                                    const avg = data.evals.length > 0 ? data.evals.reduce((sum, e) => sum + (e.point ?? 0), 0) / data.evals.length : 0;
                                                    return (
                                                        <div key={reviewerId} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                                                            <UserAvatar staff={data} className="h-10 w-10" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm truncate">{data.name}</p>
                                                                <p className="text-xs text-muted-foreground">{data.evals.length} tiêu chí</p>
                                                            </div>
                                                            <Badge
                                                                variant={avg >= 3 ? 'default' : avg >= 2 ? 'secondary' : 'destructive'}
                                                                className="text-sm font-bold px-3"
                                                            >
                                                                {avg.toFixed(1)}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Star className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                        <p>Chưa có ai đánh giá bạn trong đợt này</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ═══════ Tab 2: Tra cứu giảng viên ═══════ */}
                    <TabsContent value="lookup" className="space-y-4">
                        {!lookupStaffId ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Search className="h-5 w-5" />
                                        Tra cứu giảng viên
                                    </CardTitle>
                                    <CardDescription>Tìm kiếm theo tên, mã giảng viên hoặc email trường</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <Input
                                        type="search"
                                        aria-label="Tìm kiếm giảng viên"
                                        placeholder="Nhập tên, mã GV hoặc email..."
                                        value={lookupSearch}
                                        onChange={e => setLookupSearch(e.target.value)}
                                        className="max-w-md"
                                    />
                                    {lookupSearch.trim() && (
                                        filteredStaffList.length > 0 ? (
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {filteredStaffList.map(s => (
                                                    <Button
                                                        key={s.id}
                                                        variant="outline"
                                                        className="justify-start h-auto p-3 text-left"
                                                        onClick={() => {
                                                            setLookupStaffId(s.id);
                                                            setLookupPeriodId(selectedPeriodId);
                                                            setLookupSearch('');
                                                        }}
                                                    >
                                                        <UserAvatar staff={s} className="h-10 w-10 mr-3 shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium truncate">{s.name}</p>
                                                            <p className="text-xs text-muted-foreground">{s.staffcode} {s.schoolEmail ? `• ${s.schoolEmail}` : ''}</p>
                                                            {s.organizationUnit && (
                                                                <p className="text-xs text-muted-foreground">{s.organizationUnit.name}</p>
                                                            )}
                                                        </div>
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground">Không tìm thấy giảng viên phù hợp</p>
                                        )
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <Button variant="ghost" onClick={() => { setLookupStaffId(null); setLookupPeriodId(null); }}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại tìm kiếm
                                </Button>

                                {/* Staff Profile Card */}
                                {lookupStaff && (
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="flex items-center gap-4">
                                                <UserAvatar staff={lookupStaff} className="h-16 w-16 text-xl" />
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold">{lookupStaff.name}</h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <Badge variant="outline">{lookupStaff.staffcode}</Badge>
                                                        {lookupStaff.academicrank && <Badge variant="secondary">{lookupStaff.academicrank}</Badge>}
                                                        {lookupStaff.academicdegree && <Badge variant="secondary">{lookupStaff.academicdegree}</Badge>}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                        {lookupStaff.organizationUnit && (
                                                            <span className="flex items-center gap-1">
                                                                <Building className="h-3.5 w-3.5" />
                                                                {lookupStaff.organizationUnit.name}
                                                            </span>
                                                        )}
                                                        {lookupStaff.schoolEmail && (
                                                            <span>{lookupStaff.schoolEmail}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Period selector for lookup */}
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium whitespace-nowrap">Đợt đánh giá:</span>
                                            <Select
                                                value={lookupPeriodId?.toString() || ''}
                                                onValueChange={val => setLookupPeriodId(parseInt(val, 10))}
                                            >
                                                <SelectTrigger className="max-w-md">
                                                    <SelectValue placeholder="Chọn đợt..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {closedPeriods.map(p => (
                                                        <SelectItem key={p.id} value={p.id.toString()}>
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Scores */}
                                {loadingLookup ? (
                                    <div className="flex items-center justify-center h-32">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                ) : lookupSummary && lookupSummary.questionAvgs.some(q => q.count > 0) ? (
                                    <>
                                        {/* Overall Score */}
                                        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                                            <CardContent className="pt-6">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Điểm trung bình tổng</p>
                                                        <p className="text-4xl font-bold text-primary mt-1">
                                                            {lookupSummary.overallAvg?.toFixed(2) ?? '—'}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Từ {lookupSummary.totalReviewers} người đánh giá • {periods?.find(p => p.id === lookupPeriodId)?.name}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                                                        <TrendingUp className="h-8 w-8 text-primary" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Per-Question Breakdown */}
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Chi tiết theo tiêu chí</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>#</TableHead>
                                                            <TableHead>Tiêu chí</TableHead>
                                                            <TableHead className="text-center">Số lượt</TableHead>
                                                            <TableHead className="text-center">Điểm TB</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {lookupSummary.questionAvgs.map((q, idx) => (
                                                            <TableRow key={q.id}>
                                                                <TableCell className="font-medium">{idx + 1}</TableCell>
                                                                <TableCell>{q.title}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <Badge variant="outline">{q.count}</Badge>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {q.avg !== null ? (
                                                                        <Badge
                                                                            variant={q.avg >= 3 ? 'default' : q.avg >= 2 ? 'secondary' : 'destructive'}
                                                                            className="text-sm font-bold px-3"
                                                                        >
                                                                            {q.avg.toFixed(2)}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    </>
                                ) : lookupPeriodId ? (
                                    <Card>
                                        <CardContent className="pt-6">
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Star className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                                <p>Chưa có dữ liệu đánh giá cho giảng viên này trong đợt đã chọn</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : null}
                            </>
                        )}
                    </TabsContent>

                    {/* ═══════ Tab 3: Điểm tất cả mọi người ═══════ */}
                    <TabsContent value="everyone" className="space-y-4">
                        {loadingAll ? (
                            <Card>
                                <CardHeader>
                                    <Skeleton className="h-6 w-64" />
                                    <Skeleton className="h-4 w-96 mt-2" />
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Giảng viên</TableHead>
                                                    <TableHead className="text-center">Số người ĐG</TableHead>
                                                    <TableHead className="text-center">TB chung</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                <TableSkeleton
                                                    rows={8}
                                                    columns={4}
                                                    columnWidths={['w-8', 'w-40', 'w-16', 'w-12']}
                                                />
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : everyoneSummary && everyoneSummary.staffList.length > 0 ? (
                            <Leaderboard
                                staffList={sortedEveryoneList}
                                questions={questions}
                                currentStaffId={staffId}
                                selectedPeriodName={selectedPeriod?.name}
                                sortField={evSortField}
                                sortDir={evSortDir}
                                onToggleSort={toggleEvSort}
                            />
                        ) : (
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center py-8 text-muted-foreground">
                                        <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                        <p>Chưa có dữ liệu đánh giá cho đợt này</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
