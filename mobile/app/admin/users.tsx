import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components';
import { useTheme } from '@/contexts';
import { parentsApi } from '@/src/api/masters';
import { staffApi } from '@/src/api/staff';
import { studentAdmissionsApi } from '@/src/api/students';

const COLOR = '#6366F1';

export default function AdminUsersScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['admin-users-staff'],
    queryFn: () => staffApi.getStaffEnrollments({ limit: 1 }),
  });
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-users-students'],
    queryFn: () => studentAdmissionsApi.listAdmissions({ limit: 1 }),
  });
  const { data: parentsData = [], isLoading: parentsLoading } = useQuery({
    queryKey: ['admin-users-parents'],
    queryFn: () => parentsApi.getParents(),
  });

  const isLoading = staffLoading || studentsLoading || parentsLoading;
  const staffCount = (staffData as any)?.total ?? (staffData as any)?.items?.length ?? 0;
  const studentCount = (studentsData as any)?.total_count ?? (studentsData as any)?.total ?? (studentsData as any)?.items?.length ?? 0;
  const parentsCount = Array.isArray(parentsData) ? parentsData.length : 0;

  const userCategories = [
    {
      title: 'Staff Members',
      count: staffCount,
      icon: 'people' as const,
      color: '#8b5cf6',
      bg: theme === 'dark' ? '#2e1f5e' : '#ede9fe',
      route: '/(tabs)/staff',
      description: 'Teachers, admin staff & support',
    },
    {
      title: 'Students',
      count: studentCount,
      icon: 'school' as const,
      color: '#3b82f6',
      bg: theme === 'dark' ? '#1e3a5f' : '#dbeafe',
      route: '/(tabs)/students',
      description: 'Enrolled students across all classes',
    },
    {
      title: 'Parents',
      count: parentsCount,
      icon: 'home' as const,
      color: '#f59e0b',
      bg: theme === 'dark' ? '#3d2e0a' : '#fef3c7',
      route: '/masters/parents',
      description: 'Parent accounts linked to students',
    },
    {
      title: 'Roles & Permissions',
      count: null,
      icon: 'shield-checkmark' as const,
      color: '#10b981',
      bg: theme === 'dark' ? '#0a2e20' : '#d1fae5',
      route: '/masters/rolespermissions',
      description: 'Manage access control & permissions',
    },
  ];

  return (
    <ScreenLayout title="User Management">
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="people" size={24} color="white" />
        </View>
        <Text style={styles.bannerTitle}>User Management</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>USER CATEGORIES</Text>
        {userCategories.map((cat, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.categoryCard, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push(cat.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
              <Ionicons name={cat.icon} size={24} color={cat.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.categoryTitle, { color: colors.foreground }]}>{cat.title}</Text>
              <Text style={[styles.categoryDesc, { color: colors['muted-foreground'] }]}>{cat.description}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {cat.count !== null && (
                isLoading ? (
                  <ActivityIndicator color={cat.color} size="small" style={{ marginBottom: 2 }} />
                ) : (
                  <Text style={[styles.categoryCount, { color: cat.color }]}>{cat.count}</Text>
                )
              )}
              <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden' },
  bannerDecor: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  bannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },
  categoryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10,
    elevation: 1,
  },
  categoryIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  categoryDesc: { fontSize: 12, lineHeight: 17 },
  categoryCount: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
});
