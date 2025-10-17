import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
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

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Staff Attendance</h1>
            </div>

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

            {/* Staff List */}
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
                <CardContent>
                    {attendanceLoading || staffLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="ml-2">Loading staff...</span>
                        </div>
                    ) : staff.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No staff members found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {saveMessage && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-green-800">{saveMessage}</span>
                                </div>
                            )}
                            {saveError && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    <span className="text-red-800">{saveError}</span>
                                </div>
                            )}

                            <div className="grid gap-4">
                                {staff.map((staffMember) => {
                                    const attendance = getAttendanceStatus(staffMember.id.toString());
                                    const isExisting = !!attendance?.existingRecord;
                                    const isModified = attendance?.isModified || false;

                                    return (
                                        <div
                                            key={staffMember.id}
                                            className={`flex items-center justify-between p-4 border rounded-lg ${isModified ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <div className="font-medium">
                                                        {getStaffName(staffMember)}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Email: {staffMember.email || 'N/A'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Department: {staffMember.department || 'N/A'}
                                                    </div>
                                                </div>
                                                {isExisting && (
                                                    <Badge variant="outline" className="text-xs">
                                                        Existing
                                                    </Badge>
                                                )}
                                                {isModified && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Modified
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm">Status:</Label>
                                                <Select
                                                    value={attendance?.status || 'present'}
                                                    onValueChange={(value) =>
                                                        handleAttendanceChange(staffMember.id.toString(), value as 'present' | 'absent' | 'late')
                                                    }
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="present">present</SelectItem>
                                                        <SelectItem value="absent">absent</SelectItem>
                                                        <SelectItem value="late">late</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default StaffAttendancePage;