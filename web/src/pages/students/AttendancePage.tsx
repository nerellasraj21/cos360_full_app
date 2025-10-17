import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useClassSectionsDropdown, useStudentsByClassSection } from '@/api/hooks/masters/classesandsections';
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

interface StudentAttendanceState {
  student_id: string;
  status: 'present' | 'absent' | 'late';
  existingRecord?: StudentAttendanceOut;
  isModified: boolean;
}

const StudentAttendancePage: React.FC = () => {
  // Selection state
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Data state
  const [studentAttendances, setStudentAttendances] = useState<Map<string, StudentAttendanceState>>(new Map());
  const [existingAttendances, setExistingAttendances] = useState<StudentAttendanceOut[]>([]);

  // Loading states
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Success/error states
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Data fetching
  const { data: classesData, isLoading: classesLoading } = useClassSectionsDropdown();

  // Filter sections based on selected class
  const availableSections = useMemo(() => {
    if (!classesData || !selectedClass) return [];
    const selectedClassData = classesData.find(cls => cls.id === selectedClass);
    return selectedClassData?.sections || [];
  }, [classesData, selectedClass]);

  // Fetch students by class and section
  const { data: studentsData, isLoading: studentsLoading } = useStudentsByClassSection(
    selectedClass,
    selectedSection
  );

  // Students data from API
  const students = useMemo(() => {
    const result = studentsData || [];
    return result;
  }, [studentsData]);

  // Reset attendance states when date changes (before loading new data)
  useEffect(() => {
    if (selectedDate) {
      setStudentAttendances(new Map());
      setExistingAttendances([]);
      setSaveMessage(null);
      setSaveError(null);
    }
  }, [selectedDate]);

  // Load existing attendance data when date/class/section changes
  useEffect(() => {
    if (selectedDate && selectedClass && selectedSection) {
      loadExistingAttendance();
    }
  }, [selectedDate, selectedClass, selectedSection]);

  // Initialize student attendance states when students change or date changes
  useEffect(() => {
    if (students.length > 0) {
      const newAttendances = new Map<string, StudentAttendanceState>();
      const skippedStudents: string[] = [];

      students.forEach(student => {
        // Skip students with missing student data
        if (!student.student || !student.student.id) {
          skippedStudents.push(`Admission ID: ${student.id}`);
          return;
        }

        const existing = existingAttendances.find(att => att.student_id === student.student.id);
        // Always default to 'present' unless there's an existing record for this specific date
        const status = existing ? existing.status : 'present';
        newAttendances.set(student.student.id, {
          student_id: student.student.id,
          status: status,
          existingRecord: existing,
          isModified: false
        });
      });

      if (skippedStudents.length > 0) {
        console.warn('Skipped students with missing data:', skippedStudents);
      }

      setStudentAttendances(newAttendances);
    } else {
      // Clear attendance states when no students
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
    setSelectedSection(''); // Reset section when class changes
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
    // Clear existing state to ensure fresh load for new date
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
        const wasStatus = current.status;
        const isStatus = status;
        newMap.set(studentId, {
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
      // Prepare bulk update data for modified records
      const bulkUpdateData: BulkAttendanceUpdate[] = [];
      const individualUpdates: Promise<any>[] = [];
      const deletions: Promise<any>[] = [];

      studentAttendances.forEach((attendance, studentId) => {
        if (!attendance.isModified) return;

        if (attendance.status === 'present') {
          // Delete existing record if it exists (since present is default, no record needed)
          if (attendance.existingRecord) {
            deletions.push(deleteAttendance(attendance.existingRecord.id));
          }
        } else {
          // For absent or late status, create/update record
          if (attendance.existingRecord) {
            const updateData: StudentAttendanceUpdate = {
              status: attendance.status,
              remarks: ''
            };
            individualUpdates.push(updateAttendance(attendance.existingRecord.id, updateData));
          } else {
            // Add to bulk update for new records
            bulkUpdateData.push({
              student_id: studentId,
              status: attendance.status,
              remarks: ''
            });
          }
        }
      });

      // Execute all operations
      const promises: Promise<any>[] = [...individualUpdates, ...deletions];
      let bulkUpdateResponse: StudentAttendanceOut[] = [];

      // Use bulk update for new records if any
      if (bulkUpdateData.length > 0) {
        bulkUpdateResponse = await bulkUpdateAttendanceByDate(selectedDate, bulkUpdateData);
      }

      await Promise.all(promises);
      setSaveMessage('Attendance saved successfully!');
      toast.success('Attendance saved successfully!');

      // Update existing attendances with the bulk update response
      if (bulkUpdateResponse.length > 0) {
        setExistingAttendances(prev => {
          const updated = [...prev];
          bulkUpdateResponse.forEach(newRecord => {
            const existingIndex = updated.findIndex(att => att.student_id === newRecord.student_id);
            if (existingIndex >= 0) {
              updated[existingIndex] = newRecord;
            } else {
              updated.push(newRecord);
            }
          });
          return updated;
        });
      }

      // Small delay to ensure data is saved before reloading
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload data to get updated records
      await loadExistingAttendance();

      // Reset modification flags
      setStudentAttendances(prev => {
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

  const getStudentName = (student: StudentAdmissionResponse['student']) => {
    if (!student) return 'Unknown Student';
    return `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student';
  };

  const getAttendanceStatus = (studentId: string) => {
    return studentAttendances.get(studentId);
  };

  const hasUnsavedChanges = Array.from(studentAttendances.values()).some(att => att.isModified);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Student Attendance</h1>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class, Section & Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class-select">Class</Label>
              <Select
                value={selectedClass}
                onValueChange={handleClassChange}
                disabled={classesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classesData?.map((cls: ClassRead) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section Selection */}
            <div className="space-y-2">
              <Label htmlFor="section-select">Section</Label>
              <Select
                value={selectedSection}
                onValueChange={handleSectionChange}
                disabled={!selectedClass || availableSections.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

      {/* Student List */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Student Attendance</span>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <Badge variant="secondary">Unsaved Changes</Badge>
                )}
                <Button
                  variant="outline"
                  onClick={loadExistingAttendance}
                  disabled={isLoadingAttendance}
                  className="flex items-center gap-2"
                >
                  {isLoadingAttendance ? (
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
                    .filter(student => {
                      if (!student.student || !student.student.id) {
                        console.warn('Filtering out student with missing data:', student.id);
                        return false;
                      }
                      return true;
                    })
                    .map((student) => {
                      const attendance = getAttendanceStatus(student.student.id);
                      const isExisting = !!attendance?.existingRecord;
                      const isModified = attendance?.isModified || false;

                      return (
                        <div
                          key={student.id}
                          className={`flex items-center justify-between p-4 border rounded-lg ${isModified ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                            }`}
                        >
                          <div className="flex items-center gap-4">
                            <div>
                              <div className="font-medium">
                                {getStudentName(student.student)}
                              </div>
                              <div className="text-sm text-gray-500">
                                Roll No: {student.admission_number || 'N/A'}
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
                                handleAttendanceChange(student.student.id, value as 'present' | 'absent' | 'late')
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
      )}
    </div>
  );
};

export default StudentAttendancePage;