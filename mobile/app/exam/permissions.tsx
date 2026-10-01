import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { CustomDropdown } from '@/components/ui/dropdown';
import { useAuth, useTheme } from '@/contexts';
import {
  examsApi, markPermissionsApi,
  ExamClassSection, ExamListItem, ExamSubjectConfig, MarkPermission, MarkPermissionCreate,
} from '@/src/api/exam';
import { staffApi } from '@/src/api/staff';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { isAdminRole } from '../../src/lib/roles';

const EMPTY_FORM: MarkPermissionCreate = {
  user_id: '',
  teacher_id: '',
  subject_config_id: '',
  class_id: '',
  section_id: '',
  scope_note: '',
};

export default function MarkPermissionsScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  // Web parity (ExamDetail "Mark Permissions" tab): granting mark-entry
  // permissions is admin-only.
  const isAdmin = isAdminRole(role?.name);
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/exam/list');
    }
  }, [isAdmin, router]);

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = isDark ? '#0f0f23' : '#f8fafc';

  const { confirm, modalProps } = useConfirmModal();
  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [form, setForm] = useState<MarkPermissionCreate>({ ...EMPTY_FORM });

  // Web parity: mark-permission authorization is granted under the "exams"
  // resource — see mobile backend files/mark_permission_endpoints.py. Grant
  // maps to the "update" action there (there is no separate "create" check).
  const canGrant  = hasPermission?.('exams', 'update');
  const canToggle = hasPermission?.('exams', 'update');
  const canRevoke = hasPermission?.('exams', 'delete');

  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list({ size: 50 }),
    enabled: !examId,
  });

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['mark-permissions', selectedExamId],
    queryFn: () => markPermissionsApi.list(selectedExamId),
    enabled: !!selectedExamId,
  });

  // Teacher picker — mirrors web's staff-search dropdown instead of a raw
  // "paste teacher UUID" field.
  const { data: staffData } = useQuery({
    queryKey: ['staff-active-list'],
    queryFn: () => staffApi.getStaffEnrollments({ is_active: true, limit: 200 }),
  });
  const teacherOptions = (staffData?.items ?? []).map(s => ({
    label: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Staff',
    value: s.user_id || s.id,
  }));

  // Optional scope — narrow the grant to one of the exam's own configured
  // subjects instead of a raw class/section/subject-config UUID triplet.
  const { data: subjectConfigs = [] } = useQuery<ExamSubjectConfig[]>({
    queryKey: ['exam-subject-configs', selectedExamId],
    queryFn: () => examsApi.getSubjectConfigs(selectedExamId),
    enabled: !!selectedExamId,
  });
  const { data: classSections = [] } = useQuery<ExamClassSection[]>({
    queryKey: ['exam-class-sections', selectedExamId],
    queryFn: () => examsApi.getClassSections(selectedExamId),
    enabled: !!selectedExamId,
  });
  const classSectionLabel = (classId: string, sectionId?: string | null) => {
    const cs = classSections.find(c => c.class_id === classId && (c.section_id ?? '') === (sectionId ?? ''));
    return cs ? (cs.section_name ? `${cs.class_name ?? 'Class'} – ${cs.section_name}` : (cs.class_name ?? 'Class')) : 'Class';
  };
  const scopeOptions = [
    { label: 'All subjects (full exam access)', value: '' },
    ...subjectConfigs.map(sc => ({
      label: `${classSectionLabel(sc.class_id, sc.section_id)} · ${sc.subject_name ?? 'Subject'}`,
      value: sc.id,
    })),
  ];

  const grantMutation = useMutation({
    mutationFn: (data: MarkPermissionCreate) => markPermissionsApi.grant(selectedExamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mark-permissions', selectedExamId] });
      setGrantModalVisible(false);
      setForm({ ...EMPTY_FORM });
      showSuccess('Permission Granted', 'Mark entry permission granted successfully.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to grant permission.')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ permId, is_active }: { permId: string; is_active: boolean }) =>
      markPermissionsApi.update(selectedExamId, permId, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mark-permissions', selectedExamId] });
      showSuccess('Updated', 'Permission status updated.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to update permission.')),
  });

  const revokeMutation = useMutation({
    mutationFn: (permId: string) => markPermissionsApi.revoke(selectedExamId, permId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mark-permissions', selectedExamId] });
      showSuccess('Revoked', 'Mark entry permission revoked.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to revoke permission.')),
  });

  const handleGrant = () => {
    if (!form.user_id.trim()) { showError('Validation', 'Select a teacher.'); return; }
    const scopedConfig = subjectConfigs.find(sc => sc.id === form.subject_config_id);
    grantMutation.mutate({
      ...form,
      teacher_id: form.user_id,
      subject_config_id: form.subject_config_id || undefined,
      class_id: scopedConfig?.class_id || undefined,
      section_id: scopedConfig?.section_id || undefined,
      scope_note: form.scope_note || undefined,
    });
  };

  const handleRevoke = (perm: MarkPermission) => {
    confirm({
      title: 'Revoke Permission',
      message: `Remove mark entry access for ${perm.user_display_name ?? 'this teacher'}?`,
      confirmLabel: 'Revoke',
      destructive: true,
      onConfirm: () => revokeMutation.mutate(perm.id),
    });
  };

  const renderPermission = ({ item, index }: { item: MarkPermission; index: number }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={[styles.iconBox, { backgroundColor: item.is_active ? '#3B82F618' : '#6B728018' }]}>
        <Ionicons name="person" size={20} color={item.is_active ? '#3B82F6' : '#6B7280'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
        <Text style={[styles.teacherText, { color: colors.foreground }]}>
          {item.user_display_name ?? 'Teacher'}
        </Text>
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          Granted: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.rightActions}>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B98118' : '#EF444418' }]}>
          <Text style={[styles.statusText, { color: item.is_active ? '#10B981' : '#EF4444' }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {canToggle && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => toggleMutation.mutate({ permId: item.id, is_active: !item.is_active })}
            accessibilityLabel={item.is_active ? 'Deactivate permission' : 'Activate permission'}
          >
            <Ionicons
              name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
              size={20}
              color={item.is_active ? '#F59E0B' : '#10B981'}
            />
          </TouchableOpacity>
        )}
        {canRevoke && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleRevoke(item)}
              accessibilityLabel="Revoke permission">
            <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Non-admins are redirected by the effect above; render nothing meanwhile.
  if (!isAdmin) return null;

  return (
    <AppLayout title="Mark Permissions">
      <View style={styles.container}>

        {/* Exam selector */}
        {!examId && (
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Select Exam</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(Array.isArray(examsData) ? examsData : []).map((e: ExamListItem) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.chip, { backgroundColor: selectedExamId === e.id ? colors.primary : cardBg, borderColor: borderCol }]}
                  onPress={() => setSelectedExamId(e.id)}
                >
                  <Text style={[styles.chipText, { color: selectedExamId === e.id ? 'white' : colors['muted-foreground'] as string }]}>
                    {e.exam_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {!selectedExamId ? (
          <View style={styles.centered}>
            <Ionicons name="key-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select an exam to manage permissions</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : (
          <FlatList
            data={permissions}
            keyExtractor={p => p.id}
            renderItem={renderPermission}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="key-outline" size={40} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No permissions granted yet</Text>
                {canGrant && (
                  <TouchableOpacity
                    style={[styles.grantCta, { backgroundColor: colors.primary }]}
                    onPress={() => setGrantModalVisible(true)}
                  >
                    <Ionicons name="add" size={16} color="white" />
                    <Text style={styles.grantCtaText}>Grant First Permission</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            ListHeaderComponent={
              permissions.length > 0 ? (
                <Text style={[styles.countText, { color: colors['muted-foreground'] }]}>
                  {permissions.length} permission{permissions.length !== 1 ? 's' : ''} ·{' '}
                  {permissions.filter(p => p.is_active).length} active
                </Text>
              ) : null
            }
          />
        )}

        {/* FAB */}
        {canGrant && !!selectedExamId && (
          <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setGrantModalVisible(true)}
              accessibilityLabel="Add">
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Grant Permission Modal */}
      <Modal visible={grantModalVisible} animationType="slide" transparent onRequestClose={() => setGrantModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Grant Mark Permission</Text>
                <TouchableOpacity onPress={() => setGrantModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Teacher *</Text>
              <CustomDropdown
                data={teacherOptions}
                value={form.user_id || null}
                onChange={v => setForm(f => ({ ...f, user_id: v ? String(v) : '', teacher_id: v ? String(v) : '' }))}
                placeholder="Select teacher"
                containerStyle={{ marginBottom: 4 }}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Scope (optional)</Text>
              <CustomDropdown
                data={scopeOptions}
                value={form.subject_config_id ?? ''}
                onChange={v => setForm(f => ({ ...f, subject_config_id: v ? String(v) : '' }))}
                placeholder="All subjects (full exam access)"
                search={false}
                containerStyle={{ marginBottom: 4 }}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Scope Note (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 64, textAlignVertical: 'top' }]}
                value={form.scope_note ?? ''}
                onChangeText={v => setForm(f => ({ ...f, scope_note: v }))}
                placeholder="e.g. FA1 Mathematics only"
                placeholderTextColor={colors['muted-foreground']}
                multiline
                numberOfLines={2}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: grantMutation.isPending ? colors.muted : colors.primary }]}
                onPress={handleGrant}
                disabled={grantMutation.isPending}
              >
                <Ionicons name="checkmark" size={18} color="white" />
                <Text style={styles.submitBtnText}>{grantMutation.isPending ? 'Granting…' : 'Grant Permission'}</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmModal {...modalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  countText: { fontSize: 12, marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1,
    padding: 12, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  teacherText: { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  metaText: { fontSize: 11, marginBottom: 1 },
  rightActions: { alignItems: 'flex-end', gap: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grantCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16,
  },
  grantCtaText: { color: 'white', fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
  },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12, marginTop: 20,
  },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
