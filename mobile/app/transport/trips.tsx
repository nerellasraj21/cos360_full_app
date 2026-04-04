import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToastContext } from '@/components/ToastProvider';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useVehiclesDropdown, useRoutesDropdown, useDrivers } from '@/hooks';
import { Trip } from '../../src/api';
import { useTrips, useCreateTrip, useUpdateTrip, useDeleteTrip } from '../../hooks/use-transport';
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

export default function TripsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    route_id: '',
    driver_id: '',
    trip_number: 1,
  });

  const [pendingDeleteTrip, setPendingDeleteTrip] = useState<Trip | null>(null);

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  // Fetch trips data using permission-protected hook
  const { data: tripsData, isLoading, error, refetch } = useTrips();

  // Mutations using permission-protected hooks
  const createMutation = useCreateTrip();
  const updateMutation = useUpdateTrip();
  const deleteMutation = useDeleteTrip();

  const { data: vehiclesData } = useVehiclesDropdown();
  const { data: routesData } = useRoutesDropdown();
  const { data: driversData } = useDrivers();

  const vehicles = vehiclesData || [];
  const routes = routesData || [];
  const drivers = driversData || [];

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Trip created successfully');
      createMutation.reset();
    }
    if (createMutation.isError) {
      showError('Failed to create trip', createMutation.error?.message || 'Unknown error');
    }
  }, [createMutation.isSuccess, createMutation.isError]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Trip updated successfully');
      updateMutation.reset();
    }
    if (updateMutation.isError) {
      showError('Failed to update trip', updateMutation.error?.message || 'Unknown error');
    }
  }, [updateMutation.isSuccess, updateMutation.isError]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Trip deleted successfully');
      deleteMutation.reset();
    }
    if (deleteMutation.isError) {
      showError('Failed to delete trip', deleteMutation.error?.message || 'Unknown error');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Filter trips based on search
  const filteredTrips = useMemo(() => {
    if (!tripsData || !Array.isArray(tripsData)) return [];

    return tripsData.filter((trip: Trip) => {
      const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
      const route = routes.find(r => r.id === trip.route_id);
      const searchTerm = searchQuery.toLowerCase();

      return (
        vehicle?.name.toLowerCase().includes(searchTerm) ||
        route?.route_name.toLowerCase().includes(searchTerm) ||
        trip.trip_number.toString().includes(searchTerm)
      );
    });
  }, [tripsData, vehicles, routes, searchQuery]);

  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      route_id: '',
      driver_id: '',
      trip_number: 1,
    });
    setEditingTrip(null);
  };

  const handleEdit = (trip: Trip) => {
    setEditingTrip(trip);
    setFormData({
      vehicle_id: trip.vehicle_id ?? '',
      route_id: trip.route_id ?? '',
      driver_id: trip.driver_id ?? '',
      trip_number: trip.trip_number,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (trip: Trip) => {
    setPendingDeleteTrip(trip);
  };

  const handleSubmit = () => {
    if (!formData.vehicle_id) {
      showError('Error', 'Vehicle is required');
      return;
    }

    if (!formData.route_id) {
      showError('Error', 'Route is required');
      return;
    }

    const payload = {
      ...formData,
      driver_id: formData.driver_id || undefined,
    };

    if (editingTrip) {
      updateMutation.mutate({ id: editingTrip.id, data: payload });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const renderTripItem = useCallback(({ item }: { item: Trip }) => {
    const vehicle = vehicles.find(v => v.id === item.vehicle_id);
    const route = routes.find(r => r.id === item.route_id);
    const driver = drivers.find(d => d.id === item.driver_id);

    return (
      <View style={[styles.tripCard, { backgroundColor: colors.card }]}>
        <View style={styles.tripHeader}>
          <View style={styles.tripInfo}>
            <ThemedText type="subtitle" style={styles.tripNumber}>
              Trip #{item.trip_number}
            </ThemedText>
          </View>
          <View style={styles.actionButtons}>
            <UpdatePermissionGuard 
              resource={PERMISSION_RESOURCES.TRANSPORT_TRIPS}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create" size={16} color="white" />
              </TouchableOpacity>
            </UpdatePermissionGuard>
            <DeletePermissionGuard 
              resource={PERMISSION_RESOURCES.TRANSPORT_TRIPS}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </DeletePermissionGuard>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="car" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Vehicle: {vehicle?.name || 'Unknown Vehicle'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="bus" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Route: {route?.route_name || 'Unknown Route'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Driver: {driver?.name || 'Unknown Driver'}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }, [colors, vehicles, routes, drivers]);

  if (error) {
    return (
      <AppLayout title="Trips">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading trips data
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
    <AppLayout title="Trips">
      <ReadOrListPermissionGuard 
        resource={PERMISSION_RESOURCES.TRANSPORT_TRIPS}
        fallback={
          <View style={styles.centerContainer}>
            <Ionicons name="lock-closed" size={64} color={colors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don't have permission to view transport trips
            </ThemedText>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Header with Add Button */}
          <View style={styles.header}>
            <CreatePermissionGuard 
              resource={PERMISSION_RESOURCES.TRANSPORT_TRIPS}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  resetForm();
                  setIsModalVisible(true);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Trip</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search trips..."
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

        {/* Trips List */}
        <FlatList
          data={filteredTrips}
          renderItem={renderTripItem}
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
              <Ionicons name="navigate" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Trips Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Add your first trip to get started'}
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
                  {editingTrip ? 'Edit Trip' : 'Add Trip'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Vehicle *</ThemedText>
                  <CustomDropdown
                    data={vehicles.map(vehicle => ({ label: vehicle.name, value: vehicle.id }))}
                    value={formData.vehicle_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, vehicle_id: value?.toString() || '' }))}
                    placeholder="Select vehicle"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Route *</ThemedText>
                  <CustomDropdown
                    data={routes.map(route => ({ label: route.route_name, value: route.id }))}
                    value={formData.route_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, route_id: value?.toString() || '' }))}
                    placeholder="Select route"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Driver *</ThemedText>
                  <CustomDropdown
                    data={drivers.map(driver => ({ label: driver.name, value: driver.id }))}
                    value={formData.driver_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, driver_id: value?.toString() || '' }))}
                    placeholder="Select driver"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Trip Number *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="1"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.trip_number.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, trip_number: parseInt(text) || 1 }))}
                    keyboardType="numeric"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <ThemedText style={{ color: 'white' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingTrip ? 'Update' : 'Create')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <ConfirmModal
          visible={pendingDeleteTrip !== null}
          title="Delete Trip"
          message={`Are you sure you want to delete Trip #${pendingDeleteTrip?.trip_number}?`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            if (pendingDeleteTrip) deleteMutation.mutate(pendingDeleteTrip.id);
            setPendingDeleteTrip(null);
          }}
          onCancel={() => setPendingDeleteTrip(null)}
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
  tripCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripNumber: {
    marginBottom: 8,
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
  tripDetails: {
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
    maxHeight: '85%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalBody: {
    flex: 1,
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
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});