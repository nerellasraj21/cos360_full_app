import React, { useState } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, CheckCircle, XCircle, Clock, Upload, Loader2, Filter, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useExpenseTransactions,
  useCreateExpenseTransaction,
  useUpdateExpenseTransaction,
  useDeleteExpenseTransaction,
  useApproveExpenseTransaction,
  useExpenseTypes,
  useExpenseTypeDropdown,
  useExpenseTransactionAttachments,
  useUploadExpenseAttachment,
  useDeleteExpenseAttachment
} from '@/hooks/expense';
import type {
  ExpenseTransaction,
  ExpenseTransactionCreate,
  ExpenseTransactionUpdate,
  ExpenseTransactionApproval,
  TransactionItem
} from '@/types/expense';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/PermissionGuard';
import { usePermission } from '@/hooks/usePermission';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function ExpenseTransactionsPage() {
  const { checkPermission } = usePermission();
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ExpenseTransaction | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [approvalComment, setApprovalComment] = useState('');
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseTransaction | null>(null);

  // Form state
  const [formData, setFormData] = useState<ExpenseTransactionCreate>({
    expense_type_id: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_number: '',
    payment_method: 'cash',
    vendor_name: '',
    idempotency_key: ''
  });

  // Filters
  const [filters, setFilters] = useState({
    status_filter: '',
    expense_type_id: '',
    date_from: '',
    date_to: '',
    vendor_name: ''
  });

  // API hooks
  const { data: transactionsResponse, isLoading } = useExpenseTransactions({
    ...filters
  });
  const { data: expenseTypesDropdown } = useExpenseTypeDropdown();

  const createMutation = useCreateExpenseTransaction();
  const updateMutation = useUpdateExpenseTransaction();
  const deleteMutation = useDeleteExpenseTransaction();
  const approveMutation = useApproveExpenseTransaction();

  const transactions = transactionsResponse || [];

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.expense_type_id || !formData.amount || !formData.vendor_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Generate idempotency key for new transactions
    if (!selectedTransaction) {
      formData.idempotency_key = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }


    try {
      if (selectedTransaction) {
        await updateMutation.mutateAsync({
          id: selectedTransaction.id,
          data: formData
        });
      } else {
        await createMutation.mutateAsync(formData);
      }

      // Reset form
      resetForm();
      setShowCreateDialog(false);
      setShowEditDialog(false);
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      expense_type_id: '',
      amount: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      reference_number: '',
      payment_method: 'cash',
      vendor_name: '',
      idempotency_key: ''
    });
    setTransactionItems([]);
    setAttachments([]);
    setSelectedTransaction(null);
    setIsFormDirty(false);
  };

  // Handle create
  const handleCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  // Handle edit
  const handleEdit = (transaction: ExpenseTransaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      expense_type_id: transaction.expense_type_id,
      amount: transaction.amount,
      transaction_date: transaction.transaction_date,
      description: transaction.description,
      reference_number: transaction.reference_number || '',
      payment_method: transaction.payment_method,
      vendor_name: transaction.vendor_name || '',
      idempotency_key: transaction.idempotency_key
    });
    setTransactionItems([]);
    setShowEditDialog(true);
  };

  // Handle view
  const handleView = (transaction: ExpenseTransaction) => {
    setSelectedTransaction(transaction);
    setShowViewDialog(true);
  };

  // Handle delete
  const handleDelete = (transaction: ExpenseTransaction) => {
    setDeleteTarget(transaction);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  // Handle approval
  const handleApproval = (transaction: ExpenseTransaction) => {
    setSelectedTransaction(transaction);
    setShowApprovalDialog(true);
  };

  // Submit approval
  const handleSubmitApproval = async (status: 'approved' | 'rejected') => {
    if (!selectedTransaction) return;

    if (!approvalComment.trim()) {
      toast.error('Approval comment is required');
      return;
    }

    const approvalData: ExpenseTransactionApproval = {
      action: status === 'approved' ? 'approve' : 'reject',
      approval_comment: approvalComment.trim()
    };

    try {
      await approveMutation.mutateAsync({
        id: selectedTransaction.id,
        data: approvalData
      });
      setShowApprovalDialog(false);
      setSelectedTransaction(null);
      setApprovalComment('');
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  // Add transaction item
  const addTransactionItem = () => {
    setTransactionItems([...transactionItems, {
      item_name: '',
      item_description: '',
      unit_price: 0,
      quantity: 1,
      tax_rate: 0,
      discount_rate: 0,
      final_amount: 0
    }]);
  };

  // Update transaction item
  const updateTransactionItem = (index: number, field: string, value: any) => {
    const updatedItems = [...transactionItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Calculate final amount
    const item = updatedItems[index];
    const subtotal = (item.unit_price || 0) * (item.quantity || 1);
    const taxAmount = subtotal * ((item.tax_rate || 0) / 100);
    const discountAmount = subtotal * ((item.discount_rate || 0) / 100);
    item.final_amount = subtotal + taxAmount - discountAmount;

    setTransactionItems(updatedItems);

    // Update total amount
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.final_amount || 0), 0);
    setFormData({ ...formData, amount: totalAmount });
  };

  // Remove transaction item
  const removeTransactionItem = (index: number) => {
    const updatedItems = transactionItems.filter((_, i) => i !== index);
    setTransactionItems(updatedItems);

    // Update total amount
    const totalAmount = updatedItems.reduce((sum, item) => sum + (item.final_amount || 0), 0);
    setFormData({ ...formData, amount: totalAmount });
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Get status badge

  // Get status icon
  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      approved: <CheckCircle className="h-4 w-4" />,
      paid: <CheckCircle className="h-4 w-4" />,
      cancelled: <XCircle className="h-4 w-4" />
    };
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />;
  };

  // Filter transactions by tab
  const getFilteredTransactions = () => {
    switch (activeTab) {
      case 'pending':
        return transactions.filter(t => t.status === 'pending');
      case 'approved':
        return transactions.filter(t => t.status === 'approved');
      case 'paid':
        return transactions.filter(t => t.status === 'paid');
      case 'cancelled':
        return transactions.filter(t => t.status === 'cancelled');
      default:
        return transactions;
    }
  };

  const filteredTransactions = getFilteredTransactions();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading expense transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard
      permissions={[["expense_transactions", "list"]]}
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view expense transactions.</p>
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6">
      <PageHeader
        title="Expense Transactions"
        icon={<Receipt className="h-5 w-5" />}
        subtitle="Manage expense transactions with detailed line items and approval workflows"
        actions={<PermissionGuard resource="expense_transactions" action="create" fallback={null}><Button onClick={handleCreate} className="flex items-center gap-2"><Plus className="h-4 w-4" /> New Transaction</Button></PermissionGuard>}
      />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select value={filters.status_filter} onValueChange={(value) => setFilters({ ...filters, status_filter: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.expense_type_id} onValueChange={(value) => setFilters({ ...filters, expense_type_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {expenseTypesDropdown?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From Date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            />

            <Input
              type="date"
              placeholder="To Date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            />

            <Input
              placeholder="Vendor Name"
              value={filters.vendor_name}
              onChange={(e) => setFilters({ ...filters, vendor_name: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({transactions.filter(t => t.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({transactions.filter(t => t.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="paid">Paid ({transactions.filter(t => t.status === 'paid').length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({transactions.filter(t => t.status === 'cancelled').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredTransactions.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.vendor_name}</TableCell>
                        <TableCell>{transaction.expense_type_id}</TableCell>
                        <TableCell>₹{transaction.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <StatusBadge status={transaction.status} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <PermissionGuard
                              resource="expense_transactions"
                              action="read"
                              fallback={null}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(transaction)}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </PermissionGuard>
                            <PermissionGuard
                              resource="expense_transactions"
                              action="update"
                              fallback={null}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(transaction)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PermissionGuard>
                            {transaction.status === 'pending' && (
                              <PermissionGuard
                                resource="expense_transactions"
                                action="approve"
                                fallback={null}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApproval(transaction)}
                                  className="h-8 w-8 p-0"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                            )}
                            <PermissionGuard
                              resource="expense_transactions"
                              action="delete"
                              fallback={null}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(transaction)}
                                className="h-8 w-8 p-0 text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </PermissionGuard>
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
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No transactions found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Transaction Dialog */}
      <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTransaction ? 'Edit Transaction' : 'Create New Transaction'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6" onChange={() => setIsFormDirty(true)}>
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expense Type *</label>
                <Select
                  value={formData.expense_type_id}
                  onValueChange={(value) => { setFormData({ ...formData, expense_type_id: value }); setIsFormDirty(true); }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select expense type" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypesDropdown?.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                <Input
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="Enter vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Transaction Date *</label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Method *</label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => { setFormData({ ...formData, payment_method: value as any }); setIsFormDirty(true); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter transaction description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reference Number</label>
                <Input
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="Enter reference number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Total Amount</label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  readOnly
                />
              </div>
            </div>

            {/* Transaction Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Transaction Items</h3>
                <Button type="button" onClick={addTransactionItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {transactionItems.length > 0 && (
                <div className="space-y-4">
                  {transactionItems.map((item, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Item Name</label>
                            <Input
                              value={item.item_name || ''}
                              onChange={(e) => updateTransactionItem(index, 'item_name', e.target.value)}
                              placeholder="Item name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Unit Price</label>
                            <Input
                              type="number"
                              value={item.unit_price || 0}
                              onChange={(e) => updateTransactionItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Quantity</label>
                            <Input
                              type="number"
                              value={item.quantity || 1}
                              onChange={(e) => updateTransactionItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              placeholder="1"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                            <Input
                              type="number"
                              value={item.tax_rate || 0}
                              onChange={(e) => updateTransactionItem(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>

                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="block text-sm font-medium mb-1">Final Amount</label>
                              <Input
                                value={`₹${(item.final_amount || 0).toLocaleString()}`}
                                readOnly
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeTransactionItem(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Attachments</h3>
                <div>
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </Button>
                </div>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Transaction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Transaction ID</label>
                  <p className="text-sm">{selectedTransaction.id}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <StatusBadge status={selectedTransaction.status} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <p className="text-sm">{new Date(selectedTransaction.transaction_date).toLocaleDateString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Vendor</label>
                  <p className="text-sm">{selectedTransaction.vendor_name}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <p className="text-sm">{selectedTransaction.expense_type_id}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method</label>
                  <p className="text-sm">{selectedTransaction.payment_method}</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <p className="text-2xl font-bold">₹{selectedTransaction.amount.toLocaleString()}</p>
                </div>

                {selectedTransaction.description && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <p className="text-sm">{selectedTransaction.description}</p>
                  </div>
                )}
              </div>


            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={(open) => {
        if (!open) {
          setShowApprovalDialog(false);
          setApprovalComment('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Transaction</DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Transaction: {selectedTransaction.vendor_name} - ₹{selectedTransaction.amount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Approval Comment *</label>
                <Input
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Enter approval comment"
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSubmitApproval('approved')}
                  disabled={approveMutation.isPending || !approvalComment.trim()}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleSubmitApproval('rejected')}
                  disabled={approveMutation.isPending || !approvalComment.trim()}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
      </div>
    </PermissionGuard>
  );
}

export default ExpenseTransactionsPage;