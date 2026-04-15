import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type LeaderboardSortField = 'name' | 'reviewCount' | 'avg' | `q_${number}`;
export type LeaderboardSortDir = 'asc' | 'desc';

export type LeaderboardStaffRow = {
    id: number;
    name: string;
    avatar?: string | null;
    avg: number;
    reviewCount: number;
    byQuestion: Map<number, { total: number; count: number }>;
};

type Question = { id: number; title: string };

type Props = {
    staffList: LeaderboardStaffRow[];
    questions: Question[] | undefined;
    currentStaffId: number | null | undefined;
    selectedPeriodName: string | undefined;
    sortField: LeaderboardSortField;
    sortDir: LeaderboardSortDir;
    onToggleSort: (field: LeaderboardSortField) => void;
};

// FE-3 + FE-4: Leaderboard virtualization.
// Below the threshold we render every row (semantic <table>, cheap). Above it,
// we still keep the semantic <table> but only render the visible slice plus
// padding rows above/below — enough to keep the DOM stable at hundreds-to-
// thousands of faculty without breaking sort headers, sticky thead, or a11y.
const VIRTUALIZATION_THRESHOLD = 50;
const ROW_ESTIMATE_PX = 56;

export function Leaderboard({
    staffList,
    questions,
    currentStaffId,
    selectedPeriodName,
    sortField,
    sortDir,
    onToggleSort,
}: Props) {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const virtualizer = useVirtualizer({
        count: staffList.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_ESTIMATE_PX,
        overscan: 10,
    });
    const shouldVirtualize = staffList.length > VIRTUALIZATION_THRESHOLD;
    const virtualRows = virtualizer.getVirtualItems();
    const totalCols = 4 + (questions?.length ?? 0);

    const sortIcon = (field: LeaderboardSortField) => {
        if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
        return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    };

    const renderRow = (staff: LeaderboardStaffRow, idx: number) => (
        <TableRow key={staff.id} className={staff.id === currentStaffId ? 'bg-primary/5 font-medium' : ''}>
            <TableCell className="text-center font-mono">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <UserAvatar staff={staff} className="h-8 w-8 text-xs" />
                    <span className="text-sm">
                        {staff.name}
                        {staff.id === currentStaffId && (
                            <Badge variant="outline" className="ml-2 text-xs">Bạn</Badge>
                        )}
                    </span>
                </div>
            </TableCell>
            <TableCell className="text-center">
                <Badge variant="outline">{staff.reviewCount}</Badge>
            </TableCell>
            {questions?.map(q => {
                const qData = staff.byQuestion.get(q.id);
                const qAvg = qData && qData.count > 0 ? qData.total / qData.count : null;
                return (
                    <TableCell key={q.id} className="text-center">
                        {qAvg !== null ? (
                            <span className={`text-sm font-medium ${qAvg >= 3 ? 'text-green-600' : qAvg >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {qAvg.toFixed(1)}
                            </span>
                        ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                        )}
                    </TableCell>
                );
            })}
            <TableCell className="text-center">
                <Badge
                    variant={staff.avg >= 3 ? 'default' : staff.avg >= 2 ? 'secondary' : 'destructive'}
                    className="text-sm font-bold px-3"
                >
                    {staff.avg.toFixed(2)}
                </Badge>
            </TableCell>
        </TableRow>
    );

    const renderBody = () => {
        if (!shouldVirtualize) return staffList.map(renderRow);
        const paddingTop = virtualRows[0]?.start ?? 0;
        const totalSize = virtualizer.getTotalSize();
        const lastEnd = virtualRows[virtualRows.length - 1]?.end ?? 0;
        const paddingBottom = Math.max(0, totalSize - lastEnd);
        return (
            <>
                {paddingTop > 0 && (
                    <TableRow aria-hidden="true">
                        <TableCell colSpan={totalCols} style={{ height: paddingTop, padding: 0 }} />
                    </TableRow>
                )}
                {virtualRows.map(v => renderRow(staffList[v.index], v.index))}
                {paddingBottom > 0 && (
                    <TableRow aria-hidden="true">
                        <TableCell colSpan={totalCols} style={{ height: paddingBottom, padding: 0 }} />
                    </TableRow>
                )}
            </>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Bảng xếp hạng — {selectedPeriodName}</CardTitle>
                <CardDescription>
                    Điểm trung bình của {staffList.length} giảng viên, sắp xếp từ cao đến thấp
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div
                    ref={scrollRef}
                    className={`rounded-md border${shouldVirtualize ? ' max-h-[640px] overflow-auto' : ''}`}
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12 text-center">#</TableHead>
                                <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => onToggleSort('name')}>
                                    <span className="inline-flex items-center gap-1">
                                        Giảng viên
                                        {sortIcon('name')}
                                    </span>
                                </TableHead>
                                <TableHead className="text-center cursor-pointer select-none hover:bg-muted/50" onClick={() => onToggleSort('reviewCount')}>
                                    <span className="inline-flex items-center gap-1 justify-center">
                                        Số người ĐG
                                        {sortIcon('reviewCount')}
                                    </span>
                                </TableHead>
                                {questions?.map(q => (
                                    <TableHead
                                        key={q.id}
                                        className="text-center text-xs max-w-[100px] cursor-pointer select-none hover:bg-muted/50"
                                        title={q.title}
                                        onClick={() => onToggleSort(`q_${q.id}`)}
                                    >
                                        <span className="inline-flex items-center gap-1 justify-center">
                                            {q.title.length > 12 ? q.title.substring(0, 12) + '…' : q.title}
                                            {sortIcon(`q_${q.id}`)}
                                        </span>
                                    </TableHead>
                                ))}
                                <TableHead className="text-center font-bold cursor-pointer select-none hover:bg-muted/50" onClick={() => onToggleSort('avg')}>
                                    <span className="inline-flex items-center gap-1 justify-center">
                                        TB chung
                                        {sortIcon('avg')}
                                    </span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>{renderBody()}</TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
