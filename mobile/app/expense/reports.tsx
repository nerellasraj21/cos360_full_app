import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { useTheme } from '@/contexts';
import { useExpenseSummaryReportProtected } from '@/hooks/use-expense-protected';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const ORANGE = '#F97316';

export default function ExpenseReportsScreen() {
  const { colors, theme } = useTheme();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const filterBg = theme === 'dark' ? '#13132b' : '#f8fafc';

  const { data: report, isLoading, refetch } = useExpenseSummaryReportProtected(
    appliedFrom || appliedTo
      ? { start_date: appliedFrom || undefined, end_date: appliedTo || undefined }
      : undefined
  );

  const handleApply = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const handleClear = () => {
    setFromDate('');
    setToDate('');
    setAppliedFrom('');
    setAppliedTo('');
  };

  const fmt = (val: number) =>
    `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const statCards = report
    ? [
        { label: 'Total Transactions', value: String(report.total_transactions), icon: 'receipt-outline', color: '#556ee6' },
        { label: 'Total Amount', value: fmt(report.total_amount), icon: 'cash-outline', color: '#10B981' },
        { label: 'Approved', value: fmt(report.approved_amount), icon: 'checkmark-circle-outline', color: '#3B82F6' },
        { label: 'Pending', value: fmt(report.pending_amount), icon: 'time-outline', color: '#F59E0B' },
        { label: 'Paid', value: fmt(report.paid_amount), icon: 'wallet-outline', color: '#8B5CF6' },
        { label: 'Cancelled', value: fmt(report.cancelled_amount), icon: 'close-circle-outline', color: '#EF4444' },
      ]
    : [];

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
      <AppLayout title="Expense Reports">
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

          {/* Date filter */}
          <View style={[styles.filterCard, { backgroundColor: filterBg, borderColor: borderCol }]}>
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>Date Range</Text>
            <View style={styles.filterRow}>
              <View style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}>
                <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
                <TextInput
                  style={[styles.dateText, { color: colors.foreground }]}
                  placeholder="From (YYYY-MM-DD)"
                  placeholderTextColor={colors['muted-foreground']}
                  value={fromDate}
                  onChangeText={setFromDate}
                />
              </View>
              <View style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}>
                <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
                <TextInput
                  style={[styles.dateText, { color: colors.foreground }]}
                  placeholder="To (YYYY-MM-DD)"
                  placeholderTextColor={colors['muted-foreground']}
                  value={toDate}
                  onChangeText={setToDate}
                />
              </View>
            </View>
            <View style={styles.filterBtnRow}>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: '#556ee6' }]}
                onPress={handleApply}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
              {(appliedFrom || appliedTo) && (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: borderCol }]}
                  onPress={handleClear}
                >
                  <Text style={[styles.clearBtnText, { color: colors['muted-foreground'] }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {appliedFrom || appliedTo ? (
              <Text style={[styles.filterActive, { color: '#556ee6' }]}>
                Showing: {appliedFrom || 'All'} → {appliedTo || 'Now'}
              </Text>
            ) : null}
          </View>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ORANGE} />
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

              {/* Stat grid */}
              <View style={styles.statsGrid}>
                {statCards.map((card) => (
                  <View
                    key={card.label}
                    style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                  >
                    <View style={[styles.statIcon, { backgroundColor: card.color + '15' }]}>
                      <Ionicons name={card.icon as any} size={20} color={card.color} />
                    </View>
                    <Text style={[styles.statValue, { color: colors.foreground }]}>{card.value}</Text>
                    <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>{card.label}</Text>
                  </View>
                ))}
              </View>

              {/* Top Categories */}
              {report.top_categories?.length > 0 && (
                <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Categories</Text>
                  {report.top_categories.map((cat) => (
                    <View key={cat.category_id} style={styles.rankRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rankName, { color: colors.foreground }]}>{cat.category_name}</Text>
                        <Text style={[styles.rankMeta, { color: colors['muted-foreground'] }]}>
                          {cat.transaction_count} transaction{cat.transaction_count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.rankAmount, { color: colors.foreground }]}>
                          {fmt(cat.total_amount)}
                        </Text>
                        <Text style={[styles.rankPct, { color: '#556ee6' }]}>
                          {Number(cat.percentage).toFixed(1)}%
                        </Text>
                      </View>
                      {/* Progress bar */}
                      <View style={styles.progressBarWrap}>
                        <View
                          style={[styles.progressBar, {
                            width: `${Math.min(cat.percentage, 100)}%`,
                            backgroundColor: '#556ee6',
                          }]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Top Vendors */}
              {report.top_vendors?.length > 0 && (
                <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Vendors</Text>
                  {report.top_vendors.map((vendor, idx) => (
                    <View key={`${vendor.vendor_name}-${idx}`} style={styles.vendorRow}>
                      <View style={[styles.vendorRank, { backgroundColor: '#556ee6' + '20' }]}>
                        <Text style={[styles.vendorRankText, { color: '#556ee6' }]}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rankName, { color: colors.foreground }]}>{vendor.vendor_name}</Text>
                        <Text style={[styles.rankMeta, { color: colors['muted-foreground'] }]}>
                          {vendor.transaction_count} transaction{vendor.transaction_count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Text style={[styles.rankAmount, { color: colors.foreground }]}>
                        {fmt(vendor.total_amount)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

            </View>
          )}
        </ScrollView>
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
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 40,
  },
  dateText: { flex: 1, fontSize: 12, padding: 0 },
  filterBtnRow: { flexDirection: 'row', gap: 10 },
  applyBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  applyBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  clearBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  clearBtnText: { fontWeight: '600', fontSize: 13 },
  filterActive: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, marginBottom: 12,
  },
  statCard: {
    width: '47%', borderRadius: 12, borderWidth: 1, padding: 14, gap: 6,
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  section: {
    borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12, gap: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  rankRow: { gap: 4 },
  rankName: { fontSize: 14, fontWeight: '600' },
  rankMeta: { fontSize: 12 },
  rankAmount: { fontSize: 14, fontWeight: '700' },
  rankPct: { fontSize: 12, fontWeight: '600' },
  progressBarWrap: {
    height: 4, borderRadius: 2, backgroundColor: 'rgba(85,110,230,0.12)', overflow: 'hidden',
  },
  progressBar: { height: 4, borderRadius: 2 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vendorRank: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  vendorRankText: { fontSize: 13, fontWeight: '700' },
});
