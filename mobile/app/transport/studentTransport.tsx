import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useRoutesDropdown, useStudents } from '@/hooks';
import { studentTransportApi, StudentTransport } from '../../src/api';
import { PERMISSION_RESOURCES } from '../../src/types/permissions';
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

export default function StudentTransportScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTransport, setEditingTransport] = useState<StudentTransport | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    route_id: '',
    stop_id: '',
    trip_type: 'first trip',
    academic_year_id: '',
    fare_amount: 0,
    is_active: true,
  });

  const router = useRouter();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Fetch student transport data
  const { data: studentTransportData, isLoading, error, refetch } = useQuery({
    queryKey: ['student-transport'],
    queryFn: () => studentTransportApi.getStudentTransports(),
  });

  const { data: routes = [] } = useRoutesDropdown();
  const { data: students = [] } = useStudents();

  // Mutations
  const createMutation = useMutation({
    mutationFn: studentTransportApi.createStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      setIsModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Student transport created successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create student transport');
      console.error('Create error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StudentTransport> }) =>
      studentTransportApi.updateStudentTransport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      setIsModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Student transport updated successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update student transport');
      console.error('Update error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentTransportApi.deleteStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      Alert.alert('Success', 'Student transport deleted successfully');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to delete student transport');
      console.error('Delete error:', error);
    },
  });

  // Filter student transports based on search
  const filteredStudentTransports = useMemo(() => {
    if (!studentTransportData || !Array.isArray(studentTransportData)) return [];

    return studentTransportData.filter((item: StudentTransport) => {
      const student = students.find(s => s.id === item.student_id);
      const route = routes.find(r => r.id === item.route_id);
      const matchesSearch = student?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            route?.route_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.trip_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [studentTransportData, searchQuery, students, routes]);

  const resetForm = () => {
    setFormData({
      student_id: '',
      route_id: '',
      stop_id: '',
      trip_type: 'first trip',
      academic_year_id: '',
      fare_amount: 0,
      is_active: true,
    });
    setEditingTransport(null);
  };

  const handleEdit = (transport: StudentTransport) => {
    setEditingTransport(transport);
    setFormData({
      student_id: transport.student_id,
      route_id: transport.route_id,
      stop_id: transport.stop_id,
      trip_type: transport.trip_type,
      academic_year_id: transport.academic_year_id,
      fare_amount: transport.fare_amount,
      is_active: transport.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (transport: StudentTransport) => {
    const student = students.find(s => s.id === transport.student_id);
    Alert.alert(
      'Delete Student Transport',
      `Are you sure you want to delete transport for ${student?.name || 'Unknown Student'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(transport.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.student_id) {
      Alert.alert('Error', 'Student is required');
      return;
    }

    if (!formData.route_id) {
      Alert.alert('Error', 'Route is required');
      return;
    }

    if (!formData.stop_id) {
      Alert.alert('Error', 'Stop ID is required');
      return;
    }

    if (editingTransport) {
      updateMutation.mutate({ id: editingTransport.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderStudentTransportItem = useCallback(({ item }: { item: StudentTransport }) => {
    const student = students.find(s => s.id === item.student_id);
    const route = routes.find(r => r.id === item.route_id);

    return (
      <View style={[styles.transportCard, { backgroundColor: colors.card }]}>
        <View style={styles.transportHeader}>
          <View style={styles.transportInfo}>
            <ThemedText type="subtitle" style={styles.studentName}>
              {student?.name || 'Unknown Student'}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
              <ThemedText style={styles.statusText}>
                {item.is_active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <UpdatePermissionGuard 
              resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create" size={16} color="white" />
              </TouchableOpacity>
            </UpdatePermissionGuard>
            <DeletePermissionGuard 
              resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </DeletePermissionGuard>
          </View>
        </View>

        <View style={styles.transportDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="bus" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Route: {route?.route_name || 'Unknown Route'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="navigate" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Trip: {item.trip_type}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={16} color={colors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Fare: ₹{item.fare_amount}
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
  }, [colors, students, routes]);

  if (error) {
    return (
      <AppLayout title="Student Transport">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading student transport data
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
    <AppLayout title="Student Transport">
      <ReadOrListPermissionGuard 
        resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}
        fallback={
          <View style={styles.centerContainer}>
            <Ionicons name="lock-closed" size={64} color={colors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don't have permission to view student transport
            </ThemedText>
          </View>
        }
      >
        <View style={styles.container}>
          {/* Header with Add Button */}
          <View style={styles.header}>
            <CreatePermissionGuard 
              resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  resetForm();
                  setIsModalVisible(true);
                }}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Transport</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search student transport..."
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

        {/* Student Transport List */}
        <FlatList
          data={filteredStudentTransports}
          renderItem={renderStudentTransportItem}
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
              <Ionicons name="people" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Student Transport Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? 'Try adjusting your search query'
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
                  {editingTransport ? 'Edit Student Transport' : 'Add Student Transport'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Student *</ThemedText>
                  <CustomDropdown
                    data={students.map(student => ({ label: student.name, value: student.id }))}
                    value={formData.student_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, student_id: value?.toString() || '' }))}
                    placeholder="Select student"
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

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Stop ID *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Enter stop ID"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.stop_id}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, stop_id: text }))}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
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
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Academic Year *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="Enter academic year ID"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.academic_year_id}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, academic_year_id: text }))}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>Fare Amount *</ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                      placeholder="0"
                      placeholderTextColor={colors['muted-foreground']}
                      value={formData.fare_amount.toString()}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, fare_amount: parseFloat(text) || 0 }))}
                      keyboardType="numeric"
                    />
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
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingTransport ? 'Update' : 'Create')}
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
  transportCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transportInfo: {
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
  transportDetails: {
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