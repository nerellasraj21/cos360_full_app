import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { expenseCategoriesApi, expenseReportsApi, expenseTypesApi } from '@/src/api/expense';

const ORANGE = '#F97316';

// Colors for category left borders (cycles through these)
const BORDER_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#F97316'];

type CategoryRow = {
  id: string;
  name: string;
  description?: string;
  total_amount: number;
  entry_count: number;
  types: TypeRow[];
};

type TypeRow = {
  id: string;
  name: string;
  description?: string;
  total_amount: number;
  entry_count: number;
};

// Generate last 5 financial years (Indian FY: Apr–Mar)
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { label: 'All Years', value: '' },
  ...Array.from({ length: 5 }, (_, i) => {
    const yr = CURRENT_YEAR - i;
    return { label: `FY ${yr}–${String(yr + 1).slice(2)}`, value: String(yr) };
  }),
];

export default function ExpenseSummaryScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const [selectedYear, setSelectedYear] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const sectionBg = theme === 'dark' ? '#13132b' : '#f8fafc';

  // Fetch categories
  const { data: categoriesData, isLoading: catsLoading } = useQuery({
    queryKey: ['summary-categories'],
    queryFn: () => expenseCategoriesApi.getCategories({ active_only: false }),
  });

  // Fetch all types
  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ['summary-types'],
    queryFn: () => expenseTypesApi.getTypes({ limit: 1000 }),
  });

  // Fetch category report for amounts
  const { data: catReport = [] } = useQuery({
    queryKey: ['summary-cat-report', selectedYear],
    queryFn: () => expenseReportsApi.getCategoryReport(selectedYear ? { start_date: `${selectedYear}-04-01`, end_date: `${selectedYear}-03-31` } : {}),
  });

  // Fetch type report for amounts
  const { data: typeReport = [] } = useQuery({
    queryKey: ['summary-type-report', selectedYear],
    queryFn: () => expenseReportsApi.getTypeReport(selectedYear ? { start_date: `${selectedYear}-04-01`, end_date: `${selectedYear}-03-31` } : {}),
  });

  const categories = useMemo(() => (categoriesData as any)?.items ?? [], [categoriesData]);
  const types = useMemo(() => (typesData as any)?.items ?? [], [typesData]);

  // Build hierarchical summary
  const summary: CategoryRow[] = useMemo(() => {
    const catReportMap: Record<string, any> = {};
    (catReport as any[]).forEach(r => { catReportMap[r.category_id] = r; });

    const typeReportMap: Record<string, any> = {};
    (typeReport as any[]).forEach(r => { typeReportMap[r.type_id] = r; });

    return categories.map((cat: any) => {
      const catTypes: TypeRow[] = types
        .filter((t: any) => t.category_id === cat.id)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          total_amount: typeReportMap[t.id]?.total_amount ?? 0,
          entry_count: typeReportMap[t.id]?.transaction_count ?? 0,
        }));

      const rep = catReportMap[cat.id];
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        total_amount: rep?.total_amount ?? 0,
        entry_count: rep?.transaction_count ?? 0,
        types: catTypes,
      };
    });
  }, [categories, types, catReport, typeReport]);

  const grandTotal = useMemo(() => summary.reduce((s, c) => s + c.total_amount, 0), [summary]);
  const totalEntries = useMemo(() => summary.reduce((s, c) => s + c.entry_count, 0), [summary]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const isLoading = catsLoading || typesLoading;

  return (
    <AppLayout title="Expense Summary">
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* Header: title + year picker */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Expense Summary</Text>
            <Text style={[styles.pageSub, { color: colors['muted-foreground'] }]}>
              Category-wise breakdown of all expenses with type-level details and totals
            </Text>
          </View>
          <View style={{ width: 150 }}>
            <CustomDropdown
              data={YEAR_OPTIONS}
              value={selectedYear}
              onChange={(v: any) => setSelectedYear(v?.toString() ?? '')}
              placeholder="All Years"
            />
          </View>
        </View>

        {/* 3 Stat cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIcon, { backgroundColor: '#556ee620' }]}>
              <Ionicons name="logo-usd" size={20} color="#556ee6" />
            </View>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Grand Total</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{fmt(grandTotal)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIcon, { backgroundColor: ORANGE + '20' }]}>
              <Ionicons name="folder-outline" size={20} color={ORANGE} />
            </View>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Categories</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{summary.length}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF620' }]}>
              <Ionicons name="pricetag-outline" size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total Entries</Text>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{totalEntries}</Text>
          </View>
        </View>

        {/* Category sections */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={ORANGE} size="large" />
          </View>
        ) : summary.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[{ color: colors['muted-foreground'], fontSize: 14 }]}>No expense data found.</Text>
          </View>
        ) : (
          summary.map((cat, idx) => {
            const borderColor = BORDER_COLORS[idx % BORDER_COLORS.length];
            const expanded = expandedIds.has(cat.id);
            return (
              <View
                key={cat.id}
                style={[styles.catSection, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: borderColor }]}
              >
                {/* Category header row */}
                <TouchableOpacity
                  style={styles.catHeader}
                  onPress={() => toggleExpand(cat.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catIconBox, { backgroundColor: borderColor + '20' }]}>
                    <Ionicons name="folder-outline" size={18} color={borderColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catName, { color: colors.foreground }]}>{cat.name}</Text>
                    {cat.description ? (
                      <Text style={[styles.catDesc, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                        {cat.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={[styles.catMeta, { color: colors['muted-foreground'] }]}>
                      {cat.entry_count} entries · {cat.types.length} types
                    </Text>
                    <Text style={[styles.catAmount, { color: colors.foreground }]}>{fmt(cat.total_amount)}</Text>
                  </View>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors['muted-foreground']}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>

                {/* Type rows (shown when expanded) */}
                {expanded && (
                  <View style={[styles.typesList, { borderTopColor: borderCol }]}>
                    {cat.types.length === 0 ? (
                      <Text style={[styles.noTypes, { color: colors['muted-foreground'] }]}>No types in this category</Text>
                    ) : (
                      cat.types.map(t => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.typeRow, { backgroundColor: sectionBg, borderColor: borderCol }]}
                          onPress={() => router.push(`/expense/transactions?typeId=${t.id}` as any)}
                          activeOpacity={0.75}
                        >
                          <Ionicons name="pricetag-outline" size={14} color={colors['muted-foreground']} style={{ marginRight: 6 }} />
                          <Text style={[styles.typeName, { color: colors.foreground }]}>{t.name}</Text>
                          {t.description ? (
                            <Text style={[styles.typeSep, { color: colors['muted-foreground'] }]}> — </Text>
                          ) : null}
                          {t.description ? (
                            <Text style={[styles.typeDesc, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                              {t.description}
                            </Text>
                          ) : null}
                          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.typeMeta, { color: colors['muted-foreground'] }]}>
                              {t.entry_count} entries
                            </Text>
                            <Text style={[styles.typeAmount, { color: colors.foreground }]}>{fmt(t.total_amount)}</Text>
                            <Ionicons name="chevron-forward" size={13} color={colors['muted-foreground']} />
                          </View>
                        </TouchableOpacity>
                      ))
                    )}

                    {/* Category Total */}
                    <View style={styles.catTotal}>
                      <Text style={[styles.catTotalLabel, { color: colors['muted-foreground'] }]}>Category Total:</Text>
                      <Text style={[styles.catTotalAmount, { color: colors.foreground }]}>{fmt(cat.total_amount)}</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  pageTitle: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  pageSub: { fontSize: 12, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
  statValue: { fontSize: 16, fontWeight: '700' },
  catSection: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden',
  },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14,
  },
  catIconBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 15, fontWeight: '700' },
  catDesc: { fontSize: 12, marginTop: 1 },
  catMeta: { fontSize: 11 },
  catAmount: { fontSize: 15, fontWeight: '700' },
  typesList: { borderTopWidth: 1, paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, gap: 6 },
  typeRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, borderWidth: 1, padding: 10,
  },
  typeName: { fontSize: 13, fontWeight: '600' },
  typeSep: { fontSize: 12 },
  typeDesc: { fontSize: 12, flex: 1 },
  typeMeta: { fontSize: 11 },
  typeAmount: { fontSize: 13, fontWeight: '600' },
  catTotal: {
    flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
    gap: 6, marginTop: 8,
  },
  catTotalLabel: { fontSize: 13 },
  catTotalAmount: { fontSize: 16, fontWeight: '700' },
  noTypes: { fontSize: 12, textAlign: 'center', paddingVertical: 8 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyBox: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 40, alignItems: 'center' },
});
