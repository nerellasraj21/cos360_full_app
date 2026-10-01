import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Loader2, Save, UserCheck, Users, Filter, Search, X, RefreshCw } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { PageHeader } from '@/components/ui/PageHeader';
import { toast } from 'sonner';
import { useClassSectionsDropdown, useStudentsByClassSection } from '@/api/hooks/masters/classesandsections';
import { useStudentAttendance } from '@/api/hooks/students/attendance';
import {
  updateAttendance,
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
import type { Student } from '@/types/auth';
import { useAuthStore } from '@/lib/authStore';
import { QuickSendButton } from '@/components/communication/QuickSendButton';

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
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave';
  existingRecord?: StudentAttendanceOut;
  isModified: boolean;
}


// ─── Role router ─────────────────────────────────────────────────────────────

const StudentAttendancePage: React.FC = () => {
  const role = useAuthStore((s) => s.role);
  const studentId = useAuthStore((s) => s.studentId);
  const selectedStudent = useAuthStore((s) => s.selectedStudent);

  const roleName = role?.name.toLowerCase() ?? '';

  if (roleName === 'student') {
    return <StudentOwnView studentId={studentId ?? ''} />;
  }

  if (roleName === 'parent') {
    return <ParentView selectedStudent={selectedStudent} />;
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
    halfDay: records.filter((r) => r.status === 'half_day').length,
    leave: records.filter((r) => r.status === 'leave').length,
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
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {!isLoading && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{summary.halfDay}</p>
            <p className="text-sm text-muted-foreground">Half Day</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.leave}</p>
            <p className="text-sm text-muted-foreground">Leave</p>
          </CardContent></Card>
        </div>
      )}

      {/* Records */}
      <AttendanceRecordList records={records} isLoading={isLoading} />
    </div>
  );
}

// ─── Parent child attendance view ─────────────────────────────────────────────
// Child is chosen via the header's student switcher (authStore.selectedStudent),
// not a page-local selector — keeps every module in sync with a single source
// of truth for "which child is active".

