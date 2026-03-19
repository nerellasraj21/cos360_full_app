import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useTrips, useStudents, useFeeTerms, useRoutesDropdown } from '@/hooks';
import { routeStopsApi } from '../../src/api';
import { studentTripsApi, StudentTrip } from '../../src/api';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTrip, setEditingTrip] = useState<StudentTrip | null>(null);
  const [formData, setFormData] = useState({
    trip_id: '',
    student_id: '',
    stop_id: '',
    fee_term_id: '',
    fee_per_term: 0,
    is_active: true,
    route_id: '', // Add route_id for filtering stops
  });

  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Fetch student trips data
  const { data: studentTripsData, isLoading, error, refetch } = useQuery({
    queryKey: ['student-trips'],
    queryFn: () => studentTripsApi.getStudentTrips(),
  });

  const { data: trips = [] } = useTrips();
  const { data: students = [] } = useStudents();
  const { data: feeTerms = [] } = useFeeTerms();
  const { data: routes = [] } = useRoutesDropdown();

  // Fetch route stops based on selected route
  const { data: routeStops = [] } = useQuery({
    queryKey: ['route-stops', formData.route_id],
    queryFn: () => routeStopsApi.getRouteStops({ route_id: formData.route_id || undefined }),
    enabled: !!formData.route_id,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: studentTripsApi.createStudentTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-trips'] });
      setIsModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Student trip created successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create student trip');
      console.error('Create error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StudentTrip> }) =>
      studentTripsApi.updateStudentTrip(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-trips'] });
      setIsModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Student trip updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update student trip');
      console.error('Update error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentTripsApi.deleteStudentTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-trips'] });
      Alert.alert('Success', 'Student trip deleted successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to delete student trip');
      console.error('Delete error:', error);
    },
  });

  // Filter student trips based on search
  const filteredStudentTrips = useMemo(() => {
    if (!studentTripsData || !Array.isArray(studentTripsData)) return [];

    return studentTripsData.filter((item: StudentTrip) => {
      const trip = trips.find(t => t.id === item.trip_id);
      const student = students.find(s => s.id === item.student_id);
      const feeTerm = feeTerms.find(f => f.id === item.fee_term_id);
      const matchesSearch = trip?.trip_number.toString().includes(searchQuery) ||
                            student?.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            feeTerm?.term_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [studentTripsData, searchQuery, trips, students, feeTerms]);

  const resetForm = () => {
    setFormData({
      trip_id: '',
      student_id: '',
      stop_id: '',
      fee_term_id: '',
      fee_per_term: 0,
      is_active: true,
      route_id: '',
    });
    setEditingTrip(null);
  };

  const handleEdit = (trip: StudentTrip) => {
    setEditingTrip(trip);
    setFormData({
      trip_id: trip.trip_id,
      student_id: trip.student_id,
      stop_id: trip.stop_id,
      fee_term_id: trip.fee_term_id,
      fee_per_term: trip.fee_per_term,
      is_active: trip.is_active || true,
      route_id: '', // Will be set when trip is selected
    });
    setIsModalVisible(true);
  };

  const handleDelete = (trip: StudentTrip) => {
    const student = students.find(s => s.id === trip.student_id);
    Alert.alert(
      'Delete Student Trip',
      `Are you sure you want to delete trip for ${student?.display_name || 'Unknown Student'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(trip.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.trip_id) {
      Alert.alert('Error', 'Trip ID is required');
      return;
    }

    if (!formData.student_id) {
      Alert.alert('Error', 'Student is required');
      return;
    }

    if (!formData.stop_id) {
      Alert.alert('Error', 'Stop ID is required');
      return;
    }

    if (!formData.fee_term_id) {
      Alert.alert('Error', 'Fee term is required');
      return;
    }

    if (editingTrip) {
      updateMutation.mutate({ id: editingTrip.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderStudentTripItem = useCallback(({ item }: { item: StudentTrip }) => {
    const trip = trips.find(t => t.id === item.trip_id);
    const student = students.find(s => s.id === item.student_id);
    const feeTerm = feeTerms.find(f => f.id === item.fee_term_id);
    const route = routes.find(r => r.id === trip?.route_id);

    return (
      <View style={[styles.tripCard, { backgroundColor: colors.card }]}>
        <View style={styles.tripHeader}>
          <View style={styles.tripInfo}>
            <ThemedText type="subtitle" style={styles.studentName}>
              {student?.display_name || 'Unknown Student'}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
              <ThemedText style={styles.statusText}>
                {item.is_active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="bus" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Trip #{trip?.trip_number} - {route?.route_name || 'Unknown Route'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Stop: {item.stop_id}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              ₹{item.fee_per_term} per term ({feeTerm?.term_name || 'Unknown Term'})
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
  }, [colors, trips, students, feeTerms, routes]);

  if (error) {
    return (
      <AppLayout title="Student Trips">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading student trips data
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
    <AppLayout title="Student Trips">
      <View style={styles.container}>
        {/* Header with Add Button */}
        <View style={styles.header}>
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
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search student trips..."
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

        {/* Student Trips List */}
        <FlatList
          data={filteredStudentTrips}
          renderItem={renderStudentTripItem}
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
              <Ionicons name="school" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Student Trips Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Add student trip assignments to get started'}
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
                  {editingTrip ? 'Edit Student Trip' : 'Add Student Trip'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Trip *</ThemedText>
                  <CustomDropdown
                    data={trips.map(trip => ({
                      label: `Trip #${trip.trip_number} - ${trip.vehicle_id} - ${trip.driver_id}`,
                      value: trip.id
                    }))}
                    value={formData.trip_id}
                    onChange={(value) => {
                      const selectedTripId = value?.toString() || '';
                      const selectedTrip = trips.find(t => t.id === selectedTripId);
                      setFormData(prev => ({
                        ...prev,
                        trip_id: selectedTripId,
                        route_id: selectedTrip?.route_id || '',
                      }));
                    }}
                    placeholder="Select trip"
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Student *</ThemedText>
                  <CustomDropdown
                    data={students.map(student => ({ label: student.display_name, value: student.id }))}
                    value={formData.student_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, student_id: value?.toString() || '' }))}
                    placeholder="Select student"
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Stop *</ThemedText>
                    <CustomDropdown
                      data={routeStops.map(stop => ({
                        label: `${stop.name} - ₹${stop.fees}`,
                        value: stop.id
                      }))}
                      value={formData.stop_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, stop_id: value?.toString() || '' }))}
                      placeholder="Select stop"
                      disabled={!formData.route_id}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Fee Term *</ThemedText>
                    <CustomDropdown
                      data={feeTerms.map(term => ({ label: term.term_name, value: term.id }))}
                      value={formData.fee_term_id}
                      onChange={(value) => setFormData(prev => ({ ...prev, fee_term_id: value?.toString() || '' }))}
                      placeholder="Select fee term"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Fee per Term *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.fee_per_term.toString()}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, fee_per_term: parseFloat(text) || 0 }))}
                    keyboardType="numeric"
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
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingTrip ? 'Update' : 'Create')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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