import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { useStudentsDropdown, useAdmissionByStudentId } from '@/api/hooks/students/admissions';
import {
  searchTransactions,
  getTransactionById,
  updateTransactionStatus,
  getOutstandingFees,
  createTransaction,
  getTransactionHistory
} from '@/api/fee/transactions';
import { useGenerateReceipt } from '@/api/hooks/fee/receipts';
import { getDropdownOptions } from '@/api/fee/types';
import { getTermsDropdown, getTerm } from '@/api/fee/terms';
import { getClassesDropdown, getSectionsByClassId } from '@/api/masters/classesandsections';
import type {
  FeeTransaction,
  FeeTransactionSearchParams,
  FeeTransactionDetail,
  FeeOutstandingFees,
  FeeTransactionCreateRequest,
  PaymentMethod,
  TransactionStatus
} from '@/types/fee/transaction';
import { Plus, Search, Eye, Edit, DollarSign, Receipt, Loader2, Filter, ChevronUp, ChevronDown, ChevronsUpDown, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/common';
import { usePermission } from '@/hooks/usePermission';

export default function FeeTransactions() {
  return (
    <PermissionGuard
      resource="fee_transactions"
      action="list"
      fallback={
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <ShieldX className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
                    <p className="text-muted-foreground mt-2">
                      You don't have permission to view fee transactions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <FeeTransactionsContent />
    </PermissionGuard>
  );
}

function FeeTransactionsContent() {
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore();
  const { checkPermission } = usePermission();
  const canCreate = checkPermission('fee_transactions', 'create');
  const canUpdate = checkPermission('fee_transactions', 'update');
  const generateReceiptMutation = useGenerateReceipt();
  const [searchParams, setSearchParams] = useState<FeeTransactionSearchParams>({
    limit: 50,
    offset: 0
  });
  const [selectedTransaction, setSelectedTransaction] = useState<FeeTransactionDetail | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [termDetailsCache, setTermDetailsCache] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  // Create transaction form state
  const [createForm, setCreateForm] = useState({
    student_id: '',
    student_admission_num: '',
    payment_method: 'cash' as PaymentMethod,
    remarks: '',
    // Payment method specific fields
    upi_reference: '',
    cheque_number: '',
    bank_reference: '',
    // Transaction items
    transaction_items: [] as Array<{
      fee_type_id: string;
      fee_term_id: string;
      term_date_id: string;
      amount_due: number;
      amount_paid: number;
      description: string;
    }>
  });

  // Initialize academic years
  useEffect(() => {
    if (academicYears.length === 0) {
      fetchAndSetAcademicYears();
    }
  }, [academicYears.length, fetchAndSetAcademicYears]);

  // Update search params when academic year changes
  useEffect(() => {
    if (selectedAcademicYearId) {
      setSearchParams(prev => ({
        ...prev,
        academic_year_id: selectedAcademicYearId
      }));
    }
  }, [selectedAcademicYearId]);

  // Fetch transactions
  const { data: transactionsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['fee-transactions', searchParams],
    queryFn: () => searchTransactions(searchParams),
    enabled: true, // Always enabled for now to debug
  });

  const transactions: FeeTransaction[] = Array.isArray(transactionsResponse) ? transactionsResponse : transactionsResponse?.data || [];

  // Fetch outstanding fees for selected student
  const { data: outstandingFees } = useQuery({
    queryKey: ['outstanding-fees', searchParams.student_id, selectedAcademicYearId],
    queryFn: () => getOutstandingFees(searchParams.student_id!, selectedAcademicYearId),
    enabled: !!searchParams.student_id && !!selectedAcademicYearId,
  });

  // Fetch transaction history for selected student
  const { data: transactionHistory } = useQuery({
    queryKey: ['transaction-history', searchParams.student_id, selectedAcademicYearId],
    queryFn: () => getTransactionHistory(searchParams.student_id!, selectedAcademicYearId),
    enabled: !!searchParams.student_id && !!selectedAcademicYearId,
  });

  // Fetch admission data for selected transaction's student
  const { data: selectedTransactionAdmission } = useAdmissionByStudentId(selectedTransaction?.student_id || '');

  // Fetch students dropdown data
  const { data: students = [], isLoading: studentsLoading } = useStudentsDropdown();

  // Debug: Log student data to see the actual structure
  useEffect(() => {
    if (students.length > 0) {
      console.log('[DEBUG] First student:', JSON.stringify(students[0], null, 2));
      console.log('[DEBUG] Total students loaded:', students.length);
    }
  }, [students]);

  // Helper function to get student display name
  const getStudentDisplayName = (student: any) => {
    // Helper to check if a value is empty (null, undefined, or empty string)
    const isEmpty = (val: any) => !val || val.trim() === '';

    // Check all possible name properties, filtering out empty strings
    const displayName = (!isEmpty(student.display_name) && student.display_name) ||
                       (!isEmpty(student.name) && student.name) ||
                       (!isEmpty(student.student_name) && student.student_name) ||
                       (!isEmpty(student.full_name) && student.full_name) ||
                       // Try first_name + last_name combination
                       (!isEmpty(student.first_name) && !isEmpty(student.last_name) && `${student.first_name} ${student.last_name}`.trim()) ||
                       (!isEmpty(student.first_name) && student.first_name) ||
                       (!isEmpty(student.last_name) && student.last_name) ||
                       // Fallback to ID with proper formatting
                       `Student ${student.id}`;

    return displayName;
  };

  // Fetch fee types and terms for transaction items
  const { data: feeTypes = [] } = useQuery({
    queryKey: ['fee-types-dropdown'],
    queryFn: () => getDropdownOptions(),
    enabled: showCreateDialog,
  });

  // Fetch all fee terms (they will be filtered by fee type in the component)
  const { data: allFeeTerms = [] } = useQuery({
    queryKey: ['fee-terms-dropdown', selectedAcademicYearId],
    queryFn: () => getTermsDropdown(),
    enabled: showCreateDialog && !!selectedAcademicYearId,
  });

  // Fetch classes and sections for student info display
  const { data: classes = [] } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => getClassesDropdown(true),
  });

  // Fetch sections for the selected transaction's class
  const { data: sections = [] } = useQuery({
    queryKey: ['sections-by-class', selectedTransactionAdmission?.current_class_id],
    queryFn: () => selectedTransactionAdmission?.current_class_id ?
      getSectionsByClassId(selectedTransactionAdmission.current_class_id) : Promise.resolve([]),
    enabled: !!selectedTransactionAdmission?.current_class_id,
  });

  // Calculate total amount from transaction items
  const calculatedTotal = createForm.transaction_items.reduce(
    (sum, item) => sum + (item.amount_paid || 0),
    0
  );

  const handleStudentChange = (value: string | number, option?: any) => {
    const studentId = value?.toString() || '';
    setSelectedStudent(studentId);
    setSearchParams(prev => ({
      ...prev,
      student_id: studentId || undefined,
      offset: 0
    }));
  };

  const handleSearch = (field: keyof FeeTransactionSearchParams, value: string) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value || undefined,
      offset: 0
    }));
  };

  const handleDateRangeChange = () => {
    setSearchParams(prev => ({
      ...prev,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      offset: 0
    }));
  };

  const handleClearFilters = () => {
    setSearchParams({
      limit: 50,
      offset: 0,
      ...(selectedAcademicYearId && { academic_year_id: selectedAcademicYearId })
    });
    setDateFrom('');
    setDateTo('');
    setSelectedStudent('');
  };

  const handleStatusUpdate = async (transactionId: string, status: TransactionStatus) => {
    try {
      await updateTransactionStatus(transactionId, { status });
      toast.success('Transaction status updated successfully');
      refetch();
      setShowViewDialog(false);
    } catch (error) {
      console.error('Failed to update transaction status:', error);
      toast.error('Failed to update transaction status');
    }
  };

  const handleViewTransaction = async (transaction: FeeTransaction) => {
    try {
      const detail = await getTransactionById(transaction.id);
      setSelectedTransaction(detail);
      setShowViewDialog(true);
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
    }
  };

  // Create transaction handlers
  const handleCreateFormChange = (field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStudentSelectForCreate = (value: string | number, option?: any) => {
    const studentId = value?.toString() || '';
    setCreateForm(prev => ({
      ...prev,
      student_id: studentId,
      student_admission_num: option?.admission_number || ''
    }));
  };

  const handleCreateTransaction = async () => {
    try {
      // Validate that transaction items are provided
      if (createForm.transaction_items.length === 0) {
        toast.error('Please add at least one transaction item');
        return;
      }

      // Validate that total amount is greater than 0
      if (calculatedTotal <= 0) {
        toast.error('Total amount must be greater than 0');
        return;
      }

      // Validate that all transaction items have required fields
      const invalidItems = createForm.transaction_items.filter(
        item => !item.fee_type_id || !item.fee_term_id || !item.term_date_id || item.amount_paid <= 0
      );
      if (invalidItems.length > 0) {
        toast.error('All transaction items must have fee type, fee term, payment date, and amount paid greater than 0');
        return;
      }

      const transactionData: FeeTransactionCreateRequest = {
        student_id: createForm.student_id,
        student_admission_num: createForm.student_admission_num,
        academic_year_id: selectedAcademicYearId,
        total_amount: calculatedTotal,
        payment_method: createForm.payment_method,
        remarks: createForm.remarks,
        transaction_items: createForm.transaction_items,
        // Add payment method specific fields
        ...(createForm.payment_method === 'upi' && {
          upi_reference: createForm.upi_reference
        }),
        ...(createForm.payment_method === 'cheque' && {
          cheque_number: createForm.cheque_number
        }),
        ...(createForm.payment_method === 'bank_transfer' && {
          bank_reference: createForm.bank_reference
        })
      };

      console.log('[DEBUG] Creating transaction with data:', transactionData);

      await createTransaction(transactionData);
      toast.success('Transaction created successfully');
      setShowCreateDialog(false);
      resetCreateForm();
      refetch();
    } catch (error: any) {
      console.error('[ERROR] Failed to create transaction:', error);
      console.error('[ERROR] Response data:', error.response?.data);

      // Extract detailed error message
      let errorMessage = 'Failed to create transaction';
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        } else {
          errorMessage = JSON.stringify(error.response.data.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { duration: 5000 });
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      student_id: '',
      student_admission_num: '',
      payment_method: 'cash',
      remarks: '',
      upi_reference: '',
      cheque_number: '',
      bank_reference: '',
      transaction_items: []
    });
  };

  const handleViewTransactionHistory = () => {
    if (searchParams.student_id) {
      setShowHistoryDialog(true);
    }
  };

  const handleGenerateReceipt = (transactionId: string) => {
    generateReceiptMutation.mutate(transactionId, {
      onSuccess: () => {
        setShowViewDialog(false);
      },
    });
  };


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
    const data = [...transactions];
    if (!sortKey || !sortDir) return data;
    return data.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortKey) {
        case 'transaction_number': aVal = a.transaction_number || ''; bVal = b.transaction_number || ''; break;
        case 'student': {
          const sA = students.find(s => s.id === a.student_id);
          const sB = students.find(s => s.id === b.student_id);
          aVal = sA ? getStudentDisplayName(sA) : a.student_admission_num || '';
          bVal = sB ? getStudentDisplayName(sB) : b.student_admission_num || '';
          break;
        }
        case 'amount': aVal = String(a.total_amount); bVal = String(b.total_amount); break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'date': aVal = a.transaction_date; bVal = b.transaction_date; break;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [transactions, sortKey, sortDir, students]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading transactions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Failed to load transactions. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Transaction Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={true} onDirtyDiscard={() => { resetCreateForm(); setShowCreateDialog(false); }}>
            <DialogContent className="max-w-2xl" customLayout>
              <DialogHeader>
                <DialogTitle>Create New Transaction</DialogTitle>
                <DialogDescription>
                  Record a new fee payment transaction
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                {/* Student Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student">Student *</Label>
                    <Select
                      value={createForm.student_id}
                      onValueChange={(value) => {
                        const selectedStudent = students.find(s => s.id === value);
                        handleStudentSelectForCreate(value, selectedStudent ? { admission_number: selectedStudent.admission_number } : undefined);
                      }}
                      disabled={studentsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student..." />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {getStudentDisplayName(student)} {student.admission_number ? `(${student.admission_number})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admission">Admission Number</Label>
                    <Input
                      id="admission"
                      value={createForm.student_admission_num}
                      onChange={(e) => handleCreateFormChange('student_admission_num', e.target.value)}
                      placeholder="Auto-filled from student selection"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={createForm.payment_method}
                    onValueChange={(value) => handleCreateFormChange('payment_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method Specific Fields */}
                {createForm.payment_method === 'upi' && (
                  <div className="space-y-2">
                    <Label htmlFor="upi_reference">UPI Reference *</Label>
                    <Input
                      id="upi_reference"
                      value={createForm.upi_reference}
                      onChange={(e) => handleCreateFormChange('upi_reference', e.target.value)}
                      placeholder="Enter UPI transaction ID"
                    />
                  </div>
                )}

                {createForm.payment_method === 'cheque' && (
                  <div className="space-y-2">
                    <Label htmlFor="cheque_number">Cheque Number *</Label>
                    <Input
                      id="cheque_number"
                      value={createForm.cheque_number}
                      onChange={(e) => handleCreateFormChange('cheque_number', e.target.value)}
                      placeholder="Enter cheque number"
                    />
                  </div>
                )}

                {createForm.payment_method === 'bank_transfer' && (
                  <div className="space-y-2">
                    <Label htmlFor="bank_reference">Bank Reference *</Label>
                    <Input
                      id="bank_reference"
                      value={createForm.bank_reference}
                      onChange={(e) => handleCreateFormChange('bank_reference', e.target.value)}
                      placeholder="Enter NEFT/RTGS reference"
                    />
                  </div>
                )}

                {/* Total Amount (Calculated) */}
                <div className="space-y-2">
                  <Label htmlFor="calculated_total">Total Amount</Label>
                  <Input
                    id="calculated_total"
                    type="number"
                    value={calculatedTotal.toFixed(2)}
                    readOnly
                    className="bg-muted"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total is automatically calculated from transaction items
                  </p>
                </div>

                {/* Transaction Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Transaction Items</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newItem = {
                          fee_type_id: '',
                          fee_term_id: '',
                          term_date_id: '',
                          amount_due: 0,
                          amount_paid: 0,
                          description: ''
                        };
                        setCreateForm(prev => ({
                          ...prev,
                          transaction_items: [...prev.transaction_items, newItem]
                        }));
                      }}
                    >
                      Add Item
                    </Button>
                  </div>

                  {createForm.transaction_items.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                      No transaction items added. Click "Add Item" to get started.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {createForm.transaction_items.map((item, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`fee_type_${index}`}>Fee Type *</Label>
                              <Select
                                value={item.fee_type_id}
                                onValueChange={(value) => {
                                  const updatedItems = [...createForm.transaction_items];
                                  updatedItems[index].fee_type_id = value;
                                  setCreateForm(prev => ({ ...prev, transaction_items: updatedItems }));
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fee type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {feeTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.type_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`fee_term_${index}`}>Fee Term *</Label>
                              <Select
                                value={item.fee_term_id}
                                onValueChange={async (value) => {
                                  const updatedItems = [...createForm.transaction_items];
                                  updatedItems[index].fee_term_id = value;
                                  updatedItems[index].term_date_id = ''; // Reset term date when term changes
                                  setCreateForm(prev => ({ ...prev, transaction_items: updatedItems }));

                                  // Fetch term details to get term dates
                                  if (value && !termDetailsCache[value]) {
                                    try {
                                      const termDetails = await getTerm(value);
                                      setTermDetailsCache(prev => ({ ...prev, [value]: termDetails }));
                                    } catch (error) {
                                      console.error('Failed to fetch term details:', error);
                                    }
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select fee term" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allFeeTerms
                                    .filter(term => !item.fee_type_id || !term.fee_type_id || term.fee_type_id === item.fee_type_id)
                                    .map((term) => (
                                      <SelectItem key={term.id} value={term.id}>
                                        {term.term_name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`term_date_${index}`}>Payment Date *</Label>
                              <Select
                                value={item.term_date_id}
                                onValueChange={(value) => {
                                  const updatedItems = [...createForm.transaction_items];
                                  updatedItems[index].term_date_id = value;
                                  setCreateForm(prev => ({ ...prev, transaction_items: updatedItems }));
                                }}
                                disabled={!item.fee_term_id}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment date" />
                                </SelectTrigger>
                                <SelectContent>
                                  {item.fee_term_id && termDetailsCache[item.fee_term_id]?.fee_term_dates?.map((termDate: any) => (
                                    <SelectItem key={termDate.id} value={termDate.id}>
                                      {new Date(termDate.fee_term_date).toLocaleDateString()}
                                    </SelectItem>
                                  ))}
                                  {(!item.fee_term_id || !termDetailsCache[item.fee_term_id]?.fee_term_dates?.length) && (
                                    <SelectItem value="" disabled>No dates available</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`amount_due_${index}`}>Amount Due *</Label>
                              <Input
                                id={`amount_due_${index}`}
                                type="number"
                                value={item.amount_due}
                                onChange={(e) => {
                                  const updatedItems = [...createForm.transaction_items];
                                  updatedItems[index].amount_due = parseFloat(e.target.value) || 0;
                                  setCreateForm(prev => ({ ...prev, transaction_items: updatedItems }));
                                }}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`amount_paid_${index}`}>Amount Paid *</Label>
                              <Input
                                id={`amount_paid_${index}`}
                                type="number"
                                value={item.amount_paid}
                                onChange={(e) => {
                                  const updatedItems = [...createForm.transaction_items];
                                  updatedItems[index].amount_paid = parseFloat(e.target.value) || 0;
                                  setCreateForm(prev => ({ ...prev, transaction_items: updatedItems }));
                                }}
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                              <Label htmlFor={`description_${index}`}>Description</Label>
                              <Input
                                id={`description_${index}`}
                                value={item.description}
                                onChange={(e) => {
                                  const updatedItems = [...createForm.transaction_items];
                                  updatedItems[index].description = e.target.value;
                                  setCreateForm(prev => ({ ...prev, transaction_items: updatedItems }));
                                }}
                                placeholder="Optional description..."
                              />
                            </div>

                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  const updatedItems = createForm.transaction_items.filter((_, i) => i !== index);
                                  setCreateForm(prev => ({ ...prev, transaction_items: updatedItems }));
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={createForm.remarks}
                    onChange={(e) => handleCreateFormChange('remarks', e.target.value)}
                    placeholder="Optional remarks..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleCreateTransaction}
                  disabled={!createForm.student_id || calculatedTotal <= 0}
                >
                  Create Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-3">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Student</label>
              <Select
                value={selectedStudent}
                onValueChange={(value) => {
                  const selectedStudentData = students.find(s => s.id === value);
                  handleStudentChange(value, selectedStudentData ? { admission_number: selectedStudentData.admission_number } : undefined);
                }}
                disabled={studentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {getStudentDisplayName(student)} {student.admission_number ? `(${student.admission_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select
                value={searchParams.payment_method || ''}
                onValueChange={(value) => handleSearch('payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={searchParams.status || ''}
                onValueChange={(value) => handleSearch('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              Clear All Filters
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleDateRangeChange} variant="outline" size="sm">
                <Search className="h-4 w-4 mr-2" />
                Apply Date Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Fees Section */}
      {outstandingFees && outstandingFees.total_outstanding > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              Outstanding Fees
            </CardTitle>
            <CardDescription>
              Outstanding fees for the selected student
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div>
                <p className="text-sm font-medium text-orange-800">Total Outstanding</p>
                <p className="text-2xl font-bold text-orange-900">
                  ₹{outstandingFees.total_outstanding.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-orange-700">
                  {outstandingFees.outstanding_items.length} fee items
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewTransactionHistory}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Fee Transactions</CardTitle>
            {canCreate && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs text-muted-foreground">S.No.</TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('transaction_number')}>
                    <div className="flex items-center">Transaction #<SortIcon col="transaction_number" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('student')}>
                    <div className="flex items-center">Student<SortIcon col="student" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('amount')}>
                    <div className="flex items-center">Total Amount<SortIcon col="amount" /></div>
                  </TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Status<SortIcon col="status" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('date')}>
                    <div className="flex items-center">Date<SortIcon col="date" /></div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTransactions.map((transaction, index) => (
                    <TableRow key={transaction.id} style={{ height: '48px' }}>
                      <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {transaction.transaction_number}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {(() => {
                            const student = students.find(s => s.id === transaction.student_id);
                            return student ? getStudentDisplayName(student) : (transaction.student_admission_num || 'N/A');
                          })()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.student_admission_num}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{parseFloat(transaction.total_amount.toString()).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.payment_method.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTransaction(transaction)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Transaction Details
              {selectedTransaction?.status && (
                <StatusBadge status={selectedTransaction.status} />
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction?.transaction_number} • {selectedTransaction ? new Date(selectedTransaction.transaction_date).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Transaction Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold">₹{selectedTransaction.total_amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                        <p className="text-lg font-semibold">{selectedTransaction.payment_method.toUpperCase()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-lg font-semibold">{selectedTransaction.status.charAt(0).toUpperCase() + selectedTransaction.status.slice(1)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Student & Transaction Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Student Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="font-semibold">
                          {(() => {
                            // First try the embedded student data
                            if (selectedTransaction.student?.name) {
                              return selectedTransaction.student.name;
                            }
                            // Then try to find in students dropdown
                            const student = students.find(s => s.id === selectedTransaction.student_id);
                            if (student?.display_name) {
                              return student.display_name;
                            }
                            // Fallback to admission number or N/A
                            return selectedTransaction.student_admission_num || 'N/A';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Class - Section</p>
                        <p className="font-semibold">
 {(() => {
                            if (selectedTransactionAdmission) {
                              const classData = classes.find(c => c.id === selectedTransactionAdmission.current_class_id);
                              const sectionData = sections.find(s => s.id === selectedTransactionAdmission.current_section_id);
                              return classData ? `${classData.name}${sectionData ? ` - ${sectionData.name}` : ''}` : 'N/A';
                            }
                            return 'Loading...';
                          })()}                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Transaction Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Transaction Number</p>
                        <p className="font-semibold">{selectedTransaction.transaction_number}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Transaction Date</p>
                        <p className="font-semibold">{new Date(selectedTransaction.transaction_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Collected By</p>
                        <p className="font-semibold">{selectedTransaction.collected_by || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Approved By</p>
                        <p className="font-semibold">{selectedTransaction.approved_by || 'Pending'}</p>
                      </div>
                    </div>
                    {selectedTransaction.remarks && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Remarks</p>
                        <p className="text-sm">{selectedTransaction.remarks}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Payment Details */}
              {selectedTransaction.payment_details && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedTransaction.payment_details.upi_reference && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">UPI Reference</p>
                          <p className="font-mono text-sm">{selectedTransaction.payment_details.upi_reference}</p>
                        </div>
                      )}
                      {selectedTransaction.payment_details.cheque_number && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Cheque Number</p>
                          <p className="font-mono text-sm">{selectedTransaction.payment_details.cheque_number}</p>
                        </div>
                      )}
                      {selectedTransaction.payment_details.bank_reference && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground">Bank Reference</p>
                          <p className="font-mono text-sm">{selectedTransaction.payment_details.bank_reference}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-2">
                {/* Receipt Generation */}
                {canUpdate && selectedTransaction.status === 'completed' && !selectedTransaction.receipt_generated && (
                  <Button
                    variant="default"
                    onClick={() => handleGenerateReceipt(selectedTransaction.id)}
                    disabled={generateReceiptMutation.isPending}
                  >
                    <Receipt className="h-4 w-4 mr-2" />
                    Generate Receipt
                  </Button>
                )}

                {/* Status Update Actions */}
                {canUpdate && selectedTransaction.status === 'pending' && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => handleStatusUpdate(selectedTransaction.id, 'completed')}
                    >
                      Mark Completed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedTransaction.id, 'cancelled')}
                    >
                      Cancel Transaction
                    </Button>
                  </>
                )}

                {/* General Status Updates */}
                {canUpdate && selectedTransaction.status !== 'completed' && selectedTransaction.status !== 'cancelled' && selectedTransaction.status !== 'bounced' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedTransaction.id, 'completed')}
                    >
                      Mark Completed
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedTransaction.id, 'cancelled')}
                    >
                      Cancel Transaction
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              Complete payment history for the selected student
            </DialogDescription>
          </DialogHeader>

          {transactionHistory && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                        <p className="text-2xl font-bold">{transactionHistory.transactions.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{transactionHistory.transactions.reduce((sum, t) => sum + t.total_amount, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold">
                          {transactionHistory.transactions.filter(t => t.status === 'completed').length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transaction Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Timeline</CardTitle>
                  <CardDescription>
                    Chronological view of all transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactionHistory.transactions
                      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
                      .map((transaction, index) => (
                        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.status === 'completed' ? 'bg-green-100 text-green-600' :
                              transaction.status === 'bounced' ? 'bg-red-100 text-red-600' :
                              'bg-orange-100 text-orange-600'
                            }`}>
                              <Receipt className="h-5 w-5" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{transaction.transaction_number}</h4>
                              <StatusBadge status={transaction.status} />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                              <div>
                                <span className="text-muted-foreground">Date:</span>
                                <span className="ml-2 font-medium">
                                  {new Date(transaction.transaction_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="ml-2 font-medium text-green-600">
                                  ₹{transaction.total_amount.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Method:</span>
                                <span className="ml-2 font-medium">
                                  {transaction.payment_method.toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Receipt:</span>
                                <span className="ml-2 font-medium">
                                  {transaction.receipt_generated ? 'Generated' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                    {transactionHistory.transactions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No transaction history found for this student.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
