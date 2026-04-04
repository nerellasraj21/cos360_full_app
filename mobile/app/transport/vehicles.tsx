import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToastContext } from '@/components/ToastProvider';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { Vehicle } from '../../src/api';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '../../hooks/use-transport';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const VEHICLE_TYPE_OPTIONS = [
  { label: 'Bus', value: 'Bus' },
  { label: 'Van', value: 'Van' },
  { label: 'Auto', value: 'Auto' },
];

export default function VehiclesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    vehicle_type: 'Bus' as 'Bus' | 'Van' | 'Auto',
    last_inspected_date: '',
    pollution_renewal_date: '',
    is_active: true,
  });


  const [pendingDeleteVehicle, setPendingDeleteVehicle] = useState<Vehicle | null>(null);

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  // Fetch vehicles data using permission-protected hook
  const { data: vehiclesData, isLoading, error, refetch } = useVehicles();

  // Mutations using permission-protected hooks
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Vehicle created successfully');
      createMutation.reset();
    }
    if (createMutation.isError) {
      showError('Failed to create vehicle', createMutation.error?.message || 'Unknown error');
    }
  }, [createMutation.isSuccess, createMutation.isError]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Vehicle updated successfully');
      updateMutation.reset();
    }
    if (updateMutation.isError) {
      showError('Failed to update vehicle', updateMutation.error?.message || 'Unknown error');
    }
  }, [updateMutation.isSuccess, updateMutation.isError]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Vehicle deleted successfully');
      deleteMutation.reset();
    }
    if (deleteMutation.isError) {
      showError('Failed to delete vehicle', deleteMutation.error?.message || 'Unknown error');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Filter vehicles based on search
  const filteredVehicles = useMemo(() => {
    if (!vehiclesData || !Array.isArray(vehiclesData)) return [];

    return vehiclesData.filter((vehicle: Vehicle) => {
      const matchesSearch = vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [vehiclesData, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      registration_number: '',
      vehicle_type: 'Bus',
      last_inspected_date: '',
      pollution_renewal_date: '',
      is_active: true,
    });
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      last_inspected_date: vehicle.last_inspected_date || '',
      pollution_renewal_date: vehicle.pollution_renewal_date || '',
      is_active: vehicle.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    setPendingDeleteVehicle(vehicle);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showError('Error', 'Vehicle name is required');
      return;
    }

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderVehicleItem = useCallback(({ item }: { item: Vehicle }) => (
    <View style={[styles.vehicleCard, { backgroundColor: colors.card }]}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <ThemedText type="subtitle" style={styles.vehicleName}>
            {item.name}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <ThemedText style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <UpdatePermissionGuard
            resource={PERMISSION_RESOURCES.TRANSPORT_VEHICLES}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard
            resource={PERMISSION_RESOURCES.TRANSPORT_VEHICLES}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </View>

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="car" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            {item.registration_number} ({item.vehicle_type})
          </ThemedText>
        </View>
        {item.last_inspected_date && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Last Inspected: {new Date(item.last_inspected_date).toLocaleDateString()}
            </ThemedText>
          </View>
        )}
        {item.created_at && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  ), [colors]);

  if (error) {
    return (
      <AppLayout title="Vehicles">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading vehicles data
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
          >
            <ThemedText style={{ color: 'white' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Vehicles">
      <ReadOrListPermissionGuard
        resource={PERMISSION_RESOURCES.TRANSPORT_VEHICLES}
        fallback={
          <View style={styles.centerContainer}>
            <Ionicons name="lock-closed" size={64} color={colors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don't have permission to view transport vehicles
            </ThemedText>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Header with Add Button */}
          <View style={styles.header}>
            <CreatePermissionGuard
              resource={PERMISSION_RESOURCES.TRANSPORT_VEHICLES}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  resetForm();
                  setIsModalVisible(true);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Vehicle</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={20} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search vehicles..."
              placeholderTextColor={colors['muted-foreground']}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={20} color={colors['muted-foreground']} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Vehicles List */}
          <FlatList
            data={filteredVehicles}
            renderItem={renderVehicleItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="car" size={64} color={colors['muted-foreground']} />
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No Vehicles Found
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  {searchQuery
                    ? 'Try adjusting your search query'
                    : 'Add your first vehicle to get started'}
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title" style={styles.modalTitle}>
                  {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Vehicle Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter vehicle name"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Registration Number *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="e.g. AP09AB1234"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.registration_number}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, registration_number: text }))}
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Vehicle Type *</ThemedText>
                  <CustomDropdown
                    data={VEHICLE_TYPE_OPTIONS}
                    value={formData.vehicle_type}
                    onChange={(v) => setFormData(prev => ({ ...prev, vehicle_type: (v as 'Bus' | 'Van' | 'Auto') || 'Bus' }))}
                    placeholder="Select vehicle type"
                    search={false}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Last Inspected Date</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.last_inspected_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, last_inspected_date: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Pollution Renewal Date</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.pollution_renewal_date}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, pollution_renewal_date: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Status</ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      { backgroundColor: formData.is_active ? '#10B981' : '#EF4444' },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  >
                    <ThemedText style={styles.toggleText}>
                      {formData.is_active ? 'Active' : 'Inactive'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingVehicle ? 'Update' : 'Create'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <ConfirmModal
          visible={pendingDeleteVehicle !== null}
          title="Delete Vehicle"
          message={`Are you sure you want to delete "${pendingDeleteVehicle?.name}"?`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            if (pendingDeleteVehicle) deleteMutation.mutate(pendingDeleteVehicle.id);
            setPendingDeleteVehicle(null);
          }}
          onCancel={() => setPendingDeleteVehicle(null)}
        />
        </View>
      </ReadOrListPermissionGuard>
    </AppLayout>
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
  listContainer: {
    paddingBottom: 20,
  },
  vehicleCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
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
    borderRadius: 8,
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  toggleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});