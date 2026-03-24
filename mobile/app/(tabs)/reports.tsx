import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';

const PRIMARY = '#556ee6';

const sections = [
  {
    title: 'Student Reports',
    description: 'Attendance, performance, and enrollment analytics',
    icon: 'people' as const,
    color: '#3B82F6',
    route: '/reports/student-reports',
  },
  {
    title: 'Fee Reports',
    description: 'Fee collection, outstanding dues, and payment summaries',
    icon: 'card' as const,
    color: '#10B981',
    route: '/reports/fee-reports',
  },
  {
    title: 'Staff Reports',
    description: 'Staff attendance, performance, and workforce analytics',
    icon: 'person' as const,
    color: '#8B5CF6',
    route: '/reports/staff-reports',
  },
  {
    title: 'Transport Reports',
    description: 'Route utilization, vehicle usage, and trip analytics',
    icon: 'bus' as const,
    color: '#F59E0B',
    route: '/reports/transport-reports',
  },
  {
    title: 'Academic Reports',
    description: 'Exam results, marks, and grade distribution',
    icon: 'school' as const,
    color: '#EF4444',
    route: '/reports/academic-reports',
  },
];

export default function ReportsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  return (
    <AppLayout title="Reports">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: PRIMARY }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="bar-chart" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Reports</Text>
            <Text style={styles.bannerSub}>Analytics & Reporting Across All Modules</Text>
          </View>
        </View>

        {/* Coming soon notice */}
        <View style={[styles.noticeCard, { backgroundColor: PRIMARY + '12', borderColor: PRIMARY + '30' }]}>
          <Ionicons name="time-outline" size={18} color={PRIMARY} />
          <Text style={[styles.noticeText, { color: PRIMARY }]}>
            Unified reporting dashboard coming soon. Module-specific reports available below.
          </Text>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>REPORT SECTIONS</Text>

        {/* Grid */}
        <View style={styles.grid}>
          {sections.map((section, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => router.push(section.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.sectionIconBox, { backgroundColor: section.color + '18' }]}>
                <Ionicons name={section.icon} size={24} color={section.color} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={2}>
                {section.title}
              </Text>
              <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                {section.description}
              </Text>
              <View style={[styles.sectionArrow, { backgroundColor: section.color + '18' }]}>
                <Ionicons name="arrow-forward" size={12} color={section.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: {
    borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16, overflow: 'hidden',
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
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 16 },
  noticeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionCard: {
    width: '48%', borderRadius: 14, borderWidth: 1,
    padding: 16, minHeight: 130,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionIconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  sectionDesc: { fontSize: 11, lineHeight: 16, flex: 1 },
  sectionArrow: {
    alignSelf: 'flex-end', marginTop: 8,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
});
