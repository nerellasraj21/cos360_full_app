import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle, XCircle, Search, Eye, EyeOff, ClipboardCheck, Filter, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { Table } from '@/components/common/table';
import type { TableColumn } from '@/components/common/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/usePermission';
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

// Table row interface for rendering
interface StaffAttendanceRow {
    id: string;
    staff_id: string;
    staff_name: string;
    email: string;
    department: string;
    status: 'present' | 'absent' | 'late' | 'half_day';
    isModified: boolean;
    existingRecord?: StaffAttendanceOut;
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

    // Table state (new)
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [pageSize, setPageSize] = useState<number>(10);
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(['staff_name', 'email', 'department', 'status', 'isModified'])
    );

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

    const getAttendanceStatus = (staffId: string) => {
        return staffAttendances.get(staffId);
    };

    const hasUnsavedChanges = Array.from(staffAttendances.values()).some(att => att.isModified);

    // Column definitions for table
    const columns: TableColumn<StaffAttendanceRow>[] = [
        {
            key: 'staff_name',
            label: 'Staff Name',
            editable: false,
            className: 'font-medium',
        },
        {
            key: 'email',
            label: 'Email',
            editable: false,
            className: 'text-sm text-muted-foreground',
        },
        {
            key: 'department',
            label: 'Department',
            editable: false,
            className: 'text-sm',
        },
        {
            key: 'status',
            label: 'Status',
            editable: false, // Make non-editable since we're using custom render
            render: (value: 'present' | 'absent' | 'late' | 'half_day', row: StaffAttendanceRow) => {
                if (!canWrite) {
                    const labelMap = { present: 'Present', absent: 'Absent', late: 'Late', half_day: 'Half Day' };
                    return <span className="text-sm">{labelMap[value]}</span>;
                }
                return (
                    <Select
                        value={value}
                        onValueChange={(newValue) => {
                            handleAttendanceChange(row.staff_id, newValue as 'present' | 'absent' | 'late' | 'half_day');
                        }}
                    >
                        <SelectTrigger className="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="half_day">Half Day</SelectItem>
                        </SelectContent>
                    </Select>
                );
            },
        },
        {
            key: 'isModified',
            label: 'Modified',
            editable: false,
            render: (value: boolean) =>
                value ? <Badge variant="secondary">Modified</Badge> : null,
        },
    ];

    // Filter columns based on visibility
    const filteredColumns = columns.filter((col) =>
        visibleColumns.has(col.key as string)
    );

    // Transform staff data into table rows
    const tableData: StaffAttendanceRow[] = useMemo(() => {
        return staff.map((staffMember) => {
            const attendance = staffAttendances.get(staffMember.id);
            return {
                id: staffMember.id,
                staff_id: staffMember.id,
                staff_name: `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim() || 'Unknown Staff',
                email: staffMember.email || 'N/A',
                department: staffMember.department || 'N/A',
                status: attendance?.status || 'present',
                isModified: attendance?.isModified || false,
                existingRecord: attendance?.existingRecord,
            };
        });
    }, [staff, staffAttendances]);

    // Apply search filter
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return tableData;
        const query = searchQuery.toLowerCase();
        return tableData.filter((row) =>
            row.staff_name.toLowerCase().includes(query) ||
            row.email.toLowerCase().includes(query) ||
            row.department.toLowerCase().includes(query)
        );
    }, [tableData, searchQuery]);

    // Apply pagination
    const paginatedData = useMemo(() => {
        const startIndex = currentPage * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, currentPage, pageSize]);

    // Column visibility handlers
    const FIXED_COLUMNS = new Set(['staff_name']);

    const handleColumnToggle = (columnKey: string) => {
        if (FIXED_COLUMNS.has(columnKey)) return;
        setVisibleColumns((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(columnKey)) {
                newSet.delete(columnKey);
            } else {
                newSet.add(columnKey);
            }
            return newSet;
        });
    };

    const handleSelectAllColumns = () => {
        setVisibleColumns(new Set(columns.map((col) => col.key as string)));
    };

    const handleDeselectAllColumns = () => {
        setVisibleColumns(new Set(FIXED_COLUMNS));
    };

    // Dummy handlers for Table component (not used, but required by Table props)
    const handleEdit = () => {
        // Not used - status editing is handled directly in render function
    };

    const handleDelete = () => {
        // Not applicable - attendance doesn't have delete action
        // Changing status to "present" removes the record via save logic
    };

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
                                {attendanceFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>🔄</span>}
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
                        <Input
                            id="date-select"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => handleDateChange(e.target.value)}
                        />
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
                            <div className="flex flex-col items-center justify-center gap-1 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">{attendanceSummary.half_day}</span>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-500 uppercase tracking-wide">Half Day</span>
                            </div>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            <div className="bg-green-500 transition-all duration-300" style={{ width: `${(attendanceSummary.present / totalStaff) * 100}%` }} />
                            <div className="bg-yellow-400 transition-all duration-300" style={{ width: `${(attendanceSummary.late / totalStaff) * 100}%` }} />
                            <div className="bg-blue-400 transition-all duration-300" style={{ width: `${(attendanceSummary.half_day / totalStaff) * 100}%` }} />
                            <div className="bg-red-400 transition-all duration-300" style={{ width: `${(attendanceSummary.absent / totalStaff) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{totalStaff} staff total</span>
                            <span className="flex items-center gap-3">
                                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />Present</span>
                                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />Late</span>
                                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-400" />Half Day</span>
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
                <div className="border-t px-6 pb-6 pt-4 space-y-4">
                    {/* Filter title row */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                            <p className="text-sm font-medium text-muted-foreground">Filter Staff</p>
                            {searchQuery && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {filteredData.length} of {totalStaff}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Search by name, email, or department..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                                    className="pl-8 pr-8 h-9"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setCurrentPage(0); }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    {visibleColumns.size === columns.length ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                    Columns ({visibleColumns.size}/{columns.length})
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuCheckboxItem
                                    checked={visibleColumns.size === columns.length}
                                    onCheckedChange={(checked) => checked ? handleSelectAllColumns() : handleDeselectAllColumns()}
                                    className="font-semibold"
                                >
                                    Select All
                                </DropdownMenuCheckboxItem>
                                {columns.map((col) => {
                                    const isFixed = FIXED_COLUMNS.has(col.key as string);
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={col.key as string}
                                            checked={visibleColumns.has(col.key as string)}
                                            onCheckedChange={() => handleColumnToggle(col.key as string)}
                                            disabled={isFixed}
                                            className={isFixed ? 'opacity-60 cursor-not-allowed' : ''}
                                        >
                                            {col.label}
                                            {isFixed && <span className="ml-1 text-xs text-muted-foreground">(fixed)</span>}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </div>
                    </div>

                    {attendanceLoading || staffLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading staff...</span>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {searchQuery ? (
                                <>
                                    <p className="text-lg font-medium">No results found</p>
                                    <p className="text-sm mt-1">Try adjusting your search query</p>
                                </>
                            ) : (
                                <p className="text-lg">No staff members found.</p>
                            )}
                        </div>
                    ) : (
                        <Table
                            columns={filteredColumns}
                            data={paginatedData}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isEditing={false}
                            searchable={false}
                            pagination={{
                                page: currentPage,
                                pageSize: pageSize,
                                total: filteredData.length,
                                onPageChange: setCurrentPage,
                                onPageSizeChange: (size) => { setPageSize(size); setCurrentPage(0); },
                            }}
                            permissions={{ resource: 'staff', canEdit: false, canDelete: false }}
                        />
                    )}
                </div>
            </Card>
        </div>
    );
};

export default StaffAttendancePage;