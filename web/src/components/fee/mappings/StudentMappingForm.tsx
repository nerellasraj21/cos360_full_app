import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { feeStudentMappingsApi } from '@/api/fee/studentMappings';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { fetchStudentsDropdown } from '@/api/students/admissions';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import Select, { type SingleValue } from 'react-select';
import type { FeeStudentMapping, FeeStudentMappingCreateRequest, FeeStudentMappingUpdateRequest } from '@/types/fee/mapping';
import type { StudentDropdownItem } from '@/types/admission';
import type { ClassDropdown, SectionDropdown } from '@/types/masters/classesandsections';
import type { FeeType } from '@/types/fee';

const formSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  student_admission_num: z.string().min(1, 'Admission number is required'),
  class_id: z.string().min(1, 'Class is required'),
  section_id: z.string().min(1, 'Section is required'),
  fee_type_id: z.string().min(1, 'Fee type is required'),
  total_fee: z.number().min(0, 'Total fee must be non-negative'),
  academic_year_id: z.string().min(1, 'Academic year is required'),
});

type FormData = z.infer<typeof formSchema>;

interface StudentMappingFormProps {
  mapping?: FeeStudentMapping;
  academicYearId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type SelectOption = { value: string; label: string } | null;

export function StudentMappingForm({ mapping, academicYearId, onSuccess, onCancel }: StudentMappingFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<SelectOption>(
    mapping?.class_id ? { value: mapping.class_id, label: `Class ${mapping.class_id}` } : null
  );
  const [selectedSection, setSelectedSection] = useState<SelectOption>(
    mapping?.section_id ? { value: mapping.section_id, label: `Section ${mapping.section_id}` } : null
  );
  const [selectedStudent, setSelectedStudent] = useState<SelectOption>(
    mapping?.student_id ? { value: mapping.student_id, label: `${mapping.student_admission_num} - Student ${mapping.student_id}` } : null
  );
  const [students, setStudents] = useState<StudentDropdownItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const { selectedAcademicYearId } = useAcademicYearStore();

  // Use hooks for data fetching
  const { data: classesData, isLoading: classesLoading } = useClassesDropdown();
  const { data: sectionsData, isLoading: sectionsLoading } = useSectionsByClassId(selectedClass?.value || mapping?.class_id || '');
  const { data: feeTypes = [], isLoading: feeTypesLoading } = useFeeTypes();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      student_id: mapping?.student_id || '',
      student_admission_num: mapping?.student_admission_num || '',
      class_id: mapping?.class_id || '',
      section_id: mapping?.section_id || '',
      fee_type_id: mapping?.fee_type_id || '',
      total_fee: mapping ? parseFloat(mapping.total_fee.toString()) : 0,
      academic_year_id: mapping?.academic_year_id || academicYearId || selectedAcademicYearId || '',
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

  // Initialize selected values when data loads
  useEffect(() => {
    if (mapping && classesData && students) {
      // Set class selection
      const classItem = classesData.find(c => c.id === mapping.class_id);
      if (classItem) {
        setSelectedClass({ value: classItem.id, label: classItem.name });
      }

      // Set student selection
      const studentItem = students.find(s => s.id === mapping.student_id);
      if (studentItem) {
        setSelectedStudent({
          value: studentItem.id,
          label: studentItem.display_name || studentItem.name
        });
      }
    }
  }, [mapping, classesData, students]);

  // Initialize section when sections data loads
  useEffect(() => {
    if (mapping && sectionsData && selectedClass) {
      const sectionItem = sectionsData.find(s => s.id === mapping.section_id);
      if (sectionItem) {
        setSelectedSection({ value: sectionItem.id, label: sectionItem.name });
      }
    }
  }, [mapping, sectionsData, selectedClass]);

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
      label: student.display_name || student.name
    }));
  }, [students]);

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

  // Handle student change
  const handleStudentChange = (option: SingleValue<SelectOption>) => {
    setSelectedStudent(option);
    const selectedStudentData = students.find(s => s.id === option?.value);
    form.setValue('student_id', option?.value || '');
    form.setValue('student_admission_num', selectedStudentData?.admission_number || '');
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (mapping) {
        // Update existing mapping
        await feeStudentMappingsApi.updateMapping(mapping.id, data);
        toast.success('Fee student mapping updated successfully');
      } else {
        // Create new mapping
        await feeStudentMappingsApi.createMapping(data);
        toast.success('Fee student mapping created successfully');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving mapping:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save fee student mapping';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Selection */}
          <FormField
            control={form.control}
            name="student_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student</FormLabel>
                <FormControl>
                  <Select
                    options={studentOptions}
                    value={selectedStudent}
                    onChange={handleStudentChange}
                    placeholder="Select a student"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    styles={{
                      menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                      menu: (provided) => ({ ...provided, zIndex: 9999, pointerEvents: 'auto' }),
                      option: (provided, state) => ({
                        ...provided,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                        color: state.isSelected ? 'white' : 'black',
                        '&:hover': {
                          backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                        },
                      }),
                    }}
                    isLoading={studentsLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Admission Number */}
          <FormField
            control={form.control}
            name="student_admission_num"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admission Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter admission number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                      menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                      menu: (provided) => ({ ...provided, zIndex: 9999, pointerEvents: 'auto' }),
                      option: (provided, state) => ({
                        ...provided,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
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
                      menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                      menu: (provided) => ({ ...provided, zIndex: 9999, pointerEvents: 'auto' }),
                      option: (provided, state) => ({
                        ...provided,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
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
                      menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                      menu: (provided) => ({ ...provided, zIndex: 9999, pointerEvents: 'auto' }),
                      option: (provided, state) => ({
                        ...provided,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
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

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : mapping ? 'Update Mapping' : 'Create Mapping'}
          </Button>
        </div>
      </form>
    </Form>
  );
}