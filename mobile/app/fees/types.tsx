import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear, useAuth } from '@/contexts';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import { FeeTypeResponse, FeeTypeRequest, feeTypesApi, feeCategoriesApi, feeTermsApi } from '@/src/api/fees';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard,
  DeletePermissionGuard,
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee module,
// even via a deep link into a specific fee sub-screen.
export default function FeeTypesScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const isFeeBlocked = roleBlocksFees(role?.name);

  useEffect(() => {
    if (isFeeBlocked) router.replace('/(tabs)');
  }, [isFeeBlocked, router]);

  if (isFeeBlocked) return null;

  return <FeeTypesScreenContent />;
}

function FeeTypesScreenContent() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<FeeTypeResponse | null>(null);
  const [formData, setFormData] = useState({
    type_name: '',
    fee_category_id: '',
    academic_year_id: '',
    fee_status: 'active',
    fee_term_id: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { colors } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps: confirmModalProps } = useConfirmModal();

  const { data: types = [], isLoading, error } = useQuery({
    queryKey: ['feeTypes'],
    queryFn: () => feeTypesApi.getFeeTypes(),
  });

  const { data: feeCategories = [] } = useQuery({
    queryKey: ['feeCategoriesDropdown'],
    queryFn: () => feeCategoriesApi.getFeeCategoriesDropdown(),
  });

  const { data: feeTerms = [] } = useQuery({
    queryKey: ['feeTermsDropdown', activeAcademicYearId],
    queryFn: () => feeTermsApi.getFeeTermsDropdown(activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: feeTypesApi.createFeeType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Created', 'Fee type created successfully');
    },
    onError: () => showError('Error', 'Failed to create fee type'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeTypeRequest> }) =>
      feeTypesApi.updateFeeType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Updated', 'Fee type updated successfully');
    },
    onError: () => showError('Error', 'Failed to update fee type'),
  });

  const deleteMutation = useMutation({
    mutationFn: feeTypesApi.deleteFeeType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes'] });
      showSuccess('Deleted', 'Fee type deleted successfully');
    },
    onError: () => showError('Error', 'Failed to delete fee type'),
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return types as FeeTypeResponse[];
    const q = searchQuery.toLowerCase();
    return (types as FeeTypeResponse[]).filter(
      (t) =>
        t.type_name.toLowerCase().includes(q) ||
        (t.fee_category_name ?? '').toLowerCase().includes(q) ||
        (t.fee_term_name ?? '').toLowerCase().includes(q)
    );
  }, [types, searchQuery]);

  const resetForm = () => {
    setFormData({ type_name: '', fee_category_id: '', academic_year_id: activeAcademicYearId || '', fee_status: 'active', fee_term_id: '' });
    setEditingType(null);
  };

  const handleCreate = () => { resetForm(); setIsModalVisible(true); };

  const handleEdit = (type: FeeTypeResponse) => {
    setEditingType(type);
    setFormData({
      type_name: type.type_name,
      fee_category_id: type.fee_category_id,
      academic_year_id: type.academic_year_id,
      fee_status: type.fee_status,
      fee_term_id: type.fee_term_id,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (type: FeeTypeResponse) => {
    confirm({
      title: 'Delete Fee Type',
      message: `Delete "${type.type_name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(type.id),
    });
  };

  const handleSubmit = () => {
    if (!formData.type_name.trim()) { showError('Error', 'Type name is required'); return; }
    if (!formData.fee_category_id) { showError('Error', 'Fee category is required'); return; }
    if (!formData.fee_term_id) { showError('Error', 'Fee term is required'); return; }
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: formData });
    } else {
      createMutation.mutate({ ...formData, academic_year_id: activeAcademicYearId || formData.academic_year_id });
    }
  };

  const getTermDisplay = (type: FeeTypeResponse) => {
    if (!type.fee_term_name) return null;
    if (type.fee_term_name === type.fee_term_id) return 'Installment 1';
    return type.fee_term_name;
  };

  if (isLoading) {
    return (
      <AppLayout title="Fee Types">
        <View style={styles.center}>
          <ThemedText style={{ color: colors['muted-foreground'] }}>Loading fee types...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Types">
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <ThemedText style={{ color: '#EF4444', marginTop: 8 }}>Failed to load fee types</ThemedText>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['feeTypes'] })}
          >
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const totalCount = (types as FeeTypeResponse[]).length;

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
      <AppLayout title="Fee Types">
        <View style={styles.container}>

          {/* Filter bar */}
          <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="filter" size={14} color={colors['muted-foreground']} />
            <ThemedText style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Filters</ThemedText>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={13} color={colors['muted-foreground']} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search by name, category or term..."
                placeholderTextColor={colors['muted-foreground']}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
                  <Ionicons name="close-circle" size={14} color={colors['muted-foreground']} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Count + Add button row */}
          <View style={styles.countRow}>
            <ThemedText style={[styles.countText, { color: colors['muted-foreground'] }]}>
              {searchQuery.trim()
                ? `${filtered.length} of ${totalCount} types`
                : `Showing ${totalCount} ${totalCount === 1 ? 'type' : 'types'}`}
            </ThemedText>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={handleCreate}>
                <Ionicons name="add" size={16} color="white" />
                <ThemedText style={styles.addButtonText}>Add New Type</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* Card list */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
            {filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="list-outline" size={48} color={colors['muted-foreground']} />
                <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  {searchQuery ? 'No types match your search' : 'No fee types found'}
                </ThemedText>
              </View>
            ) : (
              filtered.map((item, index) => {
                const isActive = item.fee_status?.toLowerCase() === 'active';
                const badgeColor = isActive ? '#16A34A' : '#6B7280';
                const termDisplay = getTermDisplay(item);
                return (
                  <View key={item.id} style={[styles.card, { backgroundColor: colors.card }]}>
                    <View style={styles.cardMain}>
                      <ThemedText style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</ThemedText>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.typeName, { color: colors.foreground }]} numberOfLines={1}>
                          {item.type_name}
                        </ThemedText>
                        <View style={styles.metaRow}>
                          <View style={[styles.statusBadge, { backgroundColor: badgeColor + '22' }]}>
                            <ThemedText style={[styles.statusText, { color: badgeColor }]}>
                              {isActive ? 'Active' : 'Inactive'}
                            </ThemedText>
                          </View>
                          {item.fee_category_name ? (
                            <ThemedText style={[styles.metaText, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                              {item.fee_category_name}
                            </ThemedText>
                          ) : null}
                          {termDisplay ? (
                            <ThemedText style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                              · {termDisplay}
                            </ThemedText>
                          ) : null}
                        </View>
                      </View>

                      <View style={styles.actionButtons}>
                        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]}
                            onPress={() => handleEdit(item)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Edit"
                          >
                            <Ionicons name="create-outline" size={16} color={colors.primary} />
                          </TouchableOpacity>
                        </UpdatePermissionGuard>
                        <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#EF444422' }]}
                            onPress={() => handleDelete(item)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            accessibilityLabel="Delete"
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </DeletePermissionGuard>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Add / Edit modal */}
          <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">
                    {editingType ? 'Edit Fee Type' : 'Add Fee Type'}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <ThemedText style={styles.label}>Type Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    value={formData.type_name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, type_name: text }))}
                    placeholder="e.g., Tuition Fee, Transport Fee"
                    placeholderTextColor={colors['muted-foreground']}
                  />

                  <ThemedText style={styles.label}>Fee Category *</ThemedText>
                  <CustomDropdown
                    data={feeCategories.map((cat) => ({ label: cat.label, value: cat.id }))}
                    value={formData.fee_category_id}
                    onChange={(v) => setFormData((prev) => ({ ...prev, fee_category_id: v as string }))}
                    placeholder="Select fee category"
                    maxHeight={260}
                  />

                  <ThemedText style={styles.label}>Fee Term *</ThemedText>
                  <CustomDropdown
                    data={feeTerms.map((t) => ({ label: t.label, value: t.id }))}
                    value={formData.fee_term_id}
                    onChange={(v) => setFormData((prev) => ({ ...prev, fee_term_id: v as string }))}
                    placeholder="Select fee term"
                    maxHeight={260}
                  />

                  <View style={styles.toggleRow}>
                    <Switch
                      value={formData.fee_status === 'active'}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, fee_status: val ? 'active' : 'inactive' }))
                      }
                      trackColor={{ false: '#D1D5DB', true: colors.primary }}
                      thumbColor="white"
                    />
                    <ThemedText style={[styles.toggleLabel, { color: colors.foreground }]}>
                      {formData.fee_status === 'active' ? 'Active' : 'Inactive'}
                    </ThemedText>
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <ThemedText style={styles.submitButtonText}>
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Saving...'
                        : editingType ? 'Update Type' : 'Create Type'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <ConfirmModal {...confirmModalProps} />
        </View>
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  searchBox: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  countText: { fontSize: 12 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  addButtonText: { color: 'white', fontSize: 13, fontWeight: '600' },

  listContainer: { paddingHorizontal: 12, paddingBottom: 24 },

  card: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  serialNo: { fontSize: 11, fontWeight: '600', width: 22 },
  typeName: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  metaText: { fontSize: 12 },

  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  actionBtn: { padding: 7, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12, textAlign: 'center', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', maxWidth: 420, borderRadius: 14, padding: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { marginBottom: 8, fontWeight: '600', fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 15 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  submitButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: 'white', fontWeight: '600' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  toggleLabel: { fontSize: 15, fontWeight: '500' },
});
