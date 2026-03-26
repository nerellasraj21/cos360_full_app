import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { feeReportsApi } from '@/src/api/fees';

type Tab = 'collection' | 'pending' | 'structure';

export default function FeeReportsScreen() {
  const { colors, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('collection');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // Stats card for collection tab
  const { data: collectionStats, isLoading: statsLoading } = useQuery({
    queryKey: ['fee-report-collection-stats'],
    queryFn: () => feeReportsApi.getCollectionStats(),
    enabled: activeTab === 'collection',
  });

  // Rows for collection tab
  const { data: collectionRows, isLoading: rowsLoading } = useQuery({
    queryKey: ['fee-report-collection'],
    queryFn: () => feeReportsApi.getCollectionSummary({ page_size: 50 }),
    enabled: activeTab === 'collection',
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['fee-report-pending'],
    queryFn: () => feeReportsApi.getPendingFees({ page_size: 500 }),
    enabled: activeTab === 'pending',
  });

  const { data: structureData, isLoading: structureLoading } = useQuery({
    queryKey: ['fee-report-structure'],
    queryFn: () => feeReportsApi.getFeeStructure({ page_size: 100 }),
    enabled: activeTab === 'structure',
  });

  const isLoading =
    activeTab === 'collection'
      ? statsLoading || rowsLoading
      : activeTab === 'pending'
      ? pendingLoading
      : structureLoading;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'collection', label: 'Collection', icon: 'cash' },
    { key: 'pending', label: 'Pending', icon: 'alert-circle' },
    { key: 'structure', label: 'Structure', icon: 'list' },
  ];

  return (
    <AppLayout title="Fee Reports">
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { backgroundColor: '#556ee6', borderRadius: 8 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={15}
              color={activeTab === tab.key ? 'white' : colors['muted-foreground']}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? 'white' : colors['muted-foreground'] },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Collection Summary ── */}
          {activeTab === 'collection' && (
            <View>
              {/* Stats card */}
              {collectionStats && (
                <View style={[styles.summaryCard, { backgroundColor: '#556ee6' }]}>
                  <Text style={styles.summaryCardLabel}>Total Collected</Text>
                  <Text style={styles.summaryCardAmount}>
                    ₹{Number(collectionStats.total_collected).toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.summaryCardSub}>
                    {collectionStats.collection_percentage.toFixed(1)}% of total due
                  </Text>
                </View>
              )}

              {/* By payment method breakdown */}
              {collectionStats && Object.keys(collectionStats.payment_methods ?? {}).length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    By Payment Method
                  </Text>
                  {Object.entries(collectionStats.payment_methods).map(([method, amount]) => (
                    <View
                      key={method}
                      style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}
                    >
                      <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                        {method.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <Text style={[styles.rowValue, { color: '#10B981' }]}>
                        ₹{Number(amount).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Recent transactions */}
              {(collectionRows ?? []).length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                    Recent Transactions
                  </Text>
                  {(collectionRows ?? []).slice(0, 20).map((row, idx) => (
                    <View
                      key={idx}
                      style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                          {row.student_name}
                        </Text>
                        <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                          {row.student_admission_no} • {row.fee_type} • {row.payment_method.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <Text style={[styles.rowValue, { color: '#10B981' }]}>
                        ₹{Number(row.amount_paid).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {/* ── Pending Fees ── */}
          {activeTab === 'pending' && (
            <View>
              {/* Stats row */}
              {(pendingData ?? []).length > 0 && (() => {
                const items = pendingData ?? [];
                const totalPending = items.reduce((sum, s) => sum + Number(s.balance_amount ?? 0), 0);
                const overdueCount = items.filter(s => (s.days_overdue ?? 0) > 0).length;
                return (
                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <Text style={[styles.statValue, { color: '#92400E' }]}>
                        ₹{totalPending.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.statLabel, { color: '#B45309' }]}>Total Pending</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                      <Text style={[styles.statValue, { color: '#991B1B' }]}>{items.length}</Text>
                      <Text style={[styles.statLabel, { color: '#B91C1C' }]}>Students</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#EDE9FE', borderColor: '#DDD6FE' }]}>
                      <Text style={[styles.statValue, { color: '#5B21B6' }]}>{overdueCount}</Text>
                      <Text style={[styles.statLabel, { color: '#6D28D9' }]}>Overdue</Text>
                    </View>
                  </View>
                );
              })()}
              {(pendingData ?? []).length === 0 ? (
                <View style={styles.centered}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    No pending fees!
                  </Text>
                </View>
              ) : (
                (pendingData ?? []).map((s, idx) => (
                  <View
                    key={idx}
                    style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                        {s.student_name}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                        {s.student_admission_no} • {s.class_section}
                        {s.days_overdue ? ` • ${s.days_overdue}d overdue` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.rowValue, { color: '#EF4444' }]}>
                      ₹{Number(s.balance_amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ── Fee Structure ── */}
          {activeTab === 'structure' && (
            <View>
              {/* Stats row */}
              {(structureData ?? []).length > 0 && (() => {
                const items = structureData ?? [];
                const totalAmount = items.reduce((sum, i) => sum + Number(i.fee_amount ?? 0), 0);
                const uniqueTypes = new Set(items.map(i => i.fee_type)).size;
                return (
                  <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                      <Text style={[styles.statValue, { color: '#3730A3' }]}>
                        ₹{totalAmount.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.statLabel, { color: '#4338CA' }]}>Total Amount</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                      <Text style={[styles.statValue, { color: '#14532D' }]}>{uniqueTypes}</Text>
                      <Text style={[styles.statLabel, { color: '#166534' }]}>Fee Types</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                      <Text style={[styles.statValue, { color: colors.foreground }]}>{items.length}</Text>
                      <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Mappings</Text>
                    </View>
                  </View>
                );
              })()}
              {(structureData ?? []).length === 0 ? (
                <View style={styles.centered}>
                  <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    No fee structure found
                  </Text>
                </View>
              ) : (
                (structureData ?? []).map((item, idx) => (
                  <View
                    key={idx}
                    style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                        {item.fee_type}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                        {item.class_name}{item.section_name ? ` – ${item.section_name}` : ''} • {item.fee_term}
                      </Text>
                    </View>
                    <Text style={[styles.rowValue, { color: '#556ee6' }]}>
                      ₹{Number(item.fee_amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      )}
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
    gap: 5,
    paddingVertical: 8,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  content: { padding: 16 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center' },
  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  summaryCardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  summaryCardAmount: { color: 'white', fontSize: 28, fontWeight: '700', marginTop: 4 },
  summaryCardSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
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
  rowValue: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
});
