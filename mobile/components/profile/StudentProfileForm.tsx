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
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';
import { 
  StudentProfileOut, 
  StudentProfileUpdate, 
  BLOOD_GROUPS, 
  validateEmail, 
  validateDate 
} from '@/src/api/profile';
import { useUpdateStudentProfile } from '@/src/api/hooks/profile';

interface StudentProfileFormProps {
  profile: StudentProfileOut;
  onCancel: () => void;
}

export const StudentProfileForm: React.FC<StudentProfileFormProps> = ({
  profile,
  onCancel,
}) => {
  const { colors } = useTheme();
  const updateMutation = useUpdateStudentProfile();
  
  const [formData, setFormData] = useState<StudentProfileUpdate>({
    email: profile.email || '',
    phone: profile.phone || '',
    date_of_birth: profile.date_of_birth || '',
    address: profile.address || '',
    emergency_contact: profile.emergency_contact || '',
    blood_group: profile.blood_group || '',
    profile_picture_url: profile.profile_picture_url || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.date_of_birth && !validateDate(formData.date_of_birth)) {
      newErrors.date_of_birth = 'Please enter a valid date (YYYY-MM-DD)';
    }

    if (formData.blood_group && !BLOOD_GROUPS.includes(formData.blood_group as any)) {
      newErrors.blood_group = 'Please select a valid blood group';
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

  const updateField = (field: keyof StudentProfileUpdate, value: string) => {
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
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && <ThemedText style={styles.errorText}>{errors.email}</ThemedText>}
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Phone</ThemedText>
          <ThemedTextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => updateField('phone', text)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Emergency Contact</ThemedText>
          <ThemedTextInput
            style={styles.input}
            value={formData.emergency_contact}
            onChangeText={(text) => updateField('emergency_contact', text)}
            placeholder="Enter emergency contact number"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Personal Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Date of Birth</ThemedText>
          <ThemedTextInput
            style={[styles.input, errors.date_of_birth && styles.inputError]}
            value={formData.date_of_birth}
            onChangeText={(text) => updateField('date_of_birth', text)}
            placeholder="YYYY-MM-DD"
          />
          {errors.date_of_birth && <ThemedText style={styles.errorText}>{errors.date_of_birth}</ThemedText>}
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Blood Group</ThemedText>
          <View style={styles.bloodGroupContainer}>
            {BLOOD_GROUPS.map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  styles.bloodGroupOption,
                  formData.blood_group === group && styles.bloodGroupSelected,
                  { borderColor: colors.border }
                ]}
                onPress={() => updateField('blood_group', group)}
              >
                <ThemedText
                  style={[
                    styles.bloodGroupText,
                    formData.blood_group === group && styles.bloodGroupTextSelected
                  ]}
                >
                  {group}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {errors.blood_group && <ThemedText style={styles.errorText}>{errors.blood_group}</ThemedText>}
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Address</ThemedText>
          <ThemedTextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(text) => updateField('address', text)}
            placeholder="Enter full address"
            multiline
            numberOfLines={3}
          />
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  bloodGroupContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodGroupOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  bloodGroupSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  bloodGroupText: {
    fontSize: 14,
    color: '#374151',
  },
  bloodGroupTextSelected: {
    color: 'white',
    fontWeight: '600',
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