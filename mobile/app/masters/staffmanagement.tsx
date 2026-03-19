import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const staffSections = [
  {
    title: 'Staff Enrollment',
    description: 'View and manage staff profiles and enrollment records',
    icon: 'people' as const,
    color: '#06B6D4',
    route: '/staff/enrollment',
    resource: PERMISSION_RESOURCES.STAFF,
  },
  {
    title: 'Staff Attendance',
    description: 'Track and manage daily staff attendance records',
    icon: 'calendar' as const,
    color: '#0891B2',
    route: '/staff/attendance',
    resource: PERMISSION_RESOURCES.STAFF_ATTENDANCE,
  },
  {
    title: 'Designations',
    description: 'Manage staff roles, positions and designations',
    icon: 'ribbon' as const,
    color: '#0E7490',
    route: '/staff/designations',
    resource: PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
  },
];

export default function StaffManagementScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  return (
    <AppLayout title="Staff Management">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="people" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Staff Management</Text>
            <Text style={styles.bannerSub}>Manage staff enrollment, attendance and designations</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>STAFF SECTIONS</Text>

        {/* Section cards */}
        <View style={styles.list}>
          {staffSections.map((section, i) => {
            const hasAccess = hasPermission ? hasPermission(section.resource, 'list') : false;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.card,
                  { backgroundColor: cardBg, borderColor: borderCol },
                  !hasAccess && { opacity: 0.5 },
                ]}
                onPress={() => hasAccess && router.push(section.route as any)}
                disabled={!hasAccess}
                activeOpacity={0.75}
              >
                {/* Left accent */}
                <View style={[styles.leftAccent, { backgroundColor: hasAccess ? section.color : '#9ca3af' }]} />

                {/* Icon */}
                <View style={[styles.iconBox, { backgroundColor: (hasAccess ? section.color : '#9ca3af') + '18' }]}>
                  <Ionicons
                    name={hasAccess ? section.icon : 'lock-closed'}
                    size={22}
                    color={hasAccess ? section.color : '#9ca3af'}
                  />
                </View>

                {/* Text */}
                <View style={styles.textContent}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{section.title}</Text>
                  <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                    {hasAccess ? section.description : 'No access — contact your admin'}
                  </Text>
                </View>

                <Ionicons
                  name={hasAccess ? 'chevron-forward' : 'lock-closed'}
                  size={16}
                  color={colors['muted-foreground']}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: {
    backgroundColor: '#556ee6',
    borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 20, overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerDecor2: {
    position: 'absolute', bottom: -40, right: 60,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bannerIcon: {
    width: 54, height: 54, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 3 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  list: { gap: 10 },
  card: {
    borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  leftAccent: { width: 4, alignSelf: 'stretch' },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 14, marginVertical: 14, marginRight: 14,
  },
  textContent: { flex: 1, paddingVertical: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
  cardDesc: { fontSize: 12, lineHeight: 16 },
  chevron: { paddingRight: 14 },
});
