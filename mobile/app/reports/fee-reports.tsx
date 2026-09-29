import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components';
import { useTheme } from '@/contexts';
import { feeReportsApi, type FeeCollectionStats, type FeePendingStats, type FeeStructureStats } from '@/src/api/fees';
import { exportToCsv } from '@/src/utils/exportCsv';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const COLOR = '#10B981';
type Tab = 'collection' | 'pending' | 'structure';
type CollectionFilter = 'all' | 'today' | 'week' | 'month';

function getCollectionDates(filter: CollectionFilter): { date_from?: string; date_to?: string } {
  const today = new Date().toISOString().split('T')[0];
  if (filter === 'all') return {};
  if (filter === 'today') return { date_from: today, date_to: today };
  if (filter === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return { date_from: d.toISOString().split('T')[0], date_to: today };
  }
  // month
  const d = new Date();
  return {
    date_from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
    date_to: today,
  };
}

function FeeReportsScreenContent() {
  const { colors, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('collection');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('all');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const collectionDates = getCollectionDates(collectionFilter);

  // Collection Summary
  const { data: collectionStats, isLoading: collectionStatsLoading } = useQuery({
    queryKey: ['fee-reports', 'collection-stats', collectionFilter],
    queryFn: () => feeReportsApi.getCollectionStats(collectionDates),
    enabled: activeTab === 'collection',
  });
  const { data: collectionItems = [], isLoading: collectionLoading } = useQuery({
    queryKey: ['fee-reports', 'collection', collectionFilter],
    queryFn: () => feeReportsApi.getCollectionSummary({ page_size: 50, ...collectionDates }),
    enabled: activeTab === 'collection',
  });

  // Pending Fees
  const { data: pendingStats, isLoading: pendingStatsLoading } = useQuery({
    queryKey: ['fee-reports', 'pending-stats'],
    queryFn: () => feeReportsApi.getPendingFeesStats(),
    enabled: activeTab === 'pending',
  });
  const { data: pendingItems = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['fee-reports', 'pending'],
    queryFn: () => feeReportsApi.getPendingFees({ page_size: 50 }),
    enabled: activeTab === 'pending',
  });

  // Fee Structure
  const { data: structureStats, isLoading: structureStatsLoading } = useQuery({
    queryKey: ['fee-reports', 'structure-stats'],
    queryFn: () => feeReportsApi.getFeeStructureStats(),
    enabled: activeTab === 'structure',
  });
  const { data: structureItems = [], isLoading: structureLoading } = useQuery({
    queryKey: ['fee-reports', 'structure'],
    queryFn: () => feeReportsApi.getFeeStructure({ page_size: 50 }),
    enabled: activeTab === 'structure',
  });

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'collection', label: 'Collection' },
    { key: 'pending', label: 'Pending' },
    { key: 'structure', label: 'Structure' },
  ];

  const DATE_FILTER_OPTIONS: Array<{ key: CollectionFilter; label: string }> = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'Last 7D' },
    { key: 'month', label: 'This Month' },
  ];

  const fmt = (val?: string | number) =>
    val !== undefined && val !== null ? `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—';

  const renderCollectionStats = (stats?: FeeCollectionStats) => {
    if (!stats) return null;
    const methods = stats.payment_methods ? Object.entries(stats.payment_methods) : [];
    return (
      <View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
            <Text style={[styles.statValue, { color: '#065f46' }]}>{fmt(stats.total_collected)}</Text>
            <Text style={[styles.statLabel, { color: '#065f46' }]}>Collected</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.statValue, { color: '#991b1b' }]}>{fmt(stats.total_due)}</Text>
            <Text style={[styles.statLabel, { color: '#991b1b' }]}>Due</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <Text style={[styles.statValue, { color: '#1e40af' }]}>{stats.collection_percentage?.toFixed(1)}%</Text>
            <Text style={[styles.statLabel, { color: '#1e40af' }]}>Rate</Text>
          </View>
        </View>
        {methods.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodsScroll}>
            {methods.map(([method, amount]) => (
              <View key={method} style={[styles.methodChip, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.methodLabel, { color: colors['muted-foreground'] }]}>
                  {method.replace(/_/g, ' ')}
                </Text>
                <Text style={[styles.methodAmount, { color: COLOR }]}>{fmt(amount)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderPendingStats = (stats?: FeePendingStats) => {
    if (!stats) return null;
    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.statValue, { color: '#991b1b' }]}>{fmt(stats.total_pending)}</Text>
          <Text style={[styles.statLabel, { color: '#991b1b' }]}>Total Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
          <Text style={[styles.statValue, { color: '#92400e' }]}>{stats.student_count}</Text>
          <Text style={[styles.statLabel, { color: '#92400e' }]}>Students</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#ffe4e6' }]}>
          <Text style={[styles.statValue, { color: '#9f1239' }]}>{stats.overdue_count}</Text>
          <Text style={[styles.statLabel, { color: '#9f1239' }]}>Overdue</Text>
        </View>
      </View>
    );
  };

  const renderStructureStats = (stats?: FeeStructureStats) => {
    if (!stats) return null;
    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
          <Text style={[styles.statValue, { color: '#5b21b6' }]}>{fmt(stats.total_structure_amount)}</Text>
          <Text style={[styles.statLabel, { color: '#5b21b6' }]}>Total Amt</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Text style={[styles.statValue, { color: '#1e40af' }]}>{stats.class_count}</Text>
          <Text style={[styles.statLabel, { color: '#1e40af' }]}>Classes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <Text style={[styles.statValue, { color: '#065f46' }]}>{stats.fee_type_count}</Text>
          <Text style={[styles.statLabel, { color: '#065f46' }]}>Fee Types</Text>
        </View>
      </View>
    );
  };

  const isLoading =
    (activeTab === 'collection' && (collectionStatsLoading || collectionLoading)) ||
    (activeTab === 'pending' && (pendingStatsLoading || pendingLoading)) ||
    (activeTab === 'structure' && (structureStatsLoading || structureLoading));

  const handleExport = async () => {
    if (activeTab === 'collection') {
      await exportToCsv(
        'fee_collection_report.csv',
        ['#', 'Transaction No', 'Student', 'Class/Section', 'Fee Category', 'Fee Type', 'Amount Paid', 'Payment Method', 'Date', 'Collected By'],
        collectionItems.map((r: any, i) => [
          i + 1, r.transaction_number, r.student_name, r.class_section,
          r.fee_category, r.fee_type, r.amount_paid, r.payment_method,
          r.transaction_date, r.collected_by,
        ]),
      );
    } else if (activeTab === 'pending') {
      await exportToCsv(
        'fee_pending_report.csv',
        ['#', 'Student', 'Admission No', 'Class/Section', 'Fee Category', 'Fee Type', 'Amount Due', 'Amount Paid', 'Balance', 'Due Date', 'Days Overdue'],
        pendingItems.map((r: any, i) => [
          i + 1, r.student_name, r.student_admission_no, r.class_section,
          r.fee_category, r.fee_type, r.amount_due, r.amount_paid,
          r.balance_amount, r.due_date, r.days_overdue,
        ]),
      );
    } else {
      await exportToCsv(
        'fee_structure_report.csv',
        ['#', 'Fee Category', 'Fee Type', 'Fee Term', 'Class', 'Section', 'Fee Amount', 'Academic Year', 'Status'],
        structureItems.map((r: any, i) => [
          i + 1, r.fee_category, r.fee_type, r.fee_term,
          r.class_name, r.section_name, r.fee_amount, r.academic_year, r.status,
        ]),
      );
    }
  };

  return (
    <ScreenLayout title="Fee Reports">
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="card" size={24} color="white" />
        </View>
        <Text style={styles.bannerTitle}>Fee Reports</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Ionicons name="share-outline" size={16} color="white" />
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: COLOR, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab.key ? COLOR : colors['muted-foreground'] }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date filter — Collection tab only */}
      {activeTab === 'collection' && (
        <View style={[styles.filterBar, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
          {DATE_FILTER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.filterChip,
                { borderColor: borderCol },
                collectionFilter === opt.key && { backgroundColor: COLOR, borderColor: COLOR },
              ]}
              onPress={() => setCollectionFilter(opt.key)}
            >
              <Text style={[styles.filterChipText, { color: collectionFilter === opt.key ? 'white' : colors['muted-foreground'] }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLOR} size="large" />
          <Text style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading report...</Text>
        </View>
      ) : (
        <FlatList<any>
          data={
            activeTab === 'collection' ? collectionItems :
            activeTab === 'pending' ? pendingItems :
            structureItems
          }
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {activeTab === 'collection' && renderCollectionStats(collectionStats)}
              {activeTab === 'pending' && renderPendingStats(pendingStats)}
              {activeTab === 'structure' && renderStructureStats(structureStats)}
              <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>
                {activeTab === 'collection' ? 'TRANSACTIONS' : activeTab === 'pending' ? 'PENDING DUES' : 'FEE STRUCTURE'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={40} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No data found</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (activeTab === 'collection') {
              const row = item as any;
              return (
                <View style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{row.student_name}</Text>
                    <Text style={[styles.rowAmount, { color: COLOR }]}>{fmt(row.amount_paid)}</Text>
                  </View>
                  <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                    {row.class_section} · {row.fee_category} · {row.fee_type}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                    {row.payment_method} · {row.transaction_date}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                    #{row.transaction_number}
                  </Text>
                </View>
              );
            }
            if (activeTab === 'pending') {
              const row = item as any;
              return (
                <View style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={styles.rowHeader}>
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{row.student_name}</Text>
                    <Text style={[styles.rowAmount, { color: '#ef4444' }]}>{fmt(row.balance_amount)}</Text>
                  </View>
                  <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                    {row.class_section} · {row.fee_category} · {row.fee_type}
                  </Text>
                  {row.days_overdue != null && row.days_overdue > 0 && (
                    <Text style={[styles.overdueBadge, { backgroundColor: '#fee2e2', color: '#991b1b' }]}>
                      {row.days_overdue}d overdue
                    </Text>
                  )}
                </View>
              );
            }
            const row = item as any;
            return (
              <View style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{row.fee_type}</Text>
                  <Text style={[styles.rowAmount, { color: '#8b5cf6' }]}>{fmt(row.fee_amount)}</Text>
                </View>
                <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                  {row.fee_category} · {row.class_name}{row.section_name ? ` · ${row.section_name}` : ''} · {row.fee_term}
                </Text>
              </View>
            );
          }}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -20, right: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700', flex: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  exportBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 13, fontWeight: '600' },
  filterBar: { flexDirection: 'row', gap: 8, padding: 10, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 11, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
  methodsScroll: { marginBottom: 12 },
  methodChip: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
    marginRight: 6, alignItems: 'center',
  },
  methodLabel: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize', marginBottom: 1 },
  methodAmount: { fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10, marginTop: 4 },
  rowCard: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowTitle: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12, lineHeight: 18 },
  overdueBadge: {
    alignSelf: 'flex-start', fontSize: 11, fontWeight: '600',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4,
  },
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 40 },
  emptyText: { fontSize: 14 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function FeeReportsScreen() {
  return (
    <ScreenAccessGate
      title="Fee Reports"
      resources={['fee_reports', 'fee_transactions']}
      blockRoles={['teacher']}
    >
      <FeeReportsScreenContent />
    </ScreenAccessGate>
  );
}
