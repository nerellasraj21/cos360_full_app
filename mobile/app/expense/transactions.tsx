import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useExpenseTransactionsProtected, useExpenseTypeDropdownProtected, useExpenseDepartmentDropdownProtected } from '@/hooks/use-expense-protected';
import { ReadOrListPermissionGuard, CreatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Paid', value: 'paid' },
  { label: 'Cancelled', value: 'cancelled' },
];

const paymentMethodOptions = [
  { label: 'All Methods', value: '' },
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'UPI', value: 'upi' },
];

export default function ExpenseTransactionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const handleStatusFilter = (value: string | number | null) => {
    setStatusFilter(value?.toString() || '');
  };

  const handleTypeFilter = (value: string | number | null) => {
    setTypeFilter(value?.toString() || '');
  };

  const handleDepartmentFilter = (value: string | number | null) => {
    setDepartmentFilter(value?.toString() || '');
  };

  const { data: transactionsData, isLoading, error } = useExpenseTransactionsProtected({
    status_filter: statusFilter || undefined,
    expense_type_id: typeFilter || undefined,
    department_id: departmentFilter || undefined,
  });

  const { data: typeOptions = [] } = useExpenseTypeDropdownProtected();
  const { data: departmentOptions = [] } = useExpenseDepartmentDropdownProtected();

  const typeDropdownOptions = [
    { label: 'All Types', value: '' },
    ...(typeOptions || []).map((type: any) => ({ label: type.name, value: type.id })),
  ];

  const departmentDropdownOptions = [
    { label: 'All Departments', value: '' },
    ...(departmentOptions || []).map((dept: any) => ({ label: dept.name, value: dept.id })),
  ];

  const transactions = Array.isArray(transactionsData)
    ? transactionsData
    : transactionsData?.items || [];

  // Debug logging
  console.log('Expense Transactions - Raw data:', transactionsData);
  console.log('Expense Transactions - Processed array:', transactions);
  console.log('Expense Transactions - Type options:', typeOptions);
  console.log('Expense Transactions - Department options:', departmentOptions);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'paid': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return colors['muted-foreground'];
    }
  };

  const renderTransactionItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.transactionCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/expense/transactions/${item.id}` as any)}
    >
      <View style={styles.transactionHeader}>
        <ThemedText type="subtitle" style={styles.vendorName}>
          {item.vendor_name}
        </ThemedText>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <ThemedText style={[styles.transactionInfo, { color: colors['muted-foreground'] }]}>
          {item.description}
        </ThemedText>
        <ThemedText style={[styles.transactionInfo, { color: colors['muted-foreground'] }]}>
          {new Date(item.transaction_date).toLocaleDateString()} • Type ID: {item.expense_type_id}
        </ThemedText>
      </View>

      <View style={styles.transactionFooter}>
        <ThemedText type="subtitle" style={styles.amount}>
          ₹{item.amount.toLocaleString()}
        </ThemedText>
        <Ionicons name="chevron-forward" size={20} color={colors['muted-foreground']} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <AppLayout title="Expense Transactions">
        <View style={styles.centerContainer}>
          <ThemedText>Loading transactions...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Expense Transactions">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading transactions
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
      <AppLayout title="Expense Transactions">
        <View style={styles.container}>
          {/* Filters */}
          <View style={styles.filtersContainer}>
            <CustomDropdown
              data={statusOptions}
              value={statusFilter}
              onChange={handleStatusFilter}
              placeholder="Filter by status"
            />
            <CustomDropdown
              data={typeDropdownOptions}
              value={typeFilter}
              onChange={handleTypeFilter}
              placeholder="Filter by type"
            />
            <CustomDropdown
              data={departmentDropdownOptions}
              value={departmentFilter}
              onChange={handleDepartmentFilter}
              placeholder="Filter by department"
            />
          </View>

          {/* Add Transaction Button */}
          <View style={styles.header}>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/expense/transactions/create' as any)}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Transaction</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

        {/* Transactions List */}
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No transactions found
              </ThemedText>
            </View>
          }
        />
      </View>
    </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    gap: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  transactionCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vendorName: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  transactionDetails: {
    marginBottom: 12,
  },
  transactionInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
});