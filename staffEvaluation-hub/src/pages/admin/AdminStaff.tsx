import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStaff, useOrganizationUnits, useGroups, useStaff2Groups, Staff } from '@/hooks/useStaff';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/PaginationControls';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Search, Link } from 'lucide-react';
import { TableSkeleton } from '@/components/TableSkeleton';

const PAGE_SIZE = 20;

interface ProfileWithUser {
  id: string;
  staffId: number | null;
  user: { id: string; email: string };
}

export default function AdminStaff() {
  const { data: staff, isLoading } = useStaff();
  const { data: units } = useOrganizationUnits();
  const { data: groups } = useGroups();
  const { data: staff2groups } = useStaff2Groups();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaffForLink, setSelectedStaffForLink] = useState<Staff | null>(null);
  const [profiles, setProfiles] = useState<ProfileWithUser[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    homeEmail: '',
    schoolEmail: '',
    staffcode: '',
    gender: '',
    mobile: '',
    academicrank: '',
    academicdegree: '',
    organizationunitid: '',
  });

  // Filter groups by selected department
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (selectedUnit === 'all') return groups;
    return groups.filter(g => g.organizationunitid === parseInt(selectedUnit));
  }, [groups, selectedUnit]);

  const staffIdsInGroup = useMemo(() => {
    if (selectedGroup === 'all' || !staff2groups) return null;
    return new Set(
      staff2groups
        .filter(s2g => s2g.groupid === parseInt(selectedGroup))
        .map(s2g => s2g.staffid)
    );
  }, [selectedGroup, staff2groups]);

  const filteredStaff = useMemo(() => {
    let result = staff || [];

    if (selectedUnit !== 'all') {
      result = result.filter(s => s.organizationunitid === parseInt(selectedUnit));
    }

    if (staffIdsInGroup) {
      result = result.filter(s => staffIdsInGroup.has(s.id));
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.staffcode?.toLowerCase().includes(q) ||
        s.schoolEmail?.toLowerCase().includes(q) ||
        s.homeEmail?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [staff, selectedUnit, staffIdsInGroup, debouncedSearch]);

  const [page, setPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedUnit, selectedGroup, debouncedSearch]);

  const totalPages = Math.ceil(filteredStaff.length / PAGE_SIZE);
  const paginatedStaff = useMemo(
    () => filteredStaff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredStaff, page],
  );

  const paginationMeta = useMemo(() => ({
    total: filteredStaff.length,
    page,
    limit: PAGE_SIZE,
    totalPages,
  }), [filteredStaff.length, page, totalPages]);

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const resetForm = () => {
    setFormData({
      name: '', homeEmail: '', schoolEmail: '', staffcode: '', gender: '',
      mobile: '', academicrank: '', academicdegree: '', organizationunitid: '',
    });
    setEditingStaff(null);
  };

  const openEditDialog = (s: Staff) => {
    setEditingStaff(s);
    setFormData({
      name: s.name || '',
      homeEmail: s.homeEmail || '',
      schoolEmail: s.schoolEmail || '',
      staffcode: s.staffcode || '',
      gender: s.gender || '',
      mobile: s.mobile || '',
      academicrank: s.academicrank || '',
      academicdegree: s.academicdegree || '',
      organizationunitid: s.organizationunitid?.toString() || '',
    });
    setIsDialogOpen(true);
  };

  const openLinkDialog = async (s: Staff) => {
    setSelectedStaffForLink(s);
    setIsLoadingProfiles(true);
    setIsLinkDialogOpen(true);
    try {
      const allProfiles = await api.get<ProfileWithUser[]>('/users/profiles');
      const unlinked = allProfiles.filter(p => p.staffId === null);
      setProfiles(unlinked);
    } catch (error) {
      toast.error('Lỗi tải danh sách tài khoản');
      setProfiles([]);
    } finally {
      setIsLoadingProfiles(false);
    }
    setSelectedProfileId('');
  };

  const handleLinkProfile = async () => {
    if (!selectedStaffForLink || !selectedProfileId) return;

    try {
      await api.post('/users/link-staff', {
        profileId: selectedProfileId,
        staffId: selectedStaffForLink.id,
      });
      toast.success('Liên kết thành công!');
      setIsLinkDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Lỗi liên kết: ' + message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name: formData.name || null,
      homeEmail: formData.homeEmail || null,
      schoolEmail: formData.schoolEmail || null,
      staffcode: formData.staffcode || null,
      gender: formData.gender || null,
      mobile: formData.mobile || null,
      academicrank: formData.academicrank || null,
      academicdegree: formData.academicdegree || null,
      organizationunitid: formData.organizationunitid ? parseInt(formData.organizationunitid) : null,
    };

    try {
      if (editingStaff) {
        await api.patch(`/staff/${editingStaff.id}`, payload);
        toast.success('Cập nhật thành công!');
      } else {
        await api.post('/staff', payload);
        toast.success('Thêm mới thành công!');
      }
      await queryClient.refetchQueries({ queryKey: queryKeys.staff });
      setIsDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Lỗi: ' + message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa giảng viên này?')) return;

    try {
      await api.delete(`/staff/${id}`);
      toast.success('Đã xóa!');
      await queryClient.refetchQueries({ queryKey: queryKeys.staff });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Lỗi xóa: ' + message);
    }
  };

  const getUnitName = (id: number | null) => {
    if (!id) return '-';
    return units?.find(u => u.id === id)?.name || '-';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Quản lý Giảng viên</CardTitle>
              <CardDescription>Danh sách {filteredStaff.length} giảng viên{filteredStaff.length !== (staff?.length || 0) ? ` (tổng: ${staff?.length || 0})` : ''}</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Thêm mới</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingStaff ? 'Sửa giảng viên' : 'Thêm giảng viên'}</DialogTitle>
                  <DialogDescription>Nhập thông tin giảng viên</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Họ tên</Label>
                      <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Mã GV</Label>
                      <Input value={formData.staffcode} onChange={e => setFormData({ ...formData, staffcode: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Email cá nhân</Label>
                      <Input type="email" value={formData.homeEmail} onChange={e => setFormData({ ...formData, homeEmail: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email trường</Label>
                      <Input type="email" value={formData.schoolEmail} onChange={e => setFormData({ ...formData, schoolEmail: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Giới tính</Label>
                      <Select value={formData.gender} onValueChange={v => setFormData({ ...formData, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Nam</SelectItem>
                          <SelectItem value="female">Nữ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Điện thoại</Label>
                      <Input value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Học hàm</Label>
                      <Input value={formData.academicrank} onChange={e => setFormData({ ...formData, academicrank: e.target.value })} placeholder="PGS, GS..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Học vị</Label>
                      <Input value={formData.academicdegree} onChange={e => setFormData({ ...formData, academicdegree: e.target.value })} placeholder="Thạc sỹ, Tiến sỹ..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Đơn vị</Label>
                    <Select value={formData.organizationunitid} onValueChange={v => setFormData({ ...formData, organizationunitid: v })}>
                      <SelectTrigger><SelectValue placeholder="Chọn đơn vị" /></SelectTrigger>
                      <SelectContent>
                        {units?.map(u => (
                          <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                    <Button type="submit">{editingStaff ? 'Cập nhật' : 'Thêm'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                placeholder="Tìm kiếm theo tên, mã GV, email..."
                aria-label="Tìm kiếm giảng viên"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={selectedUnit} onValueChange={(v) => { setSelectedUnit(v); setSelectedGroup('all'); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Lọc theo khoa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả khoa</SelectItem>
                {units?.map(u => (
                  <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Lọc theo nhóm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhóm</SelectItem>
                {filteredGroups.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Mã</TableHead>
                  <TableHead>Họ tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Học hàm/vị</TableHead>
                  <TableHead>Đơn vị</TableHead>
                  <TableHead className="w-32">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton
                    rows={8}
                    columns={6}
                    columnWidths={['w-16', 'w-40', 'w-48', 'w-24', 'w-32', 'w-24']}
                  />
                ) : paginatedStaff.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.staffcode}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.schoolEmail || s.homeEmail}</TableCell>
                    <TableCell className="text-sm">{[s.academicrank, s.academicdegree].filter(Boolean).join(', ') || '-'}</TableCell>
                    <TableCell className="text-sm">{getUnitName(s.organizationunitid)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openLinkDialog(s)} aria-label="Liên kết tài khoản">
                          <Link className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEditDialog(s)} aria-label="Sửa giảng viên">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s.id)} aria-label="Xóa giảng viên">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            meta={paginationMeta}
            page={page}
            setPage={goToPage}
            nextPage={() => goToPage(page + 1)}
            prevPage={() => goToPage(page - 1)}
            hasNextPage={page < totalPages}
            hasPrevPage={page > 1}
          />
        </CardContent>
      </Card>

      {/* Link Profile Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Liên kết tài khoản</DialogTitle>
            <DialogDescription>
              Liên kết tài khoản đăng nhập với giảng viên: {selectedStaffForLink?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingProfiles ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Không có tài khoản nào chưa được liên kết
              </p>
            ) : (
              <div className="space-y-2">
                <Label>Chọn tài khoản</Label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài khoản" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleLinkProfile} disabled={!selectedProfileId}>Liên kết</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
