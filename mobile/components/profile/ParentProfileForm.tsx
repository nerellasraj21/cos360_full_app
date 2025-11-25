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
  ParentProfileOut, 
  ParentProfileUpdate, 
  validateEmail, 
  validatePhone 
} from '@/src/api/profile';
import { useUpdateParentProfile } from '@/src/api/hooks/profile';

interface ParentProfileFormProps {
  profile: ParentProfileOut;
  onCancel: () => void;
}

export const ParentProfileForm: React.FC<ParentProfileFormProps> = ({
  profile,
  onCancel,
}) => {
  const { colors } = useTheme();
  const updateMutation = useUpdateParentProfile();
  
  const [formData, setFormData] = useState<ParentProfileUpdate>({
    email: profile.email || '',
    phone: profile.phone || '',
    occupation: profile.occupation || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !validatePhone(formData.phone, 'parent')) {
      newErrors.phone = 'Please enter a valid phone number';
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

  const updateField = (field: keyof ParentProfileUpdate, value: string) => {
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
          <ThemedText style={styles.fieldLabel}>Email</ThemedText>
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
            style={[styles.input, errors.phone && styles.inputError]}
            value={formData.phone}
            onChangeText={(text) => updateField('phone', text)}
            placeholder="Enter phone number (with country code)"
            keyboardType="phone-pad"
          />
          {errors.phone && <ThemedText style={styles.errorText}>{errors.phone}</ThemedText>}
          <ThemedText style={styles.helpText}>International format supported (e.g., +1234567890)</ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Occupation</ThemedText>
          <ThemedTextInput
            style={styles.input}
            value={formData.occupation}
            onChangeText={(text) => updateField('occupation', text)}
            placeholder="Enter occupation"
          />
        </View>
      </View>

      {/* Parent Information (Read-only) */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Parent Information (Read-only)</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Name</ThemedText>
          <ThemedText style={styles.fieldValue}>{profile.name}</ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.fieldLabel}>Relation to Student</ThemedText>
          <ThemedText style={styles.fieldValue}>
            {profile.relation_to_student || 'Not specified'}
          </ThemedText>
        </View>
      </View>

      {/* Children Information */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Children</ThemedText>
        
        {profile.children.length > 0 ? (
          profile.children.map((child, index) => (
            <View key={child.student_id} style={[styles.childCard, { backgroundColor: colors.card }]}>
              <View style={styles.childHeader}>
                <IconSymbol name="person.fill" size={20} color={colors.primary} />
                <ThemedText style={styles.childName}>
                  {child.first_name} {child.last_name}
                </ThemedText>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: child.is_active ? '#10b981' : '#ef4444' }
                ]}>
                  <ThemedText style={styles.statusText}>
                    {child.is_active ? 'Active' : 'Inactive'}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.childDetails}>
                <View style={styles.childDetailRow}>
                  <ThemedText style={styles.childDetailLabel}>Admission Number:</ThemedText>
                  <ThemedText style={styles.childDetailValue}>
                    {child.admission_number || 'N/A'}
                  </ThemedText>
                </View>
                
                <View style={styles.childDetailRow}>
                  <ThemedText style={styles.childDetailLabel}>Class:</ThemedText>
                  <ThemedText style={styles.childDetailValue}>
                    {child.class_name || 'N/A'}
                  </ThemedText>
                </View>
                
                <View style={styles.childDetailRow}>
                  <ThemedText style={styles.childDetailLabel}>Section:</ThemedText>
                  <ThemedText style={styles.childDetailValue}>
                    {child.section_name || 'N/A'}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.noChildrenText}>No children linked to this account</ThemedText>
          </View>
        )}
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
  childCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  childDetails: {
    gap: 8,
  },
  childDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  childDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  childDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  noChildrenText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
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