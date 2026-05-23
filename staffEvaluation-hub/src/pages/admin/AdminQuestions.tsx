import { useState } from 'react';
import { useQuestions, Question } from '@/hooks/useStaff';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

export default function AdminQuestions() {
  const { data: questions, isLoading } = useQuestions();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEditingQuestion(null);
  };

  const openEditDialog = (q: Question) => {
    setEditingQuestion(q);
    setTitle(q.title);
    setDescription(q.description || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingQuestion) {
        await api.patch(`/questions/${editingQuestion.id}`, { title, description: description || null });
        toast.success('Cập nhật thành công!');
      } else {
        await api.post('/questions', { title, description: description || null });
        toast.success('Thêm mới thành công!');
      }
      await queryClient.refetchQueries({ queryKey: queryKeys.questions });
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Lỗi: ' + message);
    }
  };

  const handleToggleActive = async (q: Question) => {
    try {
      await api.patch(`/questions/${q.id}`, { isActive: !q.isActive });
      toast.success(q.isActive ? 'Đã ẩn câu hỏi' : 'Đã hiện câu hỏi');
      await Promise.all([
        queryClient.refetchQueries({ queryKey: queryKeys.questions }),
        queryClient.refetchQueries({ queryKey: queryKeys.activeQuestions }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Lỗi: ' + message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;

    try {
      await api.delete(`/questions/${id}`);
      toast.success('Đã xóa!');
      await queryClient.refetchQueries({ queryKey: queryKeys.questions });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Lỗi xóa: ' + message);
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
              <CardTitle>Quản lý Câu hỏi</CardTitle>
              <CardDescription>Danh sách {questions?.length || 0} câu hỏi đánh giá</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Thêm câu hỏi</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi'}</DialogTitle>
                  <DialogDescription>Nhập thông tin câu hỏi đánh giá</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tiêu đề câu hỏi</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Mô tả (tùy chọn)</Label>
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Hướng dẫn đánh giá..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                    <Button type="submit">{editingQuestion ? 'Cập nhật' : 'Thêm'}</Button>
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
                  <TableHead className="w-16">STT</TableHead>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Mô tả</TableHead>
                  <TableHead className="w-24 text-center">Trạng thái</TableHead>
                  <TableHead className="w-24">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions?.map((q, idx) => (
                  <TableRow key={q.id} className={!q.isActive ? 'opacity-50' : ''}>
                    <TableCell className="font-mono">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">{q.description || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={q.isActive}
                        onCheckedChange={() => handleToggleActive(q)}
                        aria-label={q.isActive ? 'Ẩn câu hỏi' : 'Hiện câu hỏi'}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(q)} aria-label="Sửa tiêu chí">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(q.id)} aria-label="Xóa tiêu chí">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
