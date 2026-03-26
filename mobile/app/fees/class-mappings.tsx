import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import CustomDropdown from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FeeClassMappingResponse, FeeClassMappingRequest, FeeClassMappingBulkRequest, feeClassMappingsApi, FeeTypeResponse, feeTypesApi, getFeeTermsByFeeType } from '@/src/api/fees';
import { classSectionsApi } from '@/src/api/masters';
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
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';


export default function FeeClassMappingsScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FeeClassMappingResponse | null>(null);
  const [formData, setFormData] = useState({
    class_id: '',
    fee_type_id: '',
    total_fee: 0,
    all_by_default: false,
    term_amounts: [] as { fee_term_date_id: string; amount: number }[],
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Bulk functionality state
  const [selectedMappings, setSelectedMappings] = useState<string[]>([]);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    class_ids: [] as string[],
    fee_type_id: '',
    total_fee: 0,
    all_by_default: false,
  });

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const queryClient = useQueryClient();
  const { activeAcademicYearId } = useAcademicYear();
  const { showSuccess, showError } = useToastContext();

  const { data: mappings = [], isLoading, error } = useQuery({
    queryKey: ['feeClassMappings', activeAcademicYearId],
    queryFn: () => feeClassMappingsApi.getFeeClassMappings(activeAcademicYearId ?? undefined),
  });

  const { data: types = [] } = useQuery({
    queryKey: ['feeTypes'],
    queryFn: () => feeTypesApi.getFeeTypes(),
  });

  const { data: selectedFeeTerms } = useQuery({
    queryKey: ['feeTermsByType', formData.fee_type_id],
    queryFn: () => getFeeTermsByFeeType(formData.fee_type_id),
    enabled: !!formData.fee_type_id,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classSections'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: true }),
  });

  // Calculate total fee from term amounts
  React.useEffect(() => {
    const sum = formData.term_amounts.reduce((acc, ta) => acc + ta.amount, 0);
    if (sum > 0 && sum !== formData.total_fee) {
      setFormData(prev => ({ ...prev, total_fee: sum }));
    }
  }, [formData.term_amounts]);

  const createMutation = useMutation({
    mutationFn: feeClassMappingsApi.createFeeClassMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      setIsModalVisible(false);
      resetForm();
      setErrors({});
      showSuccess('Mapping Created', 'Fee class mapping created successfully');
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      if (error.response?.data?.field_errors) {
        setErrors(error.response.data.field_errors);
      } else {
        showError('Error', error.response?.data?.detail || 'Failed to create fee class mapping');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeClassMappingRequest> }) =>
      feeClassMappingsApi.updateFeeClassMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      setIsModalVisible(false);
      resetForm();
      setErrors({});
      showSuccess('Mapping Updated', 'Fee class mapping updated successfully');
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      if (error.response?.data?.field_errors) {
        setErrors(error.response.data.field_errors);
      } else {
        showError('Error', error.response?.data?.detail || 'Failed to update fee class mapping');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: feeClassMappingsApi.deleteFeeClassMapping,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      showSuccess('Mapping Deleted', 'Fee class mapping deleted successfully');
    },
    onError: () => {
      showError('Error', 'Failed to delete fee class mapping');
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: feeClassMappingsApi.bulkCreateFeeClassMappings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
      setIsBulkModalVisible(false);
      setBulkFormData({
        class_ids: [],
        fee_type_id: '',
        total_fee: 0,
        all_by_default: false,
      });
      showSuccess('Bulk Mappings Created', 'Bulk fee class mappings created successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to create bulk fee class mappings');
      console.error('Bulk create error:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      class_id: '',
      fee_type_id: '',
      total_fee: 0,
      all_by_default: false,
      term_amounts: [],
    });
    setEditingMapping(null);
  };

  const handleCreate = () => {
    setEditingMapping(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (mapping: FeeClassMappingResponse) => {
    setEditingMapping(mapping);
    setFormData({
      class_id: mapping.class_id,
      fee_type_id: mapping.fee_type_id,
      total_fee: parseFloat(mapping.total_fee || '0') || 0,
      all_by_default: mapping.all_by_default ?? false,
      term_amounts: mapping.term_amounts || [],
    });
    setIsModalVisible(true);
  };

  const handleDelete = (mapping: FeeClassMappingResponse) => {
    Alert.alert(
      'Delete Class Mapping',
      `Are you sure you want to delete the mapping for Class ${mapping.class_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(mapping.id) },
      ]
    );
  };

  const handleSubmit = () => {
    setErrors({});

    if (!formData.class_id) {
      setErrors({ class_id: 'Class is required' });
      return;
    }
    if (!formData.fee_type_id) {
      setErrors({ fee_type_id: 'Fee type is required' });
      return;
    }
    if (formData.total_fee <= 0) {
      setErrors({ total_fee: 'Total fee must be greater than 0' });
      return;
    }
    if (!activeAcademicYearId) {
      Alert.alert('Error', 'No active academic year selected');
      return;
    }

    if (editingMapping) {
      updateMutation.mutate({
        id: editingMapping.id,
        data: {
          ...formData,
          academic_year_id: activeAcademicYearId!,
        },
      });
    } else {
      createMutation.mutate({
        academic_year_id: activeAcademicYearId!,
        all_by_default: formData.all_by_default,
        class_id: formData.class_id,
        fee_type_id: formData.fee_type_id,
        total_fee: formData.total_fee,
        term_amounts: formData.term_amounts,
      });
    }
  };

  const handleBulkSubmit = () => {
    if (bulkFormData.class_ids.length === 0) {
      Alert.alert('Error', 'At least one class is required');
      return;
    }
    if (!bulkFormData.fee_type_id) {
      Alert.alert('Error', 'Fee type is required');
      return;
    }
    if (!activeAcademicYearId) {
      Alert.alert('Error', 'No active academic year selected');
      return;
    }
    if (bulkFormData.total_fee <= 0) {
      Alert.alert('Error', 'Total fee must be greater than 0');
      return;
    }

    // For now, we'll create individual mappings since the bulk API structure is different
    // This is a simplified implementation
    bulkFormData.class_ids.forEach(classId => {
      createMutation.mutate({
        fee_type_id: bulkFormData.fee_type_id,
        class_id: classId,
        academic_year_id: activeAcademicYearId!,
        total_fee: bulkFormData.total_fee,
        all_by_default: bulkFormData.all_by_default,
      });
    });

    setIsBulkModalVisible(false);
    setBulkFormData({
      class_ids: [],
      fee_type_id: '',
      total_fee: 0,
      all_by_default: false,
    });
  };


  const renderMappingItem = ({ item }: { item: FeeClassMappingResponse }) => (
    <ThemedView style={[styles.mappingCard, { backgroundColor: colors.card }]}>
      <View style={styles.mappingInfo}>
        <ThemedText type="subtitle" style={styles.mappingTitle}>
          Class {item.class_name} - Type {item.fee_type_name}
        </ThemedText>
        <ThemedText style={[styles.mappingDetails, { color: colors['muted-foreground'] }]}>
          Total Fee: {item.total_fee} | All by Default: {item.all_by_default ? 'Yes' : 'No'}
        </ThemedText>
        <ThemedText style={[styles.mappingDate, { color: colors['muted-foreground'] }]}>
          Created: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
        </ThemedText>
      </View>

      <View style={styles.actionButtons}>
        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
        </UpdatePermissionGuard>

        <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS}>
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

  const classOptions = classes.map(c => ({ label: c.name, value: c.id }));

  const typeOptions = types.map(type => ({
    label: type.type_name,
    value: type.id,
  }));

  if (isLoading) {
    return (
      <AppLayout title="Class Mappings">
        <View style={styles.centerContainer}>
          <ThemedText>Loading fee class mappings...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Class Mappings">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading fee class mappings
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS}>
      <AppLayout title="Class Mappings">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS}>
            <TouchableOpacity
              style={[styles.bulkButton, { backgroundColor: colors.secondary }]}
              onPress={() => setIsBulkModalVisible(true)}
            >
              <Ionicons name="layers-outline" size={16} color="white" />
              <ThemedText style={[styles.bulkButtonText, { color: 'white' }]}>Bulk Add</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

      {selectedMappings.length > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: colors.accent }]}>
          <ThemedText style={styles.selectionText}>
            {selectedMappings.length} selected
          </ThemedText>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: colors.destructive }]}
            onPress={() => setSelectedMappings([])}
          >
            <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={mappings}
        keyExtractor={(item) => item.id}
        renderItem={renderMappingItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No fee class mappings found
            </ThemedText>
          </ThemedView>
        }
      />

      {/* Single Mapping Modal */}
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
                {editingMapping ? 'Edit Class Mapping' : 'Add Class Mapping'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.form}>
                <ThemedText style={styles.label}>Class *</ThemedText>
                <CustomDropdown
                  data={classOptions}
                  value={formData.class_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, class_id: value as string }))}
                  placeholder="Select class"
                />
                {errors.class_id && <ThemedText style={[styles.errorText, { color: colors.destructive }]}>{errors.class_id}</ThemedText>}

                <ThemedText style={styles.label}>Fee Type *</ThemedText>
                <CustomDropdown
                  data={typeOptions}
                  value={formData.fee_type_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, fee_type_id: value as string, term_amounts: [] }))}
                  placeholder="Select fee type"
                />
                {errors.fee_type_id && <ThemedText style={[styles.errorText, { color: colors.destructive }]}>{errors.fee_type_id}</ThemedText>}

                <ThemedText style={styles.label}>Total Fee *</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  value={formData.total_fee.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setFormData(prev => ({ ...prev, total_fee: num }));
                  }}
                  placeholder="Enter total fee"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                />
                {errors.total_fee && <ThemedText style={[styles.errorText, { color: colors.destructive }]}>{errors.total_fee}</ThemedText>}

                {selectedFeeTerms && selectedFeeTerms.fee_term_dates.length > 0 && (
                  <View>
                    <ThemedText style={styles.label}>Term Amounts</ThemedText>
                    {selectedFeeTerms.fee_term_dates.map((termDate) => {
                      const existingAmount = formData.term_amounts.find(ta => ta.fee_term_date_id === termDate.id)?.amount || 0;
                      return (
                        <View key={termDate.id} style={styles.termAmountRow}>
                          <ThemedText style={styles.termLabel}>{`Term ${termDate.installment_number}: ${new Date(termDate.fee_term_date).toLocaleDateString()}`}</ThemedText>
                          <TextInput
                            style={[styles.input, {
                              backgroundColor: colors.background,
                              color: colors.foreground,
                              borderColor: colors.border,
                              flex: 1,
                              marginBottom: 0,
                            }]}
                            value={existingAmount.toString()}
                            onChangeText={(text) => {
                              const amount = parseFloat(text) || 0;
                              setFormData(prev => {
                                const newAmounts = prev.term_amounts.filter(ta => ta.fee_term_date_id !== termDate.id);
                                newAmounts.push({ fee_term_date_id: termDate.id, amount });
                                return { ...prev, term_amounts: newAmounts };
                              });
                            }}
                            placeholder="Amount"
                            placeholderTextColor={colors['muted-foreground']}
                            keyboardType="numeric"
                          />
                        </View>
                      );
                    })}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setFormData(prev => ({ ...prev, all_by_default: !prev.all_by_default }))}
                >
                  <View style={[styles.checkbox, { borderColor: colors.border }]}>
                    {formData.all_by_default && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </View>
                  <ThemedText style={styles.checkboxLabel}>Apply for all students as default</ThemedText>
                </TouchableOpacity>

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
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
                    editingMapping ? 'Update' : 'Create'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* Bulk Mapping Modal */}
      <Modal
        visible={isBulkModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBulkModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Bulk Add Class Mappings</ThemedText>
              <TouchableOpacity onPress={() => setIsBulkModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <View style={styles.form}>
                <ThemedText style={styles.label}>Classes *</ThemedText>
                <CustomDropdown
                  data={classOptions}
                  value={null}
                  onChange={(value) => {
                    if (value && !bulkFormData.class_ids.includes(value as string)) {
                      setBulkFormData(prev => ({
                        ...prev,
                        class_ids: [...prev.class_ids, value as string]
                      }));
                    }
                  }}
                  placeholder="Select classes"
                  multiSelect={true}
                />

                {bulkFormData.class_ids.length > 0 && (
                  <View style={styles.selectedClasses}>
                    <ThemedText style={styles.selectedLabel}>Selected Classes:</ThemedText>
                    {bulkFormData.class_ids.map(id => {
                      const classOption = classOptions.find(c => c.value === id);
                      return (
                        <View key={id} style={styles.selectedClassChip}>
                          <ThemedText style={styles.chipText}>{classOption?.label}</ThemedText>
                          <TouchableOpacity
                            onPress={() => setBulkFormData(prev => ({
                              ...prev,
                              class_ids: prev.class_ids.filter(cid => cid !== id)
                            }))}
                          >
                            <Ionicons name="close" size={16} color={colors.destructive} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                <ThemedText style={styles.label}>Fee Type *</ThemedText>
                <CustomDropdown
                  data={typeOptions}
                  value={bulkFormData.fee_type_id}
                  onChange={(value) => setBulkFormData(prev => ({ ...prev, fee_type_id: value as string }))}
                  placeholder="Select fee type"
                />

                <ThemedText style={styles.label}>Total Fee *</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  value={bulkFormData.total_fee.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setBulkFormData(prev => ({ ...prev, total_fee: num }));
                  }}
                  placeholder="Enter total fee"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                />

                <ThemedText style={styles.label}>Apply to All by Default</ThemedText>
                <CustomDropdown
                  data={[
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' },
                  ]}
                  value={bulkFormData.all_by_default ? 'true' : 'false'}
                  onChange={(value) => setBulkFormData(prev => ({ ...prev, all_by_default: value === 'true' }))}
                  placeholder="Select default option"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setIsBulkModalVisible(false)}
              >
                <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleBulkSubmit}
                disabled={bulkCreateMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {bulkCreateMutation.isPending ? 'Creating...' : 'Create Bulk Mappings'}
                </ThemedText>
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectionText: {
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  mappingCard: {
    flexDirection: 'row',
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
  selectionIndicator: {
    marginRight: 12,
  },
  mappingInfo: {
    flex: 1,
  },
  mappingTitle: {
    marginBottom: 4,
  },
  mappingDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  mappingDate: {
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
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formScroll: {
    maxHeight: 400,
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
  selectedClasses: {
    marginBottom: 16,
  },
  selectedLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  selectedClassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  chipText: {
    marginRight: 8,
    fontSize: 14,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
  },
  termAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  termLabel: {
    flex: 1,
    marginRight: 8,
    fontSize: 14,
  },
});