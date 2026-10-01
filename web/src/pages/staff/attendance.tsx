import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle, XCircle, Search, ClipboardCheck, Filter, X, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';
import { QuickSendButton } from '@/components/communication/QuickSendButton';
import { useStaff } from '@/api/staff';
import { useStaffAttendanceByDate } from '@/api/hooks/staff/attendance';
import {
    createStaffAttendance,
    updateStaffAttendance,
    deleteStaffAttendance,
} from '@/api/staff/attendance';
import type {
    StaffAttendanceCreate,
    StaffAttendanceUpdate,
    StaffAttendanceOut
} from '@/types/attendance';
import type { Staff } from '@/types/staff';

interface StaffAttendanceState {
    staff_id: string;
    status: 'present' | 'absent' | 'late' | 'half_day';
    existingRecord?: StaffAttendanceOut;
    isModified: boolean;
}

const StaffAttendancePage: React.FC = () => {
    const { checkPermission } = usePermission();
    const canCreate = checkPermission('staff_attendance', 'create');
    const canUpdate = checkPermission('staff_attendance', 'update');
    const canWrite = canCreate || canUpdate;

    // Selection state
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    // Data state
    const [staffAttendances, setStaffAttendances] = useState<Map<string, StaffAttendanceState>>(new Map());
    const [existingAttendances, setExistingAttendances] = useState<StaffAttendanceOut[]>([]);

    // Loading states
    const [isSaving, setIsSaving] = useState(false);

    // Success/error states
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Filter state
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Data fetching
    const { data: staffData, isLoading: staffLoading } = useStaff({ is_active: true });
    const { data: attendanceData, isLoading: attendanceLoading, isFetching: attendanceFetching, refetch: refetchAttendance } = useStaffAttendanceByDate(selectedDate);

    // Staff data from API
    const staff = useMemo(() => {
        return staffData || [];
    }, [staffData]);

    // Reset attendance states when date changes
    useEffect(() => {
        if (selectedDate) {
            setStaffAttendances(new Map());
            setExistingAttendances([]);
            setSaveMessage(null);
            setSaveError(null);
        }
    }, [selectedDate]);

    // Update existing attendances when data changes
    useEffect(() => {
        if (attendanceData) {
            setExistingAttendances(attendanceData);
        }
    }, [attendanceData]);

    // Initialize staff attendance states when staff or attendance data changes
    useEffect(() => {
        if (staff.length > 0) {
            const newAttendances = new Map<string, StaffAttendanceState>();

            staff.forEach(staffMember => {
                const existing = existingAttendances.find(att => att.staff_id === staffMember.id);
                // Always default to 'present' unless there's an existing record for this specific date
                const status = existing ? existing.status : 'present';
                newAttendances.set(staffMember.id, {
                    staff_id: staffMember.id,
                    status: status,
                    existingRecord: existing,
                    isModified: false
                });
            });

            setStaffAttendances(newAttendances);
        } else {
            // Clear attendance states when no staff
            setStaffAttendances(new Map());
        }
    }, [staff, existingAttendances]);

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        setSaveMessage(null);
        setSaveError(null);
    };

    const handleAttendanceChange = (staffId: string, status: 'present' | 'absent' | 'late' | 'half_day') => {
        setStaffAttendances(prev => {
            const newMap = new Map(prev);
            const current = newMap.get(staffId);
            if (current) {
                const wasStatus = current.status;
                const isStatus = status;
                newMap.set(staffId, {
                    ...current,
                    status,
                    isModified: current.existingRecord ?
                        (wasStatus !== isStatus) :
                        (status !== 'present') // New records are modified if not marked present
                });
            }
            return newMap;
        });
        setSaveMessage(null);
        setSaveError(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        setSaveError(null);

        try {
            // Snapshot modified records before async ops
            const toCreate: { staffId: string; status: 'absent' | 'late' | 'half_day' }[] = [];
            const toUpdate: { id: string; staffId: string; status: 'absent' | 'late' | 'half_day' }[] = [];
            const toDelete: string[] = [];
            const toDeleteStaffIds: string[] = [];

            staffAttendances.forEach((attendance, staffId) => {
                if (!attendance.isModified) return;
                if (attendance.status === 'present') {
                    if (attendance.existingRecord) {
                        toDelete.push(attendance.existingRecord.id);
                        toDeleteStaffIds.push(staffId);
                    }
                } else {
                    if (attendance.existingRecord) {
                        toUpdate.push({ id: attendance.existingRecord.id, staffId, status: attendance.status });
                    } else {
                        toCreate.push({ staffId, status: attendance.status });
                    }
                }
            });

            // Run all operations in parallel — direct API calls (same pattern as student attendance)
            const createdRecords: StaffAttendanceOut[] = [];
            const ops: Promise<any>[] = [
                ...toUpdate.map(u => updateStaffAttendance(u.id, { status: u.status, remarks: '' })),
                ...toDelete.map(id => deleteStaffAttendance(id)),
                ...toCreate.map(c =>
                    createStaffAttendance({ staff_id: c.staffId, date: selectedDate, status: c.status, remarks: '' })
                        .then(r => { createdRecords.push(r); })
                ),
            ];
            await Promise.all(ops);

            // Update existingAttendances with saved records so any future useEffect
            // re-initialization (triggered by React Query auto-refetch) uses correct data
            setExistingAttendances(prev => {
                const remaining = prev.filter(r => !toDelete.includes(r.id));
                const updated = remaining.map(r => {
                    const u = toUpdate.find(u => u.id === r.id);
                    return u ? { ...r, status: u.status } : r;
                });
                return [...updated, ...createdRecords];
            });

            // Also patch staffAttendances in-place for immediate UI update
            setStaffAttendances(prev => {
                const newMap = new Map(prev);
                toDeleteStaffIds.forEach(staffId => {
                    const att = newMap.get(staffId);
                    if (att) newMap.set(staffId, { ...att, isModified: false, existingRecord: undefined });
                });
                toUpdate.forEach(u => {
                    const att = newMap.get(u.staffId);
                    if (att) newMap.set(u.staffId, {
                        ...att, isModified: false,
                        existingRecord: att.existingRecord ? { ...att.existingRecord, status: u.status } : undefined,
                    });
                });
                createdRecords.forEach(newRecord => {
                    const att = newMap.get(newRecord.staff_id);
                    if (att) newMap.set(newRecord.staff_id, { ...att, isModified: false, existingRecord: newRecord });
                });
                return newMap;
            });

            setSaveMessage('Attendance saved successfully!');
            toast.success('Attendance saved successfully!');
            setTimeout(() => setSaveMessage(null), 3000);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save attendance';
            setSaveError(errorMessage);
            toast.error(errorMessage);
            setTimeout(() => setSaveError(null), 5000);
        } finally {
            setIsSaving(false);
        }
    };

    const getStaffName = (staff: Staff) => {
        return `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unknown Staff';
    };

    const hasUnsavedChanges = Array.from(staffAttendances.values()).some(att => att.isModified);

    // Apply search filter directly over staff (name, email, department)
    const filteredStaff = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return staff;
        return staff.filter((staffMember) => {
            const name = getStaffName(staffMember).toLowerCase();
            const email = (staffMember.email || '').toLowerCase();
            const department = (staffMember.department || '').toLowerCase();
            return name.includes(q) || email.includes(q) || department.includes(q);
        });
    }, [staff, searchQuery]);

    const attendanceSummary = useMemo(() => {
        const all = Array.from(staffAttendances.values());
        return {
            present: all.filter(a => a.status === 'present').length,
            absent: all.filter(a => a.status === 'absent').length,
            late: all.filter(a => a.status === 'late').length,
            half_day: all.filter(a => a.status === 'half_day').length,
        };
    }, [staffAttendances]);

    const totalStaff = staff.length;
    const attendancePct = totalStaff > 0
        ? Math.round((attendanceSummary.present / totalStaff) * 100)
        : 0;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <PageHeader title="Staff Attendance" icon={<ClipboardCheck className="h-5 w-5" />} />

            {/* Single unified card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Attendance Overview</span>
                        <div className="flex items-center gap-2">
                            {hasUnsavedChanges && <Badge variant="secondary">Unsaved Changes</Badge>}
                            <Button variant="outline" size="sm" onClick={() => refetchAttendance()} disabled={attendanceFetching}>
                                {attendanceFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Refresh
                            </Button>
                            {canWrite && (
                                <Button size="sm" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {isSaving ? 'Saving...' : 'Save Attendance'}
                                </Button>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>

                {/* ── Date selector ── */}
                <div className="px-6 pb-4">
                    <div className="max-w-xs space-y-1.5">
                        <Label htmlFor="date-select">Date</Label>
                        <DatePicker value={selectedDate} onChange={handleDateChange} />
                    </div>
                </div>

                {/* ── Analysis ── */}
                {totalStaff > 0 && (
                    <div className="border-t px-6 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Attendance Analysis</p>
                            <span className="text-sm font-semibold">{attendancePct}% Present</span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div className="flex flex-col items-center justify-center gap-1 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                                <span className="text-3xl font-bold text-green-700 dark:text-green-400">{attendanceSummary.present}</span>
                                <span className="text-xs font-medium text-green-600 dark:text-green-500 uppercase tracking-wide">Present</span>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                                <span className="text-3xl font-bold text-red-700 dark:text-red-400">{attendanceSummary.absent}</span>
                                <span className="text-xs font-medium text-red-600 dark:text-red-500 uppercase tracking-wide">Absent</span>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                <span className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{attendanceSummary.late}</span>
                                <span className="text-xs font-medium text-yellow-600 dark:text-yellow-500 uppercase tracking-wide">Late</span>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-1 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                                <span className="text-3xl font-bold text-orange-700 dark:text-orange-400">{attendanceSummary.half_day}</span>
                                <span className="text-xs font-medium text-orange-600 dark:text-orange-500 uppercase tracking-wide">Half Day</span>
                            </div>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            <div className="bg-green-500 transition-all duration-300" style={{ width: `${(attendanceSummary.present / totalStaff) * 100}%` }} />
                            <div className="bg-orange-400 transition-all duration-300" style={{ width: `${(attendanceSummary.half_day / totalStaff) * 100}%` }} />
                            <div className="bg-yellow-400 transition-all duration-300" style={{ width: `${(attendanceSummary.late / totalStaff) * 100}%` }} />
                            <div className="bg-red-400 transition-all duration-300" style={{ width: `${(attendanceSummary.absent / totalStaff) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{totalStaff} staff total</span>
                            <span className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />Present</span>
                                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-400" />Half Day</span>
                                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />Late</span>
                                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400" />Absent</span>
                            </span>
                        </div>
                        {saveMessage && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-950 dark:border-green-800">
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                <span className="text-green-800 dark:text-green-200 text-sm">{saveMessage}</span>
                            </div>
                        )}
                        {saveError && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800">
                                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                <span className="text-red-800 dark:text-red-200 text-sm">{saveError}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Staff list ── */}
                <div className="border-t px-6 pb-6 pt-4">
                    {/* Filter row */}
                    <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="text-sm font-medium text-muted-foreground">Filter Staff</p>
                            {searchQuery && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {filteredStaff.length} of {totalStaff}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search by name, email, or department..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-8 h-9 text-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {attendanceLoading || staffLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Loading staff...</span>
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No staff members found.
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No staff match "{searchQuery}".
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredStaff.map((staffMember, index) => {
                                const attendance = staffAttendances.get(staffMember.id);
                                const status = attendance?.status || 'present';
                                const statusStyles = {
                                    present: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
                                    absent: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
                                    late: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800',
                                    half_day: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
                                }[status];
                                const rowStyles = status === 'absent'
                                    ? 'border-red-200'
                                    : status === 'late'
                                    ? 'border-yellow-200'
                                    : status === 'half_day'
                                    ? 'border-orange-200'
                                    : 'border-border';
                                const statusLabel = status === 'half_day' ? 'Half Day' : status.charAt(0).toUpperCase();
                                return (
                                    <div
                                        key={staffMember.id}
                                        className={`flex items-center justify-between p-4 border rounded-lg ${rowStyles}`}
                                        style={{ height: '64px' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{index + 1}</span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusStyles} capitalize min-w-[60px] justify-center`}>
                                                {statusLabel}
                                            </span>
                                            <div>
                                                <div className="font-medium">{getStaffName(staffMember)}</div>
                                                <div className="text-sm text-muted-foreground">{staffMember.email || 'N/A'} · {staffMember.department || 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <QuickSendButton
                                                templateName="Staff Attendance"
                                                targetType="individual_staff"
                                                targetRef={{ staff_id: staffMember.id }}
                                                recipientLabel={getStaffName(staffMember)}
                                                variables={{
                                                    staff_name: getStaffName(staffMember),
                                                    date: selectedDate,
                                                }}
                                                // Only meaningful for staff who aren't fully present today.
                                                disabled={status === 'present'}
                                                title={
                                                    status === 'present'
                                                        ? 'Staff is present — no notification needed'
                                                        : 'Send Attendance Message'
                                                }
                                            />
                                            {canWrite ? (
                                                <Select
                                                    value={status}
                                                    onValueChange={(value) =>
                                                        handleAttendanceChange(staffMember.id, value as 'present' | 'absent' | 'late' | 'half_day')
                                                    }
                                                >
                                                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="present">Present</SelectItem>
                                                        <SelectItem value="absent">Absent</SelectItem>
                                                        <SelectItem value="late">Late</SelectItem>
                                                        <SelectItem value="half_day">Half Day</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <span className="text-sm w-32 text-right">{statusLabel}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default StaffAttendancePage;