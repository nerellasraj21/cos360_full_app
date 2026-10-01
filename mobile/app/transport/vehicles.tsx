import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToastContext } from '@/components/ToastProvider';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { DatePickerModal } from '@/components/ui';
import { useTheme } from '@/contexts';
import { Trip, Vehicle } from '../../src/api';
import { feeCategoriesApi, feeTypesApi } from '../../src/api/fees';
import {
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useRoutes,
  useDrivers,
  useTrips,
  useCreateTrip,
  useUpdateTrip,
  useDeleteTrip,
} from '../../hooks/use-transport';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ── Trip row state ───────────────────────────────────────────────────────────
interface TripRow {
  _key: number;
  id?: string;       // set for trips already in DB, undefined for newly added rows
  route_id: string;
  driver_id: string;
}

const DEFAULT_TRIPS: TripRow[] = [
  { _key: 1, route_id: '', driver_id: '' },
  { _key: 2, route_id: '', driver_id: '' },
];

const TRIP_TYPE_LABELS: Record<number, string> = { 1: 'Trip 1', 2: 'Trip 2' };

const DRIVING_LICENCE_MAX_LENGTH = 16;

const defaultForm = {
  name: '',
  registration_number: '',
  fee_category_id: '',
  fee_type_id: '',
  driving_licence_no: '',
  driver_name: '',
  co_driver_name: '',
  driving_licence_exp_date: '',
  bus_insurance_vendor: '',
  number_of_trips: '',
  fees: '',
  insurance_expiry_date: '',
  is_active: true,
};

