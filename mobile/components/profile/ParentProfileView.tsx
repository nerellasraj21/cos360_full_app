import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';
import { ParentProfileOut } from '@/src/api/profile';

interface ParentProfileViewProps {
  profile: ParentProfileOut;
}

export const ParentProfileView: React.FC<ParentProfileViewProps> = ({ profile }) => {
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
          <ThemedText style={styles.displayName}>{profile.name}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.secondary }]}>
            {profile.relation_to_student || 'Parent/Guardian'}
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
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Occupation</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.occupation || 'Not provided'}
          </ThemedText>
        </View>
      </View>

      {/* Parent Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>Parent Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Relation to Student</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {profile.relation_to_student || 'Not specified'}
          </ThemedText>
        </View>
      </View>

      {/* Children Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>Children ({profile.children.length})</ThemedText>
        
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
                  { backgroundColor: child.is_active ? '#10b981' : colors.destructive }
                ]}>
                  <ThemedText style={styles.statusText}>
                    {child.is_active ? 'Active' : 'Inactive'}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.childDetails}>
                <View style={styles.childDetailRow}>
                  <ThemedText style={[styles.childDetailLabel, { color: colors['muted-foreground'] }]}>Admission Number:</ThemedText>
                  <ThemedText style={[styles.childDetailValue, { color: colors.foreground }]}>
                    {child.admission_number || 'N/A'}
                  </ThemedText>
                </View>
                
                <View style={styles.childDetailRow}>
                  <ThemedText style={[styles.childDetailLabel, { color: colors['muted-foreground'] }]}>Class:</ThemedText>
                  <ThemedText style={[styles.childDetailValue, { color: colors.foreground }]}>
                    {child.class_name || 'N/A'}
                  </ThemedText>
                </View>
                
                <View style={styles.childDetailRow}>
                  <ThemedText style={[styles.childDetailLabel, { color: colors['muted-foreground'] }]}>Section:</ThemedText>
                  <ThemedText style={[styles.childDetailValue, { color: colors.foreground }]}>
                    {child.section_name || 'N/A'}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
            <ThemedText style={[styles.noChildrenText, { color: colors['muted-foreground'] }]}>No children linked to this account</ThemedText>
          </View>
        )}
      </View>

      {/* System Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>System Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Parent ID</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>{profile.parent_id}</ThemedText>
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
    flex: 1,
  },
  childDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  noChildrenText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});