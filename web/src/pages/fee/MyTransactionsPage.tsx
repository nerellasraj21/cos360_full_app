import { Banknote, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMyFeeTransactions, useMyChildrenFeeTransactions } from '@/api/hooks/fee/transactions';
import { useAuthStore } from '@/lib/authStore';
import { formatCurrency } from './FeeCollection/FeeSummaryTab';

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
};

export default function MyTransactionsPage() {
  const role = useAuthStore((s) => s.role);
  const selectedStudent = useAuthStore((s) => s.selectedStudent);
  const availableStudents = useAuthStore((s) => s.availableStudents);
  const isParent = role?.name.toLowerCase() === 'parent';

  // Parent's "related" scope resolves to every linked child's transactions in
  // one list server-side — same endpoint pattern as My Receipts. Only the
  // query matching the current role is ever enabled — the other role's
  // endpoint 403s (or worse, 401s and disrupts the token-refresh flow) since
  // neither read_own/list_own nor read_related/list_related is held by both.
  const mine = useMyFeeTransactions(!isParent);
  const childrens = useMyChildrenFeeTransactions(isParent);
  const { data: allTransactions = [], isLoading, isError, error } = isParent ? childrens : mine;

  // Filter the combined "all children" list down to whichever child is
  // active in the header switcher, so the parent sees exactly one child at a
  // time — same as the student's own view.
  const transactions = isParent
    ? allTransactions.filter((t) => t.student_admission_num === selectedStudent?.admission_number)
    : allTransactions;

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Transactions"
        subtitle={
          isParent
            ? selectedStudent
              ? `Fee payment history for ${selectedStudent.name}`
              : "View your children's fee payment history"
            : 'View your fee payment history'
        }
        icon={<Banknote className="h-5 w-5" />}
      />

      {isParent && availableStudents.length > 0 && !selectedStudent && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No child selected. Use the child switcher in the header above.
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading transactions...</span>
        </div>
      )}

      {isError && (
        <div className="text-center py-4 text-sm text-destructive">
          {(error as Error)?.message || 'Failed to load transactions'}
        </div>
      )}

      {!isLoading && !isError && (!isParent || selectedStudent) && transactions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Banknote className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your fee payments will appear here once a payment is recorded for you.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && (!isParent || selectedStudent) && transactions.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No.</TableHead>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((txn, idx) => (
                    <TableRow key={txn.id} className="h-12">
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{txn.transaction_number}</TableCell>
                      <TableCell className="text-sm">
                        {txn.transaction_date
                          ? new Date(txn.transaction_date).toLocaleDateString('en-IN')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {PAYMENT_METHOD_LABEL[txn.payment_method] ?? txn.payment_method}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(txn.total_amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={txn.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {txn.receipt_generated ? 'Generated' : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
