import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import {
  examsApi, markPermissionsApi,
  ExamListItem, MarkPermission, MarkPermissionCreate,
} from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

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
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = isDark ? '#0f0f23' : '#f8fafc';

  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [form, setForm] = useState<MarkPermissionCreate>({ ...EMPTY_FORM });

  const canGrant  = hasPermission?.('mark_permissions', 'create');
  const canToggle = hasPermission?.('mark_permissions', 'update');
  const canRevoke = hasPermission?.('mark_permissions', 'delete');

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

  const grantMutation = useMutation({
    mutationFn: (data: MarkPermissionCreate) => markPermissionsApi.grant(selectedExamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mark-permissions', selectedExamId] });
      setGrantModalVisible(false);
      setForm({ ...EMPTY_FORM });
      showSuccess('Permission Granted', 'Mark entry permission granted successfully.');
    },
    onError: () => showError('Error', 'Failed to grant permission.'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ permId, is_active }: { permId: string; is_active: boolean }) =>
      markPermissionsApi.update(selectedExamId, permId, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mark-permissions', selectedExamId] });
      showSuccess('Updated', 'Permission status updated.');
    },
    onError: () => showError('Error', 'Failed to update permission.'),
  });

  const revokeMutation = useMutation({
    mutationFn: (permId: string) => markPermissionsApi.revoke(selectedExamId, permId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mark-permissions', selectedExamId] });
      showSuccess('Revoked', 'Mark entry permission revoked.');
    },
    onError: () => showError('Error', 'Failed to revoke permission.'),
  });

  const handleGrant = () => {
    if (!form.user_id.trim()) { showError('Validation', 'Teacher / User ID is required.'); return; }
    grantMutation.mutate({
      ...form,
      teacher_id: form.user_id,
      subject_config_id: form.subject_config_id || undefined,
      class_id: form.class_id || undefined,
      section_id: form.section_id || undefined,
      scope_note: form.scope_note || undefined,
    });
  };

  const handleRevoke = (perm: MarkPermission) => {
    Alert.alert('Revoke Permission', `Remove mark entry access for teacher ${perm.teacher_id}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate(perm.id) },
    ]);
  };

  const renderPermission = ({ item }: { item: MarkPermission }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={[styles.iconBox, { backgroundColor: item.is_active ? '#3B82F618' : '#6B728018' }]}>
        <Ionicons name="person" size={20} color={item.is_active ? '#3B82F6' : '#6B7280'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.teacherText, { color: colors.foreground }]}>
          {item.teacher_id}
        </Text>
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          Class: {item.class_id}{item.section_id ? ` · Section: ${item.section_id}` : ''}
        </Text>
        {item.subject_config_id && (
          <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
            Subject Config: {item.subject_config_id}
          </Text>
        )}
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
          >
            <Ionicons
              name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
              size={20}
              color={item.is_active ? '#F59E0B' : '#10B981'}
            />
          </TouchableOpacity>
        )}
        {canRevoke && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleRevoke(item)}>
            <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
            <Text style={{ color: colors['muted-foreground'] }}>Loading permissions…</Text>
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
          <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => setGrantModalVisible(true)}>
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Grant Permission Modal */}
      <Modal visible={grantModalVisible} animationType="slide" transparent onRequestClose={() => setGrantModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Grant Mark Permission</Text>
                <TouchableOpacity onPress={() => setGrantModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Teacher / User ID *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.user_id}
                onChangeText={v => setForm(f => ({ ...f, user_id: v, teacher_id: v }))}
                placeholder="Paste teacher UUID"
                placeholderTextColor={colors['muted-foreground']}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Subject Config ID (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.subject_config_id ?? ''}
                onChangeText={v => setForm(f => ({ ...f, subject_config_id: v }))}
                placeholder="Leave blank for all subjects"
                placeholderTextColor={colors['muted-foreground']}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Class ID (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.class_id ?? ''}
                onChangeText={v => setForm(f => ({ ...f, class_id: v }))}
                placeholder="Leave blank for all classes"
                placeholderTextColor={colors['muted-foreground']}
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Section ID (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.section_id ?? ''}
                onChangeText={v => setForm(f => ({ ...f, section_id: v }))}
                placeholder="Leave blank for all sections"
                placeholderTextColor={colors['muted-foreground']}
                autoCapitalize="none"
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
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
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
  rightActions: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  iconBtn: { padding: 4 },
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
