import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useExpenseTypesProtected, useExpenseCategoryDropdownProtected, useCreateExpenseTypeProtected, useUpdateExpenseTypeProtected, useDeleteExpenseTypeProtected } from '@/hooks/use-expense-protected';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ExpenseType } from '@/src/types/expense';

export default function ExpenseTypesScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<ExpenseType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    description: '',
  });

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const { data: typesResponse, isLoading, error } = useExpenseTypesProtected();
  const { data: categories = [] } = useExpenseCategoryDropdownProtected();
  const createMutation = useCreateExpenseTypeProtected();
  const updateMutation = useUpdateExpenseTypeProtected();
  const deleteMutation = useDeleteExpenseTypeProtected();

  const types = Array.isArray(typesResponse)
    ? typesResponse
    : typesResponse?.items || [];

  const categoryOptions = [
    { label: 'Select Category', value: '' },
    ...(categories || []).map((cat: any) => ({ label: cat.name, value: cat.id })),
  ];

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      description: '',
    });
    setEditingType(null);
  };

  const handleCreate = () => {
    setEditingType(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (type: ExpenseType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      category_id: type.category_id,
      description: type.description || '',
    });
    setIsModalVisible(true);
  };

  const handleDelete = (type: ExpenseType) => {
    Alert.alert(
      'Delete Expense Type',
      `Are you sure you want to delete "${type.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(type.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Type name is required');
      return;
    }
    if (!formData.category_id) {
      Alert.alert('Error', 'Category is required');
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

  const renderTypeItem = ({ item }: { item: ExpenseType }) => (
    <ThemedView style={[styles.typeCard, { backgroundColor: colors.card }]}>
      <View style={styles.typeInfo}>
        <ThemedText type="subtitle" style={styles.typeName}>
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.typeDetails, { color: colors['muted-foreground'] }]}>
          Category: {item.category_id}
        </ThemedText>
        <ThemedText style={[styles.typeDetails, { color: colors['muted-foreground'] }]}>
          Status: {item.is_active ? 'Active' : 'Inactive'}
        </ThemedText>
      </View>

      <View style={styles.actionButtons}>
        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TYPES}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
        </UpdatePermissionGuard>

        <DeletePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TYPES}>
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

  if (isLoading) {
    return (
      <AppLayout title="Expense Types">
        <View style={styles.centerContainer}>
          <ThemedText>Loading types...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Expense Types">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading types
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TYPES}>
      <AppLayout title="Expense Types">
        <View style={styles.container}>
          <View style={styles.header}>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TYPES}>
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
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyContainer}>
              <Ionicons name="list-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No expense types found
              </ThemedText>
            </ThemedView>
          )}
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
                  {editingType ? 'Edit Expense Type' : 'Add Expense Type'}
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
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter type name"
                  placeholderTextColor={colors['muted-foreground']}
                />

                <ThemedText style={styles.label}>Category *</ThemedText>
                <CustomDropdown
                  data={categoryOptions}
                  value={formData.category_id}
                  onChange={(value) => setFormData(prev => ({ ...prev, category_id: value?.toString() || '' }))}
                  placeholder="Select category"
                />

                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Enter description (optional)"
                  placeholderTextColor={colors['muted-foreground']}
                  multiline
                  numberOfLines={3}
                />
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
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' :
                     editingType ? 'Update' : 'Create'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
      </View>
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
    justifyContent: 'flex-end',
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
});