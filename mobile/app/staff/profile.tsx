import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReadOrListPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { Colors } from '@/constants/theme';
import { useStaffProfile, useUpdateStaffProfile } from '@/hooks/use-staff-api';
import type { StaffProfile } from '@/src/types/masters/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';

function StaffProfileScreenContent() {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
  });

  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  // Fetch staff profile
  const { data: profile, isLoading, error, refetch } = useStaffProfile();

  // Update profile mutation
  const updateProfileMutation = useUpdateStaffProfile({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-profile'] });
      setIsEditing(false);
      showSuccess('Success', 'Profile updated successfully');
    },
    onError: (error: any) => {
      showError('Error', error.response?.data?.detail || 'Failed to update profile');
      console.error('Update profile error:', error);
    },
  });

  const handleSave = () => {
    // Basic validation
    if (formData.email && !formData.email.includes('@')) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }
    if (formData.phone && formData.phone.length < 10) {
      showError('Validation Error', 'Please enter a valid phone number');
      return;
    }

    const updateData: { email?: string; phone?: string } = {};
    if (formData.email) updateData.email = formData.email;
    if (formData.phone) updateData.phone = formData.phone;
    updateProfileMutation.mutate(updateData);
  };

  const handleCancel = () => {
    setFormData({
      email: profile?.email || '',
      phone: profile?.phone || '',
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    setFormData({
      email: profile?.email || '',
      phone: profile?.phone || '',
    });
    setIsEditing(true);
  };

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Failed to load profile data</ThemedText>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => refetch()}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading profile...</ThemedText>
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
              accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Staff Profile
        </ThemedText>
        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: themeColors.primary }]}
            onPress={isEditing ? handleSave : handleEdit}
            disabled={updateProfileMutation.isPending}
          >
            <Ionicons name={isEditing ? "checkmark" : "create"} size={20} color="white" />
          </TouchableOpacity>
        </UpdatePermissionGuard>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Section */}
        <View style={[styles.photoSection, { backgroundColor: themeColors.card }]}>
          <View style={styles.photoContainer}>
            {profile?.profile_photo_url ? (
              <Image source={{ uri: profile.profile_photo_url }} style={styles.photoPlaceholder} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: themeColors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="person" size={48} color="white" />
              </View>
            )}
          </View>
          <ThemedText type="subtitle" style={styles.nameText}>
            {profile?.first_name} {profile?.last_name}
          </ThemedText>
          <ThemedText style={styles.designationText}>
            {profile?.designation || 'No Designation'}
          </ThemedText>
        </View>

        {/* Personal Information */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Personal Information
          </ThemedText>

          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color={themeColors['muted-foreground']} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>First Name</ThemedText>
              <ThemedText style={styles.infoValue}>{profile?.first_name || 'Not provided'}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color={themeColors['muted-foreground']} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Last Name</ThemedText>
              <ThemedText style={styles.infoValue}>{profile?.last_name || 'Not provided'}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail" size={20} color={themeColors['muted-foreground']} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Email</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  value={formData.email}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
                  placeholder="Enter email"
                  placeholderTextColor={themeColors['muted-foreground']}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <ThemedText style={styles.infoValue}>{profile?.email || 'Not provided'}</ThemedText>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color={themeColors['muted-foreground']} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Phone</ThemedText>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  value={formData.phone}
                  onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="Enter phone number"
                  placeholderTextColor={themeColors['muted-foreground']}
                  keyboardType="phone-pad"
                />
              ) : (
                <ThemedText style={styles.infoValue}>{profile?.phone || 'Not provided'}</ThemedText>
              )}
            </View>
          </View>
        </View>

        {/* Employment Information */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Employment Information
          </ThemedText>

          <View style={styles.infoRow}>
            <Ionicons name="id-card" size={20} color={themeColors['muted-foreground']} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Employee ID</ThemedText>
              <ThemedText style={styles.infoValue}>{profile?.employee_id || 'Not assigned'}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="briefcase" size={20} color={themeColors['muted-foreground']} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Designation</ThemedText>
              <ThemedText style={styles.infoValue}>{profile?.designation || 'Not assigned'}</ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color={themeColors['muted-foreground']} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Date of Joining</ThemedText>
              <ThemedText style={styles.infoValue}>
                {profile?.date_of_joining ? new Date(profile.date_of_joining).toLocaleDateString() : 'Not provided'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="checkmark-circle" size={20} color={profile?.is_active ? '#10B981' : colors.destructive} />
            <View style={styles.infoContent}>
              <ThemedText style={styles.infoLabel}>Status</ThemedText>
              <ThemedText style={[styles.infoValue, { color: profile?.is_active ? '#10B981' : colors.destructive }]}>
                {profile?.is_active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Edit Actions */}
        {isEditing && (
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSave}
                disabled={updateProfileMutation.isPending}
              >
                <ThemedText style={styles.saveButtonText}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </UpdatePermissionGuard>
        )}
      </ScrollView>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  photoSection: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  nameText: {
    textAlign: 'center',
    marginBottom: 4,
  },
  designationText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
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
  saveButton: {
    // backgroundColor set dynamically
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default function StaffProfileScreen() {
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
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              Staff Profile
            </ThemedText>
          </View>
          <View style={styles.scrollContent}>
            <View style={styles.photoSection}>
              <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
              <ThemedText type="subtitle" style={styles.nameText}>
                Access Denied
              </ThemedText>
              <ThemedText style={styles.designationText}>
                You don't have permission to view staff profile data
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      }
    >
      <StaffProfileScreenContent />
    </ReadOrListPermissionGuard>
  );
}