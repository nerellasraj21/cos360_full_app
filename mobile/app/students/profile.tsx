import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useStudentProfile, useUpdateStudentProfile } from '@/src/api/hooks/students/useStudentProfile';
import { useAuth } from '@/contexts/AuthContext';
import { ReadPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function StudentProfile() {
  const router = useRouter();
  const { colors } = useTheme();
  const { studentId } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<'email' | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: profile, isLoading, error } = useStudentProfile();
  const updateProfileMutation = useUpdateStudentProfile();

  const handleEdit = (field: 'email', currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingField || !editValue.trim()) return;

    try {
      await updateProfileMutation.mutateAsync({ [editingField]: editValue.trim() });
      setEditModalVisible(false);
      setEditingField(null);
      setEditValue('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Student Profile">
        <View style={styles.loadingContainer}>
          <ThemedText>Loading profile...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout title="Student Profile">
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            {error ? 'Failed to load profile' : 'No profile data available'}
          </ThemedText>
          {!studentId && (
            <ThemedText style={styles.errorSubtext}>
              Please select a student to view profile
            </ThemedText>
          )}
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadPermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENTS}
      fallback={
        <AppLayout title="Student Profile">
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to view student profile
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Student Profile">
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
            <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENTS}>
              <TouchableOpacity
                style={[styles.editProfileButton, { backgroundColor: colors.primary }]}
                onPress={() => handleEdit('email', profile.email || '')}
              >
                <Ionicons name="create" size={20} color="white" />
              </TouchableOpacity>
            </UpdatePermissionGuard>
          </View>

          <View style={styles.detailsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Personal Information</ThemedText>
            <View style={styles.detailRow}>
              <Ionicons name="call" size={20} color={colors['muted-foreground']} />
              <ThemedText style={styles.detailText}>Phone: {profile.phone || 'Not provided'}</ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="mail" size={20} color={colors['muted-foreground']} />
              <View style={styles.editableRow}>
                <ThemedText style={styles.detailText}>Email: {profile.email || 'Not provided'}</ThemedText>
                <UpdatePermissionGuard 
                  resource={PERMISSION_RESOURCES.STUDENTS}>
                  <TouchableOpacity
                    style={styles.editIcon}
                    onPress={() => handleEdit('email', profile.email || '')}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </UpdatePermissionGuard>
              </View>
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

        {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                Edit {editingField === 'email' ? 'Email' : 'Field'}
              </ThemedText>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text }]}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField}`}
              keyboardType={editingField === 'email' ? 'email-address' : 'default'}
              autoCapitalize="none"
            />

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