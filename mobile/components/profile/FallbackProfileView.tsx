import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';

interface FallbackProfileViewProps {
  user: any;
  role: any;
}

export const FallbackProfileView: React.FC<FallbackProfileViewProps> = ({ user, role }) => {
  const { colors } = useTheme();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.profileHeader, { backgroundColor: colors.card }]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          <IconSymbol name="person.fill" size={40} color="white" />
        </View>
        <View style={styles.headerInfo}>
          <ThemedText style={styles.displayName}>{user.username}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.secondary }]}>
            {role?.name || 'User'}
          </ThemedText>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: user.is_active ? '#10b981' : colors.destructive }
              ]}
            />
            <ThemedText style={[styles.statusText, { color: colors.secondary }]}>
              {user.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Basic Information */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>Account Information</ThemedText>
        
        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Username</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>{user.username}</ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Email</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {user.email || 'Not provided'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Role</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>
            {role?.name || 'Not assigned'}
          </ThemedText>
        </View>

        <View style={[styles.fieldContainer, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>User ID</ThemedText>
          <ThemedText style={[styles.fieldValue, { color: colors.foreground }]}>{user.id}</ThemedText>
        </View>
      </View>

      {/* Notice */}
      <View style={[styles.noticeContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <IconSymbol name="info.circle" size={24} color={colors.primary} />
        <View style={styles.noticeContent}>
          <ThemedText style={[styles.noticeTitle, { color: colors.primary }]}>Limited Profile View</ThemedText>
          <ThemedText style={[styles.noticeText, { color: colors['muted-foreground'] }]}>
            The full profile system for your role is not yet available. 
            This is basic account information from the authentication system.
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
  noticeContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
});