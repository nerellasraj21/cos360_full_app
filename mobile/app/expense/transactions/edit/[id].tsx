import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { DatePickerModal } from '@/components/ui';
import { useTheme } from '@/contexts';
import {
  useExpenseDepartmentDropdownProtected,
  useExpenseTransactionProtected,
  useExpenseTypeDropdownProtected,
  useUpdateExpenseTransactionProtected,
} from '@/hooks/use-expense-protected';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const PAYMENT_METHOD_OPTIONS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'UPI', value: 'upi' },
];

function EditExpenseTransactionScreenContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const transactionId = Array.isArray(id) ? id[0] : id;

  const { data: transaction, isLoading: isLoadingTxn } = useExpenseTransactionProtected(transactionId);
  const { data: typeOptions = [] } = useExpenseTypeDropdownProtected();
  const { data: departmentOptions = [] } = useExpenseDepartmentDropdownProtected();
  const updateMutation = useUpdateExpenseTransactionProtected();

  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e2e8f0';

  const [formData, setFormData] = useState({
    expense_type_id: '',
    amount: '',
    transaction_date: '',
    description: '',
    payment_method: 'cash' as 'cash' | 'cheque' | 'bank_transfer' | 'upi',
    vendor_name: '',
    reference_number: '',
    department_id: '',
  });

  const [initialized, setInitialized] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (transaction && !initialized) {
      setFormData({
        expense_type_id: transaction.expense_type_id,
        amount: String(Number(transaction.amount)),
        transaction_date: transaction.transaction_date,
        description: transaction.description,
        payment_method: transaction.payment_method,
        vendor_name: transaction.vendor_name ?? '',
        reference_number: transaction.reference_number ?? '',
        department_id: transaction.department_id ?? '',
      });
      setInitialized(true);
    }
  }, [transaction, initialized]);

  const typeDropdownData = (typeOptions as any[]).map((t: any) => ({
    label: t.name,
    value: t.id,
  }));

  const deptDropdownData = [
    { label: 'No Department', value: '' },
    ...(departmentOptions as any[]).map((d: any) => ({ label: d.name, value: d.id })),
  ];

  const handleSubmit = () => {
    if (!formData.expense_type_id) {
      showError('Validation', 'Please select an expense type.');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('Validation', 'Please enter a valid amount.');
      return;
    }
    if (!formData.description.trim()) {
      showError('Validation', 'Please enter a description.');
      return;
    }
    if (!formData.vendor_name.trim()) {
      showError('Validation', 'Please enter a vendor name.');
      return;
    }
    if (!formData.transaction_date) {
      showError('Validation', 'Please enter a transaction date.');
      return;
    }

    updateMutation.mutate(
      {
        id: transactionId,
        data: {
          expense_type_id: formData.expense_type_id,
          amount: parseFloat(formData.amount),
          transaction_date: formData.transaction_date,
          description: formData.description.trim(),
          payment_method: formData.payment_method,
          vendor_name: formData.vendor_name.trim(),
          reference_number: formData.reference_number.trim() || undefined,
          department_id: formData.department_id || undefined,
        },
      },
      {
        onSuccess: () => {
          showSuccess('Updated', 'Transaction updated successfully.');
          router.back();
        },
        onError: () => showError('Error', 'Failed to update transaction.'),
      }
    );
  };

  if (isLoadingTxn || !initialized) {
    return (
      <AppLayout title="Edit Transaction">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  const field = (label: string, key: keyof typeof formData, placeholder: string, opts?: {
    multiline?: boolean;
    keyboardType?: 'decimal-pad' | 'default';
    optional?: boolean;
  }) => (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors['muted-foreground'] }]}>
        {label}{opts?.optional ? ' (Optional)' : ' *'}
      </Text>
      <TextInput
        style={[
          opts?.multiline ? styles.textArea : styles.input,
          { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol },
        ]}
        value={formData[key]}
        onChangeText={(t) => {
          const val = key === 'amount' ? t.replace(/[^0-9.]/g, '') : t;
          setFormData(p => ({ ...p, [key]: val }));
        }}
        placeholder={placeholder}
        placeholderTextColor={colors['muted-foreground']}
        keyboardType={opts?.keyboardType ?? 'default'}
        multiline={opts?.multiline}
        numberOfLines={opts?.multiline ? 3 : 1}
        textAlignVertical={opts?.multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <AppLayout title="Edit Transaction">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>

        {/* Expense Type */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Expense Type *</Text>
          <CustomDropdown
            data={typeDropdownData}
            value={formData.expense_type_id}
            onChange={(v) => setFormData(p => ({ ...p, expense_type_id: v?.toString() || '' }))}
            placeholder="Select expense type"
          />
        </View>

        {field('Amount', 'amount', 'e.g. 1500.00', { keyboardType: 'decimal-pad' })}

        {/* Transaction Date — tappable calendar picker */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Transaction Date *</Text>
          <TouchableOpacity
            style={[styles.input, styles.dateField, { backgroundColor: inputBg, borderColor: borderCol }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.75}
            accessibilityLabel="Select transaction date"
          >
            <Text style={{ color: formData.transaction_date ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
              {formData.transaction_date || 'YYYY-MM-DD'}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>
        </View>

        {field('Description', 'description', 'Enter description', { multiline: true })}

        {/* Payment Method */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Payment Method *</Text>
          <CustomDropdown
            data={PAYMENT_METHOD_OPTIONS}
            value={formData.payment_method}
            onChange={(v) => setFormData(p => ({ ...p, payment_method: v?.toString() as any || 'cash' }))}
            placeholder="Select payment method"
          />
        </View>

        {field('Vendor Name', 'vendor_name', 'Enter vendor name')}
        {field('Reference Number', 'reference_number', 'Invoice/bill number', { optional: true })}

        {/* Department */}
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Department (Optional)</Text>
          <CustomDropdown
            data={deptDropdownData}
            value={formData.department_id}
            onChange={(v) => setFormData(p => ({ ...p, department_id: v?.toString() || '' }))}
            placeholder="Select department"
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: borderCol }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#556ee6', opacity: updateMutation.isPending ? 0.5 : 1 }]}
            onPress={handleSubmit}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="white" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        initialDate={formData.transaction_date}
        onConfirm={(date) => { setFormData(p => ({ ...p, transaction_date: date })); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  fieldWrap: { marginBottom: 16 },
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
  },
  textArea: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    minHeight: 80,
  },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 8 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function EditExpenseTransactionScreen() {
  return (
    <ScreenAccessGate
      title="Edit Expense"
      permissions={[['expense_transactions', 'update']]}
    >
      <EditExpenseTransactionScreenContent />
    </ScreenAccessGate>
  );
}
