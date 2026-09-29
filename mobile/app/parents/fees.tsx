import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { useChildFeeCollectionSummary } from '@/src/api/hooks/fee';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

function ParentFeesScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { selectedStudent } = useAuth();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: summary, isLoading, error, refetch } = useChildFeeCollectionSummary(
    selectedStudent?.id ?? '',
  );

  if (!selectedStudent) {
    return (
      <AppLayout title="Fee Summary">
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
            No child selected.
          </Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/parents/select-child' as any)}>
            <Text style={{ color: '#556ee6', fontWeight: '600' }}>Select a child</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Fee Summary">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  if (error || !summary) {
    return (
      <AppLayout title="Fee Summary">
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
            Could not load fee summary.
          </Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => refetch()}>
            <Text style={{ color: '#556ee6', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const totalDue = parseFloat(summary.grand_total_due ?? '0');
  const totalPaid = parseFloat(summary.grand_total_paid ?? '0');
  const totalFee = parseFloat(summary.grand_total_fee ?? '0');
  const paidPct = totalFee > 0 ? Math.round((totalPaid / totalFee) * 100) : 0;

  return (
    <AppLayout title={`Fee Summary — ${selectedStudent.name ?? ''}`}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Summary cards */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={styles.statValue}>₹{parseFloat(summary.grand_total_paid ?? '0').toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: totalDue > 0 ? '#EF4444' : '#94a3b8' }]}>
            <Text style={styles.statLabel}>Due</Text>
            <Text style={styles.statValue}>₹{parseFloat(summary.grand_total_due ?? '0').toLocaleString('en-IN')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#556ee6' }]}>
            <Text style={styles.statLabel}>Paid %</Text>
            <Text style={styles.statValue}>{paidPct}%</Text>
          </View>
        </View>

        {/* Fee breakdown */}
        {summary.items.length > 0 && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Fee Breakdown</Text>
            {summary.items.map((item, i) => (
              <View
                key={`${item.fee_type_id}-${i}`}
                style={[styles.feeRow, { borderBottomColor: borderCol }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feeType, { color: colors.foreground }]} numberOfLines={1}>
                    {item.fee_type_name}
                  </Text>
                  {item.last_paid_date && (
                    <Text style={[styles.feeMeta, { color: colors['muted-foreground'] }]}>
                      Last paid: {item.last_paid_date}
                    </Text>
                  )}
                </View>
                <View style={styles.feeAmounts}>
                  <Text style={[styles.feeAmountPaid, { color: '#10B981' }]}>
                    ₹{parseFloat(item.paid_amount ?? '0').toLocaleString('en-IN')}
                  </Text>
                  {parseFloat(item.due_amount ?? '0') > 0 && (
                    <Text style={[styles.feeAmountDue, { color: '#EF4444' }]}>
                      −₹{parseFloat(item.due_amount ?? '0').toLocaleString('en-IN')} due
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Old fee pending */}
        {parseFloat(summary.old_fee_pending_amount ?? '0') > 0 && (
          <View style={[styles.alertBox, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
            <Ionicons name="warning-outline" size={18} color="#F59E0B" />
            <Text style={[styles.alertText, { color: '#F59E0B' }]}>
              Previous year pending: ₹{parseFloat(summary.old_fee_pending_amount).toLocaleString('en-IN')}
            </Text>
          </View>
        )}

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  centeredText: { fontSize: 15, textAlign: 'center' },
  linkBtn: { marginTop: 4, padding: 8 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
  },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  statValue: { color: 'white', fontSize: 16, fontWeight: '700' },

  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },

  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  feeType: { fontSize: 13, fontWeight: '600' },
  feeMeta: { fontSize: 11, marginTop: 2 },
  feeAmounts: { alignItems: 'flex-end', gap: 2 },
  feeAmountPaid: { fontSize: 13, fontWeight: '600' },
  feeAmountDue: { fontSize: 11 },

  alertBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1,
  },
  alertText: { fontSize: 13, fontWeight: '600', flex: 1 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ParentFeesScreen() {
  return (
    <ScreenAccessGate
      title="Fees"
      permissions={[
        ['parent_profile', 'read_own'],
        ['students', 'read'],
        ['fee_transactions', 'read'],
        ['fee_transactions', 'read_own'],
        ['fee_transactions', 'read_related'],
        ['fee_transactions', 'list_related'],
      ]}
      blockRoles={['teacher']}
    >
      <ParentFeesScreenContent />
    </ScreenAccessGate>
  );
}