export default function VehiclesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [datePickerField, setDatePickerField] = useState<null | 'driving_licence_exp_date' | 'insurance_expiry_date'>(null);
  const [formData, setFormData] = useState({ ...defaultForm });

  // Trips assigned to the vehicle being created/edited
  const [trips, setTrips] = useState<TripRow[]>([...DEFAULT_TRIPS]);
  const [tripCounter, setTripCounter] = useState(DEFAULT_TRIPS.length);
  const [originalTripIds, setOriginalTripIds] = useState<Set<string>>(new Set());
  const [originalTripValues, setOriginalTripValues] = useState<Record<string, { route_id: string; driver_id: string }>>({});
  const [tripsInitialized, setTripsInitialized] = useState(false);

  const [pendingDeleteVehicle, setPendingDeleteVehicle] = useState<Vehicle | null>(null);

  // Vehicle Trips panel — lets the user pick a vehicle and see its assigned trips,
  // matching the web app's "Vehicle Trips" card below the vehicles table.
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();

  // Fetch vehicles data using permission-protected hook
  const { data: vehiclesData, isLoading, error, refetch } = useVehicles();

  // Mutations using permission-protected hooks
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const deleteMutation = useDeleteVehicle();
  const createTripMutation = useCreateTrip();
  const updateTripMutation = useUpdateTrip();
  const deleteTripMutation = useDeleteTrip();

  // Dropdown data — routes & drivers (drivers = staff with the "Driver" designation,
  // via the shared useDrivers hook, which mirrors the web app's approach and falls
  // back to the full staff list rather than ever leaving the dropdown empty).
  const { data: routesData } = useRoutes();
  const routes = Array.isArray(routesData) ? routesData : [];

  const { data: driversData } = useDrivers();
  const drivers = driversData || [];
  const driverOptions = drivers.map(d => ({ label: d.name, value: d.id }));

  // Route label matches the web app's buildRouteLabel: name + type + stops,
  // since route names alone aren't always unique enough to tell trips apart.
  const routeOptions = routes.map(r => {
    const typeSuffix = r.route_type ? ` [${r.route_type}]` : '';
    const stopsSuffix = r.starting_stop && r.ending_stop ? ` (${r.starting_stop} → ${r.ending_stop})` : '';
    return { label: `${r.route_name}${typeSuffix}${stopsSuffix}`, value: r.id };
  });

  // Fee category / fee type dropdowns (fee type filtered by selected category, same as web)
  const { data: feeCategoriesRaw } = useQuery({
    queryKey: ['fee-categories', 'dropdown-vehicles'],
    queryFn: () => feeCategoriesApi.getFeeCategories({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const feeCategoryOptions = (feeCategoriesRaw ?? []).map(c => ({ label: c.category_name, value: c.id }));

  const { data: feeTypesRaw } = useQuery({
    queryKey: ['fee-types', 'dropdown-vehicles'],
    queryFn: () => feeTypesApi.getFeeTypes(),
    staleTime: 5 * 60 * 1000,
  });
  const feeTypeOptions = (feeTypesRaw ?? [])
    .filter(t => t.fee_category_id === formData.fee_category_id)
    .map(t => ({ label: t.type_name, value: t.id }));

  // All trips (used to populate the Trips section when editing a vehicle, and by
  // the Vehicle Trips panel below the list)
  const { data: allTripsRaw, isLoading: tripsLoading } = useTrips();
  const allTrips: Trip[] = Array.isArray(allTripsRaw) ? allTripsRaw : ((allTripsRaw as any)?.items ?? []);

  // Vehicle Trips panel data
  const allVehicles = Array.isArray(vehiclesData) ? vehiclesData : [];
  const vehicleTripOptions = allVehicles.map(v => ({ label: `${v.name} (${v.registration_number})`, value: v.id }));
  const selectedVehicleForTrips = allVehicles.find(v => v.id === selectedVehicleId);
  const routeMap = new Map(routes.map(r => [r.id, r]));
  const selectedVehicleTrips = allTrips
    .filter(t => t.vehicle_id === selectedVehicleId)
    .sort((a, b) => a.trip_number - b.trip_number);
  const formatTripLabel = (trip: Trip): string => {
    const route = routeMap.get(trip.route_id);
    if (!route) return `Trip ${trip.trip_number}`;
    const acLabel = selectedVehicleForTrips?.is_ac ? 'Bus AC' : 'Bus Non AC';
    return `Trip ${trip.trip_number}  ${route.route_name}  ${acLabel}  (${route.starting_stop ?? 'Starting Point'} → ${route.ending_stop ?? 'Ending Point'})`;
  };

  // Handle delete mutation success/error states
  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Vehicle deleted successfully');
      deleteMutation.reset();
    }
    if (deleteMutation.isError) {
      showError('Failed to delete vehicle', deleteMutation.error?.message || 'Unknown error');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Populate the Trips section once the all-trips query resolves after opening Edit
  useEffect(() => {
    if (isModalVisible && editingVehicle && !tripsLoading && !tripsInitialized) {
      const existing = allTrips
        .filter(t => t.vehicle_id === editingVehicle.id)
        .sort((a, b) => a.trip_number - b.trip_number);
      setTrips(existing.map((t, i) => ({ _key: i + 1, id: t.id, route_id: t.route_id, driver_id: t.driver_id ?? '' })));
      setOriginalTripIds(new Set(existing.map(t => t.id)));
      setOriginalTripValues(Object.fromEntries(existing.map(t => [t.id, { route_id: t.route_id, driver_id: t.driver_id ?? '' }])));
      setTripCounter(existing.length);
      setTripsInitialized(true);
    }
  }, [isModalVisible, editingVehicle, tripsLoading, tripsInitialized, allTrips]);

  // Filter vehicles based on search
  const filteredVehicles = useMemo(() => {
    if (!vehiclesData || !Array.isArray(vehiclesData)) return [];

    return vehiclesData.filter((vehicle: Vehicle) => {
      const matchesSearch = vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (vehicle.driver_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [vehiclesData, searchQuery]);

  const resetForm = () => {
    setFormData({ ...defaultForm });
    setTrips([...DEFAULT_TRIPS]);
    setTripCounter(DEFAULT_TRIPS.length);
    setOriginalTripIds(new Set());
    setOriginalTripValues({});
    setTripsInitialized(true);
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      registration_number: vehicle.registration_number,
      fee_category_id: vehicle.fee_category_id ?? '',
      fee_type_id: vehicle.fee_type_id ?? '',
      driving_licence_no: vehicle.driving_licence_no ?? '',
      driver_name: vehicle.driver_name ?? '',
      co_driver_name: vehicle.co_driver_name ?? '',
      driving_licence_exp_date: vehicle.driving_licence_exp_date ?? '',
      bus_insurance_vendor: vehicle.bus_insurance_vendor ?? '',
      number_of_trips: vehicle.number_of_trips != null ? String(vehicle.number_of_trips) : '',
      fees: vehicle.fees != null ? String(vehicle.fees) : '',
      insurance_expiry_date: vehicle.insurance_expiry_date ?? '',
      is_active: vehicle.is_active,
    });
    setTrips([]);
    setTripCounter(0);
    setOriginalTripIds(new Set());
    setOriginalTripValues({});
    setTripsInitialized(false);
    setIsModalVisible(true);
  };

  const handleDelete = (vehicle: Vehicle) => {
    setPendingDeleteVehicle(vehicle);
  };

  const handleDrivingLicenceChange = (text: string) => {
    if (text.length > DRIVING_LICENCE_MAX_LENGTH) {
      showError('Error', `Driving Licence No. cannot exceed ${DRIVING_LICENCE_MAX_LENGTH} characters`);
      return;
    }
    setFormData(prev => ({ ...prev, driving_licence_no: text }));
  };

  const addTrip = () => {
    const key = tripCounter + 1;
    setTripCounter(key);
    setTrips(prev => [...prev, { _key: key, route_id: '', driver_id: '' }]);
  };
  const removeTrip = (key: number) => setTrips(prev => prev.filter(t => t._key !== key));
  const updateTripRow = (key: number, patch: Partial<TripRow>) =>
    setTrips(prev => prev.map(t => (t._key === key ? { ...t, ...patch } : t)));

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.registration_number.trim()) {
      showError('Error', 'Vehicle Name and Registration Number are required');
      return;
    }
    if (!formData.driving_licence_no.trim()) {
      showError('Error', 'Driving Licence No. is required');
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (editingVehicle) {
        // 1. Save vehicle fields
        await updateMutation.mutateAsync({
          id: editingVehicle.id,
          data: {
            name: formData.name.trim(),
            registration_number: formData.registration_number.trim(),
            vehicle_type: 'Bus',
            driver_name: formData.driver_name || null,
            co_driver_name: formData.co_driver_name || null,
            driving_licence_no: formData.driving_licence_no || null,
            driving_licence_exp_date: formData.driving_licence_exp_date || null,
            bus_insurance_vendor: formData.bus_insurance_vendor || null,
            insurance_expiry_date: formData.insurance_expiry_date || null,
            number_of_trips: formData.number_of_trips === '' ? null : Number(formData.number_of_trips),
            fees: formData.fees === '' ? undefined : Number(formData.fees),
            is_ac: false,
            is_active: formData.is_active,
            last_inspected_date: editingVehicle.last_inspected_date || today,
            pollution_renewal_date: editingVehicle.pollution_renewal_date || today,
            fee_category_id: formData.fee_category_id || null,
            fee_type_id: formData.fee_type_id || null,
          },
        });

        // 2. Delete trips that were removed
        const currentTripIds = new Set(trips.filter(t => t.id).map(t => t.id!));
        for (const id of originalTripIds) {
          if (!currentTripIds.has(id)) {
            await deleteTripMutation.mutateAsync(id);
          }
        }

        // 3. Update existing trips whose route/driver changed
        const keptTrips = trips.filter(t => !!t.id);
        for (let i = 0; i < keptTrips.length; i++) {
          const t = keptTrips[i];
          const original = originalTripValues[t.id!];
          const tripNumber = i + 1;
          if (!original || original.route_id !== t.route_id || original.driver_id !== t.driver_id) {
            await updateTripMutation.mutateAsync({
              id: t.id!,
              data: {
                vehicle_id: editingVehicle.id,
                route_id: t.route_id,
                driver_id: t.driver_id,
                trip_number: tripNumber,
              },
            });
          }
        }

        // 4. Create newly added trips
        const newTrips = trips.filter(t => !t.id && t.route_id && t.driver_id);
        const keptCount = keptTrips.length;
        for (let i = 0; i < newTrips.length; i++) {
          await createTripMutation.mutateAsync({
            vehicle_id: editingVehicle.id,
            route_id: newTrips[i].route_id,
            driver_id: newTrips[i].driver_id,
            trip_number: keptCount + i + 1,
          });
        }

        showSuccess('Vehicle updated successfully');
      } else {
        // Step 1: create with core fields only (backend rejects extended fields on POST)
        const newVehicle = await createMutation.mutateAsync({
          name: formData.name.trim(),
          registration_number: formData.registration_number.trim(),
          vehicle_type: 'Bus',
          is_active: formData.is_active,
          last_inspected_date: today,
          pollution_renewal_date: today,
        });

        // Step 2: patch with extended fields so they are persisted
        const hasExtended = formData.driver_name || formData.co_driver_name || formData.driving_licence_no ||
          formData.driving_licence_exp_date || formData.bus_insurance_vendor || formData.insurance_expiry_date ||
          formData.number_of_trips !== '' || formData.fees !== '' || formData.fee_category_id || formData.fee_type_id;

        if (hasExtended) {
          await updateMutation.mutateAsync({
            id: newVehicle.id,
            data: {
              name: formData.name.trim(),
              registration_number: formData.registration_number.trim(),
              vehicle_type: 'Bus',
              is_active: formData.is_active,
              last_inspected_date: today,
              pollution_renewal_date: today,
              driver_name: formData.driver_name || null,
              co_driver_name: formData.co_driver_name || null,
              driving_licence_no: formData.driving_licence_no || null,
              driving_licence_exp_date: formData.driving_licence_exp_date || null,
              bus_insurance_vendor: formData.bus_insurance_vendor || null,
              insurance_expiry_date: formData.insurance_expiry_date || null,
              number_of_trips: formData.number_of_trips === '' ? null : Number(formData.number_of_trips),
              fees: formData.fees === '' ? undefined : Number(formData.fees),
              is_ac: false,
              fee_category_id: formData.fee_category_id || null,
              fee_type_id: formData.fee_type_id || null,
            },
          });
        }

        const validTrips = trips.filter(t => t.route_id && t.driver_id);
        for (let i = 0; i < validTrips.length; i++) {
          await createTripMutation.mutateAsync({
            vehicle_id: newVehicle.id,
            route_id: validTrips[i].route_id,
            driver_id: validTrips[i].driver_id,
            trip_number: i + 1,
          });
        }

        showSuccess('Vehicle created successfully');
      }

      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsModalVisible(false);
      resetForm();
    } catch (e: any) {
      showError(
        editingVehicle ? 'Failed to update vehicle' : 'Failed to create vehicle',
        e?.message || 'Unknown error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderVehicleItem = ({ item, index }: { item: Vehicle; index: number }) => (
    <View style={[styles.vehicleCard, { backgroundColor: colors.card }]}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <ThemedText style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</ThemedText>
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
              accessibilityLabel="Edit"
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard
            resource={PERMISSION_RESOURCES.TRANSPORT_VEHICLES}>
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

      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="car" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            {item.registration_number}
          </ThemedText>
        </View>
        {!!item.driving_licence_no && (
          <View style={styles.detailRow}>
            <Ionicons name="card" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Licence No: {item.driving_licence_no}
            </ThemedText>
          </View>
        )}
        {!!item.driving_licence_exp_date && (
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Licence Expiry: {new Date(item.driving_licence_exp_date).toLocaleDateString('en-IN')}
            </ThemedText>
          </View>
        )}
        {item.fees != null && (
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Fees: ₹{Number(item.fees).toLocaleString('en-IN')}
            </ThemedText>
          </View>
        )}
        {!!item.driver_name && (
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Driver: {item.driver_name}
              {item.co_driver_name ? ` / ${item.co_driver_name}` : ''}
            </ThemedText>
          </View>
        )}
        {!!item.insurance_expiry_date && (
          <View style={styles.detailRow}>
            <Ionicons name="shield-checkmark" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Insurance Expiry: {new Date(item.insurance_expiry_date).toLocaleDateString('en-IN')}
            </ThemedText>
          </View>
        )}
        {(item.trip_count ?? item.number_of_trips) != null && (
          <View style={styles.detailRow}>
            <Ionicons name="repeat" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Trips: {item.trip_count ?? item.number_of_trips}
            </ThemedText>
          </View>
        )}
        {!!item.created_at && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Created: {new Date(item.created_at).toLocaleDateString('en-IN')}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );

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
              You don&apos;t have permission to view transport vehicles
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
              <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
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
            keyboardShouldPersistTaps="handled"
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
            ListFooterComponent={
              <View style={[styles.tripsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedText style={styles.tripsPanelTitle}>Vehicle Trips</ThemedText>
                <ThemedText style={styles.tripFieldLabel}>Vehicle</ThemedText>
                <CustomDropdown
                  data={vehicleTripOptions}
                  value={selectedVehicleId || null}
                  onChange={(value) => setSelectedVehicleId(value?.toString() || '')}
                  placeholder="Select vehicle"
                />

                {!selectedVehicleId ? (
                  <ThemedText style={[styles.tripsEmptyText, { color: colors['muted-foreground'] }]}>
                    Select a vehicle to view its trips.
                  </ThemedText>
                ) : tripsLoading ? (
                  <ThemedText style={[styles.tripsEmptyText, { color: colors['muted-foreground'] }]}>
                    Loading trips...
                  </ThemedText>
                ) : (
                  <>
                    <ThemedText style={styles.tripsPanelCount}>
                      No. of Trips: <ThemedText style={{ fontWeight: '700' }}>{selectedVehicleTrips.length}</ThemedText>
                    </ThemedText>
                    {selectedVehicleTrips.length === 0 ? (
                      <ThemedText style={[styles.tripsEmptyText, { color: colors['muted-foreground'] }]}>
                        No trips assigned to this vehicle.
                      </ThemedText>
                    ) : (
                      selectedVehicleTrips.map(trip => (
                        <View key={trip.id} style={[styles.tripsPanelRow, { borderColor: colors.border }]}>
                          <ThemedText style={styles.detailText}>{formatTripLabel(trip)}</ThemedText>
                        </View>
                      ))
                    )}
                  </>
                )}
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
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title" style={styles.modalTitle}>
                  {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
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
                  <ThemedText style={styles.label}>Fee Category</ThemedText>
                  <CustomDropdown
                    data={feeCategoryOptions}
                    value={formData.fee_category_id || null}
                    onChange={(value) => setFormData(prev => ({ ...prev, fee_category_id: value?.toString() || '', fee_type_id: '' }))}
                    placeholder="Select fee category"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Fee Type</ThemedText>
                  <CustomDropdown
                    data={feeTypeOptions}
                    value={formData.fee_type_id || null}
                    onChange={(value) => setFormData(prev => ({ ...prev, fee_type_id: value?.toString() || '' }))}
                    placeholder={formData.fee_category_id ? 'Select fee type' : 'Select a category first'}
                    disabled={!formData.fee_category_id}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Driving Licence No. *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter licence number"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.driving_licence_no}
                    maxLength={DRIVING_LICENCE_MAX_LENGTH}
                    onChangeText={handleDrivingLicenceChange}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Driver Name</ThemedText>
                  <CustomDropdown
                    data={driverOptions}
                    value={driverOptions.find(o => o.label === formData.driver_name)?.value ?? null}
                    onChange={(_, option) => setFormData(prev => ({ ...prev, driver_name: option?.label || '' }))}
                    placeholder="Select driver"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Co-Driver Name</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter co-driver name"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.co_driver_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, co_driver_name: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Driving Licence Expiry Date</ThemedText>
                  <TouchableOpacity
                    style={[styles.input, styles.dateField, { borderColor: colors.border }]}
                    onPress={() => setDatePickerField('driving_licence_exp_date')}
                    accessibilityLabel="Select licence expiry date"
                  >
                    <ThemedText style={{ color: formData.driving_licence_exp_date ? colors.foreground : colors['muted-foreground'], fontSize: 16 }}>
                      {formData.driving_licence_exp_date || 'Select date'}
                    </ThemedText>
                    <Ionicons name="calendar-outline" size={18} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Bus Insurance Vendor</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter vendor name"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.bus_insurance_vendor}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, bus_insurance_vendor: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Number of Trips</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="e.g. 2"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.number_of_trips}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, number_of_trips: text }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Fees (₹)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="e.g. 1200"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.fees}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fees: text }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Insurance Expiry Date</ThemedText>
                  <TouchableOpacity
                    style={[styles.input, styles.dateField, { borderColor: colors.border }]}
                    onPress={() => setDatePickerField('insurance_expiry_date')}
                    accessibilityLabel="Select insurance expiry date"
                  >
                    <ThemedText style={{ color: formData.insurance_expiry_date ? colors.foreground : colors['muted-foreground'], fontSize: 16 }}>
                      {formData.insurance_expiry_date || 'Select date'}
                    </ThemedText>
                    <Ionicons name="calendar-outline" size={18} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Active</ThemedText>
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

                {/* Trips Section */}
                <View style={[styles.tripsSection, { borderColor: colors.border }]}>
                  <View style={styles.tripsSectionHeader}>
                    <ThemedText style={styles.tripsSectionTitle}>
                      Trips{tripsLoading && editingVehicle ? ' (loading...)' : ''}
                    </ThemedText>
                    <TouchableOpacity
                      style={[styles.addTripButton, { borderColor: colors.primary }]}
                      onPress={addTrip}
                    >
                      <Ionicons name="add" size={16} color={colors.primary} />
                      <ThemedText style={[styles.addTripText, { color: colors.primary }]}>Add Trip</ThemedText>
                    </TouchableOpacity>
                  </View>

                  {trips.length === 0 ? (
                    <ThemedText style={[styles.tripsEmptyText, { color: colors['muted-foreground'] }]}>
                      {tripsLoading && editingVehicle
                        ? 'Loading trips...'
                        : 'No trips added. Tap "Add Trip" to assign routes to this vehicle.'}
                    </ThemedText>
                  ) : (
                    trips.map((trip, idx) => {
                      const typeLabel = TRIP_TYPE_LABELS[idx + 1] ?? `Trip ${idx + 1}`;
                      return (
                        <View key={trip._key} style={[styles.tripRow, { borderColor: colors.border }]}>
                          <View style={styles.tripRowHeader}>
                            <View style={[styles.tripTypeBadge, { backgroundColor: idx === 0 ? '#DBEAFE' : '#E5E7EB' }]}>
                              <ThemedText style={[styles.tripTypeText, { color: idx === 0 ? '#1D4ED8' : '#374151' }]}>
                                {typeLabel}
                              </ThemedText>
                            </View>
                            <TouchableOpacity
                              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                              onPress={() => removeTrip(trip._key)}
                              accessibilityLabel="Remove trip"
                            >
                              <Ionicons name="trash" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>

                          <ThemedText style={styles.tripFieldLabel}>Route</ThemedText>
                          <CustomDropdown
                            data={routeOptions}
                            value={trip.route_id || null}
                            onChange={(value) => updateTripRow(trip._key, { route_id: value?.toString() || '' })}
                            placeholder="Select route"
                          />

                          <ThemedText style={styles.tripFieldLabel}>Driver</ThemedText>
                          <CustomDropdown
                            data={driverOptions}
                            value={trip.driver_id || null}
                            onChange={(value) => updateTripRow(trip._key, { driver_id: value?.toString() || '' })}
                            placeholder="Select driver"
                          />
                        </View>
                      );
                    })
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsModalVisible(false)}
                  disabled={submitting}
                >
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                    {editingVehicle
                      ? (submitting ? 'Saving...' : 'Save Changes')
                      : (submitting ? 'Creating...' : 'Add Vehicle')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <DatePickerModal
          visible={datePickerField !== null}
          initialDate={datePickerField ? formData[datePickerField] : ''}
          onConfirm={(date) => {
            if (datePickerField) setFormData(prev => ({ ...prev, [datePickerField]: date }));
            setDatePickerField(null);
          }}
          onCancel={() => setDatePickerField(null)}
        />
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
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    paddingVertical: 12,
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
  serialNo: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  toggleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Trips section
  tripsSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  tripsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  addTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  addTripText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tripsEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  tripRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  tripRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tripFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 4,
    marginTop: 4,
  },
  // Vehicle Trips panel (below the vehicles list)
  tripsPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  tripsPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tripsPanelCount: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  tripsPanelRow: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
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
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
});
