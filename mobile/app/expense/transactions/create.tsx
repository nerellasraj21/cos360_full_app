import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { DatePickerModal } from '@/components/ui';
import { useTheme } from '@/contexts';
import { useExpenseTypeDropdownProtected, useExpenseDepartmentDropdownProtected, useCreateExpenseTransactionProtected } from '@/hooks/use-expense-protected';
import { CreatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { TransactionItem } from '@/src/types/expense';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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

const EMPTY_ITEM: TransactionItem = {
  item_name: '',
  item_description: '',
  unit_price: 0,
  quantity: 1,
  tax_rate: 0,
  discount_rate: 0,
  final_amount: 0,
};

function calculateItemAmount(item: TransactionItem): number {
  const subtotal = (item.unit_price || 0) * (item.quantity || 1);
  const taxAmount = subtotal * ((item.tax_rate || 0) / 100);
  const discountAmount = subtotal * ((item.discount_rate || 0) / 100);
  return subtotal + taxAmount - discountAmount;
}

export default function CreateExpenseTransactionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const [formData, setFormData] = useState({
    expense_type_id: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    payment_method: 'cash' as 'cash' | 'cheque' | 'bank_transfer' | 'upi',
    vendor_name: '',
    reference_number: '',
    department_id: '',
  });

  const [attachments, setAttachments] = useState<{ uri: string; name: string; type: string; size?: number }[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const hasItems = transactionItems.length > 0;

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

  // ─── Line Item Helpers ────────────────────────────────────────────────────────

  const addItem = () => {
    setTransactionItems(prev => [...prev, { ...EMPTY_ITEM }]);
  };

  const updateItem = (index: number, field: keyof TransactionItem, value: string | number) => {
    setTransactionItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      updated[index].final_amount = calculateItemAmount(updated[index]);

      // Recalculate total
      const total = updated.reduce((sum, it) => sum + it.final_amount, 0);
      setFormData(f => ({ ...f, amount: total.toFixed(2) }));
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setTransactionItems(prev => {
      const updated = prev.filter((_, i) => i !== index);
      const total = updated.reduce((sum, it) => sum + it.final_amount, 0);
      setFormData(f => ({ ...f, amount: updated.length > 0 ? total.toFixed(2) : '' }));
      return updated;
    });
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────

  // ─── Attachments ──────────────────────────────────────────────────────────────

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length) {
        setAttachments(prev => [
          ...prev,
          ...result.assets.map(asset => ({
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'application/octet-stream',
            size: asset.size,
          })),
        ]);
      }
    } catch {
      showError('Error', 'Failed to pick file');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.expense_type_id) {
      showError('Error', 'Please select an expense type');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError('Error', 'Please enter a valid amount');
      return;
    }
    if (!formData.description.trim()) {
      showError('Error', 'Please enter a description');
      return;
    }
    if (!formData.vendor_name.trim()) {
      showError('Error', 'Please enter vendor name');
      return;
    }
    if (!formData.transaction_date) {
      showError('Error', 'Please select a transaction date');
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
    const cleanedText = text.replace(/[^0-9.]/g, '');
    setFormData(prev => ({ ...prev, amount: cleanedText }));
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <CreatePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
      <AppLayout title="Create New Transaction">
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

          {/* Amount — read-only when line items exist */}
          <ThemedText style={styles.label}>
            Total Amount *{hasItems ? '  (auto-calculated from items)' : ''}
          </ThemedText>
          <TextInput
            style={[styles.input, {
              backgroundColor: hasItems ? colors.card : colors.background,
              color: colors.foreground,
              borderColor: colors.border,
            }]}
            value={hasItems ? `₹ ${formData.amount}` : formData.amount}
            onChangeText={hasItems ? undefined : handleAmountChange}
            placeholder="Enter amount"
            placeholderTextColor={colors['muted-foreground']}
            keyboardType="decimal-pad"
            editable={!hasItems}
          />

          {/* ─── Transaction Items ──────────────────────────────────────────── */}
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.sectionTitle}>Transaction Items</ThemedText>
            <TouchableOpacity
              style={[styles.addItemButton, { backgroundColor: colors.primary }]}
              onPress={addItem}
            >
              <Ionicons name="add" size={16} color="white" />
              <ThemedText style={styles.addItemText}>Add Item</ThemedText>
            </TouchableOpacity>
          </View>

          {transactionItems.length === 0 && (
            <ThemedText style={[styles.hintText, { color: colors['muted-foreground'] }]}>
              Add items to break down this expense. Amount will be auto-calculated.
            </ThemedText>
          )}

          {transactionItems.map((item, index) => (
            <View key={index} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.itemHeaderRow}>
                <ThemedText style={styles.itemLabel}>Item #{index + 1}</ThemedText>
                <TouchableOpacity onPress={() => removeItem(index)}
              accessibilityLabel="Delete">
                  <Ionicons name="trash" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Item Name */}
              <TextInput
                style={[styles.itemInput, { color: colors.foreground, borderColor: colors.border }]}
                value={item.item_name}
                onChangeText={(t) => updateItem(index, 'item_name', t)}
                placeholder="Item name"
                placeholderTextColor={colors['muted-foreground']}
              />

              {/* Unit Price + Quantity (side by side) */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <ThemedText style={styles.itemFieldLabel}>Unit Price</ThemedText>
                  <TextInput
                    style={[styles.itemInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={item.unit_price ? item.unit_price.toString() : ''}
                    onChangeText={(t) => updateItem(index, 'unit_price', parseFloat(t) || 0)}
                    placeholder="0.00"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <ThemedText style={styles.itemFieldLabel}>Quantity</ThemedText>
                  <TextInput
                    style={[styles.itemInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={item.quantity ? item.quantity.toString() : ''}
                    onChangeText={(t) => updateItem(index, 'quantity', parseInt(t) || 1)}
                    placeholder="1"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Tax Rate + Discount Rate (side by side) */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <ThemedText style={styles.itemFieldLabel}>Tax Rate (%)</ThemedText>
                  <TextInput
                    style={[styles.itemInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={item.tax_rate ? item.tax_rate.toString() : ''}
                    onChangeText={(t) => updateItem(index, 'tax_rate', parseFloat(t) || 0)}
                    placeholder="0"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <ThemedText style={styles.itemFieldLabel}>Discount (%)</ThemedText>
                  <TextInput
                    style={[styles.itemInput, { color: colors.foreground, borderColor: colors.border }]}
                    value={item.discount_rate ? item.discount_rate.toString() : ''}
                    onChangeText={(t) => updateItem(index, 'discount_rate', parseFloat(t) || 0)}
                    placeholder="0"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Final Amount (read-only) */}
              <View style={[styles.itemFinalRow, { backgroundColor: colors.background }]}>
                <ThemedText style={styles.itemFieldLabel}>Item Total</ThemedText>
                <ThemedText style={[styles.itemFinalAmount, { color: colors.primary }]}>
                  ₹ {(item.final_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </ThemedText>
              </View>
            </View>
          ))}

          {/* ─── Remaining Form Fields ──────────────────────────────────────── */}

          {/* Transaction Date */}
          <ThemedText style={styles.label}>Transaction Date *</ThemedText>
          <TouchableOpacity
            style={[styles.input, styles.dateField, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.75}
            accessibilityLabel="Select transaction date"
          >
            <ThemedText style={{ color: formData.transaction_date ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
              {formData.transaction_date || 'YYYY-MM-DD'}
            </ThemedText>
            <Ionicons name="calendar-outline" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>

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

          {/* ─── Attachments ──────────────────────────────────── */}
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.sectionTitle}>Attachments</ThemedText>
            <TouchableOpacity
              style={[styles.addItemButton, { backgroundColor: colors.primary }]}
              onPress={handlePickFiles}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="white" />
              <ThemedText style={styles.addItemText}>Upload Files</ThemedText>
            </TouchableOpacity>
          </View>

          {attachments.map((file, index) => (
            <View key={index} style={[styles.attachmentRow, { borderColor: colors.border }]}>
              <View style={styles.attachmentInfo}>
                <Ionicons name="document-text-outline" size={16} color={colors['muted-foreground']} />
                <ThemedText style={styles.attachmentName} numberOfLines={1}>{file.name}</ThemedText>
                {file.size ? (
                  <ThemedText style={[styles.attachmentSize, { color: colors['muted-foreground'] }]}>
                    ({(file.size / 1024).toFixed(1)} KB)
                  </ThemedText>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => removeAttachment(index)} accessibilityLabel="Remove attachment">
                <Ionicons name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <ThemedText style={{ color: 'white' }}>Cancel</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            <ThemedText style={styles.submitButtonText}>
              {createMutation.isPending ? 'Saving...' : 'Save Transaction'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <DatePickerModal
          visible={showDatePicker}
          initialDate={formData.transaction_date}
          onConfirm={(date) => { setFormData(prev => ({ ...prev, transaction_date: date })); setShowDatePicker(false); }}
          onCancel={() => setShowDatePicker(false)}
        />
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
  dateField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  // ─── Line Items Styles ──────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    marginTop: 8,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  addItemText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  hintText: {
    fontSize: 13,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemLabel: {
    fontWeight: '700',
    fontSize: 14,
  },
  itemInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  itemFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
  },
  itemFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  itemFinalAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  attachmentName: {
    fontSize: 14,
    flexShrink: 1,
  },
  attachmentSize: {
    fontSize: 12,
  },
});
