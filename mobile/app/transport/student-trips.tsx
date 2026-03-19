import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useStudents, useFeeTerms, useTrips, useRouteStops } from '@/hooks';
import { useStudentTrips, useCreateStudentTrip, useUpdateStudentTrip, useDeleteStudentTrip } from '../../hooks/use-transport';
import { StudentTrip } from '../../src/types/transport';
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

export default function StudentTripsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<StudentTrip | null>(null);
  const [formData, setFormData] = useState({
    trip_id: '',
    student_id: '',
    stop_id: '',
    fee_term_id: '',
    fee_per_term: 0,
  });

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  // Fetch data using permission-protected hooks
  const { data: studentTripsData, isLoading, error, refetch } = useStudentTrips();
  const { data: studentsData } = useStudents();
  const { data: feeTermsData } = useFeeTerms();
  const { data: tripsData } = useTrips();
  const { data: routeStopsData } = useRouteStops();

  // Mutations using permission-protected hooks
  const createMutation = useCreateStudentTrip();
  const updateMutation = useUpdateStudentTrip();
  const deleteMutation = useDeleteStudentTrip();

  const students = studentsData || [];
  const feeTerms = feeTermsData || [];
  const trips = tripsData || [];
  const routeStops = routeStopsData || [];

  // Debug logging
  React.useEffect(() => {
    console.log('Students data:', students.length, students.slice(0, 2));
    console.log('Fee terms data:', feeTerms.length, feeTerms.slice(0, 2));
    console.log('Trips data:', trips.length, trips.slice(0, 2));
    console.log('Route stops data:', routeStops.length, routeStops.slice(0, 2));
  }, [students, feeTerms, trips, routeStops]);

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Student transport assignment created successfully');
      createMutation.reset();
    }
    if (createMutation.isError) {
      showError('Failed to create assignment', createMutation.error?.message || 'Unknown error');
    }
  }, [createMutation.isSuccess, createMutation.isError]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Student transport assignment updated successfully');
      updateMutation.reset();
    }
    if (updateMutation.isError) {
      showError('Failed to update assignment', updateMutation.error?.message || 'Unknown error');
    }
  }, [updateMutation.isSuccess, updateMutation.isError]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Student transport assignment deleted successfully');
      deleteMutation.reset();
    }
    if (deleteMutation.isError) {
      showError('Failed to delete assignment', deleteMutation.error?.message || 'Unknown error');
    }
  }, [deleteMutation.isSuccess, deleteMutation.isError]);

  // Filter student trips based on search and status
  const filteredTrips = useMemo(() => {
    if (!studentTripsData || !Array.isArray(studentTripsData)) return [];

    return studentTripsData.filter((assignment: StudentTrip) => {
      const student = students.find(s => s.id === assignment.student_id);
      const searchTerm = searchQuery.toLowerCase();

      // Search filter
      const matchesSearch = !searchQuery || (
        student?.display_name?.toLowerCase().includes(searchTerm) ||
        student?.admission_number?.toLowerCase().includes(searchTerm)
      );

      // Status filter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && assignment.is_active !== false) ||
        (statusFilter === 'inactive' && assignment.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [studentTripsData, students, searchQuery, statusFilter]);

  const resetForm = () => {
    setFormData({
      trip_id: '',
      student_id: '',
      stop_id: '',
      fee_term_id: '',
      fee_per_term: 0,
    });
    setEditingTrip(null);
  };

  const handleEdit = (assignment: StudentTrip) => {
    setEditingTrip(assignment);
    setFormData({
      trip_id: assignment.trip_id,
      student_id: assignment.student_id,
      stop_id: assignment.stop_id,
      fee_term_id: assignment.fee_term_id,
      fee_per_term: assignment.fee_per_term,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (assignment: StudentTrip) => {
    const student = students.find(s => s.id === assignment.student_id);
    const trip = trips.find(t => t.id === assignment.trip_id);
    Alert.alert(
      'Delete Student Transport Assignment',
      `Are you sure you want to delete transport assignment for ${student?.display_name || 'Unknown Student'} on Trip ${trip?.trip_number || 'Unknown Trip'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(assignment.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    // Validation for creation
    if (!editingTrip) {
      if (!formData.trip_id) {
        Alert.alert('Error', 'Trip is required');
        return;
      }

      if (!formData.student_id) {
        Alert.alert('Error', 'Student is required');
        return;
      }

      if (!formData.stop_id) {
        Alert.alert('Error', 'Stop is required');
        return;
      }
    }

    if (formData.fee_per_term <= 0) {
      Alert.alert('Error', 'Fee per term must be a positive number');
      return;
    }

    if (editingTrip) {
      updateMutation.mutate({ id: editingTrip.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderAssignmentItem = useCallback(({ item }: { item: StudentTrip }) => {
    const student = students.find(s => s.id === item.student_id);
    const trip = trips.find(t => t.id === item.trip_id);
    const stop = routeStops.find(s => s.id === item.stop_id);
    const feeTerm = feeTerms.find(f => f.id === item.fee_term_id);

    const studentDisplay = student?.display_name
      ? (student.admission_number ? `${student.display_name} (${student.admission_number})` : student.display_name)
      : 'Unknown Student';

    const tripDisplay = trip ? `Trip ${trip.trip_number}` : 'Unknown Trip';
    const stopDisplay = stop?.name || 'Unknown Stop';
    const feeTermDisplay = feeTerm?.term_name || 'No Term';

    return (
      <View style={[styles.assignmentCard, { backgroundColor: colors.card }]}>
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <ThemedText type="subtitle" style={styles.studentName}>
              {studentDisplay}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: item.is_active !== false ? '#10B981' : '#EF4444' }]}>
              <ThemedText style={styles.statusText}>
                {item.is_active !== false ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
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

        <View style={styles.assignmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="navigate" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Trip: {tripDisplay}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Stop: {stopDisplay}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="school" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Fee Term: {feeTermDisplay}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Fee per Term: ₹{item.fee_per_term.toLocaleString()}
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
    );
  }, [colors, students, trips, routeStops, feeTerms]);

  if (error) {
    return (
      <AppLayout title="Student Transport Assignments">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading student transport assignments
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
    <AppLayout title="Student Transport Assignments">
      <ReadOrListPermissionGuard
        resource={PERMISSION_RESOURCES.TRANSPORT_TRIPS}
        fallback={
          <View style={styles.centerContainer}>
            <Ionicons name="lock-closed" size={64} color={colors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don't have permission to view transport assignments
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
                <ThemedText style={styles.addButtonText}>Add New</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* Filters Section */}
          <View style={styles.filtersContainer}>
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={20} color={colors['muted-foreground']} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search by name or admission number..."
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

            {/* Status Filter */}
            <View style={styles.statusFilterContainer}>
              <CustomDropdown
                data={[
                  { label: 'All Status', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
                placeholder="Filter by status"
              />
            </View>
          </View>

          {/* Student Transport Assignments List */}
          <FlatList
            data={filteredTrips}
            renderItem={renderAssignmentItem}
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
                  No Transport Assignments Found
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Add student transport assignments to get started'}
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
                    {editingTrip ? 'Edit Transport Assignment' : 'Add Transport Assignment'}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.foreground} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalBody}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Debug info */}
                  <View style={{ marginBottom: 10, padding: 10, backgroundColor: colors.muted }}>
                    <ThemedText style={{ fontSize: 12 }}>
                      Debug: Students: {students.length}, Trips: {trips.length}, Stops: {routeStops.length}, Terms: {feeTerms.length}
                    </ThemedText>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Trip {!editingTrip && '*'}</ThemedText>
                    <CustomDropdown
                      data={trips.map(trip => ({
                        label: `Trip ${trip.trip_number}`,
                        value: trip.id
                      }))}
                      value={formData.trip_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, trip_id: value?.toString() || '' }))}
                      placeholder="Select trip"
                      maxHeight={200}
                      containerStyle={{ zIndex: 3000, elevation: 3000 }}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Student {!editingTrip && '*'}</ThemedText>
                    <CustomDropdown
                      data={students.map(student => ({
                        label: student.admission_number
                          ? `${student.display_name} (${student.admission_number})`
                          : student.display_name,
                        value: student.id
                      }))}
                      value={formData.student_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, student_id: value?.toString() || '' }))}
                      placeholder="Select student"
                      maxHeight={200}
                      containerStyle={{ zIndex: 2000, elevation: 2000 }}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Stop {!editingTrip && '*'}</ThemedText>
                    <CustomDropdown
                      data={routeStops.map(stop => ({
                        label: stop.name,
                        value: stop.id
                      }))}
                      value={formData.stop_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, stop_id: value?.toString() || '' }))}
                      placeholder="Select stop"
                      maxHeight={200}
                      containerStyle={{ zIndex: 1500, elevation: 1500 }}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Fee Term</ThemedText>
                    <CustomDropdown
                      data={feeTerms.map(term => ({
                        label: term.term_name,
                        value: term.id
                      }))}
                      value={formData.fee_term_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, fee_term_id: value?.toString() || '' }))}
                      placeholder="Select fee term"
                      maxHeight={200}
                      containerStyle={{ zIndex: 1000, elevation: 1000 }}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.label}>Fee Per Term *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Enter amount"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.fee_per_term > 0 ? formData.fee_per_term.toString() : ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, fee_per_term: parseFloat(text) || 0 }))}
                      keyboardType="numeric"
                    />
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
                      {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingTrip ? 'Update' : 'Create')}
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
  filtersContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  statusFilterContainer: {
    marginBottom: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  assignmentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  assignmentInfo: {
    flex: 1,
  },
  studentName: {
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
  assignmentDetails: {
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
    zIndex: 999,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
    zIndex: 1000,
    elevation: 1000,
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
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
    zIndex: 1,
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