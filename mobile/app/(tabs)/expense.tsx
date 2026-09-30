import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { expenseCategoriesApi, expenseTypesApi, expenseTransactionsApi } from '@/src/api/expense';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const ORANGE = '#F97316';

// Mirrors the web Expense hub: Overview, Categories, Types, Transactions, Departments, Summary.
const sections: {
  title: string; description: string; icon: any; color: string;
  route: string; resource?: string; action?: string; alwaysShow?: boolean;
}[] = [
  { title: 'Overview',     description: 'Track, manage and approve expenses',                                                     icon: 'grid' as const,            color: '#9A3412', route: '/(tabs)/expense',       alwaysShow: true },
  { title: 'Categories',   description: 'Manage top-level expense categories such as Infrastructure, Utilities, and Operations', icon: 'pricetag' as const,        color: '#EA580C', route: '/expense/categories',   resource: PERMISSION_RESOURCES.EXPENSE_CATEGORIES,   action: 'list' },
  { title: 'Types',        description: 'Define specific expense types within each category with budget limits and controls',     icon: 'pricetags' as const,       color: ORANGE,    route: '/expense/types',        resource: PERMISSION_RESOURCES.EXPENSE_TYPES,        action: 'list' },
  { title: 'Transactions', description: 'Create, view, and track all expense transactions with full approval workflow',           icon: 'swap-horizontal' as const, color: '#C2410C', route: '/expense/transactions', resource: PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS, action: 'list' },
  { title: 'Departments',  description: 'Maintain the departments that expenses can be assigned to and filtered by',             icon: 'business' as const,        color: '#9A3412', route: '/expense/departments',  resource: PERMISSION_RESOURCES.EXPENSE_DEPARTMENTS,  action: 'list' },
  { title: 'Summary',      description: 'Category-wise breakdown with type totals and grand total — filterable by academic year', icon: 'list' as const,            color: '#EA580C', route: '/expense/summary',      resource: PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS, action: 'list' },
];

export default function ExpenseScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // Stat-card counts — mirrors the web Expense landing (Categories / Types / Transactions)
  const { data: categoriesData } = useQuery({
    queryKey: ['expense-categories-count'],
    queryFn: () => expenseCategoriesApi.getCategories({ limit: 1 }),
  });
  const { data: typesData } = useQuery({
    queryKey: ['expense-types-count'],
    queryFn: () => expenseTypesApi.getTypes({ limit: 1 }),
  });
  const { data: transactionsData } = useQuery({
    queryKey: ['expense-transactions-count'],
    queryFn: () => expenseTransactionsApi.getTransactions({ limit: 1 }),
  });
  const categoryCount = categoriesData?.total ?? 0;
  const typeCount = typesData?.total ?? 0;
  const transactionCount = transactionsData?.total ?? 0;

  return (
    <AppLayout title="Expense Management">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: ORANGE }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="wallet" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Expense Management</Text>
            <Text style={styles.bannerSub}>Track, manage and approve expenses</Text>
          </View>
        </View>

        {/* Stat cards — match the web Expense landing */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{categoryCount}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Expense Categories</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{typeCount}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Expense Types</Text>
          </View>
          <View style={[styles.statCard, styles.statCardWide, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{transactionCount}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total Transactions</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>EXPENSE SECTIONS</Text>

        {/* Grid */}
        <View style={styles.grid}>
          {sections.map((section, i) => {
            const hasAccess = section.alwaysShow
              ? true
              : (section.resource && section.action
                  ? hasPermission(section.resource, section.action)
                  : false);
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%', borderRadius: 14, borderWidth: 1, padding: 16, minHeight: 88,
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statCardWide: { width: '100%' },
  statValue: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
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
});
