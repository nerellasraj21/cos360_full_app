import React, { useState } from 'react';
import { Edit2, Trash2, Plus, Calendar, User, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useStaffAttendance, useCreateStaffAttendance, useUpdateStaffAttendance, useDeleteStaffAttendance, useStaffEnrollments } from '@/hooks/staff/useStaff';
import type { StaffAttendance, StaffAttendanceInput, Staff } from '@/types/staff/staff';
import { toast } from 'sonner';

interface StaffAttendanceTableProps {
    className?: string;
}

interface AttendanceFormData extends StaffAttendanceInput {}

export function StaffAttendanceTable({ className }: StaffAttendanceTableProps) {
    const [editingAttendance, setEditingAttendance] = useState<StaffAttendance | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<StaffAttendance | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [formData, setFormData] = useState<AttendanceFormData>({
        staff_id: '',
        date: '',
        status: 'present'
    });

    // Fetch attendance for selected date
    const { data: attendanceResponse, isLoading: attendanceLoading } = useStaffAttendance({
        start_date: selectedDate,
        end_date: selectedDate
    });
    const { data: staffResponse, isLoading: staffLoading } = useStaffEnrollments();

    // Use API data
    const attendance: StaffAttendance[] = attendanceResponse?.items || [];
    const staff = staffResponse?.items || [];

    // Create a map of staff attendance for quick lookup
    const attendanceMap = new Map(attendance.map(att => [att.staff_id, att]));

    // Combine staff with their attendance for the selected date
    const staffWithAttendance = staff.map(staffMember => ({
        ...staffMember,
        attendance: attendanceMap.get(staffMember.id) || null
    }));

    const isLoading = attendanceLoading || staffLoading;

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
        setShowCreateDialog(true);
    };

    const handleEditAttendance = (attendance: StaffAttendance) => {
        setFormData({
            staff_id: attendance.staff_id,
            date: attendance.date,
            status: attendance.status
        });
        setEditingAttendance(attendance);
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

    if (isLoading) {
        return (
            <div className={cn("p-6", className)}>
                <div className="text-center text-muted-foreground">Loading staff attendance...</div>
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
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="w-40"
                        />
                    </div>
                </div>
                <Button onClick={handleCreate} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Record Attendance
                </Button>
            </div>

            {/* Attendance Table */}
            {staffWithAttendance.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Staff Member
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Designation
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Attendance Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {staffWithAttendance.map((staffMember) => (
                                    <tr key={staffMember.id} className="hover:bg-accent/50">
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>{staffMember.first_name} {staffMember.last_name || ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            <span>{staffMember.designation?.title || 'N/A'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
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
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-1">
                                                {staffMember.attendance ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(staffMember.attendance!)}
                                                            className="h-8 w-8 p-0"
                                                            title="Edit Attendance"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(staffMember.attendance!)}
                                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                                                            title="Delete Attendance"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                ) : (
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
                                                )}
                                            </div>
                                        </td>
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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                                onValueChange={(value) => setFormData({ ...formData, staff_id: value })}
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
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Attendance Status *
                            </label>
                            <Select
                                value={formData.status}
                                onValueChange={(value) => setFormData({ ...formData, status: value as 'present' | 'absent' | 'leave' | 'half-day' })}
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
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateDialog(false)}
                        >
                            Cancel
                        </Button>
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