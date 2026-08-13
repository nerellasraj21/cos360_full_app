import { useState, useEffect, useMemo } from 'react';
import { Loader2, Lock, Bus, CheckCircle2 } from 'lucide-react';
import Select, { type SingleValue } from 'react-select';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStudentAdmissionDetail } from '@/api/hooks/students/admissions';
import { useReadAllClassSections } from '@/api/hooks/masters/classesandsections';
import {
  useFeeClassMappings,
  useFeeStudentMappings,
  useCreateFeeStudentMapping,
  useDeleteFeeStudentMapping,
} from '@/hooks/fee';
import { useVehiclesDropdown, useVehicle } from '@/api/hooks/masters/vehicles';
import { useRoutesDropdown } from '@/api/hooks/masters/routes';
import { useRouteStopsByRoute } from '@/api/hooks/masters/routeStops';
import { fetchStudentsDropdown } from '@/api/students/admissions';
import { formatCurrency } from '@/pages/fee/FeeCollection/FeeSummaryTab';
import type { StudentDropdownItem } from '@/types/admission';
import type { FeeClassMapping } from '@/types/fee/mapping';

type StudentOption = { value: string; label: string } | null;

export function StudentFeeAssignmentPanel() {
  const { selectedAcademicYearId } = useAcademicYearStore();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [students, setStudents] = useState<StudentDropdownItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption>(null);
  const [transportVehicleId, setTransportVehicleId] = useState<string>('');
  const [transportRouteId, setTransportRouteId] = useState<string>('');
  const [transportStopId, setTransportStopId] = useState<string>('');

  useEffect(() => {
    setStudentsLoading(true);
    fetchStudentsDropdown(false, selectedClassId || undefined, selectedSectionId || undefined)
      .then(setStudents)
      .catch(console.error)
      .finally(() => setStudentsLoading(false));
  }, [selectedClassId, selectedSectionId]);

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: s.display_name || s.name })),
    [students]
  );

  const studentId = selectedStudent?.value ?? '';

  useEffect(() => {
    setTransportVehicleId('');
    setTransportRouteId('');
    setTransportStopId('');
  }, [studentId]);

  const { data: admission, isLoading: admissionLoading } = useStudentAdmissionDetail(studentId);
  const { data: allClasses = [] } = useReadAllClassSections();

  const classOptions = useMemo(
    () => allClasses.map((c) => ({ value: c.id, label: c.name })),
    [allClasses]
  );

  const sectionOptions = useMemo(
    () => allClasses.find((c) => c.id === selectedClassId)?.sections.map((s) => ({ value: s.id, label: s.name })) ?? [],
    [allClasses, selectedClassId]
  );

  const selectedClassOption = useMemo(
    () => classOptions.find((o) => o.value === selectedClassId) ?? null,
    [classOptions, selectedClassId]
  );

  const selectedSectionOption = useMemo(
    () => sectionOptions.find((o) => o.value === selectedSectionId) ?? null,
    [sectionOptions, selectedSectionId]
  );

  const classId = (admission as any)?.current_class_id || (admission as any)?.admitted_class_id || '';
  const sectionId = (admission as any)?.current_section_id || (admission as any)?.admitted_section_id || '';
  const admissionNumber = (admission as any)?.admission_number ?? '';

  // Auto-fill Class and Section dropdowns when student admission loads
  useEffect(() => {
    if (studentId && classId) setSelectedClassId(classId);
    if (studentId && sectionId) setSelectedSectionId(sectionId);
  }, [studentId, classId, sectionId]);
  const student = (admission as any)?.student;
  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
    : selectedStudent?.label ?? '';

  const classObj = allClasses.find((c) => c.id === classId);
  const className = classObj?.name ?? classId;
  const sectionName = classObj?.sections.find((s) => s.id === sectionId)?.name ?? sectionId;

  const { data: classMappingsRaw, isLoading: mappingsLoading } = useFeeClassMappings(
    classId && selectedAcademicYearId
      ? { class_id: classId, academic_year_id: selectedAcademicYearId, limit: 100 }
      : undefined
  );

  const { data: studentMappingsRaw, isLoading: studentMappingsLoading } = useFeeStudentMappings(
    studentId && selectedAcademicYearId
      ? { student_id: studentId, academic_year_id: selectedAcademicYearId }
      : undefined
  );

  const { data: vehiclesDropdown = [] } = useVehiclesDropdown();
  const { data: selectedVehicle } = useVehicle(transportVehicleId);
  const { data: routesDropdown = [], isLoading: routesLoading } = useRoutesDropdown();
  const { data: routeStops = [], isLoading: routeStopsLoading } = useRouteStopsByRoute(transportRouteId);
  // Safety filter: the backend has historically ignored route_id-scoped query params,
  // so re-filter (and dedupe) client-side to only the selected route.
  const filteredRouteStops = useMemo(() => {
    if (!transportRouteId) return [];
    const seen = new Set<string>();
    return routeStops.filter(s => {
      if (s.route_id !== transportRouteId || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [routeStops, transportRouteId]);

  const createMutation = useCreateFeeStudentMapping();
  const deleteMutation = useDeleteFeeStudentMapping();

  const classMappings: FeeClassMapping[] = useMemo(() => {
    if (!classMappingsRaw) return [];
    return Array.isArray(classMappingsRaw)
      ? classMappingsRaw
      : (classMappingsRaw as any).items ?? [];
  }, [classMappingsRaw]);

  const studentMappings = useMemo(() => {
    if (!studentMappingsRaw) return [];
    return Array.isArray(studentMappingsRaw)
      ? studentMappingsRaw
      : (studentMappingsRaw as any).items ?? [];
  }, [studentMappingsRaw]);

  // fee_type_id → existing student mapping id
  const existingMap = useMemo(() => {
    const map = new Map<string, string>();
    studentMappings.forEach((m: any) => map.set(m.fee_type_id, m.id));
    return map;
  }, [studentMappings]);

  const mandatoryFees = classMappings.filter(
    (m) => m.all_by_default && !m.fee_type_name?.toLowerCase().includes('transport')
  );
  const nonMandatoryFees = classMappings.filter(
    (m) => !m.all_by_default && !m.fee_type_name?.toLowerCase().includes('transport')
  );
  const transportFees = classMappings.filter((m) =>
    m.fee_type_name?.toLowerCase().includes('transport')
  );

  // Transport fee is defined per stop (RouteStop.fees), not per vehicle.
  const selectedStop = filteredRouteStops.find((s) => s.id === transportStopId);
  const annualBusFee = selectedStop?.fees ?? 0;

  function assignFee(feeTypeId: string, totalFee: number) {
    if (!studentId || !classId) return;
    createMutation.mutate({
      student_id: studentId,
      student_admission_num: admissionNumber,
      class_id: classId,
      section_id: sectionId,
      fee_type_id: feeTypeId,
      total_fee: totalFee,
      academic_year_id: selectedAcademicYearId,
    });
  }

  function unassignFee(mappingId: string) {
    deleteMutation.mutate(mappingId);
  }

  const bodyLoading = admissionLoading || mappingsLoading || studentMappingsLoading;

  return (
    <div className="space-y-4">
      {/* Filters + Student Search */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium shrink-0">Class</label>
              <div className="w-44">
                <Select
                  options={classOptions}
                  value={selectedClassOption}
                  onChange={(opt) => {
                    setSelectedClassId(opt?.value ?? '');
                    setSelectedSectionId('');
                    setSelectedStudent(null);
                  }}
                  placeholder="All Classes"
                  isClearable
                  classNamePrefix="react-select"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    menu: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                      cursor: 'pointer',
                    }),
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium shrink-0">Section</label>
              <div className="w-44">
                <Select
                  options={sectionOptions}
                  value={selectedSectionOption}
                  onChange={(opt) => {
                    setSelectedSectionId(opt?.value ?? '');
                    setSelectedStudent(null);
                  }}
                  placeholder="All Sections"
                  isClearable
                  isDisabled={!selectedClassId}
                  classNamePrefix="react-select"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    menu: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                      cursor: 'pointer',
                    }),
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium shrink-0">Student</label>
              <div className="w-72">
                <Select
                  options={studentOptions}
                  value={selectedStudent}
                  onChange={(opt: SingleValue<StudentOption>) => setSelectedStudent(opt ?? null)}
                  isLoading={studentsLoading}
                  placeholder="Search by name or admission no..."
                  isClearable
                  classNamePrefix="react-select"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    menu: (base) => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }),
                    option: (base, state) => ({
                      ...base,
                      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                      color: state.isSelected ? 'white' : 'black',
                      cursor: 'pointer',
                    }),
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!studentId && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Select a student above to manage their fee assignments.
        </div>
      )}

      {studentId && bodyLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading fee structure...</span>
        </div>
      )}

      {studentId && !bodyLoading && (
        <>
          {/* Student Info */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-wrap gap-6 text-sm">
                <div><span className="text-muted-foreground">Student: </span><strong>{studentName}</strong></div>
                <div><span className="text-muted-foreground">Admission No: </span><strong>{admissionNumber || '—'}</strong></div>
                <div><span className="text-muted-foreground">Class: </span><strong>{className}</strong></div>
                <div><span className="text-muted-foreground">Section: </span><strong>{sectionName}</strong></div>
              </div>
            </CardContent>
          </Card>

          {/* Mandatory Fees */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Mandatory Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {mandatoryFees.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">No mandatory fees for this class.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">S.No.</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Per Annum</TableHead>
                      <TableHead className="text-center w-32">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mandatoryFees.map((fee, idx) => {
                      const existingId = existingMap.get(fee.fee_type_id);
                      return (
                        <TableRow key={fee.id} className="h-11">
                          <TableCell className="text-center text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{fee.fee_type_name}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(fee.total_fee)}</TableCell>
                          <TableCell className="text-center">
                            {existingId ? (
                              <Badge variant="default" className="gap-1 text-xs">
                                <CheckCircle2 className="h-3 w-3" /> Assigned
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={createMutation.isPending}
                                onClick={() => assignFee(fee.fee_type_id, fee.total_fee)}
                              >
                                Assign
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Non-Mandatory Fees */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Non-Mandatory Fees</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {nonMandatoryFees.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">No non-mandatory fees for this class.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">S.No.</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Per Annum</TableHead>
                      <TableHead className="text-center w-32">Assign</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonMandatoryFees.map((fee, idx) => {
                      const existingId = existingMap.get(fee.fee_type_id);
                      return (
                        <TableRow key={fee.id} className="h-11">
                          <TableCell className="text-center text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{fee.fee_type_name}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(fee.total_fee)}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={!!existingId}
                              onCheckedChange={(checked) => {
                                if (checked) assignFee(fee.fee_type_id, fee.total_fee);
                                else if (existingId) unassignFee(existingId);
                              }}
                              disabled={createMutation.isPending || deleteMutation.isPending}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Transport Fee */}
          {transportFees.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bus className="h-4 w-4 text-blue-500" /> Transport Fee
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Bus → Trip → Stop selectors */}
                <div className="px-4 py-3 space-y-3 border-b">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Bus</label>
                      <ShadSelect
                        value={transportVehicleId}
                        onValueChange={(val) => {
                          setTransportVehicleId(val);
                          setTransportRouteId('');
                          setTransportStopId('');
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select bus..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vehiclesDropdown.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </ShadSelect>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Trip</label>
                      <ShadSelect
                        value={transportRouteId}
                        onValueChange={(val) => {
                          setTransportRouteId(val);
                          setTransportStopId('');
                        }}
                        disabled={!transportVehicleId || routesLoading}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={routesLoading ? 'Loading...' : 'Select trip...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {routesDropdown.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.route_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </ShadSelect>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Stop</label>
                      <ShadSelect
                        value={transportStopId}
                        onValueChange={setTransportStopId}
                        disabled={!transportRouteId || routeStopsLoading}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={routeStopsLoading ? 'Loading...' : 'Select stop...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRouteStops.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </ShadSelect>
                    </div>
                  </div>

                  {/* Annual fee display — fee comes from the selected stop */}
                  {transportStopId && (
                    <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-2">
                      <Bus className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="text-sm text-muted-foreground">Stop Fee:</span>
                      <span className="text-base font-semibold text-blue-700 dark:text-blue-300">
                        {annualBusFee > 0 ? formatCurrency(annualBusFee) : '—'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Fee assignment table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">S.No.</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-right">Annual Fee</TableHead>
                      <TableHead className="text-center w-32">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transportFees.map((fee, idx) => {
                      const existingId = existingMap.get(fee.fee_type_id);
                      return (
                        <TableRow key={fee.id} className="h-12">
                          <TableCell className="text-center text-sm">{idx + 1}</TableCell>
                          <TableCell className="font-medium text-sm">{fee.fee_type_name}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {annualBusFee > 0 ? formatCurrency(annualBusFee) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {existingId ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                disabled={deleteMutation.isPending}
                                onClick={() => unassignFee(existingId)}
                              >
                                Remove
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={
                                  !transportVehicleId ||
                                  !transportRouteId ||
                                  !transportStopId ||
                                  annualBusFee === 0 ||
                                  createMutation.isPending
                                }
                                onClick={() => assignFee(fee.fee_type_id, annualBusFee)}
                              >
                                Assign
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
