import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';
import { StaffProfile } from '@/src/api/profile';

interface StaffProfileViewProps {
  profile: StaffProfile;
}

export const StaffProfileView: React.FC<StaffProfileViewProps> = ({ profile }) => {
  const { colors } = useTheme();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          {profile.profile_photo_url ? (
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
            {profile.designation || 'Staff Member'}
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

      {/* Staff Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>Staff Information</ThemedText>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Employee ID</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.employee_id || 'Not assigned'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Designation</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.designation || 'Not specified'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Date of Joining</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.date_of_joining ? new Date(profile.date_of_joining).toLocaleDateString() : 'Not specified'}
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
      </View>

      {/* System Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>System Information</ThemedText>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Staff ID</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>{profile.staff_id}</ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>User ID</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>{profile.user_id}</ThemedText>
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