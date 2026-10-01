import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useToastContext } from '@/components/ToastProvider';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { TimePickerModal, formatTime12h } from '@/components/ui';
import { useTheme } from '@/contexts';
import type { Route as TransportRoute } from '../../src/api';
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute, useCreateRouteStop } from '../../hooks/use-transport';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { escapeCsv } from '@/src/utils/exportCsv';

import React, { useMemo, useState } from 'react';
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

interface PendingStopRow {
  key: number;
  name: string;
  fees: string;
  pickup_time: string;
  drop_time: string;
}

export default function RoutesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [formData, setFormData] = useState({
    route_name: '',
    starting_stop: '',
    ending_stop: '',
    number_of_stops: 0,
    route_type: '' as string,
    trip_type: '' as string,
    start_time: '07:00:00',
    end_time: '08:30:00',
    is_active: true,
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_time' | 'end_time'>('start_time');

  // Route Stops — auto-filled rows from "Number of Stops", created right after
  // the route itself (mirrors the web app's Add Route dialog). Only used on
  // create; existing routes manage their stops from the dedicated Route Stops screen.
  const [pendingStops, setPendingStops] = useState<PendingStopRow[]>([]);
  const [showStopTimePicker, setShowStopTimePicker] = useState(false);
  const [activeStopTarget, setActiveStopTarget] = useState<{ key: number; field: 'pickup_time' | 'drop_time' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Route Stops footer — mirrors the web page's stops manager below the table.
  // Picking a route (or Add Stop) opens the dedicated Route Stops screen with
  // that route preselected, so stop editing lives in one place.
  const [stopsRouteId, setStopsRouteId] = useState('');

  const router = useRouter();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps: confirmModalProps } = useConfirmModal();

  // Fetch routes data using permission-protected hook
  const { data: routesData, isLoading, error, refetch } = useRoutes();

  // Mutations using permission-protected hooks
  const createMutation = useCreateRoute();
  const updateMutation = useUpdateRoute();
  const deleteMutation = useDeleteRoute();
  const createRouteStopMutation = useCreateRouteStop();

  // Note: createMutation's success/error is handled inline in handleSubmit
  // (not via an effect) because route creation is immediately followed by
  // creating the pending route stops — closing/toasting on createMutation.isSuccess
  // alone would end the flow before the stops exist.

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Route updated successfully');
      updateMutation.reset();
    }
    if (updateMutation.isError) {
      showError('Failed to update route', updateMutation.error?.message || 'Unknown error');
    }
  }, [updateMutation.isSuccess, updateMutation.isError]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Route deleted successfully');
      deleteMutation.reset();
    }
    if (deleteMutation.isError) {
      showError('Failed to delete route', deleteMutation.error?.message || 'Unknown error');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Filter routes based on search
  const filteredRoutes = useMemo(() => {
    if (!routesData || !Array.isArray(routesData)) return [];

    return routesData.filter((route: TransportRoute) => {
      const matchesSearch = route.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            route.starting_stop.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            route.ending_stop.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [routesData, searchQuery]);

  // ── Export (mirrors the web app's Routes Export menu: CSV / Excel / JSON) ────
  const EXPORT_HEADERS = ['Route Name', 'Starting Point', 'Ending Point', 'Number of Stops', 'Up Journey Time', 'Down Journey Time', 'Active'];

  const buildExportRows = () =>
    filteredRoutes.map((r) => [
      r.route_name,
      r.starting_stop,
      r.ending_stop,
      r.number_of_stops,
      r.start_time ? r.start_time.substring(0, 5) : '',
      r.end_time ? r.end_time.substring(0, 5) : '',
      r.is_active ? 'Yes' : 'No',
    ]);

  // Web: real blob download, identical to the web app. Native: write the file
  // locally and hand it to the OS share sheet so it can be saved/shared.
  const shareOrDownload = async (filename: string, content: string, mimeType: string) => {
    if (Platform.OS === 'web') {
      const w = globalThis as any;
      const blob = new w.Blob([content], { type: `${mimeType};charset=utf-8;` });
      const url = w.URL.createObjectURL(blob);
      const link = w.document.createElement('a');
      link.href = url;
      link.download = filename;
      w.document.body.appendChild(link);
      link.click();
      link.remove();
      w.URL.revokeObjectURL(url);
      return;
    }
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, content);
    await Sharing.shareAsync(fileUri, { mimeType });
  };

  const handleExportCSV = async () => {
    try {
      const lines = [EXPORT_HEADERS, ...buildExportRows()].map((row) => row.map(escapeCsv).join(','));
      await shareOrDownload('routes_data.csv', lines.join('\n'), 'text/csv');
    } catch {
      showError('Error', 'Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const rows = [EXPORT_HEADERS, ...buildExportRows()];
      const html = `<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
      await shareOrDownload('routes_data.xls', html, 'application/vnd.ms-excel');
    } catch {
      showError('Error', 'Failed to export Excel');
    }
  };

  const handleDownloadData = async () => {
    try {
      const jsonData = {
        title: 'Routes',
        columns: EXPORT_HEADERS,
        data: filteredRoutes.map((r) => ({
          route_name: r.route_name,
          starting_stop: r.starting_stop,
          ending_stop: r.ending_stop,
          number_of_stops: r.number_of_stops,
          start_time: r.start_time ? r.start_time.substring(0, 5) : '',
          end_time: r.end_time ? r.end_time.substring(0, 5) : '',
          is_active: r.is_active ? 'Yes' : 'No',
        })),
        exportedAt: new Date().toISOString(),
      };
      await shareOrDownload('routes_data.json', JSON.stringify(jsonData, null, 2), 'application/json');
    } catch {
      showError('Error', 'Failed to export data');
    }
  };

  const resetForm = () => {
    setFormData({
      route_name: '',
      starting_stop: '',
      ending_stop: '',
      number_of_stops: 0,
      route_type: '',
      trip_type: '',
      start_time: '07:00:00',
      end_time: '08:30:00',
      is_active: true,
    });
    setEditingRoute(null);
    setPendingStops([]);
  };

  const handleEdit = (route: TransportRoute) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      starting_stop: route.starting_stop,
      ending_stop: route.ending_stop,
      number_of_stops: route.number_of_stops,
      route_type: route.route_type,
      trip_type: route.trip_type,
      start_time: route.start_time,
      end_time: route.end_time,
      is_active: route.is_active,
    });
    setPendingStops([]);
    setIsModalVisible(true);
  };

  // Auto-sync the pending stop rows with "Number of Stops" — create only.
  // Existing routes manage their stops from the dedicated Route Stops screen.
  React.useEffect(() => {
    if (editingRoute) return;
    const count = Math.max(0, Number(formData.number_of_stops) || 0);
    setPendingStops(prev => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        const toAdd = count - prev.length;
        const newRows: PendingStopRow[] = Array.from({ length: toAdd }, (_, i) => ({
          key: Date.now() + prev.length + i,
          name: '',
          fees: '',
          pickup_time: '07:00:00',
          drop_time: '08:30:00',
        }));
        return [...prev, ...newRows];
      }
      return prev.slice(0, count);
    });
  }, [formData.number_of_stops, editingRoute]);

  const updateStopField = (key: number, field: keyof Omit<PendingStopRow, 'key'>, value: string) => {
    setPendingStops(prev => prev.map(s => (s.key === key ? { ...s, [field]: value } : s)));
  };

  const removeStopRow = (key: number) => {
    setPendingStops(prev => {
      const next = prev.filter(s => s.key !== key);
      setFormData(fd => ({ ...fd, number_of_stops: next.length }));
      return next;
    });
  };

  const openStopTimePicker = (key: number, field: 'pickup_time' | 'drop_time') => {
    setActiveStopTarget({ key, field });
    setShowStopTimePicker(true);
  };

  const confirmStopTime = (time: string) => {
    if (activeStopTarget) {
      updateStopField(activeStopTarget.key, activeStopTarget.field, time);
    }
    setShowStopTimePicker(false);
  };

  const openStopsScreen = (routeId: string, add = false) => {
    if (!routeId) return;
    router.push({
      pathname: '/transport/route-stops',
      params: add ? { routeId, add: '1' } : { routeId },
    });
  };

  const handleDelete = (route: TransportRoute) => {
    confirm({
      title: 'Delete Route',
      message: `Are you sure you want to delete "${route.route_name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(route.id),
    });
  };

  const openTimePicker = (field: 'start_time' | 'end_time') => {
    setActiveTimeField(field);
    setShowTimePicker(true);
  };

  const confirmTime = (time: string) => {
    setFormData(prev => ({ ...prev, [activeTimeField]: time }));
    setShowTimePicker(false);
  };

  const handleSubmit = async () => {
    if (!formData.route_name.trim()) {
      showError('Error', 'Route name is required');
      return;
    }

    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data: formData });
      return;
    }

    setIsSubmitting(true);
    try {
      const newRoute = await createMutation.mutateAsync(formData);
      const validStops = pendingStops.filter(s => s.name.trim());
      for (let i = 0; i < validStops.length; i++) {
        const stop = validStops[i];
        await createRouteStopMutation.mutateAsync({
          route_id: newRoute.id,
          name: stop.name.trim(),
          number: i + 1,
          reaching_time: stop.pickup_time || '00:00:00',
          pickup_time: stop.pickup_time || undefined,
          drop_time: stop.drop_time || undefined,
          fees: parseFloat(stop.fees) || 0,
          is_active: true,
        });
      }
      setIsModalVisible(false);
      resetForm();
      showSuccess('Route created successfully');
      createMutation.reset();
    } catch (err: any) {
      showError('Failed to create route', err?.message || 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRouteItem = ({ item, index }: { item: TransportRoute; index: number }) => (
    <View style={[styles.routeCard, { backgroundColor: colors.card }]}>
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <View style={styles.routeTitleRow}>
            <ThemedText style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</ThemedText>
            <ThemedText type="subtitle" style={styles.routeName}>
              {item.route_name}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <ThemedText style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <UpdatePermissionGuard 
            resource={PERMISSION_RESOURCES.TRANSPORT_ROUTES}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard 
            resource={PERMISSION_RESOURCES.TRANSPORT_ROUTES}>
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

      <View style={styles.routeDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            {item.starting_stop} → {item.ending_stop}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            {item.start_time ? formatTime12h(item.start_time) : ''} - {item.end_time ? formatTime12h(item.end_time) : ''}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="git-branch" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            Number of Stops: {item.number_of_stops}
          </ThemedText>
        </View>
        {!!item.created_at && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Created: {new Date(item.created_at).toLocaleDateString('en-IN')}
            </ThemedText>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.viewStopsButton, { borderColor: colors.border }]}
        onPress={() => openStopsScreen(item.id)}
      >
        <Ionicons name="eye-outline" size={16} color={colors.primary} />
        <ThemedText style={[styles.viewStopsButtonText, { color: colors.primary }]}>
          View Stops
        </ThemedText>
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return (
      <AppLayout title="Routes">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading routes data
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
    <AppLayout title="Routes">
      <ReadOrListPermissionGuard 
        resource={PERMISSION_RESOURCES.TRANSPORT_ROUTES}
        fallback={
          <View style={styles.centerContainer}>
            <Ionicons name="lock-closed" size={64} color={colors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don&apos;t have permission to view transport routes
            </ThemedText>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Header with Export + Add buttons */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.exportButton, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowExportOptions(true)}
              accessibilityLabel="Export"
            >
              <Ionicons name="download-outline" size={16} color={colors.foreground} />
              <ThemedText style={[styles.exportButtonText, { color: colors.foreground }]}>Export</ThemedText>
            </TouchableOpacity>
            <CreatePermissionGuard
              resource={PERMISSION_RESOURCES.TRANSPORT_ROUTES}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  resetForm();
                  setIsModalVisible(true);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Route</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* Export Options Modal */}
          <Modal
            visible={showExportOptions}
            transparent
            animationType="fade"
            onRequestClose={() => setShowExportOptions(false)}
          >
            <TouchableOpacity
              style={styles.exportOverlay}
              activeOpacity={1}
              onPress={() => setShowExportOptions(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={[styles.exportOptions, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <ThemedText style={[styles.exportOptionTitle, { color: colors['muted-foreground'] }]}>Export As</ThemedText>
                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={() => { setShowExportOptions(false); handleExportCSV(); }}
                >
                  <Ionicons name="document-text" size={18} color={colors.foreground} />
                  <ThemedText style={styles.exportOptionText}>Export to CSV</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={() => { setShowExportOptions(false); handleExportExcel(); }}
                >
                  <Ionicons name="grid" size={18} color={colors.foreground} />
                  <ThemedText style={styles.exportOptionText}>Export to Excel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportOption}
                  onPress={() => { setShowExportOptions(false); handleDownloadData(); }}
                >
                  <Ionicons name="download" size={18} color={colors.foreground} />
                  <ThemedText style={styles.exportOptionText}>Download Data</ThemedText>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search routes..."
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

        {/* Routes List */}
        <FlatList
          data={filteredRoutes}
          renderItem={renderRouteItem}
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
          ListFooterComponent={
            <View style={[styles.stopsFooter, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText style={styles.stopsFooterTitle}>Route Stops</ThemedText>
              <View style={styles.stopsFooterRow}>
                <ThemedText style={styles.stopsFooterLabel}>Route Name:</ThemedText>
                <View style={{ flex: 1 }}>
                  <CustomDropdown
                    data={(Array.isArray(routesData) ? routesData : []).map((route: TransportRoute) => ({
                      label: route.route_name,
                      value: route.id,
                    }))}
                    value={stopsRouteId}
                    onChange={(value) => {
                      const id = value?.toString() || '';
                      setStopsRouteId(id);
                      openStopsScreen(id);
                    }}
                    placeholder="Select a route to view stops..."
                  />
                </View>
              </View>
              <CreatePermissionGuard resource={PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS}>
                <TouchableOpacity
                  style={[
                    styles.stopsFooterButton,
                    { backgroundColor: colors.primary, opacity: stopsRouteId ? 1 : 0.5 },
                  ]}
                  disabled={!stopsRouteId}
                  onPress={() => openStopsScreen(stopsRouteId, true)}
                >
                  <Ionicons name="add" size={18} color="white" />
                  <ThemedText style={styles.stopsFooterButtonText}>Add Stop</ThemedText>
                </TouchableOpacity>
              </CreatePermissionGuard>
              {!stopsRouteId && (
                <ThemedText style={[styles.stopsFooterHint, { color: colors['muted-foreground'] }]}>
                  Select a route to view its stops.
                </ThemedText>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bus" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Routes Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Add your first route to get started'}
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
                  {editingRoute ? 'Edit Route' : 'Add New Route'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Route Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter route name"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.route_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, route_name: text }))}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Starting Point *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Starting point"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.starting_stop}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, starting_stop: text }))}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Ending Point *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Ending point"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.ending_stop}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, ending_stop: text }))}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Number of Stops</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.number_of_stops.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, number_of_stops: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                  />
                </View>

                {/* Route type, trip type and journey times are edit-only: the web
                    Add Route dialog omits them and creates with the defaults. */}
                {/* Route Type / Trip Type dropped: the web page has no field for
                    either, on the Add dialog or the routes table's inline edit —
                    they're never user-editable there. Up/Down Journey Time mirror
                    the table's editable "Up Journey Time" / "Down Journey Time"
                    columns, edit-only like on web. */}
                {editingRoute && (
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <ThemedText style={styles.label}>Up Journey Time *</ThemedText>
                      <TouchableOpacity
                        style={[styles.input, styles.timeButton, { borderColor: colors.border }]}
                        onPress={() => openTimePicker('start_time')}
                      >
                        <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                        <ThemedText style={[styles.timeButtonText, { color: formData.start_time ? colors.foreground : colors['muted-foreground'], flex: 1 }]}>
                          {formData.start_time ? formatTime12h(formData.start_time) : 'Select time'}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                      <ThemedText style={styles.label}>Down Journey Time *</ThemedText>
                      <TouchableOpacity
                        style={[styles.input, styles.timeButton, { borderColor: colors.border }]}
                        onPress={() => openTimePicker('end_time')}
                      >
                        <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                        <ThemedText style={[styles.timeButtonText, { color: formData.end_time ? colors.foreground : colors['muted-foreground'], flex: 1 }]}>
                          {formData.end_time ? formatTime12h(formData.end_time) : 'Select time'}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

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

                {!editingRoute && (
                  <View style={[styles.stopsSection, { borderColor: colors.border }]}>
                    <View style={styles.stopsSectionHeader}>
                      <ThemedText style={styles.stopsSectionTitle}>
                        Route Stops
                      </ThemedText>
                      <View style={[styles.stopsCountBadge, { backgroundColor: colors.muted }]}>
                        <ThemedText style={[styles.stopsCountText, { color: colors.foreground }]}>
                          {pendingStops.length} stop{pendingStops.length !== 1 ? 's' : ''}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText style={[styles.stopsSectionHint, { color: colors['muted-foreground'] }]}>
                      Auto-filled from &quot;Number of Stops&quot;
                    </ThemedText>

                    {pendingStops.length === 0 ? (
                      <ThemedText style={[styles.stopsEmptyText, { color: colors['muted-foreground'] }]}>
                        Enter a number in &quot;Number of Stops&quot; to add stop rows.
                      </ThemedText>
                    ) : (
                      pendingStops.map((stop, idx) => (
                        <View key={stop.key} style={[styles.stopRow, { borderColor: colors.border }]}>
                          <View style={styles.stopRowHeader}>
                            <ThemedText style={styles.stopRowIndex}>Stop {idx + 1}</ThemedText>
                            <TouchableOpacity
                              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                              onPress={() => removeStopRow(stop.key)}
                              accessibilityLabel="Remove stop"
                            >
                              <Ionicons name="trash" size={16} color={colors.destructive} />
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={[styles.input, { color: colors.foreground, borderColor: colors.border, marginBottom: 8 }]}
                            placeholder="Stop name"
                            placeholderTextColor={colors['muted-foreground']}
                            value={stop.name}
                            onChangeText={(text) => updateStopField(stop.key, 'name', text)}
                          />
                          <View style={[styles.formGroup, { marginBottom: 8 }]}>
                            <ThemedText style={styles.stopFieldLabel}>Amount (₹/yr)</ThemedText>
                            <TextInput
                              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                              placeholder="0"
                              placeholderTextColor={colors['muted-foreground']}
                              keyboardType="numeric"
                              value={stop.fees}
                              onChangeText={(text) => updateStopField(stop.key, 'fees', text)}
                            />
                          </View>
                          <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8, marginBottom: 0 }]}>
                              <ThemedText style={styles.stopFieldLabel}>Up Journey Time</ThemedText>
                              <TouchableOpacity
                                style={[styles.input, styles.timeButton, { borderColor: colors.border }]}
                                onPress={() => openStopTimePicker(stop.key, 'pickup_time')}
                              >
                                <Ionicons name="time-outline" size={14} color={colors['muted-foreground']} />
                                <ThemedText style={[styles.timeButtonText, { color: colors.foreground, flex: 1 }]}>
                                  {formatTime12h(stop.pickup_time)}
                                </ThemedText>
                              </TouchableOpacity>
                            </View>
                            <View style={[styles.formGroup, { flex: 1, marginLeft: 8, marginBottom: 0 }]}>
                              <ThemedText style={styles.stopFieldLabel}>Down Journey Time</ThemedText>
                              <TouchableOpacity
                                style={[styles.input, styles.timeButton, { borderColor: colors.border }]}
                                onPress={() => openStopTimePicker(stop.key, 'drop_time')}
                              >
                                <Ionicons name="time-outline" size={14} color={colors['muted-foreground']} />
                                <ThemedText style={[styles.timeButtonText, { color: colors.foreground, flex: 1 }]}>
                                  {formatTime12h(stop.drop_time)}
                                </ThemedText>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
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
                  disabled={isSubmitting || updateMutation.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {isSubmitting || updateMutation.isPending ? 'Saving...' : (editingRoute ? 'Update' : 'Add Route')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Time Picker — separate Modal, layers above the form Modal on both platforms */}
        <TimePickerModal
          visible={showTimePicker}
          initialTime={formData[activeTimeField]}
          onConfirm={confirmTime}
          onCancel={() => setShowTimePicker(false)}
          withSeconds
          presets={['06:00', '07:00', '08:00', '08:30', '14:00', '17:00']}
        />

        {/* Route Stop Time Picker — separate Modal for the pending stop rows */}
        <TimePickerModal
          visible={showStopTimePicker}
          initialTime={
            activeStopTarget
              ? pendingStops.find(s => s.key === activeStopTarget.key)?.[activeStopTarget.field] || '07:00:00'
              : '07:00:00'
          }
          onConfirm={confirmStopTime}
          onCancel={() => setShowStopTimePicker(false)}
          withSeconds
          presets={['06:00', '07:00', '08:00', '08:30', '14:00', '17:00']}
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
    gap: 8,
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportButtonText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 16,
  },
  exportOptions: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    minWidth: 200,
    marginTop: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  exportOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderRadius: 8,
  },
  exportOptionText: {
    fontSize: 15,
    fontWeight: '500',
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
  viewStopsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewStopsButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopsFooter: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  stopsFooterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  stopsFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stopsFooterLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  stopsFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
  },
  stopsFooterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  stopsFooterHint: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  routeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  serialNo: {
    fontSize: 11,
    fontWeight: '600',
  },
  routeName: {
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
  routeDetails: {
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
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButtonText: {
    fontSize: 16,
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
  stopsSection: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  stopsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  stopsSectionHint: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  stopsCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stopsCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stopsEmptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  stopRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  stopRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopRowIndex: {
    fontSize: 13,
    fontWeight: '600',
  },
  stopFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  pickerOptionText: {
    fontSize: 16,
  },
  pickerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 2,
  },
  pickerCreateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  pickerCreateText: {
    fontSize: 16,
    fontWeight: '600',
  },
});