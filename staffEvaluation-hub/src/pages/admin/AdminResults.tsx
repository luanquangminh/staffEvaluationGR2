import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAllEvaluations, useAllPeriods, useStaff, useGroups, useQuestions, Staff } from '@/hooks/useStaff';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, BarChart3, TrendingUp, Users, Download, CalendarDays, Eye, FileText, ArrowUpDown, ArrowUp, ArrowDown, Search, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

type SortField = 'name' | 'evalCount' | 'avgScore' | `q_${number}`;
type SortDir = 'asc' | 'desc';

interface StaffScoreItem {
  staff: Staff;
  avgScore: number;
  evalCount: number;
  questionScores: Record<number, number>;
}

const radarChartConfig = {
  score: {
    label: 'Điểm TB',
    color: 'hsl(220, 70%, 50%)',
  },
};

export default function AdminResults() {
  const { data: periods, isLoading: loadingPeriods } = useAllPeriods();
  const { data: staff } = useStaff();
  const { data: groups } = useGroups();
  const { data: questions } = useQuestions();

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [groupOpen, setGroupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [radarStaff, setRadarStaff] = useState<StaffScoreItem | null>(null);
  const [sortField, setSortField] = useState<SortField>('avgScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const hasAutoSelected = useRef(false);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  }, [sortField]);

  // Auto-select latest period on initial load only
  useEffect(() => {
    if (!hasAutoSelected.current && periods && periods.length > 0 && selectedPeriodId === null) {
      hasAutoSelected.current = true;
      setSelectedPeriodId(periods[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref guard prevents re-trigger; selectedPeriodId only read for null-check
  }, [periods]);

  const { data: evaluationsPage, isLoading: loadingEval } = useAllEvaluations(selectedPeriodId);
  const evaluations = evaluationsPage?.data;
  const evaluationsTruncated = evaluationsPage?.truncated ?? false;

  useEffect(() => {
    if (!evaluationsTruncated || !evaluationsPage) return;
    toast.warning(
      `Kết quả đã bị cắt ngắn tại ${evaluationsPage.data.length}/${evaluationsPage.total} bản ghi. Hãy lọc theo nhóm hoặc kỳ để xem đầy đủ.`,
      { id: `truncated-${selectedPeriodId}` },
    );
  }, [evaluationsTruncated, selectedPeriodId, evaluationsPage]);

  const selectedPeriod = useMemo(() => {
    return periods?.find(p => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const filteredEvaluations = useMemo(() => {
    if (!evaluations) return [];
    if (selectedGroup === 'all') return evaluations;
    const groupId = parseInt(selectedGroup);
    if (isNaN(groupId)) return [];
    return evaluations.filter(e => e.groupid === groupId);
  }, [evaluations, selectedGroup]);

  const staffScores = useMemo(() => {
    if (!filteredEvaluations || !staff) return [];

    const scoreMap = new Map<number, { total: number; count: number; byQuestion: Map<number, { total: number; count: number }> }>();

    filteredEvaluations.forEach(e => {
      if (!e.evaluateeid || e.point === null) return;

      if (!scoreMap.has(e.evaluateeid)) {
        scoreMap.set(e.evaluateeid, { total: 0, count: 0, byQuestion: new Map() });
      }

      const staffData = scoreMap.get(e.evaluateeid)!;
      staffData.total += e.point;
      staffData.count += 1;

      if (e.questionid) {
        if (!staffData.byQuestion.has(e.questionid)) {
          staffData.byQuestion.set(e.questionid, { total: 0, count: 0 });
        }
        const qData = staffData.byQuestion.get(e.questionid)!;
        qData.total += e.point;
        qData.count += 1;
      }
    });

    return staff
      .filter(s => scoreMap.has(s.id))
      .map(s => {
        const data = scoreMap.get(s.id)!;
        const avgScore = data.count > 0 ? data.total / data.count : 0;
        const questionScores: Record<number, number> = {};
        data.byQuestion.forEach((q, qid) => {
          questionScores[qid] = q.count > 0 ? q.total / q.count : 0;
        });
        return {
          staff: s,
          avgScore,
          evalCount: data.count,
          questionScores,
        };
      })
; // sorting handled by sortedStaffScores
  }, [filteredEvaluations, staff]);

  const sortedStaffScores = useMemo(() => {
    if (!staffScores.length) return staffScores;
    const sorted = [...staffScores];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortField === 'name') {
        va = a.staff.name || '';
        vb = b.staff.name || '';
        return dir * (va as string).localeCompare(vb as string, 'vi');
      } else if (sortField === 'evalCount') {
        va = a.evalCount; vb = b.evalCount;
      } else if (sortField === 'avgScore') {
        va = a.avgScore; vb = b.avgScore;
      } else if (sortField.startsWith('q_')) {
        const qid = parseInt(sortField.slice(2));
        va = a.questionScores[qid] ?? -1;
        vb = b.questionScores[qid] ?? -1;
      } else {
        return 0;
      }
      return dir * ((va as number) - (vb as number));
    });
    return sorted;
  }, [staffScores, sortField, sortDir]);

  const displayedStaffScores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedStaffScores;
    return sortedStaffScores.filter(item => {
      const name = (item.staff.name || '').toLowerCase();
      const code = (item.staff.staffcode || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [sortedStaffScores, searchQuery]);

  const stats = useMemo(() => {
    return {
      totalEvaluations: filteredEvaluations.length,
      avgScore: filteredEvaluations.length > 0
        ? filteredEvaluations.reduce((sum, e) => sum + (e.point || 0), 0) / filteredEvaluations.length
        : 0,
      staffEvaluated: new Set(filteredEvaluations.map(e => e.evaluateeid)).size,
    };
  }, [filteredEvaluations]);

  // Radar chart data for selected staff
  const radarData = useMemo(() => {
    if (!radarStaff || !questions) return [];
    return questions.map(q => ({
      criterion: q.title,
      fullName: q.title,
      score: radarStaff.questionScores[q.id] !== undefined
        ? Number(radarStaff.questionScores[q.id].toFixed(2))
        : 0,
      fullMark: 4,
    }));
  }, [radarStaff, questions]);

  const exportToCSV = useCallback(() => {
    if (!displayedStaffScores.length || !questions) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Hạng', 'Giảng viên', 'Mã GV', 'Số đánh giá'];
    questions.forEach(q => headers.push(q.title));
    headers.push('Điểm trung bình');

    const rows = displayedStaffScores.map((item, idx) => {
      const row: (string | number)[] = [
        idx + 1,
        item.staff.name || '',
        item.staff.staffcode || '',
        item.evalCount,
      ];
      questions.forEach(q => {
        row.push(item.questionScores[q.id] !== undefined ? item.questionScores[q.id].toFixed(2) : '');
      });
      row.push(item.avgScore.toFixed(2));
      return row;
    });

    rows.push([]);
    rows.push(['Tổng số đánh giá:', stats.totalEvaluations, '', '', ...Array(questions.length).fill(''), '']);
    rows.push(['Điểm trung bình chung:', stats.avgScore.toFixed(2), '', '', ...Array(questions.length).fill(''), '']);
    rows.push(['Số GV được đánh giá:', stats.staffEvaluated, '', '', ...Array(questions.length).fill(''), '']);

    const escapeCell = (value: string | number): string => {
      const str = String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.map(escapeCell).join(','),
      ...rows.map(row => row.map(escapeCell).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const rawGroupName = selectedGroup === 'all' ? 'TatCaNhom' : groups?.find(g => g.id.toString() === selectedGroup)?.name || 'Nhom';
    const groupName = rawGroupName.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
    const periodName = selectedPeriod?.name?.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_') || 'All';
    const fileName = `BaoCaoDanhGia_${periodName}_${groupName}_${new Date().toISOString().split('T')[0]}.csv`;

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Xuất báo cáo thành công');
  }, [displayedStaffScores, questions, stats, selectedGroup, groups, selectedPeriod]);

  const exportToPDF = useCallback(() => {
    if (!displayedStaffScores.length || !questions) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const groupName = selectedGroup === 'all'
      ? 'Tất cả nhóm'
      : groups?.find(g => g.id.toString() === selectedGroup)?.name || 'Nhóm';
    const periodName = selectedPeriod?.name || '';
    const exportDate = new Date().toLocaleDateString('vi-VN');

    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo đánh giá - ${esc(periodName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; padding: 20mm; color: #000; font-size: 12pt; }
    h1 { text-align: center; font-size: 16pt; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 11pt; color: #555; margin-bottom: 16px; }
    .summary { display: flex; justify-content: space-between; margin-bottom: 16px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px; }
    .summary-item { text-align: center; }
    .summary-item .label { font-size: 10pt; color: #666; }
    .summary-item .value { font-size: 14pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 12px; }
    th, td { border: 1px solid #333; padding: 5px 6px; text-align: center; }
    th { background-color: #e8e8e8; font-weight: bold; }
    td:nth-child(2) { text-align: left; }
    tr:nth-child(even) { background-color: #f5f5f5; }
    .avg-high { color: #166534; font-weight: bold; }
    .avg-mid { color: #1e40af; font-weight: bold; }
    .avg-low { color: #dc2626; font-weight: bold; }
    @media print {
      body { padding: 10mm; }
      @page { size: landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <h1>Báo cáo đánh giá - ${esc(periodName)}</h1>
  <p class="subtitle">Nhóm: ${esc(groupName)} | Ngày xuất: ${esc(exportDate)}</p>

  <div class="summary">
    <div class="summary-item">
      <div class="label">Tổng đánh giá</div>
      <div class="value">${stats.totalEvaluations}</div>
    </div>
    <div class="summary-item">
      <div class="label">Điểm trung bình</div>
      <div class="value">${stats.avgScore.toFixed(2)}</div>
    </div>
    <div class="summary-item">
      <div class="label">GV được đánh giá</div>
      <div class="value">${stats.staffEvaluated}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Hạng</th>
        <th>Giảng viên</th>
        <th>Mã GV</th>
        <th>Số ĐG</th>
        ${questions.map(q => { const t = esc(q.title); return `<th title="${t}">${t.length > 20 ? t.slice(0, 20) + '...' : t}</th>`; }).join('')}
        <th>TB</th>
      </tr>
    </thead>
    <tbody>
      ${displayedStaffScores.map((item, idx) => {
        const avgClass = item.avgScore >= 3 ? 'avg-high' : item.avgScore >= 2 ? 'avg-mid' : 'avg-low';
        return `<tr>
          <td>${idx + 1}</td>
          <td>${esc(item.staff.name || '')}</td>
          <td>${esc(item.staff.staffcode || '')}</td>
          <td>${item.evalCount}</td>
          ${questions.map(q => `<td>${item.questionScores[q.id] !== undefined ? item.questionScores[q.id].toFixed(2) : '-'}</td>`).join('')}
          <td class="${avgClass}">${item.avgScore.toFixed(2)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (!printWindow) {
      URL.revokeObjectURL(url);
      toast.error('Trình duyệt đã chặn popup. Vui lòng cho phép popup để xuất PDF.');
      return;
    }
    const revokeTimeout = setTimeout(() => URL.revokeObjectURL(url), 60000);
    printWindow.onload = () => {
      clearTimeout(revokeTimeout);
      printWindow.print();
      URL.revokeObjectURL(url);
    };

    toast.success('Đã mở cửa sổ in. Chọn "Save as PDF" để lưu file PDF.');
  }, [displayedStaffScores, questions, stats, selectedGroup, groups, selectedPeriod]);

  if (loadingPeriods) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* FE-7: loading state uses stat-card skeletons instead of a centered spinner. */}
      {loadingEval && (
        <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loadingEval && evaluations && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tổng đánh giá</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Điểm trung bình</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgScore.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">GV được đánh giá</CardTitle>
                <Users className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.staffEvaluated}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Kết quả đánh giá</CardTitle>
                  <CardDescription>
                    Điểm trung bình theo giảng viên — {selectedPeriod?.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm giảng viên..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-56"
                    />
                  </div>
                  <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={groupOpen} className="w-56 justify-between font-normal">
                        <span className="truncate">
                          {selectedGroup === 'all'
                            ? 'Tất cả nhóm'
                            : groups?.find(g => g.id.toString() === selectedGroup)?.name || 'Chọn nhóm'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Tìm nhóm..." />
                        <CommandList>
                          <CommandEmpty>Không tìm thấy nhóm</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="Tất cả nhóm"
                              onSelect={() => { setSelectedGroup('all'); setGroupOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedGroup === 'all' ? 'opacity-100' : 'opacity-0')} />
                              Tất cả nhóm
                            </CommandItem>
                            {groups?.map(g => (
                              <CommandItem
                                key={g.id}
                                value={g.name}
                                onSelect={() => { setSelectedGroup(g.id.toString()); setGroupOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedGroup === g.id.toString() ? 'opacity-100' : 'opacity-0')} />
                                {g.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button onClick={exportToCSV} disabled={displayedStaffScores.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Xuất CSV
                  </Button>
                  <Button onClick={exportToPDF} disabled={displayedStaffScores.length === 0} variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Xuất PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {staffScores.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Chưa có dữ liệu đánh giá</p>
              ) : displayedStaffScores.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Không tìm thấy giảng viên phù hợp</p>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Hạng</TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => toggleSort('name')}>
                          <span className="inline-flex items-center gap-1">
                            Giảng viên
                            {sortField === 'name' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </span>
                        </TableHead>
                        <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => toggleSort('evalCount')}>
                          <span className="inline-flex items-center gap-1 justify-center">
                            Số đánh giá
                            {sortField === 'evalCount' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </span>
                        </TableHead>
                        {questions?.map(q => (
                          <TableHead
                            key={q.id}
                            className="text-center text-xs max-w-24 truncate cursor-pointer select-none hover:bg-muted/50"
                            title={q.title}
                            onClick={() => toggleSort(`q_${q.id}`)}
                          >
                            <span className="inline-flex items-center gap-1 justify-center">
                              {q.title.length > 15 ? q.title.slice(0, 15) + '...' : q.title}
                              {sortField === `q_${q.id}` ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                            </span>
                          </TableHead>
                        ))}
                        <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => toggleSort('avgScore')}>
                          <span className="inline-flex items-center gap-1 justify-center">
                            Trung bình
                            {sortField === 'avgScore' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                          </span>
                        </TableHead>
                        <TableHead className="w-12 text-center">Chi tiết</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedStaffScores.map((item, idx) => (
                        <TableRow key={item.staff.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setRadarStaff(item)}>
                          <TableCell className="font-mono">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{item.staff.name}</TableCell>
                          <TableCell className="text-center">{item.evalCount}</TableCell>
                          {questions?.map(q => (
                            <TableCell key={q.id} className="text-center">
                              {item.questionScores[q.id] !== undefined ? item.questionScores[q.id].toFixed(2) : '-'}
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Badge variant={item.avgScore >= 3 ? 'default' : item.avgScore >= 2 ? 'secondary' : 'destructive'}>
                              {item.avgScore.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); setRadarStaff(item); }}
                              aria-label="Xem biểu đồ radar"
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Radar Chart Dialog */}
      <Dialog open={!!radarStaff} onOpenChange={(open) => !open && setRadarStaff(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div>{radarStaff?.staff.name}</div>
                <div className="text-sm font-normal text-muted-foreground">
                  {radarStaff?.staff.staffcode} • Điểm TB: {radarStaff?.avgScore.toFixed(2)} • {radarStaff?.evalCount} đánh giá
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {radarData.length > 0 && (
            <div className="mt-2">
              <ChartContainer config={radarChartConfig} className="h-[420px] w-full">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="55%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="criterion"
                    tick={({ x, y, payload, textAnchor }) => {
                      const label: string = payload.value || '';
                      const maxChars = 18;
                      const lines: string[] = [];
                      let remaining = label;
                      while (remaining.length > maxChars) {
                        let breakIdx = remaining.lastIndexOf(' ', maxChars);
                        if (breakIdx <= 0) breakIdx = maxChars;
                        lines.push(remaining.slice(0, breakIdx));
                        remaining = remaining.slice(breakIdx).trimStart();
                      }
                      lines.push(remaining);
                      return (
                        <text x={x} y={y} textAnchor={textAnchor} fontSize={11} fill="hsl(var(--foreground))">
                          {lines.map((line, i) => (
                            <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>{line}</tspan>
                          ))}
                        </text>
                      );
                    }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 4]}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickCount={5}
                  />
                  <Radar
                    name="Điểm TB"
                    dataKey="score"
                    stroke="hsl(220, 70%, 50%)"
                    fill="hsl(220, 70%, 50%)"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => (
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{item.payload.fullName}</span>
                            <span>Điểm TB: <strong>{value}</strong>/4</span>
                          </div>
                        )}
                      />
                    }
                  />
                </RadarChart>
              </ChartContainer>

              {/* Score breakdown table */}
              <div className="mt-4 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tiêu chí</TableHead>
                      <TableHead className="text-center w-24">Điểm TB</TableHead>
                      <TableHead className="w-48">Mức độ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions?.map(q => {
                      const score = radarStaff?.questionScores[q.id];
                      const scoreVal = score !== undefined ? score : 0;
                      return (
                        <TableRow key={q.id}>
                          <TableCell className="text-sm">{q.title}</TableCell>
                          <TableCell className="text-center font-semibold">{scoreVal.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${(scoreVal / 4) * 100}%`,
                                    backgroundColor: scoreVal >= 3 ? 'hsl(142, 76%, 36%)' : scoreVal >= 2 ? 'hsl(220, 70%, 50%)' : 'hsl(0, 70%, 50%)',
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{((scoreVal / 4) * 100).toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
