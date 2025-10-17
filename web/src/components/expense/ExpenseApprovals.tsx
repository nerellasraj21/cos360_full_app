
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, Eye, Clock, FileText, DollarSign, Calendar, User } from 'lucide-react';
import { usePendingExpenseApprovals, useApproveExpenseTransaction, useExpenseTransaction } from '@/hooks/expense';
import { formatCurrency } from '@/lib/expenseValidation';
import type { ExpenseTransaction } from '@/types/expense';

export function ExpenseApprovals() {
  const [selectedTransaction, setSelectedTransaction] = useState<ExpenseTransaction | null>(null);
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    transaction: ExpenseTransaction | null;
  }>({
    open: false,
    action: 'approve',
    transaction: null
  });
  const [approvalComment, setApprovalComment] = useState('');

  const { data: pendingApprovals, isLoading, refetch } = usePendingExpenseApprovals();
  const { data: transactionDetails } = useExpenseTransaction(selectedTransaction?.id || '');
  const approveMutation = useApproveExpenseTransaction();

  const pendingTransactions = Array.isArray(pendingApprovals)
    ? pendingApprovals
    : pendingApprovals?.items || [];

  const handleViewDetails = (transaction: ExpenseTransaction) => {
    setSelectedTransaction(transaction);
  };

  const handleApprovalAction = (action: 'approve' | 'reject', transaction: ExpenseTransaction) => {
    setApprovalDialog({
      open: true,
      action,
      transaction
    });
    setApprovalComment('');
  };

  const handleConfirmApproval = async () => {
    if (!approvalDialog.transaction) return;

    try {
      await approveMutation.mutateAsync({
        id: approvalDialog.transaction.id,
        data: {
          action: approvalDialog.action,
          approval_comment: approvalComment.trim()
        }
      });

      setApprovalDialog({ open: false, action: 'approve', transaction: null });
      refetch(); // Refresh the pending approvals list
    } catch (error) {
      console.error('Approval action failed:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Pending Approvals</h2>
          <p className="text-muted-foreground">Review and process expense approval requests</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{pendingTransactions.length}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Pending Approvals</p>
                <p className="text-2xl font-bold">{pendingTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(pendingTransactions.reduce((sum, t) => sum + t.amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Requires Attention</p>
                <p className="text-2xl font-bold text-orange-600">
                  {pendingTransactions.filter(t => t.requires_approval).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Table */}
      {pendingTransactions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending Expense Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {transaction.id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction.payment_method}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(transaction.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(transaction)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprovalAction('approve', transaction)}
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprovalAction('reject', transaction)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground">
              There are no pending expense approvals at this time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>

          {transactionDetails && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-lg font-bold">{formatCurrency(transactionDetails.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Payment Method</Label>
                  <p>{transactionDetails.payment_method}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Transaction Date</Label>
                  <p>{new Date(transactionDetails.transaction_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">{getStatusBadge(transactionDetails.status)}</div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1">{transactionDetails.description}</p>
              </div>

              {transactionDetails.reference_number && (
                <div>
                  <Label className="text-sm font-medium">Reference Number</Label>
                  <p className="mt-1">{transactionDetails.reference_number}</p>
                </div>
              )}

              {transactionDetails.vendor_name && (
                <div>
                  <Label className="text-sm font-medium">Vendor</Label>
                  <p className="mt-1">{transactionDetails.vendor_name}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleApprovalAction('approve', transactionDetails)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApprovalAction('reject', transactionDetails)}
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={() => setApprovalDialog({ open: false, action: 'approve', transaction: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {approvalDialog.action === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Approve Transaction
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Reject Transaction
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {approvalDialog.action === 'approve'
                  ? 'Are you sure you want to approve this expense transaction?'
                  : 'Are you sure you want to reject this expense transaction?'
                }
              </p>
            </div>

            {approvalDialog.transaction && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{approvalDialog.transaction.description}</span>
                  <span className="font-bold">{formatCurrency(approvalDialog.transaction.amount)}</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="approval-comment" className="text-sm font-medium">
                Comment <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="approval-comment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={`Enter a comment for ${approvalDialog.action === 'approve' ? 'approval' : 'rejection'}...`}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalDialog({ open: false, action: 'approve', transaction: null })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmApproval}
              disabled={!approvalComment.trim() || approveMutation.isPending}
              variant={approvalDialog.action === 'approve' ? 'default' : 'destructive'}
            >
              {approveMutation.isPending ? 'Processing...' :
               approvalDialog.action === 'approve' ? 'Approve Transaction' : 'Reject Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}