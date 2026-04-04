import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useQuery } from '@tanstack/react-query';
import { StudentProfile as StudentProfileData, useStudentProfile, useUpdateStudentProfile } from '@/src/api/hooks/students/useStudentProfile';
import apiClient from '@/src/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { ReadPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

export default function StudentProfile() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showError } = useToastContext();
  const { role, selectedStudent } = useAuth();
  const roleName = role?.name?.toLowerCase();
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName || '');
  const pageTitle = isParent
    ? selectedStudent ? `${selectedStudent.first_name}'s Profile` : 'Child Profile'
    : 'Student Profile';
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({ email: '', phone: '', address: '' });

  const { data: myProfile, isLoading: myLoading, error: myError } = useStudentProfile();

  const { data: childProfileData, isLoading: childLoading } = useQuery({
    queryKey: ['student', 'profile', selectedStudent?.id],
    queryFn: () =>
      apiClient.get(`/students/profile/${selectedStudent!.id}`).then((r) => r.data as StudentProfileData),
    enabled: isParent && !!selectedStudent?.id,
  });

  const profile = isParent ? childProfileData : myProfile;
  const isLoading = isParent ? childLoading : myLoading;
  const updateProfileMutation = useUpdateStudentProfile();

  const handleOpenEdit = () => {
    setEditForm({
      email: profile?.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        email: editForm.email.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        address: editForm.address.trim() || undefined,
      });
      setEditModalVisible(false);
    } catch (error) {
      showError('Error', 'Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <AppLayout title={pageTitle}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading profile...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout title={pageTitle}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            {myError && !isParent ? 'Failed to load profile' : 'No profile data available'}
          </ThemedText>
          <ThemedText style={styles.errorSubtext}>
            {isParent
              ? 'Select a student from the header'
              : 'Please select a student to view profile'}
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENTS}
      fallback={
        <AppLayout title={pageTitle}>
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to view student profile
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title={pageTitle}>
        <ScrollView style={styles.container}>
        <ThemedView style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              {profile.profile_picture_url ? (
                // TODO: Add Image component for profile picture
                <Ionicons name="person" size={40} color="white" />
              ) : (
                <Ionicons name="person" size={40} color="white" />
              )}
            </View>
            <View style={styles.profileInfo}>
              <ThemedText type="title" style={styles.name}>
                {profile.first_name} {profile.last_name}
              </ThemedText>
              <ThemedText style={styles.admissionNumber}>
                Admission #: {profile.admission_number}
              </ThemedText>
            </View>
            {!isParent && (
              <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENTS}>
                <TouchableOpacity
                  style={[styles.editProfileButton, { backgroundColor: colors.primary }]}
                  onPress={handleOpenEdit}
                >
                  <Ionicons name="create" size={20} color="white" />
                </TouchableOpacity>
              </UpdatePermissionGuard>
            )}
          </View>

          <View style={styles.detailsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Personal Information</ThemedText>
            <View style={styles.detailRow}>
              <Ionicons name="call" size={20} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>Phone: {profile.phone || 'Not provided'}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="mail" size={20} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>Email: {profile.email || 'Not provided'}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={20} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>
                DOB: {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}
              </ThemedText>
            </View>
            {profile.blood_group && (
              <View style={styles.detailRow}>
                <Ionicons name="water" size={20} color={colors['muted-foreground']} />
                <ThemedText style={styles.detailText}>Blood Group: {profile.blood_group}</ThemedText>
              </View>
            )}
            {profile.emergency_contact && (
              <View style={styles.detailRow}>
                <Ionicons name="call" size={20} color={colors['muted-foreground']} />
                <ThemedText style={styles.detailText}>Emergency Contact: {profile.emergency_contact}</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.detailsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Academic Information</ThemedText>
            <View style={styles.detailRow}>
              <Ionicons name="school" size={20} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>
                Class: {profile.class_name || 'N/A'} - Section {profile.section_name || 'N/A'}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={20} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>Academic Year: {profile.academic_year || 'N/A'}</ThemedText>
            </View>
            {profile.roll_number && (
              <View style={styles.detailRow}>
                <Ionicons name="id-card" size={20} color={colors['muted-foreground']} />
                <ThemedText style={styles.detailText}>Roll Number: {profile.roll_number}</ThemedText>
              </View>
            )}
          </View>

          {profile.address && (
            <View style={styles.detailsSection}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Address</ThemedText>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={20} color={colors['muted-foreground']} />
                <ThemedText style={styles.detailText}>{profile.address}</ThemedText>
              </View>
            </View>
          )}
        </ThemedView>
        </ScrollView>

        {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>Edit Profile</ThemedText>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFieldGroup}>
              <ThemedText style={styles.modalFieldLabel}>Email</ThemedText>
              <TextInput
                style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
                value={editForm.email}
                onChangeText={v => setEditForm(p => ({ ...p, email: v }))}
                placeholder="Enter email address"
                placeholderTextColor={colors['muted-foreground']}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalFieldGroup}>
              <ThemedText style={styles.modalFieldLabel}>Phone</ThemedText>
              <TextInput
                style={[styles.modalInput, { borderColor: colors.border, color: colors.foreground }]}
                value={editForm.phone}
                onChangeText={v => setEditForm(p => ({ ...p, phone: v }))}
                placeholder="Enter phone number"
                placeholderTextColor={colors['muted-foreground']}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalFieldGroup}>
              <ThemedText style={styles.modalFieldLabel}>Address</ThemedText>
              <TextInput
                style={[styles.modalInput, styles.modalTextarea, { borderColor: colors.border, color: colors.foreground }]}
                value={editForm.address}
                onChangeText={v => setEditForm(p => ({ ...p, address: v }))}
                placeholder="Enter address"
                placeholderTextColor={colors['muted-foreground']}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
                disabled={updateProfileMutation.isPending}
              >
                <ThemedText style={styles.saveButtonText}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>
      </AppLayout>
    </ReadPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  profileCard: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    marginBottom: 4,
  },
  admissionNumber: {
    fontSize: 14,
    opacity: 0.7,
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 12,
  },
  editableRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editIcon: {
    padding: 4,
  },
  modalFieldGroup: {
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.75,
  },
  modalTextarea: {
    minHeight: 72,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
});