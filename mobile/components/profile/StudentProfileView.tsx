import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';
import { StudentProfileOut } from '@/src/api/profile';

interface StudentProfileViewProps {
  profile: StudentProfileOut;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({ profile }) => {
  const { colors } = useTheme();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          {profile.profile_picture_url ? (
            <IconSymbol name="person.fill" size={40} color="white" />
          ) : (
            <IconSymbol name="person.fill" size={40} color="white" />
          )}
        </View>
        <View style={styles.headerInfo}>
          <ThemedText style={styles.displayName}>
            {profile.first_name} {profile.last_name}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.secondary }]}>
            {profile.admission_number || 'Student'}
          </ThemedText>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: profile.is_active ? '#10b981' : colors.destructive }
              ]}
            />
            <ThemedText style={[styles.statusText, { color: colors.secondary }]}>
              {profile.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Academic Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>Academic Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Admission Number</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.admission_number || 'Not assigned'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Roll Number</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.roll_number || 'Not assigned'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Class</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.class_name || 'Not assigned'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Section</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.section_name || 'Not assigned'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Academic Year</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.academic_year || 'Not assigned'}
          </ThemedText>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>Contact Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Email</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.email || 'Not provided'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Phone</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.phone || 'Not provided'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Emergency Contact</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.emergency_contact || 'Not provided'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Address</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.address || 'Not provided'}
          </ThemedText>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Date of Birth</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Blood Group</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.blood_group || 'Not provided'}
          </ThemedText>
        </View>
      </View>

      {/* System Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>System Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Student ID</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>{profile.id}</ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Created</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {new Date(profile.created_at).toLocaleDateString()}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Last Updated</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {new Date(profile.updated_at).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
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
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
  },
});