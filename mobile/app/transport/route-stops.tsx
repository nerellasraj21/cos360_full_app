import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { TimePickerModal, formatTime12h } from '@/components/ui';
import { useTheme } from '@/contexts';
import { useRoutesDropdown } from '@/hooks';
import { RouteStop, RouteStopCreate } from '../../src/api';
import { useRouteStops, useCreateRouteStop, useUpdateRouteStop, useDeleteRouteStop } from '../../hooks/use-transport';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type TimeField = 'reaching_time' | 'pickup_time' | 'drop_time';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RouteStopsScreen() {
  // Opened from the Routes screen: ?routeId preselects the route, ?add=1 also
  // opens the add-stop form straight away.
  const { routeId, add } = useLocalSearchParams<{ routeId?: string; add?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(routeId ?? '');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
  const [formData, setFormData] = useState({
    route_id: '',
    name: '',
    number: 1,
    reaching_time: '07:00:00',
    pickup_time: '',
    drop_time: '',
    fees: 0,
    is_active: true,
  });

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps: confirmModalProps } = useConfirmModal();

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<TimeField>('reaching_time');

  const openTimePicker = (field: TimeField) => {
    setActiveTimeField(field);
    setShowTimePicker(true);
  };

  const confirmTime = (time: string) => {
    setFormData(prev => ({ ...prev, [activeTimeField]: time }));
    setShowTimePicker(false);
  };

  const clearTime = (field: 'pickup_time' | 'drop_time') => {
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  // Fetch route stops data using permission-protected hook
  const { data: routeStopsData, isLoading, error, refetch } = useRouteStops({
    route_id: selectedRouteId || undefined
  });

  // Mutations using permission-protected hooks
  const createMutation = useCreateRouteStop();
  const updateMutation = useUpdateRouteStop();
  const deleteMutation = useDeleteRouteStop();

  const { data: routesData } = useRoutesDropdown();
  const routes = routesData || [];

  // The transport hooks don't toast, so the screen owns all user feedback.
  // Error toasts surface the real backend message (the API client sets
  // error.message to the FastAPI `detail`), not a generic string.
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Stop Created', 'Route stop created successfully');
      createMutation.reset();
    }
    if (createMutation.isError) {
      showError('Error', createMutation.error?.message || 'Failed to create route stop');
    }
  }, [createMutation.isSuccess, createMutation.isError]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Stop Updated', 'Route stop updated successfully');
      updateMutation.reset();
    }
    if (updateMutation.isError) {
      showError('Error', updateMutation.error?.message || 'Failed to update route stop');
    }
  }, [updateMutation.isSuccess, updateMutation.isError]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Stop Deleted', 'Route stop deleted successfully');
      deleteMutation.reset();
    }
    if (deleteMutation.isError) {
      showError('Error', deleteMutation.error?.message || 'Failed to delete route stop');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Filter route stops by the selected route and the search box. The route_id
  // filter is also applied client-side so a backend that ignores the query
  // param can't leak other routes' stops into the list. Stops are ordered by
  // their stop number, matching the web page.
  const filteredRouteStops = useMemo(() => {
    if (!routeStopsData || !Array.isArray(routeStopsData)) return [];

    return routeStopsData
      .filter((stop: RouteStop) => {
        const matchesRoute = !selectedRouteId || stop.route_id === selectedRouteId;
        const matchesSearch = stop.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRoute && matchesSearch;
      })
      .sort((a: RouteStop, b: RouteStop) => a.number - b.number);
  }, [routeStopsData, searchQuery, selectedRouteId]);

  const routeOptions = routes.map(route => ({ label: route.route_name, value: route.id }));

  const resetForm = () => {
    setFormData({
      route_id: selectedRouteId,
      name: '',
      number: sortedStops.length + 1,
      reaching_time: '07:00:00',
      pickup_time: '',
      drop_time: '',
      fees: 0,
      is_active: true,
    });
    setEditingStop(null);
  };

  const autoAddHandled = React.useRef(false);
  useEffect(() => {
    if (add === '1' && !autoAddHandled.current) {
      autoAddHandled.current = true;
      resetForm();
      setIsModalVisible(true);
    }
    // resetForm is stable enough here; this runs once per navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [add]);

  const handleEdit = (stop: RouteStop) => {
    setEditingStop(stop);
    setFormData({
      route_id: stop.route_id,
      name: stop.name,
      number: stop.number,
      reaching_time: stop.reaching_time,
      pickup_time: stop.pickup_time ?? '',
      drop_time: stop.drop_time ?? '',
      fees: stop.fees,
      is_active: stop.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (stop: RouteStop) => {
    confirm({
      title: 'Delete Route Stop',
      message: `Are you sure you want to delete "${stop.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(stop.id),
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showError('Error', 'Stop name is required');
      return;
    }

    const routeId = formData.route_id || selectedRouteId;
    if (!routeId) {
      showError('Error', 'Route is required');
      return;
    }

    // `reaching_time` is derived from the up journey time, the way the web
    // dialog does it, so the form only asks for the fields the web form has.
    // Empty pickup/drop times are omitted — an empty string '' is NOT a valid
    // time and the backend rejects it with a 422.
    const payload: RouteStopCreate = {
      route_id: routeId,
      name: formData.name.trim(),
      number: formData.number,
      reaching_time: formData.pickup_time || formData.reaching_time || '00:00:00',
      fees: formData.fees || 0,
      is_active: formData.is_active,
    };
    if (formData.pickup_time) payload.pickup_time = formData.pickup_time;
    if (formData.drop_time) payload.drop_time = formData.drop_time;

    if (editingStop) {
      updateMutation.mutate({ id: editingStop.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Stops sorted by sequence number, matching the web table's row order.
  const sortedStops = useMemo(
    () => [...filteredRouteStops].sort((a, b) => a.number - b.number),
    [filteredRouteStops],
  );

  const renderRouteStopItem = useCallback(({ item }: { item: RouteStop }) => {
    const sorted = [...filteredRouteStops].sort((a, b) => a.number - b.number);
    const idx = sorted.findIndex(s => s.id === item.id);

    return (
      <View style={[styles.stopCard, { backgroundColor: colors.card }]}>
        <View style={styles.stopHeader}>
          <View style={styles.stopInfo}>
            <ThemedText style={[styles.stopSerial, { color: colors['muted-foreground'] }]}>
              {idx + 1}
            </ThemedText>
            <ThemedText type="subtitle" style={styles.stopName}>
              {item.name}
            </ThemedText>
          </View>
          <View style={styles.actionButtons}>
            <UpdatePermissionGuard
              resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleEdit(item)}
              accessibilityLabel="Edit"
              >
                <Ionicons name="create" size={16} color="white" />
              </TouchableOpacity>
            </UpdatePermissionGuard>
            <DeletePermissionGuard
              resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}>
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

        <View style={styles.stopDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Amount (₹/yr): ₹{Number(item.fees ?? 0).toLocaleString('en-IN')}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="arrow-up-circle" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Up Journey Time: {item.pickup_time ? item.pickup_time.substring(0, 5) : '—'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="arrow-down-circle" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Down Journey Time: {item.drop_time ? item.drop_time.substring(0, 5) : '—'}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }, [colors, filteredRouteStops]);

  if (error) {
    return (
      <AppLayout title="Route Stops">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading route stops data
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
    <AppLayout title="Route Stops">
      <ReadOrListPermissionGuard
        resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}
        fallback={
          <View style={styles.centerContainer}>
            <Ionicons name="lock-closed" size={64} color={colors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don&apos;t have permission to view route stops
            </ThemedText>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Header with Add Stop button. Stop reordering was removed — the web
              page has no such feature; stop order is fixed by Stop Number at
              creation time, same as here now. */}
          <View style={styles.header}>
            <CreatePermissionGuard
              resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: colors.primary, opacity: selectedRouteId ? 1 : 0.5 },
                ]}
                disabled={!selectedRouteId}
                onPress={() => {
                  resetForm();
                  setIsModalVisible(true);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Stop</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

        {/* Route Filter */}
        <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.filterLabel}>Filter by Route:</ThemedText>
          <CustomDropdown
            data={routeOptions}
            value={selectedRouteId}
            onChange={(value) => setSelectedRouteId(value?.toString() || '')}
            placeholder="Select a route to view stops..."
          />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search stops..."
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

        {/* Route Stops List */}
        <FlatList
          data={selectedRouteId ? sortedStops : []}
          renderItem={renderRouteStopItem}
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
              <Ionicons name="location" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Route Stops Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {selectedRouteId
                  ? 'No stops found for selected route'
                  : 'Select a route to view its stops.'}
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
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title" style={styles.modalTitle}>
                  {editingStop ? 'Edit Route Stop' : 'Add Route Stop'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                {/* Stop Number is only asked for when creating a stop, matching the
                    web page — its inline row edit never lets you change the number,
                    only the Add Stop dialog does. */}
                {editingStop ? (
                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Stop Name *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Enter stop name"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.name}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                    />
                  </View>
                ) : (
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <ThemedText style={styles.label}>Stop Name *</ThemedText>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                        placeholder="Enter stop name"
                        placeholderTextColor={colors['muted-foreground']}
                        value={formData.name}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                      <ThemedText style={styles.label}>Stop Number *</ThemedText>
                      <TextInput
                        style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                        placeholder="1"
                        placeholderTextColor={colors['muted-foreground']}
                        value={formData.number.toString()}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, number: parseInt(text) || 1 }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Amount (₹/yr)</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.fees ? formData.fees.toString() : ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fees: parseFloat(text) || 0 }))}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Up Journey Time *</ThemedText>
                    <View style={styles.timeRow}>
                      <TouchableOpacity
                        style={[styles.input, styles.timeButton, styles.timeButtonFlex, { borderColor: colors.border }]}
                        onPress={() => openTimePicker('pickup_time')}
                      >
                        <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                        <ThemedText style={[styles.timeButtonText, { color: formData.pickup_time ? colors.foreground : colors['muted-foreground'], flex: 1 }]}>
                          {formatTime12h(formData.pickup_time) || 'Tap to set'}
                        </ThemedText>
                      </TouchableOpacity>
                      {formData.pickup_time ? (
                        <TouchableOpacity
                          style={styles.clearTimeBtn}
                          onPress={() => clearTime('pickup_time')}
              accessibilityLabel="Close"
                        >
                          <Ionicons name="close-circle" size={20} color={colors['muted-foreground']} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Down Journey Time</ThemedText>
                    <View style={styles.timeRow}>
                      <TouchableOpacity
                        style={[styles.input, styles.timeButton, styles.timeButtonFlex, { borderColor: colors.border }]}
                        onPress={() => openTimePicker('drop_time')}
                      >
                        <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                        <ThemedText style={[styles.timeButtonText, { color: formData.drop_time ? colors.foreground : colors['muted-foreground'], flex: 1 }]}>
                          {formatTime12h(formData.drop_time) || 'Tap to set'}
                        </ThemedText>
                      </TouchableOpacity>
                      {formData.drop_time ? (
                        <TouchableOpacity
                          style={styles.clearTimeBtn}
                          onPress={() => clearTime('drop_time')}
              accessibilityLabel="Close"
                        >
                          <Ionicons name="close-circle" size={20} color={colors['muted-foreground']} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  >
                    <Ionicons
                      name={formData.is_active ? "checkbox" : "square-outline"}
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
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
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingStop ? 'Update' : 'Create')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Custom Time Picker — separate Modal, layers above form Modal on both platforms */}
        <TimePickerModal
          visible={showTimePicker}
          initialTime={formData[activeTimeField]}
          onConfirm={confirmTime}
          onCancel={() => setShowTimePicker(false)}
          withSeconds
          presets={['06:00', '07:00', '08:00', '12:00', '14:00', '17:00']}
        />

        <ConfirmModal {...confirmModalProps} />
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
    gap: 10,
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
  filterContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
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
  stopCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stopInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopSerial: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopName: {
    flexShrink: 1,
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
  stopDetails: {
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
    maxHeight: '80%',
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
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
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
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButtonFlex: {
    flex: 1,
  },
  timeButtonText: {
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearTimeBtn: {
    padding: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
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
