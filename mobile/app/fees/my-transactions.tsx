import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { useMyFeeTransactions, useMyChildrenFeeTransactions } from '@/src/api/hooks/fee';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const INDIGO = '#556ee6';

const formatINR = (amount: number | string | null | undefined) =>
  '₹' + Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
};

// Web parity (`StatusBadge`): color the backend-reported transaction status
// directly rather than deriving one from transaction_items.
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#dcfce7', text: '#16a34a' },
  paid:      { bg: '#dcfce7', text: '#16a34a' },
  pending:   { bg: '#fef9c3', text: '#854d0e' },
  partial:   { bg: '#ffedd5', text: '#9a3412' },
  cancelled: { bg: '#f3f4f6', text: '#4b5563' },
};
const DEFAULT_STATUS_COLOR = { bg: '#f3f4f6', text: '#4b5563' };

const statusLabel = (status?: string) =>
  status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';

function MyTransactionsScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role, selectedStudent, availableStudents } = useAuth();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const muted = colors['muted-foreground'] as string;

  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Student's own transactions and Parent's "related" scope both resolve
  // server-side — for a parent, /fee/transactions/my-children-fees returns
  // every linked child's transactions in one list. Filtered down below to
  // whichever child is active in the header switcher, same as My Receipts.
  const mine = useMyFeeTransactions(undefined, !isParent);
  const childrens = useMyChildrenFeeTransactions(undefined, isParent);
  const { data: allTransactions = [], isLoading, error, refetch, isRefetching } = isParent ? childrens : mine;

  const transactions = isParent
    ? allTransactions.filter((t) => t.student_admission_num === selectedStudent?.admission_number)
    : allTransactions;

  if (isParent && availableStudents.length > 0 && !selectedStudent) {
    return (
      <AppLayout title="My Transactions">
        <View style={styles.center}>
          <Ionicons name="person-outline" size={40} color={muted} />
          <Text style={[styles.emptySub, { color: muted }]}>No child selected.</Text>
          <TouchableOpacity onPress={() => router.push('/parents/select-child' as any)}>
            <Text style={{ color: INDIGO, fontWeight: '600' }}>Select a child</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="My Transactions">
        <View style={styles.center}><ActivityIndicator color={INDIGO} size="large" /></View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="My Transactions">
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to load transactions</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: INDIGO }]} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Transactions">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={INDIGO} />}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>My Transactions</Text>
          <Text style={[styles.pageSub, { color: muted }]}>
            {isParent
              ? selectedStudent
                ? `Fee payment history for ${selectedStudent.name ?? ''}`
                : "View your children's fee payment history"
              : 'View your fee payment history'}
          </Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={muted} />
            <Text style={[styles.emptySub, { color: muted }]}>No transactions yet</Text>
          </View>
        ) : (
          transactions.map((txn, idx) => {
            const statusColors = STATUS_COLORS[(txn.status ?? '').toLowerCase()] ?? DEFAULT_STATUS_COLOR;
            return (
              <View key={txn.id} style={[styles.txnCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.snoBox, { backgroundColor: INDIGO + '18' }]}>
                  <Text style={{ color: INDIGO, fontWeight: '700', fontSize: 12 }}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {isParent && (
                    <Text style={[styles.txnStudent, { color: colors.foreground }]} numberOfLines={1}>
                      {txn.student_admission_num}
                    </Text>
                  )}
                  {!!txn.transaction_number && (
                    <Text style={[styles.txnNumber, { color: colors.foreground }]} numberOfLines={1}>
                      {txn.transaction_number}
                    </Text>
                  )}
                  <View style={styles.txnTopRow}>
                    <Text style={[styles.txnAmount, { color: colors.foreground }]}>{formatINR(txn.total_amount)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: statusColors.text }}>
                        {statusLabel(txn.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.txnSub, { color: muted }]}>
                    {PAYMENT_METHOD_LABEL[txn.payment_method] ?? String(txn.payment_method ?? '').replace(/_/g, ' ')} · {fmtDate(txn.transaction_date)}
                  </Text>
                  <Text style={[styles.txnSub, { color: muted }]}>
                    Receipt: {txn.receipt_generated ? 'Generated' : '—'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  errorText: { fontSize: 14, marginTop: 10 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center' },

  headerRow: { marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  pageSub: { fontSize: 12, lineHeight: 17 },

  txnCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  snoBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txnStudent: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  txnNumber: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  txnTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  txnAmount: { fontSize: 15, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  txnSub: { fontSize: 12, marginTop: 2 },
});

// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function MyTransactionsScreen() {
  return (
    <ScreenAccessGate
      title="My Transactions"
      permissions={[
        ['fee_transactions', 'read_own'],
        ['fee_transactions', 'list_own'],
        ['fee_transactions', 'read_related'],
        ['fee_transactions', 'list_related'],
      ]}
      blockRoles={['teacher']}
    >
      <MyTransactionsScreenContent />
    </ScreenAccessGate>
  );
}
