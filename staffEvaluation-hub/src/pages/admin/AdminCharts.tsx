import { useState, useMemo, useEffect, useRef } from 'react';
import { useAllEvaluations, useAllPeriods, useGroups, useStaff } from '@/hooks/useStaff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, PieChart as PieChartIcon, CalendarDays } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie } from 'recharts';

const chartConfig = {
  avgScore: {
    label: 'Điểm TB',
    color: 'hsl(var(--primary))',
  },
  count: {
    label: 'Số lượng',
    color: 'hsl(var(--primary))',
  },
};

export default function AdminCharts() {
  const { data: periods, isLoading: loadingPeriods } = useAllPeriods();
  const { data: groups, isLoading: loadingGroups } = useGroups();
  const { data: staff, isLoading: loadingStaff } = useStaff();

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const hasAutoSelected = useRef(false);

  // Auto-select latest period on initial load only
  useEffect(() => {
    if (!hasAutoSelected.current && periods && periods.length > 0 && selectedPeriodId === null) {
      hasAutoSelected.current = true;
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const { data: evaluationsPage, isLoading: loadingEval } = useAllEvaluations(selectedPeriodId);
  const evaluations = evaluationsPage?.data;

  const isLoading = loadingPeriods || loadingGroups || loadingStaff;

  const selectedPeriod = useMemo(() => {
    return periods?.find(p => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const groupChartData = useMemo(() => {
    if (!evaluations || !groups) return [];

    const groupStats = groups.map(group => {
      const groupEvals = evaluations.filter(e => e.groupid === group.id);
      const avgScore = groupEvals.length > 0
        ? groupEvals.reduce((sum, e) => sum + (e.point || 0), 0) / groupEvals.length
        : 0;
      const staffCount = new Set(groupEvals.map(e => e.evaluateeid)).size;

      return {
        name: group.name.length > 12 ? group.name.slice(0, 12) + '...' : group.name,
        fullName: group.name,
        avgScore: Number(avgScore.toFixed(2)),
        evalCount: groupEvals.length,
        staffCount,
      };
    }).filter(g => g.evalCount > 0);

    const totalAvg = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + (e.point || 0), 0) / evaluations.length
      : 0;

    groupStats.push({
      name: 'TỔNG',
      fullName: 'Tổng tất cả nhóm',
      avgScore: Number(totalAvg.toFixed(2)),
      evalCount: evaluations.length,
      staffCount: new Set(evaluations.map(e => e.evaluateeid)).size,
    });

    return groupStats;
  }, [evaluations, groups]);

  const pieChartData = useMemo(() => {
    if (!evaluations || !groups) return [];

    return groups.map((group, index) => {
      const groupEvals = evaluations.filter(e => e.groupid === group.id);
      return {
        name: group.name,
        value: groupEvals.length,
        fill: `hsl(${(index * 45) % 360}, 70%, 50%)`,
      };
    }).filter(g => g.value > 0);
  }, [evaluations, groups]);

  const scoreDistribution = useMemo(() => {
    if (!evaluations) return [];

    const distribution = [
      { range: '0-1', count: 0, fill: 'hsl(0, 70%, 50%)' },
      { range: '1-2', count: 0, fill: 'hsl(30, 70%, 50%)' },
      { range: '2-3', count: 0, fill: 'hsl(60, 70%, 50%)' },
      { range: '3-4', count: 0, fill: 'hsl(120, 70%, 50%)' },
    ];

    evaluations.forEach(e => {
      const point = e.point || 0;
      if (point >= 0 && point < 1) distribution[0].count++;
      else if (point >= 1 && point < 2) distribution[1].count++;
      else if (point >= 2 && point < 3) distribution[2].count++;
      else if (point >= 3 && point <= 4) distribution[3].count++;
    });

    return distribution;
  }, [evaluations]);



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <PieChartIcon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Biểu đồ thống kê</h1>
          <p className="text-muted-foreground">Tổng quan kết quả đánh giá theo nhóm</p>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Chọn đợt đánh giá</CardTitle>
          </div>
          <CardDescription>
            Có {periods?.length || 0} đợt đánh giá
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedPeriodId?.toString() || ''}
            onValueChange={(v) => setSelectedPeriodId(parseInt(v))}
          >
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Chọn đợt đánh giá..." />
            </SelectTrigger>
            <SelectContent>
              {periods?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{p.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatDate(p.startDate)} - {formatDate(p.endDate)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Loading evaluations */}
      {loadingEval && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Stats cards */}
      {!loadingEval && evaluations && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tổng đánh giá</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{evaluations.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Số nhóm</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pieChartData.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Điểm TB chung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {evaluations.length > 0
                    ? (evaluations.reduce((sum, e) => sum + (e.point || 0), 0) / evaluations.length).toFixed(2)
                    : '0.00'}
                </div>
              </CardContent>
            </Card>
          </div>

          {groupChartData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Điểm trung bình theo nhóm</CardTitle>
                <CardDescription>
                  So sánh điểm TB của từng nhóm — {selectedPeriod?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <BarChart data={groupChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                      className="fill-foreground"
                    />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} className="fill-foreground" />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item) => (
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{item.payload.fullName}</span>
                              <span>Điểm TB: <strong>{value}</strong></span>
                              <span>Số đánh giá: {item.payload.evalCount}</span>
                              <span>Số GV: {item.payload.staffCount}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
                      {groupChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === 'TỔNG' ? 'hsl(142, 76%, 36%)' : 'hsl(var(--primary))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {pieChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố đánh giá theo nhóm</CardTitle>
                  <CardDescription>Tỷ lệ số lượng đánh giá của từng nhóm</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name.slice(0, 10)}${name.length > 10 ? '...' : ''} (${(percent * 100).toFixed(0)}%)`}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name, item) => (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{item.payload.name}</span>
                                <span>Số đánh giá: <strong>{value}</strong></span>
                              </div>
                            )}
                          />
                        }
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Phân bố điểm số</CardTitle>
                <CardDescription>Số lượng đánh giá theo khoảng điểm</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart data={scoreDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} className="fill-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="fill-foreground" />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name, item) => (
                            <div className="flex flex-col gap-1">
                              <span>Khoảng điểm: <strong>{item.payload.range}</strong></span>
                              <span>Số lượng: <strong>{value}</strong></span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {evaluations.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Chưa có đánh giá nào trong đợt này
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
