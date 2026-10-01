import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout, ScreenAccessGate } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { expenseSettingsApi } from '@/src/api/expense';
import { ExpenseSettings } from '@/src/types/expense';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

const formatSettingAmount = (value: unknown) =>
  value === undefined || value === null || value === '' || Number.isNaN(Number(value))
    ? 'Not set'
    : `₹${Number(value).toLocaleString('en-IN')}`;

const formatApproval = (value: unknown) => {
  if (value === undefined || value === null) return 'Not set';
  return value === true || String(value).toLowerCase() === 'true' ? 'Required' : 'Not required';
};

function ExpenseSettingsScreenContent() {
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  const [editItem, setEditItem] = useState<ExpenseSettings | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const canUpdate = hasPermission?.('expense_settings', 'update');

  const [refreshing, setRefreshing] = useState(false);

  const { data: settings = [], isLoading, refetch } = useQuery({
    queryKey: ['expense-settings'],
    queryFn: () => expenseSettingsApi.getSettings(),
  });

  const { data: common, refetch: refetchCommon } = useQuery({
    queryKey: ['expense-settings-common'],
    queryFn: () => expenseSettingsApi.getCommonSettings(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseSettings> }) =>
      expenseSettingsApi.updateSetting(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expense-settings'] });
      qc.invalidateQueries({ queryKey: ['expense-settings-common'] });
      closeModal();
      showSuccess('Saved', 'Setting updated.');
    },
    onError: () => showError('Error', 'Failed to update setting.'),
  });

  const openEdit = (item: ExpenseSettings) => {
    setEditItem(item);
    setEditValue(item.value);
    setEditDesc(item.description ?? '');
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditItem(null); };

  const handleSave = () => {
    if (!editItem) return;
    updateMutation.mutate({ id: editItem.id, data: { value: editValue, description: editDesc } });
  };

  // Group settings by category
  const grouped: Record<string, ExpenseSettings[]> = {};
  for (const s of settings) {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  }

  if (isLoading) {
    return (
      <AppLayout title="Expense Settings">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Expense Settings">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#556ee6"
            onRefresh={async () => {
              setRefreshing(true);
              try { await Promise.all([refetch(), refetchCommon()]); } finally { setRefreshing(false); }
            }}
          />
        }
      >

        {/* Common settings summary card */}
        {common && (
          <View style={[styles.summaryCard, { backgroundColor: '#556ee6' }]}>
            <Text style={styles.summaryTitle}>Common Settings</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Default Approval</Text>
                <Text style={styles.summaryValue}>{formatApproval(common.settings?.default_approval_required?.value)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Auto-Approval Limit</Text>
                <Text style={styles.summaryValue}>{formatSettingAmount(common.settings?.auto_approval_limit?.value)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Receipts Required Over</Text>
                <Text style={styles.summaryValue}>{formatSettingAmount(common.settings?.require_receipts_over_amount?.value)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Grouped settings */}
        {Object.entries(grouped).map(([category, items]) => (
          <View key={category} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.foreground }]}>
              {category.replace(/_/g, ' ').toUpperCase()}
            </Text>
            {items.map(item => (
              <View key={item.id} style={[styles.settingRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingKey, { color: colors.foreground }]}>
                    {item.key.replace(/_/g, ' ')}
                  </Text>
                  {item.description ? (
                    <Text style={[styles.settingDesc, { color: colors['muted-foreground'] }]}>{item.description}</Text>
                  ) : null}
                  <Text style={[styles.settingValue, { color: '#556ee6' }]}>{item.value}</Text>
                </View>
                <View style={styles.rowRight}>
                  <View style={[styles.activeDot, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]} />
                  {canUpdate && (
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.editBtn}
              accessibilityLabel="Edit">
                      <Ionicons name="create-outline" size={18} color="#556ee6" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {settings.length === 0 && !isLoading && (
          <View style={styles.emptyView}>
            <Ionicons name="settings-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No settings configured</Text>
          </View>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Edit: {editItem?.key.replace(/_/g, ' ')}
              </Text>
              <TouchableOpacity onPress={closeModal}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Value</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Setting value"
              placeholderTextColor={colors['muted-foreground']}
            />

            <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Optional description"
              placeholderTextColor={colors['muted-foreground']}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { opacity: updateMutation.isPending ? 0.5 : 1 }]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppLayout>
  );
}

// Screen-level access control — matches sibling expense/categories.tsx.
// Web parity: the entire Expense module is off-limits to the student role.
export default function ExpenseSettingsScreen() {
  return (
    <ScreenAccessGate
      title="Expense Settings"
      resources={['expense_settings']}
      blockRoles={['student']}
    >
      <ExpenseSettingsScreenContent />
    </ScreenAccessGate>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  summaryCard: { borderRadius: 16, padding: 18, marginBottom: 16 },
  summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  summaryItem: { minWidth: '45%' },
  summaryLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  summaryValue: { color: 'white', fontSize: 15, fontWeight: '700', marginTop: 2 },
  group: { marginBottom: 16 },
  groupTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    padding: 12, marginBottom: 6,
  },
  settingKey: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  settingDesc: { fontSize: 12, marginTop: 2 },
  settingValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  editBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emptyView: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, marginBottom: 4 },
  saveBtn: {
    backgroundColor: '#556ee6', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
