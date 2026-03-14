import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';

import { PermissionGuard } from '../../src/components/mobile/MobilePermissionGuard';

export default function HomeScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = colors;


  const quickActions = [
    {
      id: 'students',
      title: 'Students',
      description: 'Manage student admissions and records',
      icon: () => <Ionicons name="people" size={28} color="#3B82F6" />,
      onPress: () => router.push('/students'),
      color: '#3B82F6',
      stats: '1,250+ Students'
    },
    {
      id: 'fees',
      title: 'Fees',
      description: 'Handle fee collection and payments',
      icon: () => <Ionicons name="card" size={28} color="#10B981" />,
      onPress: () => router.push('/fees'),
      color: '#10B981',
      stats: '₹2.5M Collected'
    },
    {
      id: 'masters',
      title: 'Masters',
      description: 'Configure academic and system settings',
      icon: () => <Ionicons name="settings" size={28} color="#F59E0B" />,
      onPress: () => router.push('/masters'),
      color: '#F59E0B',
      stats: '15+ Modules'
    },
    {
      id: 'transport',
      title: 'Transport',
      description: 'Manage routes and vehicle assignments',
      icon: () => <Ionicons name="bus" size={28} color="#8B5CF6" />,
      onPress: () => router.push('/transport'),
      color: '#8B5CF6',
      stats: '25 Vehicles'
    },
    {
      id: 'staff',
      title: 'Staff',
      description: 'Manage teaching and administrative staff',
      icon: () => <Ionicons name="person" size={28} color="#EF4444" />,
      onPress: () => router.push('/staff'),
      color: '#EF4444',
      stats: '85 Staff Members'
    },
    {
      id: 'expense',
      title: 'Expense',
      description: 'Track and manage school expenses',
      icon: () => <Ionicons name="wallet" size={28} color="#06B6D4" />,
      onPress: () => router.push('/expense'),
      color: '#06B6D4',
      stats: '₹1.2M Spent'
    }
  ];

  const recentActivities = [
    {
      id: '1',
      title: 'New Student Admission',
      description: 'John Smith admitted to Grade 10-A',
      time: '2 hours ago',
      icon: 'person-add' as const,
      color: '#10B981'
    },
    {
      id: '2',
      title: 'Fee Payment Received',
      description: '₹5,000 received from Sarah Johnson',
      time: '4 hours ago',
      icon: 'cash' as const,
      color: '#3B82F6'
    },
    {
      id: '3',
      title: 'Timetable Updated',
      description: 'Grade 9-B timetable modified',
      time: '1 day ago',
      icon: 'time' as const,
      color: '#F59E0B'
    },
    {
      id: '4',
      title: 'New Staff Member',
      description: 'Ms. Emily Chen joined as English Teacher',
      time: '2 days ago',
      icon: 'person' as const,
      color: '#8B5CF6'
    }
  ];

  const renderQuickAction = (action: typeof quickActions[0]) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.actionCard, { backgroundColor: themeColors.card }]}
      onPress={action.onPress}
    >
      <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
        {action.icon()}
      </View>
      <View style={styles.actionContent}>
        <ThemedText type="subtitle" style={styles.actionTitle}>
          {action.title}
        </ThemedText>
        <ThemedText style={styles.actionDescription}>
          {action.description}
        </ThemedText>

      </View>
      <Ionicons name="chevron-forward" size={20} color={themeColors['muted-foreground']} />
    </TouchableOpacity>
  );


  return (
    <PermissionGuard
      resourceConstant="profile"
      actionConstant="read_own"
    >
      <AppLayout title="Dashboard">
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Ionicons name="person-circle" size={32} color={themeColors.primary} />
            <ThemedText type="title" style={styles.welcomeText}>
              Welcome Username
            </ThemedText>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Quick Actions
            </ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Access key modules and features
            </ThemedText>

            <View style={styles.actionsGrid}>
              {quickActions.map(renderQuickAction)}
            </View>
          </View>
        </ScrollView>
      </AppLayout>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    marginLeft: 12,
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  statsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    marginLeft: 12,
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
});