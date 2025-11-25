import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStaffEnrollments, useCreateStaffEnrollment, useUpdateStaffEnrollment, useDeleteStaffEnrollment, useDesignationsDropdown } from '@/hooks/use-staff-api';
import type { Staff, StaffInput } from '@/src/types/masters/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useTheme } from '@/contexts';

function StaffEnrollmentScreenContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDesignationModalVisible, setIsDesignationModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDOBDatePicker, setShowDOBDatePicker] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffInput>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'Male',
    date_of_birth: '',
    joining_date: new Date().toISOString().split('T')[0],
    qualification: '',
    experience_years: 0,
    address: '',
    designation_id: '',
    department: '',
  });

  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();

  // Fetch staff enrollments
  const { data: staffData, isLoading, error, refetch } = useStaffEnrollments({
    skip: 0,
    limit: 100,
    gender: selectedGender || undefined
  });

  // Fetch designations for dropdown
  const { data: designations } = useDesignationsDropdown();

  // Mutations
  const createMutation = useCreateStaffEnrollment({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      setIsModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Staff member added successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to add staff member');
      console.error('Create staff error:', error);
    },
  });

  const updateMutation = useUpdateStaffEnrollment({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      setIsModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Staff member updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to update staff member');
      console.error('Update staff error:', error);
    },
  });

  const deleteMutation = useDeleteStaffEnrollment({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      Alert.alert('Success', 'Staff member deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to delete staff member');
      console.error('Delete staff error:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: 'Male',
      date_of_birth: '',
      joining_date: new Date().toISOString().split('T')[0],
      qualification: '',
      experience_years: 0,
      address: '',
      designation_id: '',
      department: '',
    });
    setEditingStaff(null);
  };

  // Filter staff based on search
  const filteredStaff = useMemo(() => {
    if (!staffData?.items) return [];

    return staffData.items.filter((staff: Staff) => {
      const fullName = `${staff.first_name} ${staff.last_name || ''}`.trim().toLowerCase();
      const matchesSearch =
        fullName.includes(searchQuery.toLowerCase()) ||
        (staff.email && staff.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (staff.department && staff.department.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [staffData, searchQuery]);

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      first_name: staff.first_name,
      last_name: staff.last_name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      gender: staff.gender || 'Male',
      date_of_birth: staff.date_of_birth || '',
      joining_date: staff.joining_date,
      qualification: staff.qualification || '',
      experience_years: staff.experience_years || 0,
      address: staff.address || '',
      designation_id: staff.designation_id || '',
      department: staff.department || '',
    });
    setIsModalVisible(true);
  };

  const handleDelete = (staff: Staff) => {
    Alert.alert(
      'Delete Staff Member',
      `Are you sure you want to delete "${staff.first_name} ${staff.last_name || ''}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(staff.id),
        },
      ]
    );
  };

  const handleDesignationSelect = (designationId: string) => {
    setFormData(prev => ({ ...prev, designation_id: designationId }));
    setIsDesignationModalVisible(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        joining_date: selectedDate.toISOString().split('T')[0]
      }));
    }
  };

  const handleDOBDateChange = (event: any, selectedDate?: Date) => {
    setShowDOBDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date_of_birth: selectedDate.toISOString().split('T')[0]
      }));
    }
  };

  const handleSubmit = () => {
    if (!formData.first_name.trim()) {
      Alert.alert('Validation Error', 'Please enter first name');
      return;
    }
    if (!formData.joining_date.trim()) {
      Alert.alert('Validation Error', 'Please enter joining date');
      return;
    }

    const submitData = { ...formData };
    if (!submitData.date_of_birth?.trim()) {
      delete submitData.date_of_birth;
    }

    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const renderStaffItem = ({ item }: { item: Staff }) => {
    const designationTitle = designations?.find(d => d.id === item.designation_id)?.title || 'No Designation';
 
    return (
      <View style={[styles.staffCard, { backgroundColor: themeColors.card }]}>
        <View style={styles.staffHeader}>
          <View style={styles.staffInfo}>
            <ThemedText type="subtitle" style={styles.staffName}>
              {item.first_name} {item.last_name}
            </ThemedText>
            <ThemedText style={styles.designation}>
              {designationTitle} 
            </ThemedText>
          </View>
          <View style={styles.actionButtons}>
            <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create" size={16} color="white" />
              </TouchableOpacity>
            </UpdatePermissionGuard>
            <DeletePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </DeletePermissionGuard>
          </View>
        </View>

        <View style={styles.staffDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="business" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              {item.department || 'No Department'}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>{item.phone || 'No Phone'}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="mail" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>{item.email || 'No Email'}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Joined: {new Date(item.joining_date).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const renderGenderFilters = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterButton, { backgroundColor: themeColors.card }]}
        onPress={() => setSelectedGender('')}
      >
        <ThemedText style={[styles.filterText, !selectedGender && { color: themeColors.primary }]}>
          All Genders
        </ThemedText>
      </TouchableOpacity>
      {['Male', 'Female', 'Other'].map((gender) => (
        <TouchableOpacity
          key={gender}
          style={[styles.filterButton, { backgroundColor: themeColors.card }]}
          onPress={() => setSelectedGender(gender)}
        >
          <ThemedText style={[styles.filterText, selectedGender === gender && { color: themeColors.primary }]}>
            {gender}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (error) {
    const isAuthError = (error as any)?.response?.status === 401 || (error as any)?.response?.status === 403;

    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">
          {isAuthError ? 'Authentication Required' : 'Error'}
        </ThemedText>
        <ThemedText style={styles.errorText}>
          {isAuthError
            ? 'Please log in to access staff enrollment data'
            : 'Failed to load staff data'
          }
        </ThemedText>
        {isAuthError ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace('/login')}
          >
            <ThemedText style={styles.retryText}>Go to Login</ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Staff Enrollment
        </ThemedText>
        <CreatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: themeColors.primary }]}
            onPress={() => {
              resetForm();
              setIsModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </CreatePermissionGuard>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search staff..."
          placeholderTextColor={themeColors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={20} color={themeColors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Gender Filters */}
      {renderGenderFilters()}

      {/* Staff Count */}
      <View style={styles.countContainer}>
        <ThemedText style={styles.countText}>
          {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      {/* Staff List */}
      <FlatList
        data={filteredStaff}
        renderItem={renderStaffItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Staff Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchQuery || selectedGender
                ? 'Try adjusting your search or filters'
                : 'Add your first staff member to get started'}
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
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Personal Info */}
              <View style={styles.formSection}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Personal Information</ThemedText>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>First Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Enter first name"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={formData.first_name}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, first_name: value }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Last Name</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Enter last name"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={formData.last_name}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, last_name: value }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Email</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Enter email address"
                    placeholderTextColor={themeColors['muted-foreground']}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Phone</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Enter phone number"
                    placeholderTextColor={themeColors['muted-foreground']}
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Gender</ThemedText>
                  <View style={styles.genderContainer}>
                    {['Male', 'Female', 'Other'].map((gender) => (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.genderOption,
                          {
                            backgroundColor: formData.gender === gender ? themeColors.primary : themeColors.background,
                            borderColor: themeColors.border
                          }
                        ]}
                        onPress={() => setFormData(prev => ({ ...prev, gender: gender as any }))}
                      >
                        <ThemedText
                          style={[
                            styles.genderText,
                            { color: formData.gender === gender ? 'white' : themeColors['card-foreground'] }
                          ]}
                        >
                          {gender}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Date of Birth</ThemedText>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                    onPress={() => setShowDOBDatePicker(true)}
                  >
                    <ThemedText style={{ color: themeColors['card-foreground'] }}>
                      {formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString() : 'Select date'}
                    </ThemedText>
                    <Ionicons name="calendar" size={20} color={themeColors['muted-foreground']} />
                  </TouchableOpacity>
                  {showDOBDatePicker && (
                    <DateTimePicker
                      value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
                      mode="date"
                      display="default"
                      onChange={handleDOBDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>

              </View>
              {/* Employment Details */}
              <View style={styles.formSection}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Employment Details</ThemedText>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Joining Date *</ThemedText>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <ThemedText style={{ color: themeColors['card-foreground'] }}>
                      {formData.joining_date ? new Date(formData.joining_date).toLocaleDateString() : 'Select date'}
                    </ThemedText>
                    <Ionicons name="calendar" size={20} color={themeColors['muted-foreground']} />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={formData.joining_date ? new Date(formData.joining_date) : new Date()}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Qualification</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Enter qualification"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={formData.qualification}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, qualification: value }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Department</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Enter department"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={formData.department}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, department: value }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Designation</ThemedText>
                  <TouchableOpacity
                    style={[styles.dropdown, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                    onPress={() => setIsDesignationModalVisible(true)}
                  >
                    <ThemedText style={{ color: formData.designation_id ? themeColors['card-foreground'] : themeColors['muted-foreground'] }}>
                      {designations?.find(d => d.id === formData.designation_id)?.title || 'Select designation'}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={20} color={themeColors['muted-foreground']} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSubmit}
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (editingStaff ? 'Update' : 'Create')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Designation Selection Modal */}
      <Modal
        visible={isDesignationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDesignationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background, maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                Select Designation
              </ThemedText>
              <TouchableOpacity onPress={() => setIsDesignationModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={designations || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.designationItem,
                    {
                      backgroundColor: formData.designation_id === item.id ? themeColors.primary : 'transparent'
                    }
                  ]}
                  onPress={() => handleDesignationSelect(item.id)}
                >
                  <ThemedText
                    style={{
                      color: formData.designation_id === item.id ? 'white' : themeColors['card-foreground']
                    }}
                  >
                    {item.title}
                  </ThemedText>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyText}>No designations available</ThemedText>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  countContainer: {
    marginBottom: 16,
  },
  countText: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContainer: {
    paddingBottom: 20,
  },
  staffCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    marginBottom: 4,
  },
  designation: {
    fontSize: 14,
    opacity: 0.7,
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
  staffDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
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
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  designationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
});

export default function StaffEnrollmentScreen() {
  const router = useRouter();
  
  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.STAFF}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              Staff Enrollment
            </ThemedText>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don't have permission to view staff enrollment data
            </ThemedText>
          </View>
        </ThemedView>
      }
    >
      <StaffEnrollmentScreenContent />
    </ReadOrListPermissionGuard>
  );
}