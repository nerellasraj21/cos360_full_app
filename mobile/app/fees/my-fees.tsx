import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMyOutstandingFees, useMyFeeReceipts } from '@/src/api/hooks/fee';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

function MyFeesScreenContent() {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: summary, isLoading: summaryLoading } = useMyOutstandingFees();
  const { data: receipts, isLoading: receiptsLoading } = useMyFeeReceipts({ limit: 5 });

  const isLoading = summaryLoading || receiptsLoading;

  if (isLoading) {
    return (
      <AppLayout title="My Fees">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  // Outstanding-fees response only carries items still due (paid-in-full fee
  // types drop off the list entirely), so "total fee" here is what was ever
  // due across those items, not the full fee structure total.
  const items      = summary?.outstanding_items ?? [];
  const totalFee   = items.reduce((sum, i) => sum + Number(i.amount_due ?? 0), 0);
  const totalPaid  = items.reduce((sum, i) => sum + Number(i.amount_paid ?? 0), 0);
  const totalDue   = Number(summary?.total_outstanding ?? 0);
  const paidPct    = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;
  const progressW  = `${paidPct}%`;

  return (
    <AppLayout title="My Fees">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Overview card */}
        <View style={[styles.overviewCard, { backgroundColor: '#556ee6' }]}>
          <Text style={styles.overviewLabel}>Total Fee</Text>
          <Text style={styles.overviewTotal}>₹{totalFee.toLocaleString('en-IN')}</Text>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: progressW as any }]} />
          </View>

          <View style={styles.overviewRow}>
            <View style={styles.overviewItem}>
              <Text style={styles.overviewItemLabel}>Paid</Text>
              <Text style={styles.overviewItemValue}>₹{totalPaid.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewItemLabel}>Due</Text>
              <Text style={[styles.overviewItemValue, totalDue > 0 && { color: '#fca5a5' }]}>
                ₹{totalDue.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewItem}>
              <Text style={styles.overviewItemLabel}>Paid %</Text>
              <Text style={styles.overviewItemValue}>{paidPct}%</Text>
            </View>
          </View>
        </View>

        {/* Fee breakdown */}
        {items.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Fee Breakdown</Text>
            {items.map((item, i) => {
              const due = Number(item.outstanding_amount ?? 0);
              return (
                <View key={`${item.fee_type_id}-${item.fee_term_id}-${i}`} style={[styles.feeRow, { borderBottomColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feeType, { color: colors.foreground }]} numberOfLines={1}>
                      {item.fee_type_name}
                    </Text>
                    {!!item.fee_term_name && (
                      <Text style={[styles.feeMeta, { color: colors['muted-foreground'] }]}>
                        {item.fee_term_name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.feeAmts}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#10B981' }}>
                      ₹{Number(item.amount_paid ?? 0).toLocaleString('en-IN')}
                    </Text>
                    {due > 0 && (
                      <Text style={{ fontSize: 11, color: '#EF4444' }}>
                        ₹{due.toLocaleString('en-IN')} due
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent receipts */}
        {(receipts ?? []).length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Recent Receipts</Text>
            {receipts!.map((r) => (
              <View key={r.id} style={[styles.receiptRow, { borderBottomColor: borderCol }]}>
                <Ionicons name="receipt-outline" size={18} color="#556ee6" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.receiptNum, { color: colors.foreground }]}>
                    #{r.receipt_number}
                  </Text>
                  <Text style={[styles.receiptDate, { color: colors['muted-foreground'] }]}>
                    {r.issued_date ? new Date(r.issued_date).toLocaleDateString('en-IN') : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {!isLoading && items.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[{ color: colors['muted-foreground'], fontSize: 14, textAlign: 'center' }]}>
              No outstanding fees — you&apos;re all paid up.
            </Text>
          </View>
        )}

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  overviewCard: {
    borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#556ee6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
  },
  overviewLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  overviewTotal: { color: 'white', fontSize: 30, fontWeight: '700', marginBottom: 16 },
  progressBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3, marginBottom: 16, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: 'white', borderRadius: 3 },
  overviewRow: { flexDirection: 'row', alignItems: 'center' },
  overviewItem: { flex: 1, alignItems: 'center' },
  overviewItemLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600', marginBottom: 3 },
  overviewItemValue: { color: 'white', fontSize: 14, fontWeight: '700' },
  overviewDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  feeRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  feeType: { fontSize: 13, fontWeight: '600' },
  feeMeta: { fontSize: 11, marginTop: 2 },
  feeAmts: { alignItems: 'flex-end', gap: 2 },

  receiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  receiptNum: { fontSize: 13, fontWeight: '600' },
  receiptDate: { fontSize: 11 },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function MyFeesScreen() {
  return (
    <ScreenAccessGate
      title="My Fees"
      blockRoles={['teacher']}
    >
      <MyFeesScreenContent />
    </ScreenAccessGate>
  );
}
