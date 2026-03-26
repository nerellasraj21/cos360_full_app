import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import ScreenLayout from '@/components/ScreenLayout';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const STAFF_COLOR = '#8B5CF6';

const SECTIONS = [
  {
    title: 'Staff Enrollment',
    description: 'Register new staff members, update profiles, and manage staff information',
    icon: 'people-outline' as const,
    route: '/staff/enrollment',
    btnLabel: 'Manage Staff Profiles',
    resource: PERMISSION_RESOURCES.STAFF,
  },
  {
    title: 'Staff Attendance',
    description: 'Track and manage daily attendance for all staff members',
    icon: 'calendar-outline' as const,
    route: '/staff/attendance',
    btnLabel: 'Manage Attendance',
    resource: PERMISSION_RESOURCES.STAFF_ATTENDANCE,
  },
  {
    title: 'Staff Designations',
    description: 'Manage job titles and designations for staff role assignments',
    icon: 'briefcase-outline' as const,
    route: '/staff/designations',
    btnLabel: 'Manage Designations',
    resource: PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
  },
];

export default function StaffManagementScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#e5e7eb';

  return (
    <ScreenLayout title="Staff Management">
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={[styles.pageIconBox, { backgroundColor: STAFF_COLOR + '20' }]}>
            <Ionicons name="briefcase-outline" size={26} color={STAFF_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.pageTitle}>Staff Management</ThemedText>
            <ThemedText style={[styles.pageDesc, { color: colors['muted-foreground'] }]}>
              Comprehensive staff enrollment, attendance tracking, and designation management
            </ThemedText>
          </View>
        </View>

        {/* Section Cards */}
        <View style={styles.grid}>
          {SECTIONS.map((s) => {
            const hasAccess = hasPermission ? hasPermission(s.resource, 'list') : false;
            return (
              <View
                key={s.route}
                style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
              >
                <View style={styles.cardBody}>
                  <View style={[styles.cardIconBox, { backgroundColor: STAFF_COLOR + '18' }]}>
                    <Ionicons name={s.icon} size={22} color={STAFF_COLOR} />
                  </View>
                  <ThemedText style={[styles.cardTitle, { color: colors.foreground }]}>
                    {s.title}
                  </ThemedText>
                  <ThemedText style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>
                    {hasAccess ? s.description : 'No access — contact your admin'}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={[
                    styles.cardBtn,
                    { backgroundColor: hasAccess ? STAFF_COLOR : '#9CA3AF' },
                  ]}
                  onPress={() => hasAccess && router.push(s.route as any)}
                  disabled={!hasAccess}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.cardBtnText}>{s.btnLabel}</ThemedText>
                  <Ionicons name="arrow-forward" size={15} color="#fff" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Staff Portal Access */}
        <View style={[styles.portalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={[styles.cardIconBox, { backgroundColor: STAFF_COLOR + '18' }]}>
            <Ionicons name="person-circle-outline" size={22} color={STAFF_COLOR} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <ThemedText style={[styles.cardTitle, { color: colors.foreground }]}>
              Staff Portal Access
            </ThemedText>
            <ThemedText style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>
              Staff members can access their profiles and attendance records through secure authentication
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Page header
  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 24,
  },
  pageIconBox: {
    width: 52, height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  pageTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  pageDesc: { fontSize: 13, lineHeight: 18 },

  // Section cards grid (2 cols on wider, single col stacked)
  grid: { gap: 12, marginBottom: 12 },

  card: {
    borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardBody: { padding: 18, paddingBottom: 14 },
  cardIconBox: {
    width: 42, height: 42, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardDesc: { fontSize: 13, lineHeight: 18 },

  cardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, margin: 14, marginTop: 14,
    borderRadius: 10, paddingVertical: 13,
  },
  cardBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Portal card (full-width, horizontal layout)
  portalCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: 1, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
});
