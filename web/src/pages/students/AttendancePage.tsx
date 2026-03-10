import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader2, Save, CheckCircle, XCircle, UserCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useClassSectionsDropdown, useStudentsByClassSection } from '@/api/hooks/masters/classesandsections';
import { useStudentAttendance } from '@/api/hooks/students/attendance';
import {
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceByDate,
  bulkUpdateAttendanceByDate
} from '@/api/students/attendance';
import type {
  StudentAttendanceCreate,
  StudentAttendanceUpdate,
  StudentAttendanceOut,
  BulkAttendanceUpdate
} from '@/types/attendance';
import type { StudentAdmissionResponse } from '@/types/admission';
import type { ClassRead } from '@/types/masters/classesandsections';
import { useAuthStore } from '@/lib/authStore';
import { useParentChildren } from '@/api/auth';

// Returns { start, end } defaulting to 1st of current month → today
function currentMonthRange() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    start: first.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
  };
}

interface StudentAttendanceState {
  student_id: string;
  status: 'present' | 'absent' | 'late';
  existingRecord?: StudentAttendanceOut;
  isModified: boolean;
}

// ─── Role router ─────────────────────────────────────────────────────────────

const StudentAttendancePage: React.FC = () => {
  const role = useAuthStore((s) => s.role);
  const studentId = useAuthStore((s) => s.studentId);
  const entityId = useAuthStore((s) => s.entityId);

  const roleName = role?.name.toLowerCase() ?? '';

  if (roleName === 'student') {
    return <StudentOwnView studentId={studentId ?? ''} />;
  }

  if (roleName === 'parent') {
    return <ParentView parentEntityId={entityId} />;
  }

  return <StaffView />;
};

export default StudentAttendancePage;

// ─── Student own attendance view ─────────────────────────────────────────────

function StudentOwnView({ studentId }: { studentId: string }) {
  const [dateFrom, setDateFrom] = useState(() => currentMonthRange().start);
  const [dateTo, setDateTo] = useState(() => currentMonthRange().end);

  const { data: records = [], isLoading } = useStudentAttendance(studentId, {
    start_date: dateFrom || undefined,
    end_date: dateTo || undefined,
  });

  const summary = useMemo(() => ({
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
  }), [records]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="My Attendance" icon={<UserCheck className="h-5 w-5" />} />

      {/* Date range filter */}
      <Card>
        <CardHeader><CardTitle>Filter by Date</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {!isLoading && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-sm text-muted-foreground">Total Days</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
            <p className="text-sm text-muted-foreground">Late</p>
          </CardContent></Card>
        </div>
      )}

      {/* Records */}
      <AttendanceRecordList records={records} isLoading={isLoading} />
    </div>
  );
}

// ─── Parent child attendance view ─────────────────────────────────────────────

