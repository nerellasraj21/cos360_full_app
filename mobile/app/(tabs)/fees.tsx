import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const GREEN = '#10B981';

const sections = [
  { title: 'Fee Categories',   description: 'Manage fee categories like Tuition, Transport', icon: 'folder' as const,          color: GREEN,     route: '/fees/categories',       resource: PERMISSION_RESOURCES.FEE_CATEGORIES,       action: 'list' },
  { title: 'Fee Types',        description: 'Configure types of fees within categories',     icon: 'pricetag' as const,        color: '#3B82F6', route: '/fees/types',            resource: PERMISSION_RESOURCES.FEE_TYPES,            action: 'list' },
  { title: 'Fee Terms',        description: 'Set up payment terms and schedules',            icon: 'calendar' as const,        color: '#F59E0B', route: '/fees/terms',            resource: PERMISSION_RESOURCES.FEE_TERMS,            action: 'list' },
  { title: 'Class Mappings',   description: 'Map fees to specific classes with amounts',     icon: 'school' as const,          color: '#8B5CF6', route: '/fees/class-mappings',   resource: PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS,   action: 'list' },
  { title: 'Student Mappings', description: 'Assign fees to individual students',            icon: 'people' as const,          color: '#06B6D4', route: '/fees/student-mappings', resource: PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS, action: 'list' },
  { title: 'Transactions',     description: 'View and manage fee payment transactions',      icon: 'card' as const,            color: '#556ee6', route: '/fees/transactions',     resource: PERMISSION_RESOURCES.FEE_TRANSACTIONS,     action: 'list' },
  { title: 'Fee Refunds',      description: 'Process and track fee refunds',                 icon: 'refresh-circle' as const,  color: '#EF4444', route: '/fees/refunds',          resource: PERMISSION_RESOURCES.FEE_REFUNDS,          action: 'list' },
  { title: 'Fee Collection',   description: 'Collect and record fee payments from students', icon: 'wallet' as const,          color: '#7C3AED', route: '/fees/collection',       resource: PERMISSION_RESOURCES.FEE_TRANSACTIONS,     action: 'list' },
  { title: 'Fee Reports',      description: 'Collection summary, pending fees & structure',  icon: 'bar-chart' as const,       color: '#0891B2', route: '/fees/reports',          resource: PERMISSION_RESOURCES.FEE_TRANSACTIONS,     action: 'list' },
];

export default function FeesScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // ── Student / Parent: show only fee summary ───────────────────────────────
  if (isStudent || isParent) {
    const title = isStudent ? 'My Fees' : 'Child Fees';
    const desc  = isStudent ? 'View your fee summary and payment history' : 'View child fee summary and payment history';
    return (
      <AppLayout title={title}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={[styles.banner, { backgroundColor: GREEN }]}>
            <View style={styles.bannerDecor} />
            <View style={styles.bannerDecor2} />
            <View style={styles.bannerIcon}>
              <Ionicons name="cash" size={28} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{title}</Text>
              <Text style={styles.bannerSub}>{desc}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>FEE SUMMARY</Text>

          <TouchableOpacity
            style={[styles.fullCard, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push('/fees/collection' as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.sectionIconBox, { backgroundColor: GREEN + '18' }]}>
              <Ionicons name="wallet" size={28} color={GREEN} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 16 }]}>
                {isStudent ? 'My Fee Summary' : 'Child Fee Summary'}
              </Text>
              <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]}>
                {isStudent ? 'View dues, payments, concessions & old fees' : 'View dues, payments, concessions & old fees'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors['muted-foreground']} />
          </TouchableOpacity>
        </ScrollView>
      </AppLayout>
    );
  }

  // ── Admin / Staff / Teacher: full fee management grid ─────────────────────
  return (
    <AppLayout title="Fee Management">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: GREEN }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="cash" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Fee Management</Text>
            <Text style={styles.bannerSub}>Manage all fee operations in one place</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>FEE SECTIONS</Text>

        {/* Grid */}
        <View style={styles.grid}>
          {sections.map((section, i) => {
            const hasAccess = hasPermission ? hasPermission(section.resource, section.action) : false;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.sectionCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                  !hasAccess && { opacity: 0.5 },
                ]}
                onPress={() => hasAccess && router.push(section.route as any)}
                disabled={!hasAccess}
                activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBox, { backgroundColor: section.color + '18' }]}>
                  <Ionicons
                    name={hasAccess ? section.icon : 'lock-closed'}
                    size={24}
                    color={hasAccess ? section.color : '#9ca3af'}
                  />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                  {hasAccess ? section.description : 'No access — contact admin'}
                </Text>
                {hasAccess && (
                  <View style={[styles.sectionArrow, { backgroundColor: section.color + '18' }]}>
                    <Ionicons name="arrow-forward" size={12} color={section.color} />
                  </View>
                )}
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
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionCard: {
    width: '48%', borderRadius: 14, borderWidth: 1,
    padding: 16, minHeight: 120,
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
  fullCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
});
