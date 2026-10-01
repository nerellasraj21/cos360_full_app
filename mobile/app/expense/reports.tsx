import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { DatePickerModal, formatDate } from '@/components/ui/date-picker-modal';
import { useTheme } from '@/contexts';
import {
  useExpenseCategoryReportProtected,
  useExpenseTrendReportProtected,
  useExpenseTypeReportProtected,
} from '@/hooks/use-expense-protected';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const ORANGE = '#F97316';
const BRAND = '#556ee6';

type ReportTab = 'category' | 'type' | 'trend';

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'category', label: 'By Category' },
  { key: 'type', label: 'By Type' },
  { key: 'trend', label: 'Trend' },
];

function toNumber(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(val: unknown): string {
  return `₹${toNumber(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtCount(val: unknown): string {
  return toNumber(val).toLocaleString('en-IN');
}

function fmtPercent(val: unknown): string {
  return `${toNumber(val).toFixed(1)}%`;
}

function fmtMonth(val?: string): string {
  if (!val) return '-';
  const parts = val.split('-').map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return val;
  const d = new Date(parts[0], parts[1] - 1, 1);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function fmtDay(val?: string): string {
  if (!val) return '-';
  const parts = val.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return val;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function defaultRange() {
  const end = new Date();
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { from: formatDate(start), to: formatDate(end) };
}

export default function ExpenseReportsScreen() {
  const { colors, theme } = useTheme();

  const initial = useMemo(() => defaultRange(), []);
  const [tab, setTab] = useState<ReportTab>('category');
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [appliedFrom, setAppliedFrom] = useState(initial.from);
  const [appliedTo, setAppliedTo] = useState(initial.to);
  const [datePicker, setDatePicker] = useState<'from' | 'to' | null>(null);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const filterBg = theme === 'dark' ? '#13132b' : '#f8fafc';
  const chipBg = theme === 'dark' ? '#1a1a2e' : '#f1f5f9';

  const filters = useMemo(
    () => ({ start_date: appliedFrom || undefined, end_date: appliedTo || undefined }),
    [appliedFrom, appliedTo],
  );

  const categoryQ = useExpenseCategoryReportProtected(filters);
  const typeQ = useExpenseTypeReportProtected(filters);
  const trendQ = useExpenseTrendReportProtected(filters);

  const active = tab === 'category' ? categoryQ : tab === 'type' ? typeQ : trendQ;
  const report = active.data;
  const summary = report?.summary;

  const rangeInvalid = !!fromDate && !!toDate && fromDate > toDate;
  const dirty = fromDate !== appliedFrom || toDate !== appliedTo;

  const handleApply = () => {
    if (rangeInvalid) return;
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const handleReset = () => {
    setFromDate(initial.from);
    setToDate(initial.to);
    setAppliedFrom(initial.from);
    setAppliedTo(initial.to);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([categoryQ.refetch(), typeQ.refetch(), trendQ.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const statCards = useMemo(() => {
    if (!summary) return [];
    const third =
      tab === 'category'
        ? { label: 'Categories', value: fmtCount((report as any)?.categories?.length ?? summary.categories_count), icon: 'albums-outline', color: '#8B5CF6' }
        : tab === 'type'
          ? { label: 'Expense Types', value: fmtCount((report as any)?.types?.length ?? 0), icon: 'pricetags-outline', color: '#8B5CF6' }
          : { label: 'Months', value: fmtCount((report as any)?.monthly_trends?.length ?? 0), icon: 'calendar-outline', color: '#8B5CF6' };
    return [
      { label: 'Total Amount', value: fmtMoney(summary.total_amount), icon: 'cash-outline', color: '#10B981' },
      { label: 'Total Transactions', value: fmtCount(summary.total_transactions), icon: 'receipt-outline', color: BRAND },
      { label: 'Average per Transaction', value: fmtMoney(summary.average_transaction), icon: 'analytics-outline', color: '#3B82F6' },
      third,
    ];
  }, [summary, tab, report]);

  const categories = tab === 'category' ? ((report as any)?.categories ?? []) : [];
  const types = tab === 'type' ? ((report as any)?.types ?? []) : [];
  const trends = tab === 'trend' ? ((report as any)?.monthly_trends ?? []) : [];
  const rowCount = categories.length + types.length + trends.length;

  const sectionTitle = tab === 'category' ? 'Category Breakdown' : tab === 'type' ? 'Type Breakdown' : 'Monthly Trends';

  const rangeLabel = `${fmtDay(appliedFrom)} to ${fmtDay(appliedTo)}`;

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_REPORTS}>
      <AppLayout title="Expense Reports">
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={ORANGE} onRefresh={handleRefresh} />}
        >
          <View style={[styles.filterCard, { backgroundColor: filterBg, borderColor: borderCol }]}>
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>Date Range</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}
                onPress={() => setDatePicker('from')}
                accessibilityLabel="Select start date"
              >
                <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
                <Text style={[styles.dateText, { color: fromDate ? colors.foreground : colors['muted-foreground'] }]}>
                  {fromDate ? fmtDay(fromDate) : 'Start date'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}
                onPress={() => setDatePicker('to')}
                accessibilityLabel="Select end date"
              >
                <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
                <Text style={[styles.dateText, { color: toDate ? colors.foreground : colors['muted-foreground'] }]}>
                  {toDate ? fmtDay(toDate) : 'End date'}
                </Text>
              </TouchableOpacity>
            </View>
            {rangeInvalid && (
              <Text style={styles.errorText}>Start date must be on or before the end date</Text>
            )}
            <View style={styles.filterBtnRow}>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: BRAND, opacity: rangeInvalid || !dirty ? 0.5 : 1 }]}
                onPress={handleApply}
                disabled={rangeInvalid || !dirty}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: borderCol }]}
                onPress={handleReset}
              >
                <Text style={[styles.clearBtnText, { color: colors['muted-foreground'] }]}>Last 30 Days</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.filterActive, { color: BRAND }]}>Showing: {rangeLabel}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsRow}
            keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }}
          >
            {TABS.map(t => {
              const isActive = tab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tab, { backgroundColor: isActive ? ORANGE : chipBg, borderColor: isActive ? ORANGE : borderCol }]}
                  onPress={() => setTab(t.key)}
                >
                  <Text style={[styles.tabText, { color: isActive ? 'white' : colors['muted-foreground'] }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {active.isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ORANGE} />
            </View>
          ) : active.isError ? (
            <View style={styles.empty}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                {(active.error as any)?.message || 'Could not load the report'}
              </Text>
              <TouchableOpacity style={[styles.retryBtn, { borderColor: ORANGE }]} onPress={() => active.refetch()}>
                <Text style={{ color: ORANGE, fontWeight: '600', fontSize: 13 }}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !report ? (
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No data found for selected period
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingBottom: 32 }}>
              <View style={styles.statsGrid}>
                {statCards.map(card => (
                  <View
                    key={card.label}
                    style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                  >
                    <View style={[styles.statIcon, { backgroundColor: card.color + '15' }]}>
                      <Ionicons name={card.icon as any} size={20} color={card.color} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit>
                      {card.value}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>{card.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{sectionTitle}</Text>

              {rowCount === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="bar-chart-outline" size={40} color={colors['muted-foreground']} />
                  <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    No expenses found for selected period
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {categories.map((cat: any, idx: number) => {
                    const pct = Math.min(Math.max(toNumber(cat.percentage_of_total), 0), 100);
                    return (
                      <View
                        key={cat.category_id ?? `cat-${idx}`}
                        style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: BRAND }]}
                      >
                        <View style={styles.rowTop}>
                          <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={2}>
                            {cat.category_name || 'Uncategorised'}
                          </Text>
                          <Text style={[styles.rankAmount, { color: colors.foreground }]}>{fmtMoney(cat.total_amount)}</Text>
                        </View>
                        <Text style={[styles.rankMeta, { color: colors['muted-foreground'] }]}>
                          {fmtCount(cat.transaction_count)} transaction{toNumber(cat.transaction_count) !== 1 ? 's' : ''}
                          {'  |  '}Avg {fmtMoney(cat.average_amount)}
                        </Text>
                        <View style={styles.progressBarWrap}>
                          <View style={[styles.progressBar, { width: `${pct}%`, backgroundColor: BRAND }]} />
                        </View>
                        <Text style={[styles.rankPct, { color: BRAND }]}>{fmtPercent(cat.percentage_of_total)} of total</Text>
                      </View>
                    );
                  })}

                  {types.map((t: any, idx: number) => (
                    <View
                      key={t.type_id ?? `type-${idx}`}
                      style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#10B981' }]}
                    >
                      <View style={styles.rowTop}>
                        <Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={2}>
                          {t.type_name || 'Unnamed type'}
                        </Text>
                        <Text style={[styles.rankAmount, { color: colors.foreground }]}>{fmtMoney(t.total_amount)}</Text>
                      </View>
                      {!!t.category_name && (
                        <View style={styles.metaRow}>
                          <Ionicons name="albums-outline" size={12} color={colors['muted-foreground']} />
                          <Text style={[styles.rankMeta, { color: colors['muted-foreground'] }]}>{t.category_name}</Text>
                        </View>
                      )}
                      <Text style={[styles.rankMeta, { color: colors['muted-foreground'] }]}>
                        {fmtCount(t.transaction_count)} transaction{toNumber(t.transaction_count) !== 1 ? 's' : ''}
                        {'  |  '}Avg {fmtMoney(t.average_amount)}
                      </Text>
                    </View>
                  ))}

                  {trends.map((m: any, idx: number) => (
                    <View
                      key={m.month ?? `month-${idx}`}
                      style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol, borderLeftColor: '#F59E0B' }]}
                    >
                      <View style={styles.rowTop}>
                        <Text style={[styles.rankName, { color: colors.foreground }]}>{fmtMonth(m.month)}</Text>
                        <Text style={[styles.rankAmount, { color: colors.foreground }]}>{fmtMoney(m.total_amount)}</Text>
                      </View>
                      <Text style={[styles.rankMeta, { color: colors['muted-foreground'] }]}>
                        {fmtCount(m.transaction_count)} transaction{toNumber(m.transaction_count) !== 1 ? 's' : ''}
                        {'  |  '}Avg {fmtMoney(m.average_per_transaction)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
        <DatePickerModal
          visible={datePicker !== null}
          initialDate={datePicker === 'from' ? fromDate : toDate}
          onConfirm={date => {
            if (datePicker === 'from') setFromDate(date);
            else if (datePicker === 'to') setToDate(date);
            setDatePicker(null);
          }}
          onCancel={() => setDatePicker(null)}
        />
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  filterCard: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 10,
  },
  filterTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  filterRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 44,
  },
  dateText: { flex: 1, fontSize: 12 },
  errorText: { color: '#EF4444', fontSize: 12 },
  filterBtnRow: { flexDirection: 'row', gap: 10 },
  applyBtn: { flex: 1, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  applyBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  clearBtn: { flex: 1, borderRadius: 8, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  clearBtnText: { fontWeight: '600', fontSize: 13 },
  filterActive: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  tabsRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 12, fontWeight: '600' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 12,
  },
  statCard: {
    width: '47%', flexGrow: 1, borderRadius: 12, borderWidth: 1, padding: 14, gap: 6,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  rowCard: {
    borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, padding: 14, gap: 6,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankName: { flex: 1, fontSize: 14, fontWeight: '600' },
  rankMeta: { fontSize: 12 },
  rankAmount: { fontSize: 14, fontWeight: '700' },
  rankPct: { fontSize: 12, fontWeight: '600' },
  progressBarWrap: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(85,110,230,0.12)', overflow: 'hidden',
  },
  progressBar: { height: 4, borderRadius: 2 },
});