function ParentView({ parentEntityId }: { parentEntityId: string | null }) {
  const { data: children = [], isLoading: childrenLoading, error: childrenError } = useParentChildren(parentEntityId);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [dateFrom, setDateFrom] = useState(() => currentMonthRange().start);
  const [dateTo, setDateTo] = useState(() => currentMonthRange().end);

  // Auto-select first child once loaded
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const { data: records = [], isLoading: attendanceLoading } = useStudentAttendance(selectedChildId, {
    start_date: dateFrom || undefined,
    end_date: dateTo || undefined,
  });

  const isLoading = attendanceLoading;
  const selectedChild = children.find((s) => s.id === selectedChildId);

  const summary = useMemo(() => ({
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
  }), [records]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Children's Attendance" icon={<Users className="h-5 w-5" />} />

      {/* Child selector + date filter */}
      <Card>
        <CardHeader><CardTitle>Select Child & Date Range</CardTitle></CardHeader>
        <CardContent>
          {!parentEntityId ? (
            <div className="text-center py-4 text-muted-foreground">
              Session outdated. Please log out and log back in to view children.
            </div>
          ) : childrenLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading children...</span>
            </div>
          ) : childrenError ? (
            <div className="text-center py-4 text-destructive">
              Failed to load children: {(childrenError as Error).message}
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No children found for this account.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Child</Label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name || `${child.first_name} ${child.last_name}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {selectedChild && !isLoading && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-sm text-muted-foreground">Total Days</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
            <p className="text-sm text-muted-foreground">Present</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{summary.late}</p>
            <p className="text-sm text-muted-foreground">Late</p>
          </CardContent></Card>
        </div>
      )}

      <AttendanceRecordList
        records={records}
        isLoading={isLoading}
        title={selectedChild ? `${selectedChild.name || `${selectedChild.first_name} ${selectedChild.last_name}`.trim()}'s Attendance` : 'Attendance'}
      />
    </div>
  );
}

// ─── Shared read-only record list ─────────────────────────────────────────────

function AttendanceRecordList({
  records,
  isLoading,
  title = 'Attendance Records',
}: {
  records: StudentAttendanceOut[];
  isLoading: boolean;
  title?: string;
}) {
  const statusBadge = (status: string) => {
    if (status === 'present') return <StatusBadge status={status} />;
    if (status === 'absent') return <StatusBadge status={status} />;
    return <StatusBadge status={status} />;
  };

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading attendance...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No attendance records found for the selected period.
          </div>
        ) : (
          <div className="space-y-2">
            {[...records]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  style={{ height: '48px' }}
                >
                  <span className="font-medium">
                    {new Date(record.date).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-3">
                    {record.remarks && (
                      <span className="text-sm text-muted-foreground hidden md:block">{record.remarks}</span>
                    )}
                    {statusBadge(record.status)}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Staff / Teacher attendance marking view (original behavior) ──────────────

function StaffView() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [studentAttendances, setStudentAttendances] = useState<Map<string, StudentAttendanceState>>(new Map());
  const [existingAttendances, setExistingAttendances] = useState<StudentAttendanceOut[]>([]);

  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: classesData, isLoading: classesLoading } = useClassSectionsDropdown();

  const availableSections = useMemo(() => {
    if (!classesData || !selectedClass) return [];
    const selectedClassData = classesData.find(cls => cls.id === selectedClass);
    return selectedClassData?.sections || [];
  }, [classesData, selectedClass]);

  const { data: studentsData, isLoading: studentsLoading } = useStudentsByClassSection(
    selectedClass,
    selectedSection
  );

  const students = useMemo(() => studentsData || [], [studentsData]);

  useEffect(() => {
    if (selectedDate) {
      setStudentAttendances(new Map());
      setExistingAttendances([]);
      setSaveMessage(null);
      setSaveError(null);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && selectedClass && selectedSection) {
      loadExistingAttendance();
    }
  }, [selectedDate, selectedClass, selectedSection]);

  useEffect(() => {
    if (students.length > 0) {
      const newAttendances = new Map<string, StudentAttendanceState>();
      students.forEach(student => {
        if (!student.student || !student.student.id) return;
        const existing = existingAttendances.find(att => att.student_id === student.student.id);
        const status = existing ? existing.status : 'present';
        newAttendances.set(student.student.id, {
          student_id: student.student.id,
          status,
          existingRecord: existing,
          isModified: false,
        });
      });
      setStudentAttendances(newAttendances);
    } else {
      setStudentAttendances(new Map());
    }
  }, [students, existingAttendances, selectedDate]);

  const loadExistingAttendance = async () => {
    if (!selectedDate) return;
    setIsLoadingAttendance(true);
    try {
      const dateAttendances = await getAttendanceByDate(selectedDate);
      setExistingAttendances(dateAttendances);
    } catch (error) {
      console.error('Failed to load existing attendance:', error);
      toast.error('Failed to load existing attendance data');
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedSection('');
    setStudentAttendances(new Map());
    setExistingAttendances([]);
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setStudentAttendances(new Map());
    setExistingAttendances([]);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setStudentAttendances(new Map());
    setExistingAttendances([]);
    setSaveMessage(null);
    setSaveError(null);
  };

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setStudentAttendances(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(studentId);
      if (current) {
        newMap.set(studentId, {
          ...current,
          status,
          isModified: current.existingRecord
            ? current.existingRecord.status !== status
            : status !== 'present',
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
      const bulkUpdateData: BulkAttendanceUpdate[] = [];
      const individualUpdates: Promise<any>[] = [];
      const deletions: Promise<any>[] = [];

      studentAttendances.forEach((attendance) => {
        if (!attendance.isModified) return;
        if (attendance.status === 'present') {
          if (attendance.existingRecord) {
            deletions.push(deleteAttendance(attendance.existingRecord.id));
          }
        } else {
          if (attendance.existingRecord) {
            individualUpdates.push(
              updateAttendance(attendance.existingRecord.id, { status: attendance.status, remarks: '' })
            );
          } else {
            bulkUpdateData.push({ student_id: attendance.student_id, status: attendance.status, remarks: '' });
          }
        }
      });

      let bulkUpdateResponse: StudentAttendanceOut[] = [];
      if (bulkUpdateData.length > 0) {
        bulkUpdateResponse = await bulkUpdateAttendanceByDate(selectedDate, bulkUpdateData);
      }
      await Promise.all([...individualUpdates, ...deletions]);

      setSaveMessage('Attendance saved successfully!');
      toast.success('Attendance saved successfully!');

      if (bulkUpdateResponse.length > 0) {
        setExistingAttendances(prev => {
          const updated = [...prev];
          bulkUpdateResponse.forEach(newRecord => {
            const idx = updated.findIndex(att => att.student_id === newRecord.student_id);
            if (idx >= 0) updated[idx] = newRecord;
            else updated.push(newRecord);
          });
          return updated;
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      await loadExistingAttendance();

      setStudentAttendances(prev => {
        const newMap = new Map(prev);
        newMap.forEach(att => { att.isModified = false; });
        return newMap;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save attendance';
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const getStudentName = (student: StudentAdmissionResponse['student']) => {
    if (!student) return 'Unknown Student';
    return `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student';
  };

  const hasUnsavedChanges = Array.from(studentAttendances.values()).some(att => att.isModified);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Student Attendance" icon={<UserCheck className="h-5 w-5" />} />

      <Card>
        <CardHeader><CardTitle>Select Class, Section & Date</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={handleClassChange} disabled={classesLoading}>
                <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classesData?.map((cls: ClassRead) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Section</Label>
              <Select
                value={selectedSection}
                onValueChange={handleSectionChange}
                disabled={!selectedClass || availableSections.length === 0}
              >
                <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                <SelectContent>
                  {availableSections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Student Attendance</span>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && <Badge variant="secondary">Unsaved Changes</Badge>}
                <Button variant="outline" onClick={loadExistingAttendance} disabled={isLoadingAttendance}>
                  {isLoadingAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄'}
                  Refresh
                </Button>
                <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAttendance || studentsLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading students...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No students found for the selected class and section.
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
                  {students
                    .filter(student => student.student?.id)
                    .map((student) => {
                      const attendance = studentAttendances.get(student.student.id);
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-4 border rounded-lg ${attendance?.isModified ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                          style={{ height: '64px' }}
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="font-medium">{getStudentName(student.student)}</div>
                              <div className="text-sm text-gray-500">Roll No: {student.admission_number || 'N/A'}</div>
                            </div>
                            {attendance?.existingRecord && <Badge variant="outline" className="text-xs">Existing</Badge>}
                            {attendance?.isModified && <Badge variant="secondary" className="text-xs">Modified</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Status:</Label>
                            <Select
                              value={attendance?.status || 'present'}
                              onValueChange={(value) =>
                                handleAttendanceChange(student.student.id, value as 'present' | 'absent' | 'late')
                              }
                            >
                              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
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
      )}
    </div>
  );
}
