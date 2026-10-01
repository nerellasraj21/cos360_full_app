import React, { useState, useMemo } from 'react';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import { Edit, Trash2, Plus, Calendar, User, CheckCircle, XCircle, Clock, Search, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStaffAttendance, useCreateStaffAttendance, useUpdateStaffAttendance, useDeleteStaffAttendance, useStaffEnrollments } from '@/hooks/staff/useStaff';
import { usePermission } from '@/hooks/usePermission';
import type { StaffAttendance, StaffAttendanceInput, Staff } from '@/types/staff/staff';
import { toast } from 'sonner';

interface StaffAttendanceTableProps {
    className?: string;
}

interface AttendanceFormData extends StaffAttendanceInput {}

export function StaffAttendanceTable({ className }: StaffAttendanceTableProps) {
    const { checkPermission } = usePermission();
    const canCreate = checkPermission('staff_attendance', 'create');
    const canUpdate = checkPermission('staff_attendance', 'update');
    const canDelete = checkPermission('staff_attendance', 'delete');
    const hasAnyAction = canCreate || canUpdate || canDelete;

    const [editingAttendance, setEditingAttendance] = useState<StaffAttendance | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<StaffAttendance | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [formData, setFormData] = useState<AttendanceFormData>({
        staff_id: '',
        date: '',
        status: 'present'
    });
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Fetch attendance for selected date
    const { data: attendanceResponse, isLoading: attendanceLoading } = useStaffAttendance({
        start_date: selectedDate,
        end_date: selectedDate
    });
    const { data: staffResponse, isLoading: staffLoading } = useStaffEnrollments();

    // Use API data
    const attendance: StaffAttendance[] = attendanceResponse?.items || [];
    const staff: Staff[] = (Array.isArray(staffResponse) ? staffResponse : staffResponse?.items) || [];

    // Create a map of staff attendance for quick lookup
    const attendanceMap = new Map(attendance.map(att => [att.staff_id, att]));

    // Combine staff with their attendance for the selected date
    const staffWithAttendance = staff.map(staffMember => ({
        ...staffMember,
        attendance: attendanceMap.get(staffMember.id) || null
    }));

    const isLoading = attendanceLoading || staffLoading;

    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
    const [localSearch, setLocalSearch] = useState('');

    const createMutation = useCreateStaffAttendance();
    const updateMutation = useUpdateStaffAttendance();
    const deleteMutation = useDeleteStaffAttendance();

    const handleCreate = () => {
        setFormData({
            staff_id: '',
            date: selectedDate,
            status: 'present'
        });
        setEditingAttendance(null);
        setIsFormDirty(false);
        setShowCreateDialog(true);
    };

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
    };

    const handleMarkAttendance = (staffMember: Staff, status: 'present' | 'absent' | 'leave' | 'half-day') => {
        setFormData({
            staff_id: staffMember.id,
            date: selectedDate,
            status: status
        });
        setEditingAttendance(null);
        setIsFormDirty(false);
        setShowCreateDialog(true);
    };

    const handleEditAttendance = (attendance: StaffAttendance) => {
        setFormData({
            staff_id: attendance.staff_id,
            date: attendance.date,
            status: attendance.status
        });
        setEditingAttendance(attendance);
        setIsFormDirty(false);
        setShowCreateDialog(true);
    };

    const handleEdit = (attendance: StaffAttendance) => {
        handleEditAttendance(attendance);
    };

    const handleDelete = (attendance: StaffAttendance) => {
        setShowDeleteDialog(attendance);
    };

    const handleSubmit = async () => {
        if (!formData.staff_id) {
            toast.error('Please select a staff member');
            return;
        }

        if (!formData.date) {
            toast.error('Please select a date');
            return;
        }

        try {
            if (editingAttendance) {
                await updateMutation.mutateAsync({
                    id: editingAttendance.id,
                    data: formData
                });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setIsFormDirty(false);
            setShowCreateDialog(false);
            setEditingAttendance(null);
        } catch (error) {
            // Error handling is done in the mutation hooks
        }
    };

    const handleConfirmDelete = async () => {
        if (showDeleteDialog) {
            try {
                await deleteMutation.mutateAsync(showDeleteDialog.id);
                setShowDeleteDialog(null);
            } catch (error) {
                // Error handling is done in the mutation hook
            }
        }
    };

    const getStaffName = (staffId: string) => {
        const staffMember = staff.find(s => s.id === staffId);
        return staffMember ? `${staffMember.first_name} ${staffMember.last_name || ''}`.trim() : `Staff ${staffId}`;
    };

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'present':
                return 'default';
            case 'absent':
                return 'destructive';
            case 'leave':
                return 'secondary';
            case 'half-day':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'present':
                return <CheckCircle className="h-4 w-4" />;
            case 'absent':
                return <XCircle className="h-4 w-4" />;
            case 'leave':
                return <Clock className="h-4 w-4" />;
            case 'half-day':
                return <Clock className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };


    // Search filter
    const effectiveSearch = (localSearch).toLowerCase();

    const filteredData = useMemo(() => {
        if (!effectiveSearch) return staffWithAttendance;
        return staffWithAttendance.filter((s: any) => {
            const name = `${s.first_name} ${s.last_name || ''}`.toLowerCase();
            const desig = (s.designation?.title || '').toLowerCase();
            return name.includes(effectiveSearch) || desig.includes(effectiveSearch);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staffWithAttendance, effectiveSearch]);

    const sortedData = useMemo(() => {
        if (!sortKey || !sortDir) return filteredData;
        return [...filteredData].sort((a: any, b: any) => {
            let aVal: string;
            let bVal: string;
            switch (sortKey) {
                case 'name':
                    aVal = `${a.first_name} ${a.last_name || ''}`.toLowerCase();
                    bVal = `${b.first_name} ${b.last_name || ''}`.toLowerCase();
                    break;
                case 'designation':
                    aVal = (a.designation?.title || '').toLowerCase();
                    bVal = (b.designation?.title || '').toLowerCase();
                    break;
                default: return 0;
            }
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredData, sortKey, sortDir]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-50" />;
        if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 inline" />;
        return <ChevronDown className="h-3 w-3 ml-1 inline" />;
    };

    if (isLoading) {
        return (
            <div className={cn("p-6", className)}>
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading staff attendance...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-foreground">Staff Attendance</h2>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <DatePicker value={selectedDate} onChange={handleDateChange} className="w-44" />
                    </div>
                </div>
                {canCreate && (
                    <Button onClick={handleCreate} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Record Attendance
                    </Button>
                )}
            </div>

            {/* Attendance Table */}
            {/* Filter bar */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filters</span>
                </div>
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search staff..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
            </div>

            {filteredData.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold border-b bg-muted w-14 text-xs text-muted-foreground">S.No.</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('name')}>
                                        Staff Member <SortIcon col="name" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('designation')}>
                                        Designation <SortIcon col="designation" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Attendance Status
                                    </th>
                                    {hasAnyAction && (
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {sortedData.map((staffMember, index) => (
                                    <tr key={staffMember.id} className="hover:bg-accent/50" style={{ height: '48px' }}>
                                        <td className="px-3 align-middle text-xs text-muted-foreground">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-foreground align-middle">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{staffMember.first_name} {staffMember.last_name || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground align-middle">
                                            <span>{staffMember.designation?.title || 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm align-middle">
                                            {staffMember.attendance ? (
                                                <Badge
                                                    variant={getStatusBadgeVariant(staffMember.attendance.status)}
                                                    className="text-xs flex items-center gap-1 w-fit"
                                                >
                                                    {getStatusIcon(staffMember.attendance.status)}
                                                    {staffMember.attendance.status.charAt(0).toUpperCase() + staffMember.attendance.status.slice(1)}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">Not marked</span>
                                            )}
                                        </td>
                                        {hasAnyAction && (
                                        <td className="px-4 py-3 text-sm align-middle">
                                            <TableActionGroup>
                                                {staffMember.attendance ? (
                                                    <>
                                                        {canUpdate && (
                                                            <EditButton
                                                                onClick={() => handleEdit(staffMember.attendance!)}
                                                                title="Edit Attendance"
                                                            />
                                                        )}
                                                        {canDelete && (
                                                            <DeleteButton
                                                                onClick={() => handleDelete(staffMember.attendance!)}
                                                                title="Delete Attendance"
                                                            />
                                                        )}
                                                    </>
                                                ) : canCreate ? (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMarkAttendance(staffMember, 'present')}
                                                            className="h-8 px-2 text-xs"
                                                            title="Mark Present"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Present
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMarkAttendance(staffMember, 'absent')}
                                                            className="h-8 px-2 text-xs text-destructive"
                                                            title="Mark Absent"
                                                        >
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Absent
                                                        </Button>
                                                    </div>
                                                ) : null}
                                            </TableActionGroup>
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                    <p>No staff members found.</p>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAttendance ? 'Edit Attendance Record' : 'Record Staff Attendance'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Staff Member *
                            </label>
                            <Select
                                value={formData.staff_id}
                                onValueChange={(value) => { setFormData({ ...formData, staff_id: value }); setIsFormDirty(true); }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff.map((staffMember) => (
                                        <SelectItem key={staffMember.id} value={staffMember.id}>
                                            {staffMember.first_name} {staffMember.last_name || ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Date *
                            </label>
                            <DatePicker
                                value={formData.date}
                                onChange={(v) => { setFormData({ ...formData, date: v }); setIsFormDirty(true); }}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Attendance Status *
                            </label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => { setFormData({ ...formData, status: value as 'present' | 'absent' | 'leave' | 'half-day' }); setIsFormDirty(true); }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="present">Present</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
                                    <SelectItem value="leave">On Leave</SelectItem>
                                    <SelectItem value="half-day">Half Day</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Attendance Record</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground">
                        Are you sure you want to delete the attendance record for "{getStaffName(showDeleteDialog?.staff_id || '')}" on "{showDeleteDialog?.date ? new Date(showDeleteDialog.date).toLocaleDateString() : ''}"?
                        This action cannot be undone.
                    </p>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}