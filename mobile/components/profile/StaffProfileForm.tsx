import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/contexts';
import { 
  StaffProfile, 
  StaffProfileUpdate, 
  validateEmail, 
  validatePhone 
} from '@/src/api/profile';
import { useUpdateStaffProfile } from '@/src/api/hooks/profile';

interface StaffProfileFormProps {
  profile: StaffProfile;
  onCancel: () => void;
}

export const StaffProfileForm: React.FC<StaffProfileFormProps> = ({
  profile,
  onCancel,
}) => {
  const { colors } = useTheme();
  const updateMutation = useUpdateStaffProfile();
  
  const [formData, setFormData] = useState<StaffProfileUpdate>({
    email: profile.email || undefined,
    phone: profile.phone || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validatePhone(formData.phone, 'staff')) {
      newErrors.phone = 'Phone must be exactly 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateMutation.mutateAsync(formData);
      Alert.alert('Success', 'Profile updated successfully');
      onCancel(); // Close edit mode
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Failed to update profile';
      Alert.alert('Error', errorMessage);
    }
  };

  const updateField = (field: keyof StaffProfileUpdate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Contact Information */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Contact Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Email *</ThemedText>
          <ThemedTextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={formData.email || ''}
            onChangeText={(text) => updateField('email', text)}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <ThemedText style={styles.errorText}>{errors.email}</ThemedText>}
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Phone *</ThemedText>
          <ThemedTextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={formData.phone || ''}
            onChangeText={(text) => updateField('phone', text)}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
          />
          {errors.phone && <ThemedText style={styles.errorText}>{errors.phone}</ThemedText>}
          <ThemedText style={styles.helpText}>Phone number must be exactly 10 digits</ThemedText>
        </View>
      </View>

      {/* Read-only Information */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Staff Information (Read-only)</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Name</ThemedText>
          <ThemedText style={styles.fieldValue}>
            {profile.first_name} {profile.last_name}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Employee ID</ThemedText>
          <ThemedText style={styles.fieldValue}>
            {profile.employee_id || 'Not assigned'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Designation</ThemedText>
          <ThemedText style={styles.fieldValue}>
            {profile.designation || 'Not specified'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Date of Joining</ThemedText>
          <ThemedText style={styles.fieldValue}>
            {profile.date_of_joining ? new Date(profile.date_of_joining).toLocaleDateString() : 'Not specified'}
          </ThemedText>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={onCancel}
        >
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <ThemedText style={styles.saveButtonText}>Saving...</ThemedText>
          ) : (
            <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#374151',
  },
  fieldContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  helpText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 40,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    marginRight: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10b981',
    marginLeft: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});