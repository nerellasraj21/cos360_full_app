import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { feeStudentMappingsApi } from '@/api/fee/studentMappings';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { fetchStudentsDropdown } from '@/api/students/admissions';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import Select, { type SingleValue } from 'react-select';
import type { FeeStudentMappingBulkCreateRequest, FeeStudentMappingBulkResponse } from '@/types/fee/mapping';
import type { StudentDropdownItem } from '@/types/admission';
import type { ClassDropdown, SectionDropdown } from '@/types/masters/classesandsections';
import type { FeeType } from '@/types/fee';

const formSchema = z.object({
  student_ids: z.array(z.string()).min(1, 'At least one student must be selected'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  fee_type_id: z.string().min(1, 'Fee type is required'),
  total_fee: z.number().min(0, 'Total fee must be non-negative'),
  academic_year_id: z.string().min(1, 'Academic year is required'),
});

type FormData = z.infer<typeof formSchema>;

interface BulkStudentMappingFormProps {
  academicYearId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type SelectOption = { value: string; label: string } | null;

export function BulkStudentMappingForm({ academicYearId, onSuccess, onCancel }: BulkStudentMappingFormProps) {
  const [loading, setLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<FeeStudentMappingBulkResponse | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<SelectOption>(null);
  const [selectedSection, setSelectedSection] = useState<SelectOption>(null);
  const [students, setStudents] = useState<StudentDropdownItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const { academicYears, selectedAcademicYearId } = useAcademicYearStore();

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
      academic_year_id: academicYearId || selectedAcademicYearId || '',
    },
  });

  // Fetch students data
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentsLoading(true);
        const studentsData = await fetchStudentsDropdown();
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to load students');
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, []);

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
    return students.map(student => ({
      value: student.id,
      label: student.admission_number ? `${student.name} (${student.admission_number})` : student.name
    }));
  }, [students]);

  const academicYearOptions = useMemo(() => {
    return academicYears.map(year => ({
      value: year.id,
      label: year.title
    }));
  }, [academicYears]);

  // Handle class change
  const handleClassChange = (option: SingleValue<SelectOption>) => {
    setSelectedClass(option);
    setSelectedSection(null); // Reset section when class changes
    form.setValue('class_id', option?.value || '');
    form.setValue('section_id', ''); // Reset section in form
  };

  // Handle section change
  const handleSectionChange = (option: SingleValue<SelectOption>) => {
    setSelectedSection(option);
    form.setValue('section_id', option?.value || '');
  };


  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setBulkResult(null);

      const result = await feeStudentMappingsApi.bulkCreateMappings(data);
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
      console.error('Error creating bulk mappings:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create bulk mappings';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = (studentId: string | number, studentOption?: any) => {
    const id = String(studentId);
    if (!selectedStudents.find(s => s.id === id)) {
      const student = studentOption || { id, name: `Student ${id}`, admission_number: id };
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
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
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
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
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
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
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

            {/* Academic Year Selection */}
            <FormField
              control={form.control}
              name="academic_year_id"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Academic Year</FormLabel>
                  <FormControl>
                    <Select
                      options={academicYearOptions}
                      value={academicYearOptions.find(option => option.value === field.value) || null}
                      onChange={(option) => field.onChange(option?.value || '')}
                      placeholder="Select academic year"
                      className="w-full"
                      classNamePrefix="react-select"
                      menuPlacement="auto"
                      menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
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
                  placeholder="Select students to add"
                  className="w-full"
                  classNamePrefix="react-select"
                  menuPlacement="auto"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999 }),
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
                />
              </div>
            </div>

            {/* Selected Students */}
            {selectedStudents.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Students ({selectedStudents.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedStudents.map((student) => (
                    <Badge key={student.id} variant="secondary" className="flex items-center gap-1">
                      {student.name} ({student.admission_number})
                      <button
                        type="button"
                        onClick={() => removeStudent(student.id)}
                        className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
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