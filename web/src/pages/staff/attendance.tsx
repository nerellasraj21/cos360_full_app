import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle, XCircle, Search, Eye, EyeOff, ClipboardCheck } from 'lucide-react';
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
import { useStaff } from '@/api/staff';
import {
    useStaffAttendanceByDate,
    useCreateStaffAttendance,
    useUpdateStaffAttendance,
    useDeleteStaffAttendance
} from '@/api/hooks/staff/attendance';
import type {
    StaffAttendanceCreate,
    StaffAttendanceUpdate,
    StaffAttendanceOut
} from '@/types/attendance';
import type { Staff } from '@/types/staff';

interface StaffAttendanceState {
    staff_id: string;
    status: 'present' | 'absent' | 'late';
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
    status: 'present' | 'absent' | 'late';
    isModified: boolean;
    existingRecord?: StaffAttendanceOut;
}

const StaffAttendancePage: React.FC = () => {
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
        new Set(['staff_name', 'email', 'department', 'status', 'isModified', 'actions'])
    );

    // Data fetching
    const { data: staffData, isLoading: staffLoading } = useStaff({ is_active: true });
    const { data: attendanceData, isLoading: attendanceLoading, refetch: refetchAttendance } = useStaffAttendanceByDate(selectedDate);

    // Mutations
    const createMutation = useCreateStaffAttendance();
    const updateMutation = useUpdateStaffAttendance();
    const deleteMutation = useDeleteStaffAttendance();

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
                const existing = existingAttendances.find(att => att.staff_id === staffMember.id.toString());
                // Always default to 'present' unless there's an existing record for this specific date
                const status = existing ? existing.status : 'present';
                newAttendances.set(staffMember.id.toString(), {
                    staff_id: staffMember.id.toString(),
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

    const handleAttendanceChange = (staffId: string, status: 'present' | 'absent' | 'late') => {
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
            const promises: Promise<any>[] = [];

            staffAttendances.forEach((attendance, staffId) => {
                if (!attendance.isModified) return;

                if (attendance.status === 'present') {
                    // Delete existing record if it exists (since present is default, no record needed)
                    if (attendance.existingRecord) {
                        promises.push(deleteMutation.mutateAsync(attendance.existingRecord.id));
                    }
                } else {
                    // For absent or late status, create/update record
                    if (attendance.existingRecord) {
                        const updateData: StaffAttendanceUpdate = {
                            status: attendance.status,
                            remarks: ''
                        };
                        promises.push(updateMutation.mutateAsync({
                            id: attendance.existingRecord.id,
                            data: updateData
                        }));
                    } else {
                        // Create new record
                        const createData: StaffAttendanceCreate = {
                            staff_id: staffId,
                            date: selectedDate,
                            status: attendance.status,
                            remarks: ''
                        };
                        promises.push(createMutation.mutateAsync(createData));
                    }
                }
            });

            // Execute all operations
            await Promise.all(promises);
            setSaveMessage('Attendance saved successfully!');
            toast.success('Attendance saved successfully!');

            // Auto-dismiss success message after 3 seconds
            setTimeout(() => {
                setSaveMessage(null);
            }, 3000);

            // Small delay to ensure data is saved before reloading
            await new Promise(resolve => setTimeout(resolve, 500));

            // Reload data to get updated records
            await refetchAttendance();

            // Reset modification flags
            setStaffAttendances(prev => {
                const newMap = new Map(prev);
                newMap.forEach(att => {
                    att.isModified = false;
                });
                return newMap;
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to save attendance';
            setSaveError(errorMessage);
            toast.error(errorMessage);

            // Auto-dismiss error message after 5 seconds
            setTimeout(() => {
                setSaveError(null);
            }, 5000);
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
            render: (value: 'present' | 'absent' | 'late', row: StaffAttendanceRow) => {
                // Direct dropdown - no edit mode needed
                return (
                    <Select
                        value={value}
                        onValueChange={(newValue) => {
                            handleAttendanceChange(row.staff_id, newValue as 'present' | 'absent' | 'late');
                        }}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
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
        {
            key: 'actions',
            label: '', // Empty label to hide Actions column header
            editable: false,
            render: () => null, // Return null to hide content
            className: 'w-0 p-0', // Hide the column entirely
        },
    ];

    // Filter columns based on visibility
    const filteredColumns = columns.filter((col) =>
        visibleColumns.has(col.key as string)
    );

    // Transform staff data into table rows
    const tableData: StaffAttendanceRow[] = useMemo(() => {
        return staff.map((staffMember) => {
            const attendance = staffAttendances.get(staffMember.id.toString());
            return {
                id: staffMember.id.toString(),
                staff_id: staffMember.id.toString(),
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
    const handleColumnToggle = (columnKey: string) => {
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
        setVisibleColumns(new Set());
    };

    // Dummy handlers for Table component (not used, but required by Table props)
    const handleEdit = () => {
        // Not used - status editing is handled directly in render function
    };

    const handleDelete = () => {
        // Not applicable - attendance doesn't have delete action
        // Changing status to "present" removes the record via save logic
    };

    return (
        <div className="container mx-auto p-4 space-y-6">
            <PageHeader title="Staff Attendance" icon={<ClipboardCheck className="h-5 w-5" />} />

            {/* Date Selection */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Date</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Date Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="date-select">Date</Label>
                            <Input
                                id="date-select"
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Staff Attendance Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Staff Attendance</span>
                        <div className="flex items-center gap-2">
                            {hasUnsavedChanges && (
                                <Badge variant="secondary">Unsaved Changes</Badge>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => refetchAttendance()}
                                disabled={attendanceLoading}
                                className="flex items-center gap-2"
                            >
                                {attendanceLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    '🔄'
                                )}
                                Refresh
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || !hasUnsavedChanges}
                                className="flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {isSaving ? 'Saving...' : 'Save Attendance'}
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Success/Error Messages */}
                    {saveMessage && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-950 dark:border-green-800">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <span className="text-green-800 dark:text-green-200">{saveMessage}</span>
                        </div>
                    )}
                    {saveError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800">
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            <span className="text-red-800 dark:text-red-200">{saveError}</span>
                        </div>
                    )}

                    {/* Table Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or department..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(0); // Reset to first page on search
                                }}
                                className="h-9"
                            />
                        </div>

                        {/* Column Visibility Toggle */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    {visibleColumns.size === columns.length ? (
                                        <Eye className="h-4 w-4" />
                                    ) : (
                                        <EyeOff className="h-4 w-4" />
                                    )}
                                    Columns ({visibleColumns.size}/{columns.length})
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuCheckboxItem
                                    checked={visibleColumns.size === columns.length}
                                    onCheckedChange={(checked) =>
                                        checked ? handleSelectAllColumns() : handleDeselectAllColumns()
                                    }
                                    className="font-semibold"
                                >
                                    Select All
                                </DropdownMenuCheckboxItem>
                                {columns.map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.key as string}
                                        checked={visibleColumns.has(col.key as string)}
                                        onCheckedChange={() => handleColumnToggle(col.key as string)}
                                    >
                                        {col.label}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Loading State */}
                    {attendanceLoading || staffLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading staff...</span>
                        </div>
                    ) : filteredData.length === 0 ? (
                        // Empty State
                        <div className="text-center py-12 text-muted-foreground">
                            {searchQuery ? (
                                <>
                                    <p className="text-lg font-medium">No results found</p>
                                    <p className="text-sm mt-1">Try adjusting your search query</p>
                                </>
                            ) : (
                                <p className="text-lg">No staff members found for this date.</p>
                            )}
                        </div>
                    ) : (
                        // Table
                        <Table
                            columns={filteredColumns}
                            data={paginatedData}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            isEditing={false} // Disable edit buttons - direct editing via status dropdown
                            pagination={{
                                page: currentPage,
                                pageSize: pageSize,
                                total: filteredData.length,
                                onPageChange: setCurrentPage,
                                onPageSizeChange: (size) => {
                                    setPageSize(size);
                                    setCurrentPage(0); // Reset to first page
                                },
                            }}
                            permissions={{
                                resource: 'staff',
                                canEdit: false,
                                canDelete: false,
                            }}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StaffAttendancePage;