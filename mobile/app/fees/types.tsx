import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import CustomDropdown from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAcademicYear } from '@/contexts';
import { FeeTypeResponse, FeeTypeRequest, feeTypesApi, feeCategoriesApi, feeTermsApi } from '@/src/api/fees';
import { 
  ReadOrListPermissionGuard, 
  CreatePermissionGuard, 
  UpdatePermissionGuard, 
  DeletePermissionGuard 
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';


export default function FeeTypesScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingType, setEditingType] = useState<FeeTypeResponse | null>(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState<FeeTypeResponse | null>(null);
    const [formData, setFormData] = useState({
     type_name: '',
     fee_category_id: '',
     academic_year_id: '',
     fee_status: 'active',
     fee_term_id: '',
   });

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const { activeAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

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
      showSuccess('Type Created', 'Fee type created successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to create fee type');
      console.error('Create error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeTypeRequest> }) =>
      feeTypesApi.updateFeeType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Type Updated', 'Fee type updated successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to update fee type');
      console.error('Update error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: feeTypesApi.deleteFeeType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTypes'] });
      showSuccess('Type Deleted', 'Fee type deleted successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to delete fee type');
      console.error('Delete error:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      type_name: '',
      fee_category_id: '',
      academic_year_id: activeAcademicYearId || '',
      fee_status: 'active',
      fee_term_id: '',
    });
    setEditingType(null);
  };

  const handleCreate = () => {
    setEditingType(null);
    resetForm();
    setIsModalVisible(true);
  };

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
    setTypeToDelete(type);
    setIsDeleteModalVisible(true);
  };

  const handleSubmit = () => {
    if (!formData.type_name.trim()) {
      showError('Error', 'Type name is required');
      return;
    }

    if (!formData.fee_category_id) {
      showError('Error', 'Fee category is required');
      return;
    }

    if (!formData.fee_term_id) {
      showError('Error', 'Fee term is required');
      return;
    }

    if (editingType) {
      updateMutation.mutate({
        id: editingType.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderTypeItem = ({ item }: { item: FeeTypeResponse }) => {
    const firstFeeTermDate = item.fee_term_dates?.[0]?.fee_term_date;
    const parsedDate = firstFeeTermDate ? new Date(firstFeeTermDate) : null;
    return (
      <ThemedView style={[styles.typeCard, { backgroundColor: colors.card }]}>
        <View style={styles.typeInfo}>
          <ThemedText type="subtitle" style={styles.typeName}>
            {item.type_name}
          </ThemedText>
          <ThemedText style={[styles.typeDetails, { color: colors['muted-foreground'] }]}>
            Status: {item.fee_status === 'active' ? 'Active' : 'Inactive'}
          </ThemedText>
          <ThemedText style={[styles.typeDate, { color: colors['muted-foreground'] }]}>
            Term Date: {parsedDate ? parsedDate.toLocaleDateString() : 'N/A'}
          </ThemedText>
        </View>

        <View style={styles.actionButtons}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>

          <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.destructive }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </ThemedView>
    );
  };


  if (isLoading) {
    return (
      <AppLayout title="Fee Types">
        <View style={styles.centerContainer}>
          <ThemedText>Loading fee types...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Types">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading fee types
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
      <AppLayout title="Fee Types">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TYPES}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
            >
              <Ionicons name="add" size={20} color="white" />
              <ThemedText style={styles.addButtonText}>Add Type</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

      <FlatList
        data={types}
        keyExtractor={(item) => item.id}
        renderItem={renderTypeItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No fee types found
            </ThemedText>
          </ThemedView>
        }
      />

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                {editingType ? 'Edit Fee Type' : 'Add Fee Type'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <ThemedText style={styles.label}>Type Name *</ThemedText>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                }]}
                value={formData.type_name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, type_name: text }))}
                placeholder="Enter type name"
                placeholderTextColor={colors['muted-foreground']}
              />

              <ThemedText style={styles.label}>Fee Category *</ThemedText>
              <CustomDropdown
                data={feeCategories.map(cat => ({ label: cat.label, value: cat.id }))}
                value={formData.fee_category_id}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, fee_category_id: value as string }));
                }}
                placeholder="Select fee category"
              />

              <ThemedText style={styles.label}>Fee Term *</ThemedText>
              <CustomDropdown
                data={feeTerms.map(term => ({ label: term.label, value: term.id }))}
                value={formData.fee_term_id}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, fee_term_id: value as string }));
                }}
                placeholder="Select fee term"
              />

              <ThemedText style={styles.label}>Status</ThemedText>
              <TouchableOpacity
                style={[styles.toggleButton, { backgroundColor: formData.fee_status === 'active' ? colors.primary : colors.destructive }]}
                onPress={() => setFormData(prev => ({ ...prev, fee_status: prev.fee_status === 'active' ? 'inactive' : 'active' }))}
              >
                <ThemedText style={styles.toggleButtonText}>
                  {formData.fee_status === 'active' ? 'Active' : 'Inactive'}
                </ThemedText>
              </TouchableOpacity>
            </View>

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
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
                   editingType ? 'Update' : 'Create'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      <Modal
        visible={isDeleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.confirmationModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Delete Fee Type</ThemedText>
            </View>

            <View style={styles.confirmationMessage}>
              <ThemedText>Are you sure you want to delete "{typeToDelete?.type_name}"?</ThemedText>
              <ThemedText style={{ color: colors['muted-foreground'], marginTop: 8 }}>This action cannot be undone.</ThemedText>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setIsDeleteModalVisible(false);
                  setTypeToDelete(null);
                }}
              >
                <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.destructive }]}
                onPress={() => {
                  if (typeToDelete) {
                    deleteMutation.mutate(typeToDelete.id);
                  }
                  setIsDeleteModalVisible(false);
                  setTypeToDelete(null);
                }}
              >
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
      </ThemedView>
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  typeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    marginBottom: 4,
  },
  typeDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  typeDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
    zIndex: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  toggleButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  confirmationModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  confirmationMessage: {
    marginBottom: 20,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});