function ParentView({ selectedStudent }: { selectedStudent: Student | null }) {
  const [dateFrom, setDateFrom] = useState(() => currentMonthRange().start);
  const [dateTo, setDateTo] = useState(() => currentMonthRange().end);

  const { data: records = [], isLoading } = useStudentAttendance(selectedStudent?.id ?? '', {
    start_date: dateFrom || undefined,
    end_date: dateTo || undefined,
  });

  const summary = useMemo(() => ({
    total: records.length,
    present: records.filter((r) => r.status === 'present').length,
    absent: records.filter((r) => r.status === 'absent').length,
    late: records.filter((r) => r.status === 'late').length,
    halfDay: records.filter((r) => r.status === 'half_day').length,
    leave: records.filter((r) => r.status === 'leave').length,
  }), [records]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Children's Attendance" icon={<Users className="h-5 w-5" />} />

      {/* Date filter */}
      <Card>
        <CardHeader><CardTitle>Filter by Date</CardTitle></CardHeader>
        <CardContent>
          {!selectedStudent ? (
            <div className="text-center py-4 text-muted-foreground">
              No child selected. Use the child switcher in the header above.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From</Label>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && !isLoading && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{summary.halfDay}</p>
            <p className="text-sm text-muted-foreground">Half Day</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{summary.leave}</p>
            <p className="text-sm text-muted-foreground">Leave</p>
          </CardContent></Card>
        </div>
      )}

      <AttendanceRecordList
        records={records}
        isLoading={isLoading}
        title={selectedStudent ? `${selectedStudent.name}'s Attendance` : 'Attendance'}
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
              .map((record, index) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                  style={{ height: '48px' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{index + 1}</span>
                    <span className="font-medium">
                      {new Date(record.date).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
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
  const [searchQuery, setSearchQuery] = useState('');

  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canMark = hasPermission('student_attendance', 'create') || hasPermission('student_attendance', 'update');

  const { data: classesData, isLoading: classesLoading } = useClassSectionsDropdown();

  const availableSections = useMemo(() => {
    if (!classesData || !selectedClass) return [];
    const selectedClassData = classesData.find(cls => cls.id === selectedClass);
    return selectedClassData?.sections || [];
  }, [classesData, selectedClass]);

  const { data: studentsData, isLoading: studentsLoading } = useStudentsByClassSection(
    selectedClass,
    selectedSection,
    selectedDate
  );

  const students = useMemo(() => studentsData || [], [studentsData]);

  useEffect(() => {
    if (selectedDate) {
      setStudentAttendances(new Map());
      setExistingAttendances([]);
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

  const loadExistingAttendance = async (silent = false) => {
    if (!selectedDate) return;
    if (!silent) setIsLoadingAttendance(true);
    try {
      const dateAttendances = await getAttendanceByDate(selectedDate);
      setExistingAttendances(dateAttendances);
    } catch {
      toast.error('Failed to load existing attendance data');
    } finally {
      if (!silent) setIsLoadingAttendance(false);
    }
  };

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedSection('');
    setStudentAttendances(new Map());
    setExistingAttendances([]);
    setSearchQuery('');
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setStudentAttendances(new Map());
    setExistingAttendances([]);
    setSearchQuery('');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setStudentAttendances(new Map());
    setExistingAttendances([]);
  };

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'half_day' | 'leave') => {
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
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Snapshot before async ops
      const toCreate: BulkAttendanceUpdate[] = [];
      const toUpdate: { id: string; studentId: string; status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' }[] = [];

      studentAttendances.forEach((attendance) => {
        if (!attendance.isModified) return;
        if (attendance.existingRecord) {
          // PATCH to any status (including 'present') — avoids DELETE permission requirement
          toUpdate.push({ id: attendance.existingRecord.id, studentId: attendance.student_id, status: attendance.status });
        } else if (attendance.status !== 'present') {
          toCreate.push({ student_id: attendance.student_id, status: attendance.status, remarks: '' });
        }
      });

      // Run all operations in parallel
      let bulkResponse: StudentAttendanceOut[] = [];
      const ops: Promise<any>[] = [
        ...toUpdate.map(u => updateAttendance(u.id, { status: u.status, remarks: '' })),
      ];
      if (toCreate.length > 0) {
        ops.push(bulkUpdateAttendanceByDate(selectedDate, toCreate).then(r => { bulkResponse = r; }));
      }
      await Promise.all(ops);

      // Patch studentAttendances in-place — do NOT touch existingAttendances
      // so the useEffect never fires and the full list never rebuilds
      setStudentAttendances(prev => {
        const newMap = new Map(prev);
        // Updated records: patch existingRecord status
        toUpdate.forEach(u => {
          const att = newMap.get(u.studentId);
          if (att) newMap.set(u.studentId, {
            ...att, isModified: false,
            existingRecord: att.existingRecord ? { ...att.existingRecord, status: u.status } : undefined,
          });
        });
        // Newly created: attach server record (gives us the real ID for future saves)
        bulkResponse.forEach(newRecord => {
          const att = newMap.get(newRecord.student_id);
          if (att) newMap.set(newRecord.student_id, { ...att, isModified: false, existingRecord: newRecord });
        });
        return newMap;
      });

      toast.success('Attendance saved successfully!');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save attendance';
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

  const attendanceSummary = useMemo(() => {
    const all = Array.from(studentAttendances.values());
    return {
      present: all.filter(a => a.status === 'present').length,
      absent: all.filter(a => a.status === 'absent').length,
      late: all.filter(a => a.status === 'late').length,
      half_day: all.filter(a => a.status === 'half_day').length,
      leave: all.filter(a => a.status === 'leave').length,
    };
  }, [studentAttendances]);

  const totalStudents = students.length;
  // Half day counts as 0.5 present, matching the backend attendance_percentage formula
  const attendancePct = totalStudents > 0
    ? Math.round(((attendanceSummary.present + attendanceSummary.half_day * 0.5) / totalStudents) * 100)
    : 0;

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => {
      const name = getStudentName(s.student).toLowerCase();
      const roll = (s.admission_number || '').toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [students, searchQuery]);


  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Student Attendance" icon={<UserCheck className="h-5 w-5" />} />

      {/* Single unified card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Attendance Overview</span>
            {selectedClass && selectedSection && (
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && <Badge variant="secondary">Unsaved Changes</Badge>}
                <Button variant="outline" size="sm" onClick={() => loadExistingAttendance()} disabled={isLoadingAttendance}>
                  {isLoadingAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving || !hasUnsavedChanges || !canMark}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isSaving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        {/* ── Filters ── */}
        <div className="px-6 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <Label>Date</Label>
            <DatePicker value={selectedDate} onChange={handleDateChange} />
          </div>
        </div>

        {selectedClass && selectedSection && (
          <>
            {/* ── Analysis ── */}
            <div className="border-t px-6 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Attendance Analysis</p>
                {totalStudents > 0 && (
                  <span className="text-sm font-semibold">{attendancePct}% Present</span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-3">
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
                <div className="flex flex-col items-center justify-center gap-1 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <span className="text-3xl font-bold text-blue-700 dark:text-blue-400">{attendanceSummary.leave}</span>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-500 uppercase tracking-wide">Leave</span>
                </div>
              </div>
              {totalStudents > 0 && (
                <>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div className="bg-green-500 transition-all duration-300" style={{ width: `${(attendanceSummary.present / totalStudents) * 100}%` }} />
                    <div className="bg-orange-400 transition-all duration-300" style={{ width: `${(attendanceSummary.half_day / totalStudents) * 100}%` }} />
                    <div className="bg-yellow-400 transition-all duration-300" style={{ width: `${(attendanceSummary.late / totalStudents) * 100}%` }} />
                    <div className="bg-blue-400 transition-all duration-300" style={{ width: `${(attendanceSummary.leave / totalStudents) * 100}%` }} />
                    <div className="bg-red-400 transition-all duration-300" style={{ width: `${(attendanceSummary.absent / totalStudents) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{totalStudents} students total</span>
                    <span className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />Present</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-orange-400" />Half Day</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />Late</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-400" />Leave</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-400" />Absent</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* ── Student list ── */}
            <div className="border-t px-6 pb-6 pt-4">
              {/* Filter row */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium text-muted-foreground">Filter Students</p>
                  {searchQuery && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      {filteredStudents.length} of {totalStudents}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search by name or roll no..."
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
              {isLoadingAttendance || studentsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading students...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students found for the selected class and section.
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students match "{searchQuery}".
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredStudents
                    .filter(student => student.student?.id)
                    .map((student, index) => {
                      const attendance = studentAttendances.get(student.student.id);
                      const status = attendance?.status || 'present';
                      const statusStyles = {
                        present: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
                        absent: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
                        late: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800',
                        half_day: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
                        leave: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
                      }[status];
                      const rowStyles = status === 'absent'
                        ? 'border-red-200'
                        : status === 'late'
                        ? 'border-yellow-200'
                        : status === 'half_day'
                        ? 'border-orange-200'
                        : status === 'leave'
                        ? 'border-blue-200'
                        : 'border-border';
                      const statusLabel = status === 'half_day' ? 'Half Day' : status === 'leave' ? 'Le' : status.charAt(0).toUpperCase();
                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-4 border rounded-lg ${rowStyles}`}
                          style={{ height: '64px' }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{index + 1}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusStyles} capitalize min-w-[60px] justify-center`}>
                              {statusLabel}
                            </span>
                            <div>
                              <div className="font-medium">{getStudentName(student.student)}</div>
                              <div className="text-sm text-muted-foreground">Roll No: {student.admission_number || 'N/A'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <QuickSendButton
                              templateName="Student Absentees"
                              targetType="individual_student"
                              targetRef={{ student_id: student.student.id }}
                              recipientLabel={getStudentName(student.student)}
                              variables={{
                                student_name: getStudentName(student.student),
                                date: selectedDate,
                              }}
                              // Absence notice only makes sense when not present.
                              disabled={status === 'present'}
                              title={
                                status === 'present'
                                  ? 'Student is present — no notification needed'
                                  : 'Send Absentee Message'
                              }
                            />
                            <Select
                              value={status}
                              onValueChange={(value) =>
                                handleAttendanceChange(student.student.id, value as 'present' | 'absent' | 'late' | 'half_day' | 'leave')
                              }
                            >
                              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                                <SelectItem value="half_day">Half Day</SelectItem>
                                <SelectItem value="leave">Leave</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
