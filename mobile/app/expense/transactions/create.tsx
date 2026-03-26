import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useExpenseTypeDropdownProtected, useExpenseDepartmentDropdownProtected, useCreateExpenseTransactionProtected } from '@/hooks/use-expense-protected';
import { CreatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const paymentMethodOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'UPI', value: 'upi' },
];

export default function CreateExpenseTransactionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const [formData, setFormData] = useState({
    expense_type_id: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    description: '',
    payment_method: 'cash' as 'cash' | 'cheque' | 'bank_transfer' | 'upi',
    vendor_name: '',
    reference_number: '',
    department_id: '',
  });

  const { data: typeOptions = [] } = useExpenseTypeDropdownProtected();
  const { data: departmentOptions = [] } = useExpenseDepartmentDropdownProtected();
  const createMutation = useCreateExpenseTransactionProtected();

  const typeDropdownOptions = (typeOptions || []).map((type: any) => ({
    label: type.name,
    value: type.id,
  }));

  const departmentDropdownOptions = (departmentOptions || []).map((dept: any) => ({
    label: dept.name,
    value: dept.id,
  }));

  const handleSubmit = () => {
    // Validation
    if (!formData.expense_type_id) {
      Alert.alert('Error', 'Please select an expense type');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!formData.vendor_name.trim()) {
      Alert.alert('Error', 'Please enter vendor name');
      return;
    }

    if (!formData.transaction_date) {
      Alert.alert('Error', 'Please select a transaction date');
      return;
    }

    const idempotencyKey = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const submitData = {
      expense_type_id: formData.expense_type_id,
      amount: parseFloat(formData.amount),
      transaction_date: formData.transaction_date,
      description: formData.description.trim(),
      payment_method: formData.payment_method,
      vendor_name: formData.vendor_name.trim(),
      reference_number: formData.reference_number.trim() || undefined,
      department_id: formData.department_id || undefined,
      idempotency_key: idempotencyKey,
    };

    createMutation.mutate(submitData, {
      onSuccess: () => {
        showSuccess('Created', 'Transaction created successfully.');
        router.back();
      },
      onError: () => showError('Error', 'Failed to create transaction.'),
    });
  };

  const handleAmountChange = (text: string) => {
    // Only allow numbers and decimal point
    const cleanedText = text.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, amount: cleanedText }));
  };

  return (
    <CreatePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
      <AppLayout title="Create Transaction">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Expense Type */}
          <ThemedText style={styles.label}>Expense Type *</ThemedText>
          <CustomDropdown
            data={typeDropdownOptions}
            value={formData.expense_type_id}
            onChange={(value) => setFormData(prev => ({ ...prev, expense_type_id: value?.toString() || '' }))}
            placeholder="Select expense type"
          />

          {/* Amount */}
          <ThemedText style={styles.label}>Amount *</ThemedText>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            value={formData.amount}
            onChangeText={handleAmountChange}
            placeholder="Enter amount"
            placeholderTextColor={colors['muted-foreground']}
            keyboardType="decimal-pad"
          />

          {/* Transaction Date */}
          <ThemedText style={styles.label}>Transaction Date *</ThemedText>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            value={formData.transaction_date}
            onChangeText={(text) => setFormData(prev => ({ ...prev, transaction_date: text }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors['muted-foreground']}
          />

          {/* Description */}
          <ThemedText style={styles.label}>Description *</ThemedText>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Enter transaction description"
            placeholderTextColor={colors['muted-foreground']}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Payment Method */}
          <ThemedText style={styles.label}>Payment Method *</ThemedText>
          <CustomDropdown
            data={paymentMethodOptions}
            value={formData.payment_method}
            onChange={(value) => setFormData(prev => ({ ...prev, payment_method: (value?.toString() || 'cash') as 'cash' | 'cheque' | 'bank_transfer' | 'upi' }))}
            placeholder="Select payment method"
          />

          {/* Vendor Name */}
          <ThemedText style={styles.label}>Vendor Name *</ThemedText>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            value={formData.vendor_name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, vendor_name: text }))}
            placeholder="Enter vendor/supplier name"
            placeholderTextColor={colors['muted-foreground']}
          />

          {/* Reference Number */}
          <ThemedText style={styles.label}>Reference Number (Optional)</ThemedText>
          <TextInput
            style={[styles.input, {
              backgroundColor: colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            value={formData.reference_number}
            onChangeText={(text) => setFormData(prev => ({ ...prev, reference_number: text }))}
            placeholder="Invoice/bill number"
            placeholderTextColor={colors['muted-foreground']}
          />

          {/* Department */}
          <ThemedText style={styles.label}>Department (Optional)</ThemedText>
          <CustomDropdown
            data={[
              { label: 'No Department', value: '' },
              ...departmentDropdownOptions,
            ]}
            value={formData.department_id}
            onChange={(value) => setFormData(prev => ({ ...prev, department_id: value?.toString() || '' }))}
            placeholder="Select department"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            <ThemedText style={styles.submitButtonText}>
              {createMutation.isPending ? 'Creating...' : 'Create Transaction'}
            </ThemedText>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </AppLayout>
    </CreatePermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 80,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});