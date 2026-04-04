import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/themed-text-input';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import {
  useCertificateTypes,
  useCreateCertificateType,
  useUpdateCertificateType,
  useDeleteCertificateType
} from '@/src/api/hooks/students/certificates';
import { CertificateTypeRead } from '@/src/api/students';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

export default function CertificateTypesPage() {
  const { colors } = useTheme();
  const { showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');

  // Edit state
  const [editingType, setEditingType] = useState<CertificateTypeRead | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // API hooks
  const { data: certificateTypesData, isLoading } = useCertificateTypes();
  const createCertificateType = useCreateCertificateType();
  const updateCertificateType = useUpdateCertificateType();
  const deleteCertificateType = useDeleteCertificateType();

  const certificateTypes = certificateTypesData?.items || [];

  const handleAddType = () => {
    if (!newTypeName.trim()) {
      showError('Error', 'Please enter a certificate type name');
      return;
    }

    createCertificateType.mutate({
      name: newTypeName.trim(),
      description: newTypeDescription.trim() || undefined,
    }, {
      onSuccess: () => {
        setNewTypeName('');
        setNewTypeDescription('');
        setShowAddForm(false);
      }
    });
  };

  const openEditType = (item: CertificateTypeRead) => {
    setEditingType(item);
    setEditName(item.name);
    setEditDescription(item.description || '');
  };

  const handleUpdateType = () => {
    if (!editingType || !editName.trim()) {
      showError('Error', 'Please enter a certificate type name');
      return;
    }
    updateCertificateType.mutate(
      { id: editingType.id, data: { name: editName.trim(), description: editDescription.trim() || undefined } },
      { onSuccess: () => setEditingType(null) }
    );
  };

  const handleDeleteType = (id: string) => {
    confirm({
      title: 'Delete Certificate Type',
      message: 'Are you sure you want to delete this certificate type?',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteCertificateType.mutate(id),
    });
  };

  const renderCertificateType = ({ item }: { item: CertificateTypeRead }) => (
    <ThemedView style={[styles.typeCard, { backgroundColor: colors.card }]}>
      <View style={styles.typeHeader}>
        <View style={styles.typeInfo}>
          <ThemedText type="subtitle" style={styles.typeName}>
            {item.name}
          </ThemedText>
          <ThemedText style={styles.typeDescription}>
            {item.description || 'No description'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.typeFooter}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => openEditType(item)}
          >
            <Ionicons name="create" size={16} color="white" />
            <ThemedText style={styles.actionText}>Edit</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={() => handleDeleteType(item.id)}
          >
            <Ionicons name="trash" size={16} color="white" />
            <ThemedText style={styles.actionText}>Delete</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );

  return (
    <AppLayout title="Certificate Types">
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color="white" />
          <ThemedText style={styles.addButtonText}>
            {showAddForm ? 'Cancel' : 'Add Certificate Type'}
          </ThemedText>
        </TouchableOpacity>

        {showAddForm && (
          <ThemedView style={[styles.addForm, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.formTitle}>
              New Certificate Type
            </ThemedText>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Type Name *</ThemedText>
              <ThemedTextInput
                placeholder="Enter certificate type name"
                value={newTypeName}
                onChangeText={setNewTypeName}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Description</ThemedText>
              <ThemedTextInput
                placeholder="Enter description"
                value={newTypeDescription}
                onChangeText={setNewTypeDescription}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.formButton, styles.cancelButton]}
                onPress={() => {
                  setShowAddForm(false);
                  setNewTypeName('');
                  setNewTypeDescription('');
                }}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formButton, styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleAddType}
              >
                <ThemedText style={styles.submitButtonText}>Add Type</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}

        <FlatList
          data={certificateTypes}
          renderItem={renderCertificateType}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Certificate Types Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                Add your first certificate type to get started
              </ThemedText>
            </View>
          }
        />
      </View>

      {/* Edit Type Modal */}
      <Modal
        visible={!!editingType}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border ?? '#E5E7EB' }]}>
              <ThemedText style={styles.modalTitle}>Edit Certificate Type</ThemedText>
              <TouchableOpacity onPress={() => setEditingType(null)}>
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Type Name *</ThemedText>
                <ThemedTextInput
                  placeholder="Enter certificate type name"
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <ThemedTextInput
                  placeholder="Enter description (optional)"
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={2}
                />
              </View>
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => setEditingType(null)}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleUpdateType}
                  disabled={updateCertificateType.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {updateCertificateType.isPending ? 'Saving...' : 'Save Changes'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal {...modalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  addForm: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  submitButton: {
    // backgroundColor handled by parent
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  typeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  typeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createdDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
});