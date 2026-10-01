import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useAuth, useTheme } from '@/contexts';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { feeClassMappingsApi, feeStudentMappingsApi, type FeeClassMappingResponse } from '@/src/api/fees';
import { classSectionsApi } from '@/src/api/masters';
import { studentAdmissionsApi } from '@/src/api/students';
import type { FeeStudentMappingCreateRequest, FeeStudentMappingResponse } from '@/src/types/fee';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { formatINR } from '@/src/utils/currency';

export function AssignStudentFeesContent() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { activeAcademicYearId } = useAcademicYear();

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // ── Reference data ────────────────────────────────────────────────────────
  const { data: classSections = [] } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => classSectionsApi.getClassSections(),
  });

  // Web parity: the assignment panel lists inactive students too (activeOnly=false)
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-dropdown', 'assign-fees', selectedClassId, selectedSectionId],
    queryFn: () => studentAdmissionsApi.studentsDropdown({
      active_only: false,
      ...(selectedClassId ? { class_id: selectedClassId } : {}),
      ...(selectedSectionId ? { section_id: selectedSectionId } : {}),
    }),
  });

  const { data: admission, isLoading: admissionLoading } = useQuery({
    queryKey: ['student', 'admission', 'detail', selectedStudentId],
    queryFn: () => studentAdmissionsApi.getAdmissionByStudentId(selectedStudentId),
    enabled: !!selectedStudentId,
  });

  const classId = admission?.current_class_id || admission?.admitted_class_id || '';
  const sectionId = admission?.current_section_id || admission?.admitted_section_id || '';
  const admissionNumber = admission?.admission_number || '';

  // Mirror web: fill the Class/Section pickers from the student's admission
  useEffect(() => {
    if (selectedStudentId && classId) setSelectedClassId(classId);
    if (selectedStudentId && sectionId) setSelectedSectionId(sectionId);
  }, [selectedStudentId, classId, sectionId]);

  // ── Fee structure for the student's class + their existing mappings ───────
  const { data: classMappingsRaw = [], isLoading: classMappingsLoading } = useQuery({
    queryKey: ['feeClassMappings', activeAcademicYearId, classId],
    queryFn: () => feeClassMappingsApi.getFeeClassMappings(activeAcademicYearId ?? undefined, classId),
    enabled: !!classId && !!activeAcademicYearId,
  });

  const { data: studentMappingsRaw = [], isLoading: studentMappingsLoading } = useQuery({
    queryKey: ['feeStudentMappings', { student_id: selectedStudentId, academic_year_id: activeAcademicYearId }],
    queryFn: () => feeStudentMappingsApi.getFeeStudentMappings({
      student_id: selectedStudentId,
      academic_year_id: activeAcademicYearId || '',
    }),
    enabled: !!selectedStudentId && !!activeAcademicYearId,
  });

  // The backend has historically ignored the class_id filter, so re-filter here
  const classMappings = useMemo(
    () => (classMappingsRaw as FeeClassMappingResponse[]).filter(m => !classId || m.class_id === classId),
    [classMappingsRaw, classId]
  );

  const existingMap = useMemo(() => {
    const map = new Map<string, string>();
    (studentMappingsRaw as FeeStudentMappingResponse[]).forEach((m: any) => map.set(m.fee_type_id, m.id));
    return map;
  }, [studentMappingsRaw]);

  // fee_type_id → the amount actually saved on the student's existing mapping.
  // Needed for Transport, whose class-mapping amount may not reflect what was saved.
  const existingAmountMap = useMemo(() => {
    const map = new Map<string, number>();
    (studentMappingsRaw as FeeStudentMappingResponse[]).forEach((m: any) =>
      map.set(m.fee_type_id, parseFloat(m.total_fee) || 0)
    );
    return map;
  }, [studentMappingsRaw]);

  const isTransport = (m: FeeClassMappingResponse) =>
    !!m.fee_type_name?.toLowerCase().includes('transport');

  const mandatoryFees = classMappings.filter(m => m.all_by_default && !isTransport(m));
  const nonMandatoryFees = classMappings.filter(m => !m.all_by_default && !isTransport(m));
  const transportFees = classMappings.filter(isTransport);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['feeStudentMappings'] });
  };

  const createMutation = useMutation({
    mutationFn: (data: FeeStudentMappingCreateRequest) =>
      feeStudentMappingsApi.createFeeStudentMapping(data),
    onSuccess: () => {
      invalidate();
      showSuccess('Fee Assigned', 'Fee assigned to the student successfully');
    },
    onError: () => showError('Error', 'Failed to assign the fee'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feeStudentMappingsApi.deleteFeeStudentMapping(id),
    onSuccess: () => {
      invalidate();
      showSuccess('Fee Removed', 'Fee assignment removed successfully');
    },
    onError: () => showError('Error', 'Failed to remove the fee assignment'),
  });

  const assignFee = (feeTypeId: string, totalFee: number) => {
    if (!selectedStudentId || !classId) return;
    createMutation.mutate({
      student_id: selectedStudentId,
      student_admission_num: admissionNumber,
      class_id: classId,
      section_id: sectionId,
      fee_type_id: feeTypeId,
      total_fee: totalFee,
      academic_year_id: activeAcademicYearId || '',
    });
  };

  const unassignFee = (mappingId: string) => deleteMutation.mutate(mappingId);

  // ── Dropdown options ──────────────────────────────────────────────────────
  const classOptions = classSections.map(cls => ({ label: cls.name, value: cls.id }));

  const sectionOptions = selectedClassId
    ? (classSections.find(cls => cls.id === selectedClassId)?.sections ?? [])
      .map(section => ({ label: section.name, value: section.id }))
    : [];

  const studentOptions = students.map(student => ({
    label: student.admission_number
      ? `${student.display_name} (${student.admission_number})`
      : student.display_name,
    value: student.id,
  }));

  const studentClass = classSections.find(cls => cls.id === classId);
  const className = studentClass?.name || '—';
  const sectionName = studentClass?.sections.find(s => s.id === sectionId)?.name || '—';
  const studentName = admission?.student
    ? `${admission.student.first_name || ''} ${admission.student.last_name || ''}`.trim()
    : (students.find(s => s.id === selectedStudentId)?.display_name || '');

  const bodyLoading = admissionLoading || classMappingsLoading || studentMappingsLoading;
  const mutating = createMutation.isPending || deleteMutation.isPending;

  const renderFeeRow = (
    fee: FeeClassMappingResponse,
    index: number,
    amount: number,
    action: React.ReactNode
  ) => (
    <View key={fee.id} style={[styles.feeRow, { borderTopColor: colors.border }]}>
      <ThemedText style={[styles.feeSerial, { color: colors['muted-foreground'] }]}>{index + 1}</ThemedText>
      <View style={styles.feeInfo}>
        <ThemedText style={styles.feeName}>{fee.fee_type_name || 'Fee'}</ThemedText>
        <ThemedText style={[styles.feeAmount, { color: colors['muted-foreground'] }]}>
          {amount > 0 ? formatINR(amount) : '—'}
        </ThemedText>
      </View>
      <View style={styles.feeAction}>{action}</View>
    </View>
  );

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS}>
      <ThemedView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Pickers */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText style={styles.label}>Class</ThemedText>
            <CustomDropdown
              data={[{ label: 'All Classes', value: '' }, ...classOptions]}
              value={selectedClassId}
              onChange={(value) => {
                setSelectedClassId(value as string);
                setSelectedSectionId('');
                setSelectedStudentId('');
              }}
              placeholder="All classes"
              search
              searchPlaceholder="Search classes..."
              maxHeight={300}
              mode="default"
              style={styles.compactDropdown}
              containerStyle={styles.compactDropdownContainer}
              placeholderStyle={styles.compactDropdownText}
              selectedTextStyle={styles.compactDropdownText}
            />

            <ThemedText style={styles.label}>Section</ThemedText>
            <CustomDropdown
              data={[{ label: 'All Sections', value: '' }, ...sectionOptions]}
              value={selectedSectionId}
              onChange={(value) => {
                setSelectedSectionId(value as string);
                setSelectedStudentId('');
              }}
              placeholder={selectedClassId ? 'All sections' : 'Select a class first'}
              disabled={!selectedClassId}
              search
              searchPlaceholder="Search sections..."
              maxHeight={300}
              mode="default"
              style={styles.compactDropdown}
              containerStyle={styles.compactDropdownContainer}
              placeholderStyle={styles.compactDropdownText}
              selectedTextStyle={styles.compactDropdownText}
            />

            <View style={styles.labelRow}>
              <ThemedText style={styles.label}>Student</ThemedText>
              {!!selectedStudentId ? (
                <TouchableOpacity style={styles.clearStudent} onPress={() => setSelectedStudentId('')}>
                  <Ionicons name="close-circle" size={13} color={colors['muted-foreground']} />
                  <ThemedText style={[styles.labelHint, { color: colors['muted-foreground'], marginTop: 0 }]}>
                    Clear
                  </ThemedText>
                </TouchableOpacity>
              ) : !studentsLoading ? (
                <ThemedText style={[styles.labelHint, { color: colors['muted-foreground'] }]}>
                  {studentOptions.length} {studentOptions.length === 1 ? 'student' : 'students'}
                </ThemedText>
              ) : null}
            </View>
            <CustomDropdown
              data={studentOptions}
              value={selectedStudentId}
              onChange={(value) => setSelectedStudentId(value as string)}
              placeholder={studentsLoading ? 'Loading students...' : 'Search by name or admission no...'}
              search
              searchPlaceholder="Search by name or admission no..."
              maxHeight={340}
              mode="default"
              style={styles.compactDropdown}
              containerStyle={styles.compactDropdownContainer}
              placeholderStyle={styles.compactDropdownText}
              selectedTextStyle={styles.compactDropdownText}
            />
          </View>

          {!selectedStudentId && (
            <View style={styles.placeholderBox}>
              <Ionicons name="person-outline" size={40} color={colors['muted-foreground']} />
              <ThemedText style={[styles.placeholderText, { color: colors['muted-foreground'] }]}>
                Select a student above to manage their fee assignments.
              </ThemedText>
            </View>
          )}

          {!!selectedStudentId && bodyLoading && (
            <View style={styles.placeholderBox}>
              <ThemedText style={{ color: colors['muted-foreground'] }}>Loading fee structure...</ThemedText>
            </View>
          )}

          {!!selectedStudentId && !bodyLoading && (
            <>
              {/* Student summary */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.summaryRow}>
                  <ThemedText style={[styles.summaryLabel, { color: colors['muted-foreground'] }]}>Student</ThemedText>
                  <ThemedText style={styles.summaryValue}>{studentName || '—'}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={[styles.summaryLabel, { color: colors['muted-foreground'] }]}>Admission No</ThemedText>
                  <ThemedText style={styles.summaryValue}>{admissionNumber || '—'}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={[styles.summaryLabel, { color: colors['muted-foreground'] }]}>Class</ThemedText>
                  <ThemedText style={styles.summaryValue}>{className}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={[styles.summaryLabel, { color: colors['muted-foreground'] }]}>Section</ThemedText>
                  <ThemedText style={styles.summaryValue}>{sectionName}</ThemedText>
                </View>
              </View>

              {/* Mandatory fees */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="lock-closed" size={15} color={colors.primary} />
                  <ThemedText style={styles.cardTitle}>Mandatory Fees</ThemedText>
                </View>
                {mandatoryFees.length === 0 ? (
                  <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    No mandatory fees for this class.
                  </ThemedText>
                ) : (
                  mandatoryFees.map((fee, index) => {
                    const existingId = existingMap.get(fee.fee_type_id);
                    const amount = parseFloat(fee.total_fee || '0') || 0;
                    return renderFeeRow(fee, index, amount, existingId ? (
                      <View style={[styles.assignedBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark-circle" size={12} color="white" />
                        <ThemedText style={styles.assignedBadgeText}>Assigned</ThemedText>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.assignButton, { borderColor: colors.primary }, mutating && styles.disabled]}
                        onPress={() => assignFee(fee.fee_type_id, amount)}
                        disabled={mutating}
                      >
                        <ThemedText style={[styles.assignButtonText, { color: colors.primary }]}>Assign</ThemedText>
                      </TouchableOpacity>
                    ));
                  })
                )}
              </View>

              {/* Non-mandatory fees */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="options-outline" size={15} color={colors.primary} />
                  <ThemedText style={styles.cardTitle}>Non-Mandatory Fees</ThemedText>
                </View>
                {nonMandatoryFees.length === 0 ? (
                  <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    No non-mandatory fees for this class.
                  </ThemedText>
                ) : (
                  nonMandatoryFees.map((fee, index) => {
                    const existingId = existingMap.get(fee.fee_type_id);
                    const amount = parseFloat(fee.total_fee || '0') || 0;
                    return renderFeeRow(fee, index, amount, (
                      <Switch
                        value={!!existingId}
                        onValueChange={(checked) => {
                          if (checked) assignFee(fee.fee_type_id, amount);
                          else if (existingId) unassignFee(existingId);
                        }}
                        disabled={mutating}
                        trackColor={{ false: colors.border, true: colors.primary }}
                      />
                    ));
                  })
                )}
              </View>

              {/* Transport fee */}
              {transportFees.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="bus" size={15} color="#3B82F6" />
                    <ThemedText style={styles.cardTitle}>Transport Fee</ThemedText>
                  </View>

                  {transportFees.map((fee, index) => {
                    const existingId = existingMap.get(fee.fee_type_id);
                    const classAmount = parseFloat(fee.total_fee || '0') || 0;
                    // Once assigned, show the amount actually saved on the student's
                    // mapping; otherwise fall back to the class mapping's flat amount.
                    const amount = existingId ? (existingAmountMap.get(fee.fee_type_id) ?? 0) : classAmount;
                    return renderFeeRow(fee, index, amount, existingId ? (
                      <View style={[styles.assignedBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark-circle" size={12} color="white" />
                        <ThemedText style={styles.assignedBadgeText}>Assigned</ThemedText>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.assignButton, { borderColor: colors.primary }, mutating && styles.disabled]}
                        onPress={() => assignFee(fee.fee_type_id, classAmount)}
                        disabled={mutating}
                      >
                        <ThemedText style={[styles.assignButtonText, { color: colors.primary }]}>Assign</ThemedText>
                      </TouchableOpacity>
                    ));
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

// Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee
// module, even via a deep link into a specific fee sub-screen.
export default function AssignStudentFeesScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const isFeeBlocked = roleBlocksFees(role?.name);

  useEffect(() => {
    if (isFeeBlocked) router.replace('/(tabs)');
  }, [isFeeBlocked, router]);

  if (isFeeBlocked) return null;

  return (
    <AppLayout title="Assign Student Fees">
      <AssignStudentFeesContent />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 32 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  compactDropdown: { height: 44, paddingHorizontal: 10, paddingVertical: 4 },
  compactDropdownContainer: { marginBottom: 0 },
  compactDropdownText: { fontSize: 13 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelHint: { fontSize: 11, marginTop: 8 },
  clearStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  placeholderBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  placeholderText: { fontSize: 13, textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 12, fontWeight: '600' },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  feeSerial: { fontSize: 11, width: 16 },
  feeInfo: { flex: 1 },
  feeName: { fontSize: 13, fontWeight: '600' },
  feeAmount: { fontSize: 12, marginTop: 2 },
  feeAction: { minWidth: 84, alignItems: 'flex-end' },
  assignButton: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  assignButtonText: { fontSize: 12, fontWeight: '600' },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  assignedBadgeText: { color: 'white', fontSize: 11, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  emptyText: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});
