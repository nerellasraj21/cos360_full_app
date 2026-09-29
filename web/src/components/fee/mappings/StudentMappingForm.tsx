import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { useVehiclesDropdown, useVehicle } from '@/api/hooks/masters/vehicles';
import { useRoutesDropdown } from '@/api/hooks/masters/routes';
import { useRouteStopsByRoute } from '@/api/hooks/masters/routeStops';
import { useTripsByVehicle } from '@/api/hooks/masters/trips';
import { useStudentTransportsByStudent } from '@/api/hooks/masters/studentTransport';
import { useClassesDropdown, useSectionsByClassId } from '@/hooks/masters/useClassesAndSections';
import { fetchStudentsDropdown } from '@/api/students/admissions';
import { useStudentAdmissionDetail } from '@/api/hooks/students/admissions';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import { useFeeClassMappings, useCreateFeeStudentMapping, useUpdateFeeStudentMapping } from '@/hooks/fee/useFeeMappings';
import Select, { type SingleValue } from 'react-select';
import type { FeeClassMapping, FeeStudentMapping, FeeStudentMappingCreateRequest, FeeStudentMappingUpdateRequest } from '@/types/fee/mapping';
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
  const createMutation = useCreateFeeStudentMapping();
  const updateMutation = useUpdateFeeStudentMapping();
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
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);
  const [transportVehicleId, setTransportVehicleId] = useState('');
  const [transportTripId, setTransportTripId] = useState('');
  const [transportStopId, setTransportStopId] = useState('');

  const { selectedAcademicYearId } = useAcademicYearStore();

  // Fetch admission for the currently selected student to auto-fill class/section
  const { data: selectedAdmission } = useStudentAdmissionDetail(selectedStudent?.value || '');

  // Use hooks for data fetching
  const { data: classesData, isLoading: classesLoading } = useClassesDropdown();
  const { data: sectionsData, isLoading: sectionsLoading } = useSectionsByClassId(selectedClass?.value || mapping?.class_id || '');
  const { data: feeTypes = [], isLoading: feeTypesLoading } = useFeeTypes();

  const { data: vehiclesDropdown = [] } = useVehiclesDropdown();
  const { data: selectedVehicle } = useVehicle(transportVehicleId);
  const { data: routesDropdown = [] } = useRoutesDropdown();
  const { data: trips = [], isLoading: tripsLoading } = useTripsByVehicle(transportVehicleId);
  const selectedTrip = trips.find(t => t.id === transportTripId);
  const { data: routeStops = [], isLoading: routeStopsLoading } = useRouteStopsByRoute(selectedTrip?.route_id || '');
  // Safety filter: the backend has historically ignored route_id-scoped query params,
  // so re-filter (and dedupe) client-side to only the selected trip's route.
  const filteredRouteStops = useMemo(() => {
    const routeId = selectedTrip?.route_id;
    if (!routeId) return [];
    const seen = new Set<string>();
    return routeStops.filter(s => {
      if (s.route_id !== routeId || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [routeStops, selectedTrip?.route_id]);
  const selectedStop = useMemo(
    () => filteredRouteStops.find(s => s.id === transportStopId),
    [filteredRouteStops, transportStopId]
  );
  const { data: existingTransports = [] } = useStudentTransportsByStudent(mapping ? (selectedStudent?.value || '') : '');

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

  // Fetch students data, filtered by the selected class/section (if any)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentsLoading(true);
        const studentsData = await fetchStudentsDropdown(true, selectedClass?.value, selectedSection?.value);
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to load students');
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass?.value, selectedSection?.value]);

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

  // Initialize section when sections data loads (edit mode)
  useEffect(() => {
    if (mapping && sectionsData && selectedClass) {
      const sectionItem = sectionsData.find(s => s.id === mapping.section_id);
      if (sectionItem) {
        setSelectedSection({ value: sectionItem.id, label: sectionItem.name });
      }
    }
  }, [mapping, sectionsData, selectedClass]);

  // Auto-fill class/section from admission when student is selected (create mode only)
  useEffect(() => {
    if (mapping || !selectedAdmission || !classesData) return;
    const classId = selectedAdmission.current_class_id || selectedAdmission.admitted_class_id;
    const sectionId = selectedAdmission.current_section_id || selectedAdmission.admitted_section_id;
    if (classId) {
      const classItem = classesData.find(c => c.id === classId);
      if (classItem) {
        setSelectedClass({ value: classItem.id, label: classItem.name });
        form.setValue('class_id', classItem.id);
        setSelectedSection(null);
        form.setValue('section_id', '');
      }
    }
    if (sectionId) setPendingSectionId(sectionId);
  }, [selectedAdmission, classesData]);

  // Resolve pending section once sections load after student auto-select
  useEffect(() => {
    if (pendingSectionId && sectionsData) {
      const sectionItem = sectionsData.find(s => s.id === pendingSectionId);
      if (sectionItem) {
        setSelectedSection({ value: sectionItem.id, label: sectionItem.name });
        form.setValue('section_id', sectionItem.id);
        setPendingSectionId(null);
      }
    }
  }, [pendingSectionId, sectionsData]);

  // Detect if selected fee type is transport
  const selectedFeeTypeId = form.watch('fee_type_id');
  const selectedFeeTypeObj = feeTypes.find(ft => ft.id === selectedFeeTypeId);
  const isTransportFee = selectedFeeTypeObj?.type_name?.toLowerCase().includes('transport') ?? false;

  // Reset transport selections when fee type changes away from transport
  useEffect(() => {
    if (!isTransportFee) {
      setTransportVehicleId('');
      setTransportTripId('');
      setTransportStopId('');
    }
  }, [isTransportFee]);

  // Prefill Bus/Trip/Stop from the student's existing transport assignment (edit mode)
  useEffect(() => {
    if (!mapping || !isTransportFee) return;
    if (transportVehicleId || transportTripId || transportStopId) return; // already set/edited
    const existing = existingTransports[0];
    if (existing) {
      setTransportVehicleId(existing.trip?.vehicle?.id || '');
      setTransportTripId(existing.trip_id);
      setTransportStopId(existing.stop_id);
    }
  }, [mapping, isTransportFee, existingTransports]);

  // Auto-fill total_fee from the selected stop's fee. Transport fee is defined per stop
  // (RouteStop.fees), not per vehicle. Create mode only — editing an existing mapping keeps
  // its saved total_fee untouched, matching the class-mapping effect below.
  useEffect(() => {
    if (mapping || !isTransportFee || !transportStopId) return;
    form.setValue('total_fee', selectedStop?.fees ?? 0);
  }, [mapping, isTransportFee, transportStopId, selectedStop]);

  // Look up the class-level fee mapping (Fee Mappings > Class Mappings) for the selected
  // class, so total_fee can be auto-filled instead of typed in manually. Create mode only —
  // editing an existing mapping keeps its saved total_fee untouched.
  const { data: classMappingsRaw } = useFeeClassMappings(
    !mapping && selectedClass?.value && selectedAcademicYearId
      ? { class_id: selectedClass.value, academic_year_id: selectedAcademicYearId, limit: 100 }
      : undefined
  );
  const classMappings: FeeClassMapping[] = useMemo(() => {
    if (!classMappingsRaw) return [];
    return Array.isArray(classMappingsRaw) ? classMappingsRaw : (classMappingsRaw.items ?? []);
  }, [classMappingsRaw]);

  // Auto-fill total_fee from the matching class mapping when Class + Fee Type are selected.
  // Still editable — the user can override the auto-filled amount.
  useEffect(() => {
    if (mapping || isTransportFee || !selectedFeeTypeId) return;
    const match = classMappings.find(m => m.fee_type_id === selectedFeeTypeId);
    if (match) form.setValue('total_fee', parseFloat(match.total_fee.toString()) || 0);
  }, [mapping, isTransportFee, selectedFeeTypeId, classMappings]);

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
    setSelectedSection(null);
    setPendingSectionId(null);
    form.setValue('class_id', option?.value || '');
    form.setValue('section_id', '');
  };

  // Handle section change
  const handleSectionChange = (option: SingleValue<SelectOption>) => {
    setSelectedSection(option);
    form.setValue('section_id', option?.value || '');
  };

  // Handle student change — admission hook takes care of class/section auto-fill
  const handleStudentChange = (option: SingleValue<SelectOption>) => {
    setSelectedStudent(option);
    const studentData = students.find(s => s.id === option?.value);
    form.setValue('student_id', option?.value || '');
    form.setValue('student_admission_num', studentData?.admission_number || '');
    // Reset class/section; auto-fill effect will set them once admission loads
    setSelectedClass(null);
    setSelectedSection(null);
    setPendingSectionId(null);
    form.setValue('class_id', '');
    form.setValue('section_id', '');
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (mapping) {
        // Update existing mapping — hook invalidates the mappings list on success
        await updateMutation.mutateAsync({ id: mapping.id, data });
      } else {
        // Create new mapping — hook invalidates the mappings list on success
        await createMutation.mutateAsync(data);
      }

      onSuccess();
    } catch (error) {
      // Mutation hooks already toast the failure; just log for debugging.
      console.error('Error saving mapping:', error);
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

          {/* Admission Number — auto-filled from student selection */}
          <FormField
            control={form.control}
            name="student_admission_num"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admission Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Auto-filled on student selection"
                    readOnly={!!selectedStudent}
                    className={selectedStudent ? 'bg-muted cursor-not-allowed' : ''}
                  />
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

          {/* Address — auto-filled from admission, non-editable */}
          <div className="md:col-span-2">
            <Label className="text-sm font-medium">Address</Label>
            <Input
              value={
                selectedAdmission
                  ? [selectedAdmission.address_line1, selectedAdmission.address_line2, selectedAdmission.city]
                      .filter(Boolean)
                      .join(', ')
                  : ''
              }
              readOnly
              placeholder="Auto-filled on student selection"
              className="mt-1 bg-muted cursor-not-allowed"
            />
          </div>

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
                    placeholder={isTransportFee ? 'Auto-filled from bus pricing' : 'Enter total fee amount'}
                    readOnly={isTransportFee}
                    className={isTransportFee ? 'bg-muted cursor-not-allowed' : ''}
                    onChange={(e) => !isTransportFee && field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Transport Fee — Bus → Trip → Stop */}
        {isTransportFee && (
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span>🚌</span> Transport Details
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bus */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Bus</Label>
                <Select
                  options={vehiclesDropdown.map(v => ({ value: v.id, label: v.name }))}
                  value={transportVehicleId ? { value: transportVehicleId, label: vehiclesDropdown.find(v => v.id === transportVehicleId)?.name || '' } : null}
                  onChange={(opt) => {
                    setTransportVehicleId(opt?.value || '');
                    setTransportTripId('');
                    setTransportStopId('');
                    form.setValue('total_fee', 0);
                  }}
                  placeholder="Select bus..."
                  classNamePrefix="react-select"
                  menuPlacement="auto"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    menu: provided => ({ ...provided, zIndex: 9999, pointerEvents: 'auto' }),
                    option: (provided, state) => ({
                      ...provided,
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                    }),
                  }}
                />
              </div>

              {/* Trip */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Trip</Label>
                <Select
                  options={trips.map(t => ({
                    value: t.id,
                    label: `Trip #${t.trip_number} — ${routesDropdown.find(r => r.id === t.route_id)?.route_name || ''}`,
                  }))}
                  value={transportTripId ? {
                    value: transportTripId,
                    label: `Trip #${selectedTrip?.trip_number ?? ''} — ${routesDropdown.find(r => r.id === selectedTrip?.route_id)?.route_name || ''}`,
                  } : null}
                  onChange={(opt) => {
                    setTransportTripId(opt?.value || '');
                    setTransportStopId('');
                  }}
                  isDisabled={!transportVehicleId || tripsLoading}
                  isLoading={tripsLoading}
                  placeholder="Select trip..."
                  classNamePrefix="react-select"
                  menuPlacement="auto"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    menu: provided => ({ ...provided, zIndex: 9999, pointerEvents: 'auto' }),
                    option: (provided, state) => ({
                      ...provided,
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                    }),
                  }}
                />
              </div>

              {/* Stop */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">Stop</Label>
                <Select
                  options={filteredRouteStops.map(s => ({ value: s.id, label: s.name }))}
                  value={transportStopId ? { value: transportStopId, label: filteredRouteStops.find(s => s.id === transportStopId)?.name || '' } : null}
                  onChange={(opt) => setTransportStopId(opt?.value || '')}
                  isDisabled={!transportTripId || routeStopsLoading}
                  isLoading={routeStopsLoading}
                  placeholder="Select stop..."
                  classNamePrefix="react-select"
                  menuPlacement="auto"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    menu: provided => ({ ...provided, zIndex: 9999, pointerEvents: 'auto' }),
                    option: (provided, state) => ({
                      ...provided,
                      cursor: 'pointer',
                      pointerEvents: 'auto',
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                    }),
                  }}
                />
              </div>
            </div>

            {/* Annual fee summary — fee comes from the selected stop */}
            {transportStopId && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Stop Fee:</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300 text-base">
                  {(selectedStop?.fees ?? 0) > 0
                    ? `₹${(selectedStop?.fees ?? 0).toLocaleString('en-IN')}`
                    : '—'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || (isTransportFee && (!transportVehicleId || !transportTripId || !transportStopId))}
          >
            {loading ? 'Saving...' : mapping ? 'Update Mapping' : 'Create Mapping'}
          </Button>
        </div>
      </form>
    </Form>
  );
}