import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useAcademicYear, useTheme } from '@/contexts';
import {
  feeReportsApi,
  FeeCollectionStats,
  FeePendingStats,
  FeeStructureStats,
} from '@/src/api/fees';
import { classSectionsApi } from '@/src/api/masters';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';
import CustomDropdown from '@/components/ui/dropdown';

type Tab = 'collection' | 'pending' | 'structure';

const FEE_STATUSES = [
  { label: 'All', value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Bounced', value: 'bounced' },
];

const PAYMENT_METHODS = [
  { label: 'All', value: '' },
  { label: 'Cash', value: 'cash' },
  { label: 'Online', value: 'online' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'UPI', value: 'upi' },
  { label: 'Bank', value: 'bank_transfer' },
  { label: 'Card', value: 'card' },
];

const formatINR = (val: string | number | null | undefined) =>
  '₹' + Number(val ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FeeReportsScreenContent() {
  const { colors, theme } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const { showError } = useToastContext();
  const [activeTab, setActiveTab] = useState<Tab>('collection');

  // ── Collection filters ────────────────────────────────────────────────────
  const [colDateFrom, setColDateFrom]   = useState('');
  const [colDateTo, setColDateTo]       = useState('');
  const [colMethod, setColMethod]       = useState('');
  const [colStatus, setColStatus]       = useState('');
  const [colApplied, setColApplied]     = useState(false);

  // ── Pending filters ───────────────────────────────────────────────────────
  const [pendClassId, setPendClassId]   = useState('');
  const [pendSection, setPendSection]   = useState('');
  const [pendApplied, setPendApplied]   = useState(false);

  // ── Structure filters ─────────────────────────────────────────────────────
  const [strucClassId, setStrucClassId] = useState('');
  const [strucApplied, setStrucApplied] = useState(false);

  const [exporting, setExporting]       = useState(false);

  const cardBg   = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // ── Classes/sections for dropdowns (replaces raw UUID text inputs) ──────────
  const { data: classesForFilter = [] } = useQuery({
    queryKey: ['classSections', 'feeReportsFilter'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: true }),
  });
  const classOptions = classesForFilter.map(c => ({ label: c.name, value: c.id }));
  const pendSectionOptions = (classesForFilter.find(c => c.id === pendClassId)?.sections ?? [])
    .map(s => ({ label: s.name, value: s.id }));

  // ── Collection queries ────────────────────────────────────────────────────
  const colParams = colApplied ? {
    academic_year_id: activeAcademicYearId ?? undefined,
    date_from: colDateFrom || undefined,
    date_to:   colDateTo   || undefined,
    payment_method: colMethod || undefined,
    status: colStatus || undefined,
  } : { academic_year_id: activeAcademicYearId ?? undefined };

  const { data: collectionStats, isLoading: statsLoading } = useQuery<FeeCollectionStats>({
    queryKey: ['fee-report-collection-stats', colParams],
    queryFn: () => feeReportsApi.getCollectionStats(colParams),
    enabled: activeTab === 'collection',
  });

  const { data: collectionRows, isLoading: rowsLoading } = useQuery({
    queryKey: ['fee-report-collection', colParams],
    queryFn: () => feeReportsApi.getCollectionSummary({ ...colParams, page_size: 50 }),
    enabled: activeTab === 'collection',
  });

  // ── Pending queries ───────────────────────────────────────────────────────
  const pendParams = {
    academic_year_id: activeAcademicYearId ?? undefined,
    class_id:   pendClassId || undefined,
    section_id: pendSection || undefined,
  };

  const { data: pendingStats, isLoading: pendStatsLoading } = useQuery<FeePendingStats>({
    queryKey: ['fee-report-pending-stats', pendParams],
    queryFn: () => feeReportsApi.getPendingFeesStats(pendParams),
    enabled: activeTab === 'pending' && pendApplied,
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['fee-report-pending', pendParams],
    queryFn: () => feeReportsApi.getPendingFees({ ...pendParams, page_size: 100 }),
    enabled: activeTab === 'pending' && pendApplied,
  });

  // ── Structure queries ─────────────────────────────────────────────────────
  const strucParams = {
    academic_year_id: activeAcademicYearId ?? undefined,
    class_id: strucClassId || undefined,
  };

  const { data: structureStats, isLoading: strucStatsLoading } = useQuery<FeeStructureStats>({
    queryKey: ['fee-report-structure-stats', strucParams],
    queryFn: () => feeReportsApi.getFeeStructureStats(strucParams),
    enabled: activeTab === 'structure' && strucApplied,
  });

  const { data: structureData, isLoading: structureLoading } = useQuery({
    queryKey: ['fee-report-structure', strucParams],
    queryFn: () => feeReportsApi.getFeeStructure({ ...strucParams, page_size: 100 }),
    enabled: activeTab === 'structure' && strucApplied,
  });

  const isLoading =
    activeTab === 'collection' ? statsLoading || rowsLoading :
    activeTab === 'pending'    ? pendStatsLoading || pendingLoading :
    strucStatsLoading || structureLoading;

  const exportDisabled = exporting ||
    (activeTab === 'pending'   && !pendApplied) ||
    (activeTab === 'structure' && !strucApplied);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await feeReportsApi.exportReport({
        report_type: activeTab,
        format: 'csv',
        filters: activeTab === 'collection' ? colParams :
                 activeTab === 'pending'    ? pendParams : strucParams,
      });
      // On mobile, share via the OS share sheet
      const text = await (blob as any).text?.() ?? '';
      await Share.share({ message: text, title: `fee_${activeTab}_report.csv` });
    } catch {
      showError('Export failed', 'Unable to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'collection', label: 'Collection Summary', icon: 'cash' },
    { key: 'pending',    label: 'Pending Fees', icon: 'alert-circle' },
    { key: 'structure',  label: 'Fee Structure', icon: 'list' },
  ];

  return (
    <AppLayout title="Fee Reports">
      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.primary, borderRadius: 8 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={activeTab === tab.key ? 'white' : colors['muted-foreground']}
            />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? 'white' : colors['muted-foreground'] }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Collection tab ────────────────────────────────────────────── */}
        {activeTab === 'collection' && (
          <>
            {/* Filters */}
            <View style={[styles.filterBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.filterTitle, { color: colors.foreground }]}>Filters</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterField}>
                  <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>From Date</Text>
                  <TextInput
                    style={[styles.filterInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    value={colDateFrom}
                    onChangeText={setColDateFrom}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.filterField}>
                  <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>To Date</Text>
                  <TextInput
                    style={[styles.filterInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                    value={colDateTo}
                    onChangeText={setColDateTo}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {PAYMENT_METHODS.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.methodChip, colMethod === m.value && { backgroundColor: colors.primary }]}
                    onPress={() => setColMethod(m.value)}
                  >
                    <Text style={{ color: colMethod === m.value ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {FEE_STATUSES.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.methodChip, colStatus === s.value && { backgroundColor: colors.primary }]}
                    onPress={() => setColStatus(s.value)}
                  >
                    <Text style={{ color: colStatus === s.value ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.applyBtn,{backgroundColor:colors.primary}]}
                onPress={() => setColApplied(true)}
              >
                <Ionicons name="search" size={14} color="white" />
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
              <>
                {/* Stats cards */}
                {collectionStats && (
                  <>
                    <View style={styles.statsRow}>
                      <View style={[styles.statCard, { backgroundColor: colors.primary+'18', borderColor: colors.primary+'40' }]}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                          {formatINR(collectionStats.total_collected)}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.primary }]}>Collected</Text>
                      </View>
                      <View style={[styles.statCard, { backgroundColor: '#EF444418', borderColor: '#EF444440' }]}>
                        <Text style={[styles.statValue, { color: '#EF4444' }]}>
                          {formatINR(collectionStats.total_due)}
                        </Text>
                        <Text style={[styles.statLabel, { color: '#EF4444' }]}>Total Due</Text>
                      </View>
                      <View style={[styles.statCard, { backgroundColor: '#10B98118', borderColor: '#10B98140' }]}>
                        <Text style={[styles.statValue, { color: '#10B981' }]}>
                          {collectionStats.collection_percentage.toFixed(1)}%
                        </Text>
                        <Text style={[styles.statLabel, { color: '#10B981' }]}>Collection %</Text>
                      </View>
                    </View>

                    {/* By Payment Method */}
                    {Object.keys(collectionStats.payment_methods ?? {}).length > 0 && (
                      <>
                        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>By Payment Method</Text>
                        {Object.entries(collectionStats.payment_methods).map(([method, amount]) => (
                          <View key={method} style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
                            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                              {method.replace(/_/g, ' ').toUpperCase()}
                            </Text>
                            <Text style={[styles.rowValue, { color: '#10B981' }]}>
                              {formatINR(amount)}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )}

                {/* Recent transactions */}
                {(collectionRows ?? []).length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Transactions</Text>
                    {(collectionRows ?? []).slice(0, 20).map((row, idx) => (
                      <View key={idx} style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.rowLabel, { color: colors.foreground }]}>{row.student_name}</Text>
                          <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                            {row.student_admission_no} • {row.fee_type} • {row.payment_method.replace(/_/g, ' ')}
                          </Text>
                        </View>
                        <Text style={[styles.rowValue, { color: '#10B981' }]}>
                          {formatINR(row.amount_paid)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {!collectionStats && !collectionRows?.length && (
                  <View style={styles.centered}>
                    <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
                    <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                      No data available
                    </Text>
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ── Pending Fees tab ──────────────────────────────────────────── */}
        {activeTab === 'pending' && (
          <>
            {/* Filters */}
            <View style={[styles.filterBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.filterTitle, { color: colors.foreground }]}>Filters</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterField}>
                  <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Class</Text>
                  <CustomDropdown
                    data={[{ label: 'All Classes', value: '' }, ...classOptions]}
                    value={pendClassId || null}
                    onChange={(v) => { setPendClassId(v ? String(v) : ''); setPendSection(''); }}
                    placeholder="All Classes"
                    search={false}
                  />
                </View>
                <View style={styles.filterField}>
                  <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Section</Text>
                  <CustomDropdown
                    data={[{ label: 'All Sections', value: '' }, ...pendSectionOptions]}
                    value={pendSection || null}
                    onChange={(v) => setPendSection(v ? String(v) : '')}
                    placeholder="All Sections"
                    search={false}
                  />
                </View>
              </View>
              <TouchableOpacity style={[styles.applyBtn,{backgroundColor:colors.primary}]} onPress={() => setPendApplied(true)}>
                <Ionicons name="search" size={14} color="white" />
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>

            {!pendApplied ? (
              <View style={styles.centered}>
                <Ionicons name="filter" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  Apply filters to view pending fees
                </Text>
              </View>
            ) : isLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
              <>
                {/* Stats from API */}
                {pendingStats && (
                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <Text style={[styles.statValue, { color: '#92400E' }]}>
                        {formatINR(pendingStats.total_pending)}
                      </Text>
                      <Text style={[styles.statLabel, { color: '#B45309' }]}>Total Pending</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                      <Text style={[styles.statValue, { color: '#991B1B' }]}>{pendingStats.student_count}</Text>
                      <Text style={[styles.statLabel, { color: '#B91C1C' }]}>Students</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
                      <Text style={[styles.statValue, { color: '#5B21B6' }]}>{pendingStats.overdue_count}</Text>
                      <Text style={[styles.statLabel, { color: '#6D28D9' }]}>Overdue</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                      <Text style={[styles.statValue, { color: '#9A3412' }]}>{formatINR((pendingData??[]).reduce((s,r)=>s+Number(r.balance_amount),0))}</Text>
                      <Text style={[styles.statLabel, { color: '#C2410C' }]}>Total Due</Text>
                    </View>
                  </View>
                )}

                {(pendingData ?? []).length === 0 ? (
                  <View style={styles.centered}>
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                    <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No pending fees!</Text>
                  </View>
                ) : (
                  (pendingData ?? []).map((s, idx) => (
                    <View key={idx} style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{s.student_name}</Text>
                        <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                          {s.student_admission_no} • {s.class_section}
                          {s.days_overdue ? ` • ${s.days_overdue}d overdue` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.rowValue, { color: '#EF4444' }]}>
                        {formatINR(s.balance_amount)}
                      </Text>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}

        {/* ── Fee Structure tab ─────────────────────────────────────────── */}
        {activeTab === 'structure' && (
          <>
            {/* Filters */}
            <View style={[styles.filterBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.filterTitle, { color: colors.foreground }]}>Filters</Text>
              <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Class</Text>
              <CustomDropdown
                data={[{ label: 'All Classes', value: '' }, ...classOptions]}
                value={strucClassId || null}
                onChange={(v) => setStrucClassId(v ? String(v) : '')}
                placeholder="All Classes"
                search={false}
              />
              <TouchableOpacity style={[styles.applyBtn,{marginTop:4,backgroundColor:colors.primary}]} onPress={() => setStrucApplied(true)}>
                <Ionicons name="search" size={14} color="white" />
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>

            {!strucApplied ? (
              <View style={styles.centered}>
                <Ionicons name="filter" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  Apply filters to view fee structure
                </Text>
              </View>
            ) : isLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
              <>
                {structureStats && (
                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                      <Text style={[styles.statValue, { color: '#3730A3' }]}>
                        {formatINR(structureStats.total_structure_amount)}
                      </Text>
                      <Text style={[styles.statLabel, { color: '#4338CA' }]}>Total Amount</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                      <Text style={[styles.statValue, { color: '#14532D' }]}>{structureStats.fee_type_count}</Text>
                      <Text style={[styles.statLabel, { color: '#166534' }]}>Fee Types</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                      <Text style={[styles.statValue, { color: colors.foreground }]}>{structureStats.class_count}</Text>
                      <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Classes</Text>
                    </View>
                  </View>
                )}

                {(structureData ?? []).length === 0 ? (
                  <View style={styles.centered}>
                    <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No fee structure found</Text>
                  </View>
                ) : (
                  (structureData ?? []).map((item, idx) => (
                    <View key={idx} style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.fee_type}</Text>
                        <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                          {item.class_name}{item.section_name ? ` – ${item.section_name}` : ''} • {item.fee_term}
                        </Text>
                      </View>
                      <Text style={[styles.rowValue, { color: colors.primary }]}>
                        {formatINR(item.fee_amount)}
                      </Text>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        )}

        {/* Export button at the bottom */}
        <TouchableOpacity
          style={[styles.exportBtn, exportDisabled && { opacity: 0.4 }]}
          onPress={handleExport}
          disabled={exportDisabled}
        >
          <Ionicons name="download-outline" size={16} color="white" />
          <Text style={styles.exportBtnText}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  tabText: { fontSize: 11, fontWeight: '600' },
  content: { padding: 16 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },

  filterBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  filterField: { flex: 1 },
  filterLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  methodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
  },
  applyBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 13, fontWeight: '700', marginBottom: 2, textAlign: 'center' },
  statLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowValue: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 11, marginTop: 2 },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 8,
  },
  exportBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
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
