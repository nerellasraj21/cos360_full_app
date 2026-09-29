import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear, useAuth } from '@/contexts';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import { FeeCategoryResponse, FeeTypeResponse, feeTermsApi, feeTypesApi } from '@/src/api/fees';
import {
  useFeeCategories,
  useCreateFeeCategory,
  useUpdateFeeCategory,
  useDeleteFeeCategory,
  useFeeCategoryTypes,
} from '@/hooks/use-fee-permissions';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard,
  DeletePermissionGuard,
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Category card with expandable fee types ─────────────────────────────────

function CategoryCard({
  item,
  index,
  colors,
  onEdit,
  onDelete,
  onAddType,
}: {
  item: FeeCategoryResponse;
  index: number;
  colors: any;
  onEdit: (cat: FeeCategoryResponse) => void;
  onDelete: (cat: FeeCategoryResponse) => void;
  onAddType: (cat: FeeCategoryResponse) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: feeTypes = [], isLoading: typesLoading } = useFeeCategoryTypes(item.id, expanded);

  const isActive = item.category_status?.toLowerCase() === 'active';
  const badgeColor = isActive ? '#16A34A' : '#6B7280';

  return (
    <ThemedView style={[styles.categoryCard, { backgroundColor: colors.card }]}>
      {/* Main row — tap to expand */}
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.75}>
        <View style={styles.cardLeft}>
          <ThemedText style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</ThemedText>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={15}
            color={colors['muted-foreground']}
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <ThemedText style={[styles.categoryName, { color: colors.foreground }]} numberOfLines={1}>
              {item.category_name}
            </ThemedText>
            <View style={styles.badgeRow}>
              <View style={[styles.statusBadge, { backgroundColor: badgeColor + '22' }]}>
                <ThemedText style={[styles.statusBadgeText, { color: badgeColor }]}>
                  {isActive ? 'Active' : 'Inactive'}
                </ThemedText>
              </View>
              {expanded && (
                <ThemedText style={[styles.typeCount, { color: colors['muted-foreground'] }]}>
                  {typesLoading ? 'loading...' : `${feeTypes.length} fee type${feeTypes.length !== 1 ? 's' : ''}`}
                </ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={(e) => { e.stopPropagation?.(); onAddType(item); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Add"
            >
              <Ionicons name="add" size={16} color={colors.primary} />
            </TouchableOpacity>
          </CreatePermissionGuard>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={(e) => { e.stopPropagation?.(); onEdit(item); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Edit"
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF444422' }]}
              onPress={(e) => { e.stopPropagation?.(); onDelete(item); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Delete"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </TouchableOpacity>

      {/* Expanded fee types */}
      {expanded && (
        <View style={[styles.typesContainer, { borderTopColor: colors.border }]}>
          {typesLoading ? (
            <ThemedText style={[styles.typesMeta, { color: colors['muted-foreground'] }]}>Loading fee types...</ThemedText>
          ) : feeTypes.length === 0 ? (
            <ThemedText style={[styles.typesMeta, { color: colors['muted-foreground'] }]}>No fee types. Tap + to add one.</ThemedText>
          ) : (
            feeTypes.map((ft: FeeTypeResponse) => {
              const ftActive = ft.fee_status?.toLowerCase() === 'active';
              const termLabel = ft.fee_term_name && ft.fee_term_name !== ft.fee_term_id
                ? `Term: ${ft.fee_term_name}`
                : null;
              return (
                <View key={ft.id} style={[styles.typeRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ThemedText style={[styles.typeName, { color: colors.foreground }]}>{ft.type_name}</ThemedText>
                    {termLabel ? (
                      <ThemedText style={[styles.termLabel, { color: colors['muted-foreground'] }]}>{termLabel}</ThemedText>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: (ftActive ? '#16A34A' : '#6B7280') + '22' }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: ftActive ? '#16A34A' : '#6B7280' }]}>
                      {ftActive ? 'Active' : 'Inactive'}
                    </ThemedText>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </ThemedView>
  );
}

// ─── Manage Fee Types modal ───────────────────────────────────────────────────

function ManageFeeTypesModal({
  category,
  colors,
  onClose,
  onAddType,
  onDeleteType,
}: {
  category: FeeCategoryResponse | null;
  colors: any;
  onClose: () => void;
  onAddType: () => void;
  onDeleteType: (id: string) => void;
}) {
  const { data: feeTypes = [], isLoading } = useFeeCategoryTypes(category?.id ?? '', !!category);

  return (
    <Modal
      visible={!!category}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView style={[styles.manageModalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.manageHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={[styles.manageTitle, { color: colors.foreground }]} numberOfLines={2}>
              Manage Fee Types - {category?.category_name}
            </ThemedText>
            <TouchableOpacity onPress={onClose}
              accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors['muted-foreground']} />
            </TouchableOpacity>
          </View>

          {/* Section header: "Fee Types" + "+ Add Fee Type" button */}
          <View style={styles.manageSectionRow}>
            <ThemedText style={[styles.manageSectionTitle, { color: colors.foreground }]}>Fee Types</ThemedText>
            <TouchableOpacity
              style={[styles.addFeeTypeBtn, { backgroundColor: colors.primary }]}
              onPress={onAddType}
            >
              <Ionicons name="add" size={14} color="white" />
              <ThemedText style={styles.addFeeTypeBtnText}>Add Fee Type</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Fee types list */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
            {isLoading ? (
              <ThemedText style={{ color: colors['muted-foreground'], textAlign: 'center', paddingVertical: 24 }}>
                Loading...
              </ThemedText>
            ) : feeTypes.length === 0 ? (
              <ThemedText style={{ color: colors['muted-foreground'], textAlign: 'center', paddingVertical: 24 }}>
                No fee types yet. Tap "+ Add Fee Type" to create one.
              </ThemedText>
            ) : (
              feeTypes.map((ft: FeeTypeResponse) => {
                const ftActive = ft.fee_status?.toLowerCase() === 'active';
                const termLabel = ft.fee_term_name && ft.fee_term_name !== ft.fee_term_id
                  ? `Term: ${ft.fee_term_name}` : null;
                return (
                  <View
                    key={ft.id}
                    style={[styles.manageFeeTypeRow, { borderColor: colors.border, backgroundColor: colors.background }]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.manageFeeTypeName, { color: colors.foreground }]}>{ft.type_name}</ThemedText>
                      <View style={styles.manageTypeMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: (ftActive ? '#16A34A' : '#6B7280') + '22' }]}>
                          <ThemedText style={[styles.statusBadgeText, { color: ftActive ? '#16A34A' : '#6B7280' }]}>
                            {ftActive ? 'Active' : 'Inactive'}
                          </ThemedText>
                        </View>
                        {termLabel && (
                          <ThemedText style={[styles.termLabel, { color: colors['muted-foreground'] }]}>{termLabel}</ThemedText>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteTypeBtn}
                      onPress={() => onDeleteType(ft.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Delete"
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Close button */}
          <View style={[styles.manageFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.closeBtnFull, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <ThemedText style={{ fontWeight: '600', color: colors.foreground }}>Close</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

// Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee module,
// even via a deep link into a specific fee sub-screen.
export default function FeeCategoriesScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const isFeeBlocked = roleBlocksFees(role?.name?.toLowerCase());

  useEffect(() => {
    if (isFeeBlocked) router.replace('/(tabs)');
  }, [isFeeBlocked, router]);

  if (isFeeBlocked) return null;

  return <FeeCategoriesScreenContent />;
}

function FeeCategoriesScreenContent() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategoryResponse | null>(null);
  const [formData, setFormData] = useState({
    category_name: '',
    academic_year_id: '',
    category_status: 'active',
  });

  // Manage fee types state
  const [managingCategory, setManagingCategory] = useState<FeeCategoryResponse | null>(null);
  const [showAddTypeForm, setShowAddTypeForm] = useState(false);
  const [typeFormData, setTypeFormData] = useState({ type_name: '', fee_status: 'active', fee_term_id: '' });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { colors } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps: confirmModalProps } = useConfirmModal();

  const { data: categories = [], isLoading, error, hasPermission } = useFeeCategories();

  const createMutation = useCreateFeeCategory();
  const updateMutation = useUpdateFeeCategory();
  const deleteMutation = useDeleteFeeCategory();

  // Fee terms for the "Add Fee Type" dropdown
  const { data: feeTermsDropdown = [] } = useQuery({
    queryKey: ['feeTermsDropdown', activeAcademicYearId],
    queryFn: () => feeTermsApi.getFeeTermsDropdown(activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined),
  });

  const createFeeTypeMutation = useMutation({
    mutationFn: (data: { type_name: string; fee_status: string; fee_term_id: string; fee_category_id: string; academic_year_id: string }) =>
      feeTypesApi.createFeeType(data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes', 'by-category', vars.fee_category_id] });
      queryClient.invalidateQueries({ queryKey: ['feeTypes'] });
      showSuccess('Created', 'Fee type added successfully');
      setShowAddTypeForm(false);
      setTypeFormData({ type_name: '', fee_status: 'active', fee_term_id: '' });
    },
    onError: (err: any) => showError('Error', err?.message || 'Failed to create fee type'),
  });

  const deleteFeeTypeMutation = useMutation({
    mutationFn: (id: string) => feeTypesApi.deleteFeeType(id),
    onSuccess: (_data, _id) => {
      if (managingCategory) {
        queryClient.invalidateQueries({ queryKey: ['feeTypes', 'by-category', managingCategory.id] });
        queryClient.invalidateQueries({ queryKey: ['feeTypes'] });
      }
      showSuccess('Deleted', 'Fee type deleted');
    },
    onError: (err: any) => showError('Error', err?.message || 'Failed to delete fee type'),
  });

  // Client-side filter
  const filtered = useMemo(() => {
    let list = categories as FeeCategoryResponse[];
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.category_status?.toLowerCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.category_name.toLowerCase().includes(q));
    }
    return list;
  }, [categories, statusFilter, searchQuery]);

  const resetForm = () => {
    setFormData({ category_name: '', academic_year_id: activeAcademicYearId || '', category_status: 'active' });
    setEditingCategory(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (category: FeeCategoryResponse) => {
    setEditingCategory(category);
    setFormData({
      category_name: category.category_name,
      academic_year_id: category.academic_year_id,
      category_status: category.category_status,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (category: FeeCategoryResponse) => {
    confirm({
      title: 'Delete Fee Category',
      message: `Delete "${category.category_name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        deleteMutation.mutate(category.id, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feeCategories'] });
            showSuccess('Deleted', 'Fee category deleted successfully');
          },
          onError: (err: any) =>
            showError('Delete Failed', err?.message || 'Cannot delete — it may have associated fee types'),
        });
      },
    });
  };

  const handleSubmit = () => {
    if (!formData.category_name.trim()) {
      showError('Error', 'Category name is required');
      return;
    }
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['feeCategories'] });
          setIsModalVisible(false);
          resetForm();
          showSuccess('Updated', 'Fee category updated successfully');
        },
        onError: () => showError('Error', 'Failed to update fee category'),
      });
    } else {
      createMutation.mutate({
        category_name: formData.category_name,
        academic_year_id: activeAcademicYearId || formData.academic_year_id,
        category_status: formData.category_status,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['feeCategories'] });
          setIsModalVisible(false);
          resetForm();
          showSuccess('Created', 'Fee category created successfully');
        },
        onError: () => showError('Error', 'Failed to create fee category'),
      });
    }
  };

  const handleAddFeeType = () => {
    if (!typeFormData.type_name.trim()) { showError('Error', 'Fee type name is required'); return; }
    if (!typeFormData.fee_term_id) { showError('Error', 'Please select a fee term'); return; }
    createFeeTypeMutation.mutate({
      type_name: typeFormData.type_name.trim(),
      fee_status: typeFormData.fee_status,
      fee_term_id: typeFormData.fee_term_id,
      fee_category_id: managingCategory!.id,
      academic_year_id: activeAcademicYearId || managingCategory!.academic_year_id,
    });
  };

  if (!hasPermission) {
    return (
      <AppLayout title="Fee Categories">
        <View style={styles.center}>
          <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
          <ThemedText style={{ color: colors['muted-foreground'], textAlign: 'center', marginTop: 16 }}>
            You don&apos;t have permission to access fee categories
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Fee Categories">
        <View style={styles.center}>
          <ThemedText style={{ color: colors['muted-foreground'] }}>Loading fee categories...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Categories">
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
          <ThemedText style={{ color: '#EF4444', marginTop: 8 }}>Error loading fee categories</ThemedText>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['feeCategories'] })}
          >
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const totalCount = (categories as FeeCategoryResponse[]).length;

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
      <AppLayout title="Fee Categories">
        <View style={styles.container}>

          {/* Filter bar */}
          <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="filter" size={14} color={colors['muted-foreground']} />
            <ThemedText style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Filters</ThemedText>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={13} color={colors['muted-foreground']} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search categories..."
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
            <View style={styles.statusPickerWrap}>
              <CustomDropdown
                data={[
                  { label: 'All Status', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ]}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
                placeholder="All Status"
                containerStyle={styles.statusPickerContainer}
                style={{ ...styles.statusPickerBox, backgroundColor: colors.card, borderColor: colors.border }}
                placeholderStyle={{ ...styles.statusPickerText, color: colors['muted-foreground'] }}
                selectedTextStyle={{ ...styles.statusPickerText, color: colors.foreground }}
                iconStyle={styles.statusPickerIcon}
              />
            </View>
          </View>

          {/* Count + Add button */}
          <View style={styles.countRow}>
            <ThemedText style={[styles.countText, { color: colors['muted-foreground'] }]}>
              Showing {filtered.length} of {totalCount} {totalCount === 1 ? 'category' : 'categories'}
            </ThemedText>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Ionicons name="add" size={16} color="white" />
                <ThemedText style={styles.addButtonText}>Add Category</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
            {filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-outline" size={48} color={colors['muted-foreground']} />
                <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  {searchQuery || statusFilter !== 'all' ? 'No matching categories' : 'No fee categories found'}
                </ThemedText>
              </View>
            ) : (
              filtered.map((item, index) => (
                <CategoryCard
                  key={item.id}
                  item={item}
                  index={index}
                  colors={colors}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAddType={(cat) => {
                    setManagingCategory(cat);
                    setShowAddTypeForm(false);
                    setTypeFormData({ type_name: '', fee_status: 'active', fee_term_id: '' });
                  }}
                />
              ))
            )}
          </ScrollView>

          {/* Add / Edit category modal */}
          <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">
                    {editingCategory ? 'Edit Fee Category' : 'Add Fee Category'}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <ThemedText style={styles.label}>Category Name *</ThemedText>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.border,
                    }]}
                    value={formData.category_name}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, category_name: text }))}
                    placeholder="Enter category name"
                    placeholderTextColor={colors['muted-foreground']}
                  />

                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          category_status: prev.category_status === 'active' ? 'inactive' : 'active',
                        }))
                      }
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: formData.category_status === 'active' }}
                    >
                      <Ionicons
                        name={formData.category_status === 'active' ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                    <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
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
                        : editingCategory ? 'Update' : 'Save'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </View>
          </Modal>

          {/* Manage Fee Types modal */}
          <ManageFeeTypesModal
            category={managingCategory}
            colors={colors}
            onClose={() => setManagingCategory(null)}
            onAddType={() => {
              setTypeFormData({ type_name: '', fee_status: 'active', fee_term_id: '' });
              setShowAddTypeForm(true);
            }}
            onDeleteType={(id) => {
              confirm({
                title: 'Delete Fee Type',
                message: 'Are you sure you want to delete this fee type?',
                confirmLabel: 'Delete',
                destructive: true,
                onConfirm: () => deleteFeeTypeMutation.mutate(id),
              });
            }}
          />

          {/* Add Fee Type modal (opens on top of Manage modal) */}
          <Modal
            visible={showAddTypeForm}
            animationType="slide"
            transparent
            onRequestClose={() => setShowAddTypeForm(false)}
          >
            <View style={styles.modalOverlay}>
              <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ThemedText type="subtitle">Add Fee Type</ThemedText>
                    {managingCategory && (
                      <ThemedText style={[styles.modalSubtitle, { color: colors['muted-foreground'] }]}>
                        {managingCategory.category_name}
                      </ThemedText>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setShowAddTypeForm(false)}
              accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <ThemedText style={styles.label}>Fee Type Name *</ThemedText>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.border,
                    }]}
                    value={typeFormData.type_name}
                    onChangeText={(text) => setTypeFormData((prev) => ({ ...prev, type_name: text }))}
                    placeholder="Enter fee type name"
                    placeholderTextColor={colors['muted-foreground']}
                  />

                  <ThemedText style={styles.label}>Fee Term *</ThemedText>
                  <CustomDropdown
                    data={feeTermsDropdown.map((t) => ({ label: t.label, value: t.id }))}
                    value={typeFormData.fee_term_id}
                    onChange={(v) => setTypeFormData((prev) => ({ ...prev, fee_term_id: v as string }))}
                    placeholder="Select fee term"
                    mode="default"
                    maxHeight={220}
                  />

                  <ThemedText style={[styles.label, { marginTop: 16 }]}>Status</ThemedText>
                  <CustomDropdown
                    data={[
                      { label: 'Active', value: 'active' },
                      { label: 'Inactive', value: 'inactive' },
                    ]}
                    value={typeFormData.fee_status}
                    onChange={(v) => setTypeFormData((prev) => ({ ...prev, fee_status: v as string }))}
                    placeholder="Select status"
                    mode="default"
                    maxHeight={120}
                  />
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => setShowAddTypeForm(false)}
                  >
                    <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddFeeType}
                    disabled={createFeeTypeMutation.isPending}
                  >
                    <ThemedText style={styles.submitButtonText}>
                      {createFeeTypeMutation.isPending ? 'Adding...' : 'Add Fee Type'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
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

  // Filter bar
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
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  statusPickerWrap: { width: 120 },
  statusPickerContainer: { marginBottom: 0 },
  statusPickerBox: {
    height: 32,
    minHeight: 32,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  statusPickerText: { fontSize: 13 },
  statusPickerIcon: { width: 14, height: 14 },

  // Count row
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

  // List
  listContainer: { paddingHorizontal: 12, paddingBottom: 24 },

  // Category card
  categoryCard: {
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serialNo: { fontSize: 11, fontWeight: '600', width: 20, textAlign: 'center', marginRight: 2 },
  categoryName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  typeCount: { fontSize: 11 },
  actionButtons: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actionBtn: {
    padding: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded fee types
  typesContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typesMeta: { fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 6,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  typeName: { fontSize: 13, fontWeight: '500' },
  termLabel: { fontSize: 11, marginTop: 1 },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { marginTop: 12, textAlign: 'center', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 14,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  label: { marginBottom: 8, fontWeight: '600', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  checkbox: { marginRight: 8 },
  checkboxLabel: { fontSize: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 20 },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: 'white', fontWeight: '600' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },

  // Manage Fee Types modal
  manageModalContent: {
    width: '92%',
    maxWidth: 440,
    borderRadius: 14,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  manageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  manageTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  manageSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  manageSectionTitle: { fontSize: 14, fontWeight: '700' },
  addFeeTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addFeeTypeBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },
  manageFeeTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  manageFeeTypeName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  manageTypeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteTypeBtn: { padding: 4 },
  manageFooter: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  closeBtnFull: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
});
