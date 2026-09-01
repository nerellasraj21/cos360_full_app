import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { getModuleStyle, mapPath } from '@/components/navigation/menuMap';
import { useAuth, useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { menuChildrenFor, roleBlocksFees } from '@/src/lib/menuUtils';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const GREEN = '#10B981';

const sections = [
  { title: 'Fee Categories',   description: 'Manage fee categories and their associated fee types', icon: 'pricetag' as const,       color: GREEN,     route: '/fees/categories',     resource: PERMISSION_RESOURCES.FEE_CATEGORIES,     action: 'list' },
  { title: 'Fee Types',        description: 'Manage individual fee types and their properties',     icon: 'pricetags' as const,      color: '#3B82F6', route: '/fees/types',          resource: PERMISSION_RESOURCES.FEE_TYPES,          action: 'list' },
  { title: 'Fee Terms',        description: 'Configure fee terms and payment schedules',            icon: 'calendar' as const,       color: '#F59E0B', route: '/fees/terms',          resource: PERMISSION_RESOURCES.FEE_TERMS,          action: 'list' },
  { title: 'Fee Mappings',     description: 'Map fee types to classes or individual students',      icon: 'git-branch' as const,     color: '#8B5CF6', route: '/fees/mappings',       resource: PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS, action: 'list' },
  { title: 'Fee Term Amounts', description: 'Manage fee term amount configurations',                icon: 'cash-outline' as const,   color: '#06B6D4', route: '/fees/mappings?tab=class-mappings', resource: PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS, action: 'list' },
  { title: 'Fee Collection',   description: 'Collect and manage fee payments from students',        icon: 'wallet' as const,         color: '#7C3AED', route: '/fees/collection',     resource: PERMISSION_RESOURCES.FEE_TRANSACTIONS,   action: 'list' },
  { title: 'Fee Receipts',     description: 'View and manage fee payment receipts',                 icon: 'receipt' as const,        color: '#556ee6', route: '/fees/receipts',       resource: PERMISSION_RESOURCES.FEE_TRANSACTIONS,   action: 'list' },
  { title: 'Fee Refunds',      description: 'Process and manage fee refunds',                       icon: 'refresh-circle' as const, color: '#EF4444', route: '/fees/refunds',  resource: PERMISSION_RESOURCES.FEE_REFUNDS,  action: 'list' },
];

// Descriptions for the self-service fee sections — copy matches the web app's
// `STUDENT_FEE_SECTIONS` in `src/routes/_app/fee/index.tsx`.
const SELF_SERVICE_DESCRIPTIONS: Record<string, string> = {
  'My Receipts': 'View your fee payment receipts',
  'My Transactions': 'View your fee payment history',
  'My Fees': 'View your fee summary and payments',
};

// Web parity (`STUDENT_FEE_SECTIONS`): shown when the backend Fee menu node
// doesn't already provide them. Both screens exist on mobile
// (`app/fees/my-receipts.tsx`, `app/fees/my-transactions.tsx`) — separate
// from the admin-only `app/fees/receipts.tsx` management screen.
const SELF_SERVICE_FEE_SECTIONS = [
  { id: '__my_receipts', name: 'My Receipts', path: '/fee/my-receipts' },
  { id: '__my_transactions', name: 'My Transactions', path: '/fee/my-transactions' },
];

export default function FeesScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role, menu } = useAuth();
  const { hasPermission } = useMobilePermission();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
  const isFeeBlocked = roleBlocksFees(roleName);

  // Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee module.
  useEffect(() => {
    if (isFeeBlocked) {
      router.replace('/(tabs)');
    }
  }, [isFeeBlocked, router]);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // Student/parent fee sections come from the Fee node of the backend menu —
  // the same source the web `/fee` hub renders from. `applyRoleMenuRules`
  // already strips "My Fees" for students and injects the self-service pair
  // when the backend sends no Fee node at all.
  const selfServiceSections = useMemo(() => {
    const fromMenu = menuChildrenFor((menu ?? []) as any, roleName, ['fee', 'fees', 'fee management'])
      .filter(child => !!child.path);

    const merged = [...fromMenu];
    for (const fallback of SELF_SERVICE_FEE_SECTIONS) {
      const route = mapPath(fallback.path);
      const alreadyThere = merged.some(child => mapPath(child.path!) === route);
      if (!alreadyThere) merged.push(fallback as any);
    }
    return merged;
  }, [menu, roleName]);

  // Render nothing while redirecting a blocked role away from fees.
  if (isFeeBlocked) {
    return null;
  }

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

          <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>FEE SECTIONS</Text>

          {/* Fee summary — mobile-only screen, backed by the granted
              /fee/collection/my-summary (student) and child-summary (parent) endpoints. */}
          <TouchableOpacity
            style={[styles.fullCard, { backgroundColor: cardBg, borderColor: borderCol, marginBottom: 10 }]}
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
                View dues, payments, concessions & old fees
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors['muted-foreground']} />
          </TouchableOpacity>

          {/* Menu-driven sections — web parity with `STUDENT_FEE_SECTIONS`. */}
          {selfServiceSections.map(section => {
            const label = section.name ?? '';
            const { icon, color } = getModuleStyle(label);
            const description = SELF_SERVICE_DESCRIPTIONS[label] ?? `View your ${label.toLowerCase()}`;
            return (
              <TouchableOpacity
                key={section.id ?? section.path}
                style={[styles.fullCard, { backgroundColor: cardBg, borderColor: borderCol, marginBottom: 10 }]}
                onPress={() => router.push(mapPath(section.path!) as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBox, { backgroundColor: color + '18' }]}>
                  <Ionicons name={icon} size={28} color={color} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, fontSize: 16 }]}>
                    {label}
                  </Text>
                  <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]}>
                    {description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors['muted-foreground']} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </AppLayout>
    );
  }

  // ── Admin / Staff: full fee management grid (teachers are redirected above) ─
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
