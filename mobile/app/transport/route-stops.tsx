import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useRoutesDropdown } from '@/hooks';
import { RouteStop } from '../../src/api';
import { useRouteStops, useCreateRouteStop, useUpdateRouteStop, useDeleteRouteStop } from '../../hooks/use-transport';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type TimeField = 'reaching_time' | 'pickup_time' | 'drop_time';

// ─── Custom Time Picker Modal ─────────────────────────────────────────────────
// Renders as its own Modal so it layers correctly above the form Modal on both
// Android and iOS. No dependency on @react-native-community/datetimepicker.

function TimePickerModal({
  visible,
  initialTime,
  onConfirm,
  onCancel,
  colors,
}: {
  visible: boolean;
  initialTime: string;
  onConfirm: (time: string) => void;
  onCancel: () => void;
  colors: any;
}) {
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);

  // Sync to the field's current value whenever the picker opens
  useEffect(() => {
    if (visible) {
      const parts = (initialTime || '07:00:00').split(':').map(Number);
      setHour(isNaN(parts[0]) ? 7 : parts[0]);
      setMinute(isNaN(parts[1]) ? 0 : parts[1]);
    }
  }, [visible]);

  const pad = (n: number) => String(n).padStart(2, '0');

  const handleDone = () => {
    onConfirm(`${pad(hour)}:${pad(minute)}:00`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={tpStyles.overlay}>
        <View style={[tpStyles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[tpStyles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onCancel} style={tpStyles.headerBtn}>
              <ThemedText style={{ color: colors['muted-foreground'], fontSize: 16 }}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={{ fontWeight: '700', fontSize: 16, color: colors.foreground }}>
              Select Time
            </ThemedText>
            <TouchableOpacity onPress={handleDone} style={tpStyles.headerBtn}>
              <ThemedText style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>
                Done
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Hour : Minute picker */}
          <View style={tpStyles.pickerRow}>
            {/* Hour column */}
            <View style={tpStyles.column}>
              <TouchableOpacity
                style={tpStyles.arrowBtn}
                onPress={() => setHour(h => (h + 1) % 24)}
              >
                <Ionicons name="chevron-up" size={32} color={colors.primary} />
              </TouchableOpacity>
              <View style={[tpStyles.digitBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedText style={tpStyles.timeDigit}>{pad(hour)}</ThemedText>
              </View>
              <TouchableOpacity
                style={tpStyles.arrowBtn}
                onPress={() => setHour(h => (h - 1 + 24) % 24)}
              >
                <Ionicons name="chevron-down" size={32} color={colors.primary} />
              </TouchableOpacity>
              <ThemedText style={[tpStyles.columnLabel, { color: colors['muted-foreground'] }]}>
                Hour
              </ThemedText>
            </View>

            <ThemedText style={[tpStyles.colon, { color: colors.foreground }]}>:</ThemedText>

            {/* Minute column */}
            <View style={tpStyles.column}>
              <TouchableOpacity
                style={tpStyles.arrowBtn}
                onPress={() => setMinute(m => (m + 1) % 60)}
              >
                <Ionicons name="chevron-up" size={32} color={colors.primary} />
              </TouchableOpacity>
              <View style={[tpStyles.digitBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ThemedText style={tpStyles.timeDigit}>{pad(minute)}</ThemedText>
              </View>
              <TouchableOpacity
                style={tpStyles.arrowBtn}
                onPress={() => setMinute(m => (m - 1 + 60) % 60)}
              >
                <Ionicons name="chevron-down" size={32} color={colors.primary} />
              </TouchableOpacity>
              <ThemedText style={[tpStyles.columnLabel, { color: colors['muted-foreground'] }]}>
                Minute
              </ThemedText>
            </View>
          </View>

          {/* Quick preset buttons */}
          <View style={tpStyles.presets}>
            {['06:00', '07:00', '08:00', '12:00', '14:00', '17:00'].map(t => {
              const [ph, pm] = t.split(':').map(Number);
              const isActive = ph === hour && pm === minute;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    tpStyles.presetBtn,
                    { borderColor: colors.border, backgroundColor: isActive ? colors.primary : colors.card },
                  ]}
                  onPress={() => { setHour(ph); setMinute(pm); }}
                >
                  <ThemedText style={[tpStyles.presetText, { color: isActive ? '#fff' : colors.foreground }]}>
                    {t}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerBtn: {
    minWidth: 60,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  column: {
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    padding: 6,
  },
  digitBox: {
    width: 80,
    height: 72,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDigit: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
  },
  columnLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  colon: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 28,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RouteStopsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
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

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Stop Created', 'Route stop created successfully');
      createMutation.reset();
    }
    if (createMutation.isError) {
      showError('Error', 'Failed to create route stop');
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
      showError('Error', 'Failed to update route stop');
    }
  }, [updateMutation.isSuccess, updateMutation.isError]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Stop Deleted', 'Route stop deleted successfully');
      deleteMutation.reset();
    }
    if (deleteMutation.isError) {
      showError('Error', 'Failed to delete route stop');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Filter route stops based on search
  const filteredRouteStops = useMemo(() => {
    if (!routeStopsData || !Array.isArray(routeStopsData)) return [];

    return routeStopsData.filter((stop: RouteStop) => {
      const matchesSearch = stop.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [routeStopsData, searchQuery]);

  const routeOptions = [
    { label: 'All Routes', value: '' },
    ...routes.map(route => ({ label: route.route_name, value: route.id })),
  ];

  const resetForm = () => {
    setFormData({
      route_id: selectedRouteId,
      name: '',
      number: 1,
      reaching_time: '07:00:00',
      pickup_time: '',
      drop_time: '',
      fees: 0,
      is_active: true,
    });
    setEditingStop(null);
  };

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
    Alert.alert(
      'Delete Route Stop',
      `Are you sure you want to delete "${stop.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(stop.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Stop name is required');
      return;
    }

    if (!formData.route_id) {
      Alert.alert('Error', 'Route is required');
      return;
    }

    if (editingStop) {
      updateMutation.mutate({ id: editingStop.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderRouteStopItem = useCallback(({ item }: { item: RouteStop }) => {
    const route = routes.find(r => r.id === item.route_id);

    return (
      <View style={[styles.stopCard, { backgroundColor: colors.card }]}>
        <View style={styles.stopHeader}>
          <View style={styles.stopInfo}>
            <ThemedText type="subtitle" style={styles.stopName}>
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
              resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create" size={16} color="white" />
              </TouchableOpacity>
            </UpdatePermissionGuard>
            <DeletePermissionGuard
              resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </DeletePermissionGuard>
          </View>
        </View>

        <View style={styles.stopDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="bus" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Route: {route?.route_name || 'Unknown Route'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Stop #{item.number} • {item.reaching_time}
            </ThemedText>
          </View>
          {item.pickup_time ? (
            <View style={styles.detailRow}>
              <Ionicons name="arrow-up-circle" size={16} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>
                Pickup: {item.pickup_time}
              </ThemedText>
            </View>
          ) : null}
          {item.drop_time ? (
            <View style={styles.detailRow}>
              <Ionicons name="arrow-down-circle" size={16} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>
                Drop: {item.drop_time}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Fees: ₹{item.fees}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }, [colors, routes]);

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
              You don't have permission to view route stops
            </ThemedText>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Header with Add Button */}
          <View style={styles.header}>
            <CreatePermissionGuard
              resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
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
            placeholder="Select route"
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
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={20} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Route Stops List */}
        <FlatList
          data={filteredRouteStops}
          renderItem={renderRouteStopItem}
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
              <Ionicons name="location" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Route Stops Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {selectedRouteId
                  ? 'No stops found for selected route'
                  : 'Select a route to view stops or add your first stop'}
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
                  {editingStop ? 'Edit Route Stop' : 'Add Route Stop'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Route *</ThemedText>
                  <CustomDropdown
                    data={routes.map(route => ({ label: route.route_name, value: route.id }))}
                    value={formData.route_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, route_id: value?.toString() || '' }))}
                    placeholder="Select route"
                  />
                </View>

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

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Reaching Time *</ThemedText>
                    <TouchableOpacity
                      style={[styles.input, styles.timeButton, { borderColor: colors.border }]}
                      onPress={() => openTimePicker('reaching_time')}
                    >
                      <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                      <ThemedText style={[styles.timeButtonText, { color: colors.foreground, flex: 1 }]}>
                        {formData.reaching_time || '07:00:00'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Fees *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="0"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.fees.toString()}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, fees: parseFloat(text) || 0 }))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Pickup Time</ThemedText>
                    <View style={styles.timeRow}>
                      <TouchableOpacity
                        style={[styles.input, styles.timeButton, styles.timeButtonFlex, { borderColor: colors.border }]}
                        onPress={() => openTimePicker('pickup_time')}
                      >
                        <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                        <ThemedText style={[styles.timeButtonText, { color: formData.pickup_time ? colors.foreground : colors['muted-foreground'], flex: 1 }]}>
                          {formData.pickup_time || 'Tap to set'}
                        </ThemedText>
                      </TouchableOpacity>
                      {formData.pickup_time ? (
                        <TouchableOpacity
                          style={styles.clearTimeBtn}
                          onPress={() => clearTime('pickup_time')}
                        >
                          <Ionicons name="close-circle" size={20} color={colors['muted-foreground']} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Drop Time</ThemedText>
                    <View style={styles.timeRow}>
                      <TouchableOpacity
                        style={[styles.input, styles.timeButton, styles.timeButtonFlex, { borderColor: colors.border }]}
                        onPress={() => openTimePicker('drop_time')}
                      >
                        <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                        <ThemedText style={[styles.timeButtonText, { color: formData.drop_time ? colors.foreground : colors['muted-foreground'], flex: 1 }]}>
                          {formData.drop_time || 'Tap to set'}
                        </ThemedText>
                      </TouchableOpacity>
                      {formData.drop_time ? (
                        <TouchableOpacity
                          style={styles.clearTimeBtn}
                          onPress={() => clearTime('drop_time')}
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
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
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
          </View>
        </Modal>

        {/* Custom Time Picker — separate Modal, layers above form Modal on both platforms */}
        <TimePickerModal
          visible={showTimePicker}
          initialTime={formData[activeTimeField]}
          onConfirm={confirmTime}
          onCancel={() => setShowTimePicker(false)}
          colors={colors}
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
  },
  stopName: {
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
