import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import { Colors } from '@/constants/theme';
import { useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation } from '@/hooks/use-staff-api';
import type { Designation, DesignationInput } from '@/src/types/masters/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

function StaffDesignationsScreenContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [formData, setFormData] = useState<DesignationInput>({
    title: '',
  });

  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();

  // Fetch designations data
  const { data: designationsData, isLoading, error, refetch } = useDesignations();

  // Mutations
  const createMutation = useCreateDesignation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Success', 'Designation created successfully');
    },
    onError: (error: any) => {
      showError('Error', error.response?.data?.detail || 'Failed to create designation');
      console.error('Create designation error:', error);
    },
  });

  const updateMutation = useUpdateDesignation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Success', 'Designation updated successfully');
    },
    onError: (error: any) => {
      showError('Error', error.response?.data?.detail || 'Failed to update designation');
      console.error('Update designation error:', error);
    },
  });

  const deleteMutation = useDeleteDesignation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      showSuccess('Success', 'Designation deleted successfully');
    },
    onError: (error: any) => {
      showError('Error', error.response?.data?.detail || 'Failed to delete designation');
      console.error('Delete designation error:', error);
    },
  });

  const resetForm = () => {
    setFormData({ title: '' });
    setEditingDesignation(null);
  };

  const handleEdit = (designation: Designation) => {
    setEditingDesignation(designation);
    setFormData({ title: designation.title });
    setIsModalVisible(true);
  };

  const handleDelete = (designation: Designation) => {
    confirm({
      title: 'Delete Designation',
      message: `Are you sure you want to delete "${designation.title}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(designation.id),
    });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      showError('Validation Error', 'Please enter designation title');
      return;
    }

    if (editingDesignation) {
      updateMutation.mutate({ id: editingDesignation.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filter designations based on search
  const filteredDesignations = useMemo(() => {
    if (!designationsData?.items) return [];

    return designationsData.items.filter((designation: Designation) => {
      const matchesSearch = designation.title.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [designationsData, searchQuery]);

  const renderDesignationItem = ({ item, index }: { item: Designation; index: number }) => (
    <View style={[styles.designationCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.designationHeader}>
        <View style={styles.designationInfo}>
          <ThemedText style={[styles.serialNo, { color: themeColors['muted-foreground'] }]}>
            {index + 1}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.designationName}>
            {item.title}
          </ThemedText>
        </View>
        <View style={styles.actionButtons}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF_DESIGNATIONS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEdit(item)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard resource={PERMISSION_RESOURCES.STAFF_DESIGNATIONS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
              accessibilityLabel="Delete"
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </View>

      <View style={styles.designationDetails}>
        <ThemedText style={styles.createdAt}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </View>

      {/* Staff Count */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={themeColors.primary} />
          <ThemedText style={styles.statText}>
            {item.staff_count || 0} staff member{item.staff_count !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Failed to load designations data</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
              accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Staff Designations
        </ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search designations..."
          placeholderTextColor={themeColors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={themeColors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Designations Count + Add button */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>
          {filteredDesignations.length} designation{filteredDesignations.length !== 1 ? 's' : ''}
        </ThemedText>
        <CreatePermissionGuard resource={PERMISSION_RESOURCES.STAFF_DESIGNATIONS}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: themeColors.primary }]}
            onPress={() => {
              resetForm();
              setIsModalVisible(true);
            }}
            accessibilityLabel="Add Designation"
          >
            <Ionicons name="add" size={18} color="white" />
            <ThemedText style={styles.addButtonText}>Add Designation</ThemedText>
          </TouchableOpacity>
        </CreatePermissionGuard>
      </View>


      {/* Designations List */}
      <FlatList
        data={filteredDesignations}
        renderItem={renderDesignationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ribbon" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Designations Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search'
                : 'Add staff designations to get started'}
            </ThemedText>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingDesignation ? 'Edit Designation' : 'Add Designation'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Title *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter designation title"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.title}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, title: value }))}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmModal {...modalProps} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContainer: {
    paddingBottom: 20,
  },
  designationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  designationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  designationInfo: {
    flex: 1,
  },
  designationName: {
    marginBottom: 4,
  },
  serialNo: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  designationDetails: {
    marginBottom: 12,
  },
  createdAt: {
    fontSize: 12,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    marginLeft: 6,
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default function StaffDesignationsScreen() {
  const router = useRouter();
  
  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.STAFF_DESIGNATIONS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              Staff Designations
            </ThemedText>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don&apos;t have permission to view staff designations data
            </ThemedText>
          </View>
        </ThemedView>
      }
    >
      <StaffDesignationsScreenContent />
    </ReadOrListPermissionGuard>
  );
}