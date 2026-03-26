import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import type { Route as TransportRoute, RouteCreate, RouteUpdate } from '../../src/api';
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute } from '../../hooks/use-transport';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';
import { Ionicons } from '@expo/vector-icons';

import React, { useCallback, useMemo, useState } from 'react';
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

export default function RoutesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  const [formData, setFormData] = useState({
    route_name: '',
    starting_stop: '',
    ending_stop: '',
    number_of_stops: 8,
    route_type: 'upward' as 'upward' | 'downward',
    trip_type: 'first trip' as 'first trip' | 'second trip',
    start_time: '07:00:00',
    end_time: '08:30:00',
    is_active: true,
  });

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  // Fetch routes data using permission-protected hook
  const { data: routesData, isLoading, error, refetch } = useRoutes();

  // Mutations using permission-protected hooks
  const createMutation = useCreateRoute();
  const updateMutation = useUpdateRoute();
  const deleteMutation = useDeleteRoute();

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Route created successfully');
      createMutation.reset();
    }
    if (createMutation.isError) {
      showError('Failed to create route', createMutation.error?.message || 'Unknown error');
    }
  }, [createMutation.isSuccess, createMutation.isError]);

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

  const resetForm = () => {
    setFormData({
      route_name: '',
      starting_stop: '',
      ending_stop: '',
      number_of_stops: 8,
      route_type: 'upward',
      trip_type: 'first trip',
      start_time: '07:00:00',
      end_time: '08:30:00',
      is_active: true,
    });
    setEditingRoute(null);
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
    setIsModalVisible(true);
  };

  const handleDelete = (route: TransportRoute) => {
    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete "${route.route_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(route.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.route_name.trim()) {
      Alert.alert('Error', 'Route name is required');
      return;
    }

    if (editingRoute) {
      updateMutation.mutate({ id: editingRoute.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderRouteItem = useCallback(({ item }: { item: TransportRoute }) => (
    <View style={[styles.routeCard, { backgroundColor: colors.card }]}>
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <ThemedText type="subtitle" style={styles.routeName}>
            {item.route_name}
          </ThemedText>
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
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard 
            resource={PERMISSION_RESOURCES.TRANSPORT_ROUTES}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
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
            {item.start_time} - {item.end_time} ({item.route_type}, {item.trip_type})
          </ThemedText>
        </View>
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
              You don't have permission to view transport routes
            </ThemedText>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Header with Add Button */}
          <View style={styles.header}>
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
            <TouchableOpacity onPress={() => setSearchQuery('')}>
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
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title" style={styles.modalTitle}>
                  {editingRoute ? 'Edit Route' : 'Add Route'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
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
                    <ThemedText style={styles.label}>Starting Stop *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Enter starting stop"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.starting_stop}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, starting_stop: text }))}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Ending Stop *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Enter ending stop"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.ending_stop}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, ending_stop: text }))}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Number of Stops *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="8"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.number_of_stops.toString()}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, number_of_stops: parseInt(text) || 8 }))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Route Type *</ThemedText>
                    <TouchableOpacity
                      style={[styles.dropdown, { borderColor: colors.border }]}
                      onPress={() => {
                        setFormData(prev => ({
                          ...prev,
                          route_type: prev.route_type === 'upward' ? 'downward' : 'upward'
                        }));
                      }}
                    >
                      <ThemedText style={{ color: colors.foreground }}>
                        {formData.route_type === 'upward' ? 'Upward' : 'Downward'}
                      </ThemedText>
                      <Ionicons name="chevron-down" size={16} color={colors['muted-foreground']} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Trip Type *</ThemedText>
                    <TouchableOpacity
                      style={[styles.dropdown, { borderColor: colors.border }]}
                      onPress={() => {
                        setFormData(prev => ({
                          ...prev,
                          trip_type: prev.trip_type === 'first trip' ? 'second trip' : 'first trip'
                        }));
                      }}
                    >
                      <ThemedText style={{ color: colors.foreground }}>
                        {formData.trip_type === 'first trip' ? 'First Trip' : 'Second Trip'}
                      </ThemedText>
                      <Ionicons name="chevron-down" size={16} color={colors['muted-foreground']} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Start Time *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="07:00:00"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.start_time}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, start_time: text }))}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>End Time *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="08:30:00"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.end_time}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, end_time: text }))}
                  />
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
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingRoute ? 'Update' : 'Create')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  routeName: {
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