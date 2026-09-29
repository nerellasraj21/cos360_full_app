
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InfiniteScrollDropdown } from '@/components/dropdown/InfiniteScrollDropdown';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateExpenseTransaction, useUpdateExpenseTransaction, useExpenseTypeDropdown } from '@/hooks/expense';
import type { DropdownOption } from '@/types/dropdown';
import { validateTransactionForm, generateIdempotencyKey } from '@/lib/expenseValidation';
import { handleExpenseTransactionError } from '@/lib/expenseErrorHandler';
import type { ExpenseTransaction, ExpenseTransactionCreate, ExpenseTransactionUpdate } from '@/types/expense';

interface ExpenseTransactionFormProps {
  transaction?: ExpenseTransaction;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ExpenseTransactionForm({ transaction, onSubmit, onCancel }: ExpenseTransactionFormProps) {
  const isEditing = !!transaction;

  const [formData, setFormData] = useState<Partial<ExpenseTransactionCreate & ExpenseTransactionUpdate>>({
    expense_type_id: transaction?.expense_type_id || '',
    amount: transaction?.amount || undefined,
    transaction_date: transaction?.transaction_date || new Date().toISOString().split('T')[0],
    description: transaction?.description || '',
    reference_number: transaction?.reference_number || '',
    payment_method: transaction?.payment_method || 'cash',
    vendor_name: transaction?.vendor_name || '',
    idempotency_key: transaction?.idempotency_key || generateIdempotencyKey(),
    requires_approval_override: transaction?.requires_approval_override || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: expenseTypes = [] } = useExpenseTypeDropdown();
  const typeOptions: DropdownOption[] = useMemo(() =>
    expenseTypes.map(t => ({ id: t.id, value: t.id, label: t.name })), [expenseTypes]);
  const createMutation = useCreateExpenseTransaction();
  const updateMutation = useUpdateExpenseTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateTransactionForm(formData as any);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (isEditing && transaction) {
        await updateMutation.mutateAsync({
          id: transaction.id,
          data: formData as ExpenseTransactionUpdate
        });
      } else {
        await createMutation.mutateAsync(formData as ExpenseTransactionCreate);
      }
      onSubmit();
    } catch (error) {
      handleExpenseTransactionError(error, isEditing ? 'update' : 'create');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Expense Type and Amount Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expense_type_id">Expense Type *</Label>
          <InfiniteScrollDropdown
            data={typeOptions}
            value={formData.expense_type_id || ''}
            onChange={(val) => handleInputChange('expense_type_id', val)}
            placeholder="Select expense type"
            clearable={false}
            error={errors.expense_type_id}
          />
        </div>

        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            max="999999.99"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || '')}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-destructive mt-1">{errors.amount}</p>
          )}
        </div>
      </div>

      {/* Transaction Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="transaction_date">Transaction Date *</Label>
          <Input
            id="transaction_date"
            type="date"
            value={formData.transaction_date}
            onChange={(e) => handleInputChange('transaction_date', e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
          {errors.transaction_date && (
            <p className="text-sm text-destructive mt-1">{errors.transaction_date}</p>
          )}
        </div>

        <div>
          <Label htmlFor="payment_method">Payment Method *</Label>
          <InfiniteScrollDropdown
            data={[{id:'cash',value:'cash',label:'Cash'},{id:'cheque',value:'cheque',label:'Cheque'},{id:'bank_transfer',value:'bank_transfer',label:'Bank Transfer'},{id:'upi',value:'upi',label:'UPI'}]}
            value={formData.payment_method}
            onChange={(value) => handleInputChange('payment_method', value)}
            placeholder="Select payment method"
            clearable={false}
            error={errors.payment_method}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Enter transaction description"
          maxLength={500}
          rows={3}
        />
        {errors.description && (
          <p className="text-sm text-destructive mt-1">{errors.description}</p>
        )}
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reference_number">Reference Number</Label>
          <Input
            id="reference_number"
            value={formData.reference_number}
            onChange={(e) => handleInputChange('reference_number', e.target.value)}
            placeholder="Optional reference"
            maxLength={100}
          />
          {errors.reference_number && (
            <p className="text-sm text-destructive mt-1">{errors.reference_number}</p>
          )}
        </div>

        <div>
          <Label htmlFor="vendor_name">Vendor Name</Label>
          <Input
            id="vendor_name"
            value={formData.vendor_name}
            onChange={(e) => handleInputChange('vendor_name', e.target.value)}
            placeholder="Vendor or merchant name"
            maxLength={200}
          />
          {errors.vendor_name && (
            <p className="text-sm text-destructive mt-1">{errors.vendor_name}</p>
          )}
        </div>
      </div>

      {/* Idempotency Key (only for new transactions) */}
      {!isEditing && (
        <div>
          <Label htmlFor="idempotency_key">Idempotency Key *</Label>
          <Input
            id="idempotency_key"
            value={formData.idempotency_key}
            onChange={(e) => handleInputChange('idempotency_key', e.target.value)}
            placeholder="Unique transaction identifier"
          />
          {errors.idempotency_key && (
            <p className="text-sm text-destructive mt-1">{errors.idempotency_key}</p>
          )}
        </div>
      )}

      {/* Approval Override */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="requires_approval_override"
          checked={formData.requires_approval_override}
          onCheckedChange={(checked) => handleInputChange('requires_approval_override', checked)}
        />
        <Label htmlFor="requires_approval_override">
          Override approval requirement (requires special permission)
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Transaction' : 'Create Transaction'}
        </Button>
      </div>
    </form>
  );
}