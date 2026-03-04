
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Search, Filter, Eye, Edit, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useExpenseTransactions, useExpenseTypeDropdown, useExpenseCategoryDropdown } from '@/hooks/expense';
import { ExpenseTransactionForm } from './ExpenseTransactionForm';
import { ExpenseTransactionView } from './ExpenseTransactionView';
import { formatCurrency } from '@/lib/expenseValidation';
import type { ExpenseTransaction } from '@/types/expense';

export function ExpenseTransactions() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreateDirty, setIsCreateDirty] = useState(false);
  const [viewTransaction, setViewTransaction] = useState<ExpenseTransaction | null>(null);
  const [editTransaction, setEditTransaction] = useState<ExpenseTransaction | null>(null);
  const [isEditDirty, setIsEditDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  const { data: transactionsResponse, isLoading } = useExpenseTransactions({
    skip: currentPage * pageSize,
    limit: pageSize,
    status_filter: statusFilter || undefined,
    expense_type_id: typeFilter || undefined,
  });

  const { data: expenseTypes = [] } = useExpenseTypeDropdown();
  const { data: categories = [] } = useExpenseCategoryDropdown();

  const transactions = transactionsResponse || [];
  const totalCount = transactions.length;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      case 'draft': return 'outline';
      default: return 'secondary';
    }
  };

  const getTypeName = (typeId: string) => {
    const type = expenseTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown';
  };

  const getCategoryName = (typeId: string) => {
    const type = expenseTypes.find(t => t.id === typeId);
    const category = categories.find(c => c.id === type?.category_id);
    return category ? category.name : 'Unknown';
  };

  const filteredTransactions = useMemo(() => transactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [transactions, searchQuery]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0 inline" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 shrink-0 inline" />;
    return <ChevronDown className="h-3 w-3 ml-1 shrink-0 inline" />;
  };

  const sortedTransactions = useMemo(() => {
    const data = [...filteredTransactions];
    if (!sortKey || !sortDir) return data;
    return data.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortKey) {
        case 'date': aVal = a.transaction_date; bVal = b.transaction_date; break;
        case 'description': aVal = a.description; bVal = b.description; break;
        case 'category': aVal = getCategoryName(a.expense_type_id); bVal = getCategoryName(b.expense_type_id); break;
        case 'type': aVal = getTypeName(a.expense_type_id); bVal = getTypeName(b.expense_type_id); break;
        case 'amount': aVal = String(a.amount); bVal = String(b.amount); break;
        case 'status': aVal = a.status; bVal = b.status; break;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTransactions, sortKey, sortDir, expenseTypes, categories]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">Expense Transactions</CardTitle>
          <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter bar */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 h-8 text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 h-8 text-sm">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {expenseTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-xs text-muted-foreground">S.No.</TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('date')}>
                <div className="flex items-center">Date<SortIcon col="date" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('description')}>
                <div className="flex items-center">Description<SortIcon col="description" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('category')}>
                <div className="flex items-center">Category<SortIcon col="category" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('type')}>
                <div className="flex items-center">Type<SortIcon col="type" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('amount')}>
                <div className="flex items-center">Amount<SortIcon col="amount" /></div>
              </TableHead>
              <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('status')}>
                <div className="flex items-center">Status<SortIcon col="status" /></div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : sortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              sortedTransactions.map((transaction, index) => (
                <TableRow key={transaction.id} style={{ height: '48px' }}>
                  <TableCell className="text-muted-foreground text-sm">{currentPage * pageSize + index + 1}</TableCell>
                  <TableCell>
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      {transaction.reference_number && (
                        <div className="text-sm text-muted-foreground">
                          Ref: {transaction.reference_number}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryName(transaction.expense_type_id)}</TableCell>
                  <TableCell>{getTypeName(transaction.expense_type_id)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewTransaction(transaction)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTransaction(transaction)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* handle delete */}}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} transactions
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={(currentPage + 1) * pageSize >= totalCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Create Transaction Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isCreateDirty} onDirtyDiscard={() => setIsCreateDirty(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onChange={() => setIsCreateDirty(true)}>
          <DialogHeader>
            <DialogTitle>Create Expense Transaction</DialogTitle>
          </DialogHeader>
          <ExpenseTransactionForm
            onSubmit={() => { setIsCreateDirty(false); setShowCreateDialog(false); }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Transaction Dialog */}
      <Dialog open={!!viewTransaction} onOpenChange={() => setViewTransaction(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {viewTransaction && (
            <ExpenseTransactionView
              transaction={viewTransaction}
              onClose={() => setViewTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editTransaction} onOpenChange={(open) => { if (!open) setEditTransaction(null); }} guardDirty={isEditDirty} onDirtyDiscard={() => setIsEditDirty(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onChange={() => setIsEditDirty(true)}>
          <DialogHeader>
            <DialogTitle>Edit Expense Transaction</DialogTitle>
          </DialogHeader>
          {editTransaction && (
            <ExpenseTransactionForm
              transaction={editTransaction}
              onSubmit={() => { setIsEditDirty(false); setEditTransaction(null); }}
              onCancel={() => setEditTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
