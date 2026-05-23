import { useState } from 'react';
import { useAllPeriods, EvaluationPeriod } from '@/hooks/useStaff';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Calendar } from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    draft: { label: 'Nháp', variant: 'outline' },
    active: { label: 'Đang diễn ra', variant: 'default' },
    closed: { label: 'Đã kết thúc', variant: 'secondary' },
};

export default function AdminPeriods() {
    const { data: periods, isLoading } = useAllPeriods();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<EvaluationPeriod | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState<string>('draft');
    const [isAnonymous, setIsAnonymous] = useState(false);

    const resetForm = () => {
        setName('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setStatus('draft');
        setIsAnonymous(false);
        setEditingPeriod(null);
    };

    const openEditDialog = (p: EvaluationPeriod) => {
        setEditingPeriod(p);
        setName(p.name);
        setDescription(p.description || '');
        setStartDate(p.startDate.split('T')[0]);
        setEndDate(p.endDate.split('T')[0]);
        setStatus(p.status);
        setIsAnonymous(p.isAnonymous);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (new Date(endDate) <= new Date(startDate)) {
            toast.error('Ngày kết thúc phải sau ngày bắt đầu!');
            return;
        }

        try {
            if (editingPeriod) {
                await api.patch(`/evaluation-periods/${editingPeriod.id}`, {
                    name,
                    description: description || null,
                    startDate: new Date(startDate).toISOString(),
                    endDate: new Date(endDate).toISOString(),
                    status,
                    isAnonymous,
                });
                toast.success('Cập nhật đợt đánh giá thành công!');
            } else {
                await api.post('/evaluation-periods', {
                    name,
                    description: description || null,
                    startDate: new Date(startDate).toISOString(),
                    endDate: new Date(endDate).toISOString(),
                    isAnonymous,
                });
                toast.success('Thêm đợt đánh giá thành công!');
            }
            await queryClient.refetchQueries({ queryKey: queryKeys.allPeriods });
            await queryClient.refetchQueries({ queryKey: queryKeys.activePeriods });
            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Lỗi: ' + message);
        }
    };

    const handleDelete = async (id: number, periodName: string) => {
        if (!confirm(`Bạn có chắc muốn xóa đợt "${periodName}"? Tất cả đánh giá liên quan sẽ bị mất!`)) return;

        try {
            await api.delete(`/evaluation-periods/${id}`);
            toast.success('Đã xóa đợt đánh giá!');
            await queryClient.refetchQueries({ queryKey: queryKeys.allPeriods });
            await queryClient.refetchQueries({ queryKey: queryKeys.activePeriods });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Lỗi xóa: ' + message);
        }
    };

    const handleStatusChange = async (id: number, newStatus: string) => {
        try {
            await api.patch(`/evaluation-periods/${id}`, { status: newStatus });
            toast.success(`Đã chuyển trạng thái sang "${statusConfig[newStatus]?.label}"!`);
            await queryClient.refetchQueries({ queryKey: queryKeys.allPeriods });
            await queryClient.refetchQueries({ queryKey: queryKeys.activePeriods });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error('Lỗi: ' + message);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                Quản lý Đợt đánh giá
                            </CardTitle>
                            <CardDescription>
                                Danh sách {periods?.length || 0} đợt đánh giá
                            </CardDescription>
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" /> Thêm đợt</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle>{editingPeriod ? 'Sửa đợt đánh giá' : 'Thêm đợt đánh giá mới'}</DialogTitle>
                                    <DialogDescription>Nhập thông tin đợt đánh giá</DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Tên đợt đánh giá *</Label>
                                        <Input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="VD: Đợt đánh giá HK2 2024-2025"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Mô tả (tùy chọn)</Label>
                                        <Textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            rows={2}
                                            placeholder="Ghi chú thêm về đợt đánh giá..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Ngày bắt đầu *</Label>
                                            <Input
                                                type="date"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ngày kết thúc *</Label>
                                            <Input
                                                type="date"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="isAnonymous" className="text-sm font-medium cursor-pointer">
                                                Đánh giá ẩn danh
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Ẩn danh tính người chấm khỏi kết quả của giảng viên
                                            </p>
                                        </div>
                                        <Switch
                                            id="isAnonymous"
                                            checked={isAnonymous}
                                            onCheckedChange={setIsAnonymous}
                                        />
                                    </div>
                                    {editingPeriod && (
                                        <div className="space-y-2">
                                            <Label>Trạng thái</Label>
                                            <Select value={status} onValueChange={setStatus}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">Nháp</SelectItem>
                                                    <SelectItem value="active">Đang diễn ra</SelectItem>
                                                    <SelectItem value="closed">Đã kết thúc</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                                        <Button type="submit">{editingPeriod ? 'Cập nhật' : 'Thêm'}</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">ID</TableHead>
                                    <TableHead>Tên đợt</TableHead>
                                    <TableHead>Mô tả</TableHead>
                                    <TableHead className="text-center">Ngày bắt đầu</TableHead>
                                    <TableHead className="text-center">Ngày kết thúc</TableHead>
                                    <TableHead className="text-center">Ẩn danh</TableHead>
                                    <TableHead className="text-center">Trạng thái</TableHead>
                                    <TableHead className="text-right">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periods?.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            Chưa có đợt đánh giá nào
                                        </TableCell>
                                    </TableRow>
                                )}
                                {periods?.map(p => {
                                    const cfg = statusConfig[p.status] || statusConfig.draft;
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-mono">{p.id}</TableCell>
                                            <TableCell className="font-medium">{p.name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                                {p.description || '—'}
                                            </TableCell>
                                            <TableCell className="text-center text-sm">
                                                {new Date(p.startDate).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="text-center text-sm">
                                                {new Date(p.endDate).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {p.isAnonymous ? (
                                                    <Badge variant="secondary">Ẩn danh</Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Select
                                                    value={p.status}
                                                    onValueChange={(val) => handleStatusChange(p.id, val)}
                                                >
                                                    <SelectTrigger className="w-[140px] mx-auto h-8">
                                                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="draft">Nháp</SelectItem>
                                                        <SelectItem value="active">Đang diễn ra</SelectItem>
                                                        <SelectItem value="closed">Đã kết thúc</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => openEditDialog(p)} aria-label="Sửa đợt đánh giá">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(p.id, p.name)}
                                                        aria-label="Xóa đợt đánh giá"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
