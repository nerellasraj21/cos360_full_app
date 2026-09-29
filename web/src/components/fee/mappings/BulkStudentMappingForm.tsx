import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { feeStudentMappingsApi } from '@/api/fee/studentMappings';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import CAxios from '@/api/index';
import Select, { type SingleValue } from 'react-select';
import type { FeeStudentMappingBulkCreateRequest, FeeStudentMappingBulkResponse } from '@/types/fee/mapping';
import type { StudentDropdownItem } from '@/types/admission';

const formSchema = z.object({
  student_ids: z.array(z.string()).min(1, 'At least one student must be selected'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  fee_type_id: z.string().min(1, 'Fee type is required'),
  total_fee: z.number().min(0, 'Total fee must be non-negative'),
});

type FormData = z.infer<typeof formSchema>;

interface BulkStudentMappingFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type SelectOption = { value: string; label: string } | null;

export function BulkStudentMappingForm({ onSuccess, onCancel }: BulkStudentMappingFormProps) {
  const [loading, setLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<FeeStudentMappingBulkResponse | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<SelectOption>(null);
  const [selectedSection, setSelectedSection] = useState<SelectOption>(null);
  const [students, setStudents] = useState<StudentDropdownItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const { selectedAcademicYearId } = useAcademicYearStore();

  // Use hooks for data fetching
  const { data: classesData, isLoading: classesLoading } = useClassesDropdown();
  const { data: sectionsData, isLoading: sectionsLoading } = useSectionsByClassId(selectedClass?.value || '');
  const { data: feeTypes = [], isLoading: feeTypesLoading } = useFeeTypes();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      student_ids: [],
      class_id: '',
      section_id: '',
      fee_type_id: '',
      total_fee: 0,
    },
  });

  // Fetch students data when class and section are selected
  useEffect(() => {
    const fetchStudents = async () => {
      // Only fetch students if both class and section are selected
      if (!selectedClass?.value || !selectedSection?.value) {
        setStudents([]);
        setStudentsLoading(false);
        return;
      }

      try {
        setStudentsLoading(true);

        // Fetch students with class and section filter from the API
        console.log('[DEBUG] Fetching students for class:', selectedClass.value, 'section:', selectedSection.value);
        const { data } = await CAxios.get('/students/admission/students/dropdown', {
          params: {
            class_id: selectedClass.value,
            section_id: selectedSection.value,
            active_only: true
          }
        });

        console.log('[DEBUG] Students API response:', data);
        console.log('[DEBUG] Number of students returned:', data?.length || 0);
        setStudents(data || []);
      } catch (error) {
        console.error('[ERROR] Failed to fetch students:', error);
        toast.error('Failed to load students');
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass, selectedSection]);

  // Transform data for react-select
  const classOptions = useMemo(() => {
    if (!classesData) return [];
    return classesData.map(cls => ({ value: cls.id, label: cls.name }));
  }, [classesData]);

  const sectionOptions = useMemo(() => {
    if (!sectionsData) return [];
    return sectionsData.map(section => ({ value: section.id, label: section.name }));
  }, [sectionsData]);

  const studentOptions = useMemo(() => {
    return students.map(student => {
      // Use display_name if available (it may already include admission number)
      // Otherwise construct it from name and admission_number
      const label = student.display_name ||
                   (student.admission_number ? `${student.name} (${student.admission_number})` : student.name) ||
                   'Unknown Student';
      return {
        value: student.id,
        label: label
      };
    });
  }, [students]);

  // Handle class change
  const handleClassChange = (option: SingleValue<SelectOption>) => {
    setSelectedClass(option);
    setSelectedSection(null); // Reset section when class changes
    setSelectedStudents([]); // Clear selected students
    form.setValue('class_id', option?.value || '');
    form.setValue('section_id', ''); // Reset section in form
    form.setValue('student_ids', []); // Clear student IDs in form
  };

  // Handle section change
  const handleSectionChange = (option: SingleValue<SelectOption>) => {
    setSelectedSection(option);
    setSelectedStudents([]); // Clear selected students when section changes
    form.setValue('section_id', option?.value || '');
    form.setValue('student_ids', []); // Clear student IDs in form
  };


  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setBulkResult(null);

      // Validate that all selected students have admission numbers
      const studentsWithoutAdmission = selectedStudents.filter(
        s => !s.admission_number && !s.admission_num
      );

      if (studentsWithoutAdmission.length > 0) {
        const studentNames = studentsWithoutAdmission
          .map(s => s.name || s.display_name || s.id)
          .join(', ');
        toast.error(`The following students don't have admission numbers: ${studentNames}`);
        setLoading(false);
        return;
      }

      // Log the request data for debugging
      console.log('[DEBUG] Bulk create request:', {
        student_ids: data.student_ids,
        class_id: data.class_id,
        section_id: data.section_id,
        fee_type_id: data.fee_type_id,
        total_fee: data.total_fee,
        academic_year_id: selectedAcademicYearId,
        selected_students: selectedStudents.map(s => ({
          id: s.id,
          name: s.name,
          admission_number: s.admission_number || s.admission_num
        }))
      });

      const requestData: FeeStudentMappingBulkCreateRequest = {
        ...data,
        academic_year_id: selectedAcademicYearId || '',
      };

      const result = await feeStudentMappingsApi.bulkCreateMappings(requestData);
      setBulkResult(result);

      if (result.success_count > 0) {
        toast.success(`Successfully created ${result.success_count} out of ${result.total_count} mappings`);
        if (result.success_count === result.total_count) {
          onSuccess();
        }
      } else {
        toast.error('Failed to create any mappings');
      }
    } catch (error: any) {
      console.error('[ERROR] Bulk create failed:', error);
      console.error('[ERROR] Response data:', error.response?.data);

      // Extract more detailed error message
      let errorMessage = 'Failed to create bulk mappings';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      }

      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const addStudent = (studentId: string | number, studentOption?: any) => {
    const id = String(studentId);
    if (!selectedStudents.find(s => s.id === id)) {
      const student = studentOption || {
        id,
        name: `Student ${id}`,
        display_name: `Student ${id}`,
        admission_number: id,
        admission_num: id
      };
      const newSelected = [...selectedStudents, student];
      setSelectedStudents(newSelected);
      form.setValue('student_ids', newSelected.map(s => s.id));
    }
  };

  const removeStudent = (studentId: string) => {
    const newSelected = selectedStudents.filter(s => s.id !== studentId);
    setSelectedStudents(newSelected);
    form.setValue('student_ids', newSelected.map(s => s.id));
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Class Selection */}
            <FormField
              control={form.control}
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <FormControl>
                    <Select
                      options={classOptions}
                      value={selectedClass}
                      onChange={handleClassChange}
                      placeholder="Select a class"
                      className="w-full"
                      classNamePrefix="react-select"
                      menuPlacement="auto"
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          cursor: 'pointer',
                        }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        option: (provided, state) => ({
                          ...provided,
                          cursor: 'pointer',
                          backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                          color: state.isSelected ? 'white' : 'black',
                          '&:hover': {
                            backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                          },
                        }),
                      }}
                      isLoading={classesLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Section Selection */}
            <FormField
              control={form.control}
              name="section_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section</FormLabel>
                  <FormControl>
                    <Select
                      options={sectionOptions}
                      value={selectedSection}
                      onChange={handleSectionChange}
                      placeholder="Select a section"
                      className="w-full"
                      classNamePrefix="react-select"
                      menuPlacement="auto"
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          cursor: 'pointer',
                        }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        option: (provided, state) => ({
                          ...provided,
                          cursor: 'pointer',
                          backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                          color: state.isSelected ? 'white' : 'black',
                          '&:hover': {
                            backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                          },
                        }),
                      }}
                      isLoading={sectionsLoading}
                      isDisabled={!selectedClass}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fee Type Selection */}
            <FormField
              control={form.control}
              name="fee_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Type</FormLabel>
                  <FormControl>
                    <Select
                      options={feeTypes.map(feeType => ({
                        value: feeType.id,
                        label: feeType.type_name
                      }))}
                      value={feeTypes.find(feeType => feeType.id === field.value) ?
                        { value: field.value, label: feeTypes.find(feeType => feeType.id === field.value)?.type_name || '' } :
                        null}
                      onChange={(option) => field.onChange(option?.value || '')}
                      placeholder="Select a fee type"
                      className="w-full"
                      classNamePrefix="react-select"
                      menuPlacement="auto"
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          cursor: 'pointer',
                        }),
                        menu: (provided) => ({ ...provided, zIndex: 9999 }),
                        option: (provided, state) => ({
                          ...provided,
                          cursor: 'pointer',
                          backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                          color: state.isSelected ? 'white' : 'black',
                          '&:hover': {
                            backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                          },
                        }),
                      }}
                      isLoading={feeTypesLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Total Fee */}
            <FormField
              control={form.control}
              name="total_fee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Fee (₹)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter total fee amount"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Student Selection */}
          <div className="space-y-4">
            <Label>Students</Label>
            {!selectedClass || !selectedSection ? (
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                Please select a class and section first to view available students.
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    options={studentOptions}
                    onChange={(option) => {
                      if (option) {
                        const selectedStudentData = students.find(s => s.id === option.value);
                        addStudent(option.value, selectedStudentData);
                      }
                    }}
                    placeholder={studentsLoading ? "Loading students..." : studentOptions.length === 0 ? "No students found" : "Select students to add"}
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    styles={{
                      control: (provided) => ({
                        ...provided,
                        cursor: 'pointer',
                      }),
                      menu: (provided) => ({ ...provided, zIndex: 9999 }),
                      option: (provided, state) => ({
                        ...provided,
                        cursor: 'pointer',
                        backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                        color: state.isSelected ? 'white' : 'black',
                        '&:hover': {
                          backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                        },
                      }),
                    }}
                    isLoading={studentsLoading}
                    isDisabled={!selectedClass || !selectedSection || studentsLoading}
                  />
                </div>
              </div>
            )}

            {/* Selected Students */}
            {selectedStudents.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Students ({selectedStudents.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map((student) => {
                    const admissionNum = student.admission_number || student.admission_num || '';
                    const studentName = student.display_name || student.name || '';
                    const hasAdmission = !!admissionNum;
                    return (
                      <Badge
                        key={student.id}
                        variant={hasAdmission ? "secondary" : "destructive"}
                        className="flex items-center gap-1"
                      >
                        {studentName} {admissionNum ? `(${admissionNum})` : '(No Admission #)'}
                        <button
                          type="button"
                          onClick={() => removeStudent(student.id)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                {selectedStudents.some(s => !s.admission_number && !s.admission_num) && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
                    ⚠️ Warning: Some selected students don't have admission numbers. This will cause the bulk creation to fail.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedStudents.length === 0}>
              {loading ? 'Creating...' : `Create Mappings (${selectedStudents.length} students)`}
            </Button>
          </div>
        </form>
      </Form>

      {/* Bulk Result */}
      {bulkResult && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Creation Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Badge variant="default">Success: {bulkResult.success_count}</Badge>
                <Badge variant="destructive">Failed: {bulkResult.total_count - bulkResult.success_count}</Badge>
                <Badge variant="outline">Total: {bulkResult.total_count}</Badge>
              </div>

              {bulkResult.message && (
                <p className="text-sm text-muted-foreground">{bulkResult.message}</p>
              )}

              {bulkResult.errors && bulkResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-destructive">Errors:</Label>
                  <div className="space-y-1">
                    {bulkResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-destructive">
                        <strong>{error.student_name} ({error.student_admission_num}):</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}