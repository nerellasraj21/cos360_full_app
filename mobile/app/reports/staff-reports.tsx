import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';

const COLOR = '#8B5CF6';

const plannedReports = [
  { icon: 'checkmark-circle' as const, title: 'Staff Attendance Report', desc: 'Daily and monthly attendance records by department and designation' },
  { icon: 'people' as const, title: 'Workforce Report', desc: 'Staff headcount by department, gender, and employment type' },
  { icon: 'bar-chart' as const, title: 'Performance Report', desc: 'Staff performance scores and appraisal summaries' },
  { icon: 'calendar' as const, title: 'Leave Report', desc: 'Leave taken, pending, and approved by staff and type' },
  { icon: 'stats-chart' as const, title: 'Department Summary', desc: 'Staff distribution and workload across departments' },
];

export default function StaffReportsScreen() {
  const { colors, theme } = useTheme();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  return (
    <AppLayout title="Staff Reports">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: COLOR }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="person" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Staff Reports</Text>
            <Text style={styles.bannerSub}>Attendance · Performance · Workforce</Text>
          </View>
        </View>

        {/* Coming soon */}
        <View style={[styles.comingSoonCard, { backgroundColor: COLOR + '10', borderColor: COLOR + '30' }]}>
          <Ionicons name="construct-outline" size={40} color={COLOR} />
          <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>Coming Soon</Text>
          <Text style={[styles.comingSoonDesc, { color: colors['muted-foreground'] }]}>
            Staff report generation is currently being built. The following reports will be available:
          </Text>
        </View>

        {/* Planned reports */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>PLANNED REPORTS</Text>

        {plannedReports.map((report, i) => (
          <View key={i} style={[styles.reportItem, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.reportIcon, { backgroundColor: COLOR + '18' }]}>
              <Ionicons name={report.icon} size={20} color={COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.reportTitle, { color: colors.foreground }]}>{report.title}</Text>
              <Text style={[styles.reportDesc, { color: colors['muted-foreground'] }]}>{report.desc}</Text>
            </View>
          </View>
        ))}

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
  comingSoonCard: {
    borderRadius: 14, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 8, marginBottom: 24,
  },
  comingSoonTitle: { fontSize: 18, fontWeight: '700' },
  comingSoonDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12,
  },
  reportItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  reportIcon: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  reportTitle: { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  reportDesc: { fontSize: 12, lineHeight: 17 },
});
