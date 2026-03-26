import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import {
  useDeleteExpenseTransactionProtected,
  useExpenseTransactionsProtected,
  useExpenseTypeDropdownProtected,
} from '@/hooks/use-expense-protected';
import type { ExpenseTransaction } from '@/src/types/expense';

const ORANGE = '#F97316';

type StatusTab = 'all' | 'pending' | 'approved' | 'paid' | 'cancelled';

const STATUS_COLORS: Record<string, string> = {
  pending:   '#F59E0B',
  approved:  '#3B82F6',
  paid:      '#10B981',
  cancelled: '#6b7280',
  rejected:  '#EF4444',
};

const PAYMENT_METHODS: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
};

export default function ExpenseTransactionsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const filterBg = theme === 'dark' ? '#13132b' : '#f8fafc';

  const { data: raw, isLoading } = useExpenseTransactionsProtected({
    status_filter: statusFilter || undefined,
    expense_type_id: typeFilter || undefined,
  });
  const { data: typesDropdown = [] } = useExpenseTypeDropdownProtected();
  const deleteMutation = useDeleteExpenseTransactionProtected();

  const allTransactions: ExpenseTransaction[] = useMemo(() => {
    const items = (raw as any)?.items ?? [];
    return items.filter((t: ExpenseTransaction) => {
      if (vendorFilter.trim() && !(t.vendor_name ?? '').toLowerCase().includes(vendorFilter.toLowerCase())) return false;
      if (fromDate && t.transaction_date < fromDate) return false;
      if (toDate && t.transaction_date > toDate) return false;
      return true;
    });
  }, [raw, vendorFilter, fromDate, toDate]);

  const tabCounts = useMemo(() => ({
    all: allTransactions.length,
    pending: allTransactions.filter(t => t.status === 'pending').length,
    approved: allTransactions.filter(t => t.status === 'approved').length,
    paid: allTransactions.filter(t => t.status === 'paid').length,
    cancelled: allTransactions.filter(t => t.status === 'cancelled').length,
  }), [allTransactions]);

  const displayed = useMemo(() => {
    if (activeTab === 'all') return allTransactions;
    return allTransactions.filter(t => t.status === activeTab);
  }, [allTransactions, activeTab]);

  const typeOptions = useMemo(() => [
    { label: 'All Types', value: '' },
    ...(typesDropdown as any[]).map((t: any) => ({ label: t.name || '', value: t.id })),
  ], [typesDropdown]);

  const handleDelete = (item: ExpenseTransaction) => {
    Alert.alert('Delete Transaction', `Delete this transaction of ₹${item.amount}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () =>
          deleteMutation.mutate(item.id, {
            onSuccess: () => showSuccess('Deleted', 'Transaction has been deleted.'),
            onError: () => showError('Delete Failed', 'Could not delete transaction.'),
          }),
      },
    ]);
  };

  const TABS: { key: StatusTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'paid', label: 'Paid' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  const renderItem = ({ item }: { item: ExpenseTransaction }) => {
    const statusColor = STATUS_COLORS[item.status] ?? '#6b7280';
    return (
      <TouchableOpacity
        style={[styles.txCard, { backgroundColor: cardBg, borderColor: borderCol }]}
        onPress={() => router.push(`/expense/transactions/${item.id}` as any)}
        activeOpacity={0.8}
      >
        <View style={styles.txTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.txDesc, { color: colors.foreground }]} numberOfLines={1}>
              {item.description}
            </Text>
            {item.vendor_name ? (
              <Text style={[styles.txMeta, { color: colors['muted-foreground'] }]}>
                {item.vendor_name} · {PAYMENT_METHODS[item.payment_method] ?? item.payment_method}
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={[styles.txAmount, { color: colors.foreground }]}>
              ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>
            <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.txBottom}>
          <Text style={[styles.txDate, { color: colors['muted-foreground'] }]}>
            {new Date(item.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
          {item.reference_number ? (
            <Text style={[styles.txRef, { color: colors['muted-foreground'] }]}>
              Ref: {item.reference_number}
            </Text>
          ) : null}
          <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push(`/expense/transactions/edit/${item.id}` as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={15} color="#556ee6" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout title="Expense Transactions">
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>

        {/* Filters section */}
        <View style={[styles.filtersSection, { backgroundColor: filterBg, borderColor: borderCol }]}>
          <Text style={[styles.filtersTitle, { color: colors.foreground }]}>Filters</Text>

          {/* Row 1: Status + Type */}
          <View style={styles.filterRow}>
            <View style={styles.filterHalf}>
              <CustomDropdown
                data={[
                  { label: 'All Status', value: '' },
                  { label: 'Pending', value: 'pending' },
                  { label: 'Approved', value: 'approved' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Cancelled', value: 'cancelled' },
                ]}
                value={statusFilter}
                onChange={(v: any) => setStatusFilter(v?.toString() ?? '')}
                placeholder="All Status"
              />
            </View>
            <View style={styles.filterHalf}>
              <CustomDropdown
                data={typeOptions}
                value={typeFilter}
                onChange={(v: any) => setTypeFilter(v?.toString() ?? '')}
                placeholder="All Types"
              />
            </View>
          </View>

          {/* Row 2: From date + To date */}
          <View style={styles.filterRow}>
            <View style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}>
              <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
              <TextInput
                style={[styles.dateInputText, { color: colors.foreground }]}
                placeholder="From date (YYYY-MM-DD)"
                placeholderTextColor={colors['muted-foreground']}
                value={fromDate}
                onChangeText={setFromDate}
              />
            </View>
            <View style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}>
              <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
              <TextInput
                style={[styles.dateInputText, { color: colors.foreground }]}
                placeholder="To date (YYYY-MM-DD)"
                placeholderTextColor={colors['muted-foreground']}
                value={toDate}
                onChangeText={setToDate}
              />
            </View>
          </View>

          {/* Row 3: Vendor name */}
          <View style={[styles.vendorInput, { borderColor: borderCol, backgroundColor: inputBg }]}>
            <TextInput
              style={[styles.dateInputText, { color: colors.foreground }]}
              placeholder="Vendor Name"
              placeholderTextColor={colors['muted-foreground']}
              value={vendorFilter}
              onChangeText={setVendorFilter}
            />
          </View>
        </View>

        {/* New Transaction button */}
        <View style={styles.newBtnRow}>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: '#556ee6' }]}
            onPress={() => router.push('/expense/transactions/create' as any)}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.newBtnText}>New Transaction</Text>
          </TouchableOpacity>
        </View>

        {/* Status tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  active ? { backgroundColor: colors.foreground } : { backgroundColor: 'transparent', borderColor: borderCol, borderWidth: 1 },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, { color: active ? colors.background : colors['muted-foreground'] }]}>
                  {tab.label} ({tabCounts[tab.key]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Transaction list */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={ORANGE} size="large" />
          </View>
        ) : displayed.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No transactions found.
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
            contentContainerStyle={styles.list}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  filtersSection: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 10,
  },
  filtersTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterHalf: { flex: 1 },
  dateInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 40,
  },
  vendorInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40,
    justifyContent: 'center',
  },
  dateInputText: { flex: 1, fontSize: 12, padding: 0 },
  newBtnRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, alignItems: 'flex-end' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  newBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  tabsScroll: { marginTop: 10 },
  tabsContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  tabText: { fontSize: 13, fontWeight: '600' },
  list: { padding: 16, gap: 10 },
  txCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  txTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  txDesc: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  txMeta: { fontSize: 12 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 11 },
  txRef: { fontSize: 11 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyBox: {
    marginHorizontal: 16, marginTop: 8,
    borderRadius: 12, borderWidth: 1, padding: 40,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14 },
});
