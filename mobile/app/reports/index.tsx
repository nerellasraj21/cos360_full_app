import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useMemo } from 'react';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';

// `resources`: a card is shown only when the user holds read or list on one of
// them, so an accountant sees Fee Reports only and a teacher/parent/student sees
// none - matching the role matrix in docs/USER_ROLES_WORKFLOW.md.
const REPORT_MODULES: {
  route: string; icon: any; color: string; bg: string; darkBg: string;
  title: string; subtitle: string; resources: string[]; hideForRoles?: string[];
}[] = [
  {
    route: '/reports/fee-reports',
    icon: 'card' as const,
    color: '#10B981',
    bg: '#F0FDF4',
    darkBg: '#10B98120',
    title: 'Fee Reports',
    subtitle: 'Collection summary, pending fees, fee structure',
    resources: ['fee_reports', 'fee_transactions'],
    hideForRoles: ['teacher'],
  },
  {
    route: '/reports/student-reports',
    icon: 'people' as const,
    color: '#3B82F6',
    bg: '#EFF6FF',
    darkBg: '#3B82F620',
    title: 'Student Reports',
    subtitle: 'Admission stats, class-wise strength, demographics',
    resources: ['students', 'student_attendance'],
  },
  {
    route: '/reports/academic-reports',
    icon: 'school' as const,
    color: '#6366F1',
    bg: '#EEF2FF',
    darkBg: '#6366F120',
    title: 'Academic Reports',
    subtitle: 'Exam results, grade distributions, subject performance',
    resources: ['exams', 'exam_results'],
  },
  {
    route: '/reports/staff-reports',
    icon: 'briefcase' as const,
    color: '#F59E0B',
    bg: '#FFFBEB',
    darkBg: '#F59E0B20',
    title: 'Staff Reports',
    subtitle: 'Staff attendance, designation-wise count',
    resources: ['staff', 'staff_attendance'],
  },
  {
    route: '/reports/transport-reports',
    icon: 'bus' as const,
    color: '#EC4899',
    bg: '#FDF2F8',
    darkBg: '#EC489920',
    title: 'Transport Reports',
    subtitle: 'Route utilisation, student transport summary',
    resources: ['routes', 'vehicles', 'transport_trips'],
  },
];

export default function ReportsIndexScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role, hasPermission } = useAuth();

  const roleName = role?.name?.toLowerCase() ?? '';

  // Only surface the report modules this role is allowed to open.
  const reportModules = useMemo(
    () =>
      REPORT_MODULES.filter(mod => {
        if (mod.hideForRoles?.includes(roleName)) return false;
        return mod.resources.some(
          resource => hasPermission(resource, 'read') || hasPermission(resource, 'list')
        );
      }),
    [roleName, hasPermission]
  );

  return (
    <AppLayout title="Reports">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        <Text style={[styles.heading, { color: colors.foreground }]}>Reports & Analytics</Text>
        <Text style={[styles.sub, { color: colors['muted-foreground'] }]}>
          Generate and export reports across all modules.
        </Text>

        <View style={styles.grid}>
          {reportModules.map((mod) => (
            <TouchableOpacity
              key={mod.route}
              style={[
                styles.card,
                { backgroundColor: theme === 'dark' ? mod.darkBg : mod.bg },
              ]}
              onPress={() => router.push(mod.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconBox, { backgroundColor: mod.color }]}>
                <Ionicons name={mod.icon} size={24} color="white" />
              </View>
              <Text style={[styles.cardTitle, { color: mod.color }]}>{mod.title}</Text>
              <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                {mod.subtitle}
              </Text>
              <View style={[styles.arrowBox, { backgroundColor: mod.color + '20' }]}>
                <Ionicons name="arrow-forward" size={14} color={mod.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { fontSize: 13, marginBottom: 20, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', borderRadius: 18, padding: 16,
  },
  iconBox: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  cardSub: { fontSize: 11, lineHeight: 16, marginBottom: 12 },
  arrowBox: {
    alignSelf: 'flex-end', width: 28, height: 28,
    borderRadius: 8, justifyContent: 'center', alignItems: 'center',
  },
});
