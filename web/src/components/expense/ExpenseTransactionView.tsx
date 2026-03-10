
import React from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Eye, Calendar, CreditCard, User, Building, Hash } from 'lucide-react';
import { formatCurrency, formatFileSize } from '@/lib/expenseValidation';
import { useExpenseTransactionAttachments, useExpenseTypeDropdown, useExpenseCategoryDropdown } from '@/hooks/expense';
import type { ExpenseTransaction } from '@/types/expense';

interface ExpenseTransactionViewProps {
  transaction: ExpenseTransaction;
  onClose: () => void;
}

export function ExpenseTransactionView({ transaction, onClose }: ExpenseTransactionViewProps) {
  const { data: attachments = [] } = useExpenseTransactionAttachments(transaction.id);
  const { data: expenseTypes = [] } = useExpenseTypeDropdown();
  const { data: categories = [] } = useExpenseCategoryDropdown();


  const getTypeName = (typeId: string) => {
    const type = expenseTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown';
  };

  const getCategoryName = (typeId: string) => {
    const type = expenseTypes.find(t => t.id === typeId);
    const category = categories.find(c => c.id === type?.category_id);
    return category ? category.name : 'Unknown';
  };

  const transactionDetails: Array<{
    label: string;
    value: string | React.ReactElement;
    icon: React.ComponentType<any> | null;
  }> = [
    {
      label: 'Transaction ID',
      value: transaction.id,
      icon: Hash
    },
    {
      label: 'Amount',
      value: formatCurrency(transaction.amount),
      icon: CreditCard
    },
    {
      label: 'Transaction Date',
      value: new Date(transaction.transaction_date).toLocaleDateString(),
      icon: Calendar
    },
    {
      label: 'Payment Method',
      value: transaction.payment_method.replace('_', ' ').toUpperCase(),
      icon: CreditCard
    },
    {
      label: 'Status',
      value: <StatusBadge status={transaction.status} />,
      icon: null
    },
    {
      label: 'Category',
      value: getCategoryName(transaction.expense_type_id),
      icon: Building
    },
    {
      label: 'Expense Type',
      value: getTypeName(transaction.expense_type_id),
      icon: FileText
    },
    {
      label: 'Reference Number',
      value: transaction.reference_number || 'N/A',
      icon: Hash
    },
    {
      label: 'Vendor Name',
      value: transaction.vendor_name || 'N/A',
      icon: User
    },
    {
      label: 'Department',
      value: transaction.department_id || 'N/A',
      icon: Building
    },
    {
      label: 'Idempotency Key',
      value: transaction.idempotency_key,
      icon: Hash
    },
    {
      label: 'Created By',
      value: `${transaction.created_by_role} (${transaction.created_by_user_id})`,
      icon: User
    },
    {
      label: 'Created At',
      value: new Date(transaction.created_at).toLocaleString(),
      icon: Calendar
    },
    {
      label: 'Updated At',
      value: new Date(transaction.updated_at).toLocaleString(),
      icon: Calendar
    }
  ];

  if (transaction.requires_approval) {
    transactionDetails.splice(4, 0, {
      label: 'Requires Approval',
      value: transaction.requires_approval ? 'Yes' : 'No',
      icon: null
    });
  }

  if (transaction.approved_by_user_id) {
    transactionDetails.splice(-2, 0, {
      label: 'Approved By',
      value: `${transaction.approved_by_role} (${transaction.approved_by_user_id})`,
      icon: User
    });
    transactionDetails.splice(-2, 0, {
      label: 'Approved At',
      value: transaction.approved_at ? new Date(transaction.approved_at).toLocaleString() : 'N/A',
      icon: Calendar
    });
  }

  return (
    <div className="space-y-6">
      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transactionDetails.map((detail, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {detail.icon && <detail.icon className="h-4 w-4 text-muted-foreground" />}
                <div className="flex-1">
                  <div className="text-sm font-medium text-muted-foreground">{detail.label}</div>
                  <div className="text-sm">{detail.value}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{transaction.description}</p>
        </CardContent>
      </Card>

      {/* Approval Comment */}
      {transaction.approval_comment && (
        <Card>
          <CardHeader>
            <CardTitle>Approval Comment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{transaction.approval_comment}</p>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments ({attachments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{attachment.original_filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {attachment.document_type} • {formatFileSize(attachment.file_size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}