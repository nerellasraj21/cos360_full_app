import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { useAuthStore } from '@/lib/authStore';
import { useStudentsDropdown } from '@/api/hooks/students/admissions';
import { fetchStudentsDropdown } from '@/api/students/admissions';
import SelectDropdown, { type SingleValue } from 'react-select';
import type { StudentDropdownItem } from '@/types/admission';
import {
  fetchFeeRefunds,
  fetchFeeRefundById,
  createFeeRefund,
  approveOrRejectRefund,
  processRefund,
  cancelFeeRefund,
  fetchRefundStatistics
} from '@/api/fee/refunds';
import { searchTransactions, getTransactionById } from '@/api/fee/transactions';
import type {
  FeeRefundWithDetails,
  FeeRefundCreateRequest
} from '@/types/fee/refund';
import type { FeeTransaction } from '@/types/fee/transaction';
import { Plus, Search, Eye, CheckCircle, XCircle, RefreshCw, DollarSign, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/common';
import { ShieldX } from 'lucide-react';

export default function FeeRefunds() {
  return (
    <PermissionGuard
      resource="fee_refunds"
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
                      You don't have permission to view fee refunds.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <FeeRefundsContent />
    </PermissionGuard>
  );
}

function FeeRefundsContent() {
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useState<{
    limit: number;
    offset: number;
    status: string;
    student_id: string | undefined;
    refund_reason: string;
    requested_date_from: string;
    requested_date_to: string;
    approved_date_from: string;
    approved_date_to: string;
    processed_date_from: string;
    processed_date_to: string;
  }>({
    limit: 50,
    offset: 0,
    status: '',
    student_id: undefined,
    refund_reason: '',
    requested_date_from: '',
    requested_date_to: '',
    approved_date_from: '',
    approved_date_to: '',
    processed_date_from: '',
    processed_date_to: ''
  });
  const [selectedRefund, setSelectedRefund] = useState<FeeRefundWithDetails | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');

  // Students dropdown data
  const [students, setStudents] = useState<StudentDropdownItem[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedStudentOption, setSelectedStudentOption] = useState<{ value: string; label: string } | null>(null);

  // Transactions dropdown data
  const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [selectedTransactionOption, setSelectedTransactionOption] = useState<{ value: string; label: string } | null>(null);

  // Create refund form state
  const [createForm, setCreateForm] = useState({
    fee_transaction_id: '',
    refund_amount: 0,
    refund_reason: '',
    detailed_reason: '',
    student_id: '',
    student_admission_num: '',
    academic_year_id: '',
    requested_by_user_id: user?.id || ''
  });

  // Approve/Reject form state
  const [approveForm, setApproveForm] = useState({
    action: 'approve' as 'approve' | 'reject',
    rejection_reason: ''
  });

  // Process form state
  const [processForm, setProcessForm] = useState({
    reference_number: ''
  });

  const queryClient = useQueryClient();

  // Initialize academic years
  useEffect(() => {
    if (academicYears.length === 0) {
      fetchAndSetAcademicYears();
    }
  }, [academicYears.length, fetchAndSetAcademicYears]);

  // Ensure academic years are loaded when component mounts
  useEffect(() => {
    fetchAndSetAcademicYears();
  }, []);

  // Update search params and form when academic year changes
  useEffect(() => {
    if (selectedAcademicYearId) {
      setSearchParams(prev => ({
        ...prev,
        academic_year_id: selectedAcademicYearId
      }));
      setCreateForm(prev => ({
        ...prev,
        academic_year_id: selectedAcademicYearId
      }));
    }
  }, [selectedAcademicYearId]);

  // Update form when user changes (login/logout)
  useEffect(() => {
    setCreateForm(prev => ({
      ...prev,
      requested_by_user_id: user?.id || ''
    }));
  }, [user?.id]);

  // Fetch transactions when student or academic year changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!createForm.student_id) {
        setTransactions([]);
        return;
      }

      try {
        setTransactionsLoading(true);
        const searchParams: any = {
          student_id: createForm.student_id,
          status: 'completed', // Only show completed transactions for refunds
          limit: 100
        };

        if (createForm.academic_year_id) {
          searchParams.academic_year_id = createForm.academic_year_id;
        }

        const response = await searchTransactions(searchParams);
        setTransactions(Array.isArray(response) ? response : response?.items || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load transactions');
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchTransactions();
  }, [createForm.student_id, createForm.academic_year_id]);

  // Fetch refunds
  const { data: refundsResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['fee-refunds', searchParams],
    queryFn: () => fetchFeeRefunds(searchParams.offset, searchParams.limit, {
      academic_year_id: selectedAcademicYearId || undefined,
      status: searchParams.status || undefined,
      student_id: searchParams.student_id || undefined,
      date_range: {
        start_date: searchParams.requested_date_from || undefined,
        end_date: searchParams.requested_date_to || undefined
      }
    }),
    enabled: true, // Always enabled
  });

  const refunds: FeeRefundWithDetails[] = Array.isArray(refundsResponse)
    ? refundsResponse
    : refundsResponse?.items || [];

  // Fetch refund statistics
  const { data: refundStats } = useQuery({
    queryKey: ['refund-statistics', selectedAcademicYearId],
    queryFn: () => fetchRefundStatistics(selectedAcademicYearId),
    enabled: !!selectedAcademicYearId,
  });

  // Fetch students dropdown data
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setStudentsLoading(true);
        const studentsData = await fetchStudentsDropdown();
        setStudents(studentsData);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Failed to load students');
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // Mutations
  const createRefundMutation = useMutation({
    mutationFn: createFeeRefund,
    onSuccess: () => {
      toast.success('Refund created successfully');
      setShowCreateDialog(false);
      resetCreateForm();
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create refund: ${error.message}`);
    }
  });

  const approveRefundMutation = useMutation({
    mutationFn: ({ refundId, action, approvalRemarks, approvedByUserId }: { refundId: string; action: 'approve' | 'reject'; approvalRemarks?: string; approvedByUserId: string }) =>
      approveOrRejectRefund({ refund_id: refundId, action, approval_remarks: approvalRemarks, approved_by_user_id: approvedByUserId }),
    onSuccess: () => {
      toast.success('Refund processed successfully');
      setShowApproveDialog(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to process refund: ${error.message}`);
    }
  });

  const processRefundMutation = useMutation({
    mutationFn: ({ refundId, processedByUserId, refundMethod, refundReference, processingRemarks }: { refundId: string; processedByUserId: string; refundMethod?: 'cash' | 'bank_transfer' | 'cheque'; refundReference?: string; processingRemarks?: string }) =>
      processRefund({ refund_id: refundId, processed_by_user_id: processedByUserId, refund_method: refundMethod, refund_reference: refundReference, processing_remarks: processingRemarks }),
    onSuccess: () => {
      toast.success('Refund processed successfully');
      setShowProcessDialog(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to process refund: ${error.message}`);
    }
  });

  const cancelRefundMutation = useMutation({
    mutationFn: ({ refundId, reason }: { refundId: string; reason: string }) =>
      cancelFeeRefund(refundId, reason),
    onSuccess: () => {
      toast.success('Refund cancelled successfully');
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel refund: ${error.message}`);
    }
  });

  const handleStudentChange = (value: string | number, option?: any) => {
    const studentId = value?.toString() || '';
    setSelectedStudent(studentId);
    setSearchParams(prev => ({
      ...prev,
      student_id: studentId || undefined,
      offset: 0
    }));
  };

  const handleSearch = (field: keyof typeof searchParams, value: string) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value || undefined,
      offset: 0
    }));
  };

  const handleClearFilters = () => {
    setSearchParams({
      limit: 50,
      offset: 0,
      status: '',
      student_id: '',
      refund_reason: '',
      requested_date_from: '',
      requested_date_to: '',
      approved_date_from: '',
      approved_date_to: '',
      processed_date_from: '',
      processed_date_to: ''
    });
    setSelectedStudent('');
  };

  const handleViewRefund = async (refund: FeeRefundWithDetails) => {
    // Always fetch transaction details for the refund
    let transactionData;
    try {
      console.log('Fetching transaction details for refund:', refund.refund_number, 'transaction ID:', refund.fee_transaction_id);
      transactionData = await getTransactionById(refund.fee_transaction_id);
      console.log('Transaction details fetched:', transactionData);
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
      // Continue with refund data only
    }

    const enhancedRefund = {
      ...refund,
      transaction_number: transactionData?.transaction_number || 'N/A',
      transaction_amount: transactionData?.total_amount || 0,
      transaction_date: transactionData?.transaction_date || '',
      payment_method: transactionData?.payment_method || 'N/A'
    };

    setSelectedRefund(enhancedRefund);
    setShowViewDialog(true);
  };

  const handleApproveReject = (refund: FeeRefundWithDetails) => {
    setSelectedRefund(refund);
    setApproveForm({ action: 'approve', rejection_reason: '' });
    setShowApproveDialog(true);
  };

  const handleProcess = (refund: FeeRefundWithDetails) => {
    setSelectedRefund(refund);
    setProcessForm({ reference_number: '' });
    setShowProcessDialog(true);
  };

  const handleCreateFormChange = (field: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Transform students data for react-select
  const studentOptions = useMemo(() => {
    return students.map(student => ({
      value: student.id,
      label: student.admission_number ? `${student?.display_name || student.name} (${student.admission_number})` : student.name
    }));
  }, [students]);

  // Transform transactions data for react-select
  const transactionOptions = useMemo(() => {
    return transactions.map(transaction => {
      const feeTypes = transaction.transaction_items?.map(item => item.fee_type?.name).filter(Boolean).slice(0, 2).join(', ') || 'General Fee';
      const paymentMethod = transaction.payment_method?.toUpperCase() || 'N/A';
      const date = new Date(transaction.transaction_date).toLocaleDateString();
      return {
        value: transaction.id,
        label: `${transaction.transaction_number} | ₹${Number(transaction.total_amount).toLocaleString()} | ${paymentMethod} | ${feeTypes} | ${date}`
      };
    });
  }, [transactions]);

  // Handle student selection change for create form
  const handleCreateFormStudentChange = (option: SingleValue<{ value: string; label: string }>) => {
    setSelectedStudentOption(option);
    const selectedStudentData = students.find(s => s.id === option?.value);
    setCreateForm(prev => ({
      ...prev,
      student_id: option?.value || '',
      student_admission_num: selectedStudentData?.admission_number || '',
      fee_transaction_id: '' // Reset transaction when student changes
    }));
    setSelectedTransactionOption(null);
  };

  // Handle transaction selection change for create form
  const handleCreateFormTransactionChange = (option: SingleValue<{ value: string; label: string }>) => {
    setSelectedTransactionOption(option);
    const selectedTransaction = transactions.find(t => t.id === option?.value);
    setCreateForm(prev => ({
      ...prev,
      fee_transaction_id: option?.value || '',
      refund_amount: selectedTransaction?.total_amount || 0 // Pre-fill refund amount with transaction amount
    }));
  };


  const resetCreateForm = () => {
    setCreateForm({
      fee_transaction_id: '',
      refund_amount: 0,
      refund_reason: '',
      detailed_reason: '',
      student_id: '',
      student_admission_num: '',
      academic_year_id: '',
      requested_by_user_id: user?.id || ''
    });
    setSelectedStudentOption(null);
    setSelectedTransactionOption(null);
  };

  const handleCreateRefund = () => {
    if (!user?.id) {
      toast.error('You must be logged in to create a refund request');
      return;
    }

    if (!selectedTransactionOption || createForm.refund_amount <= 0 || !createForm.refund_reason || !createForm.student_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    const refundData: FeeRefundCreateRequest = {
      fee_transaction_id: createForm.fee_transaction_id,
      refund_amount: createForm.refund_amount,
      refund_reason: createForm.refund_reason as 'fee_adjustment' | 'student_withdrawal' | 'excess_payment' | 'other',
      detailed_reason: createForm.detailed_reason,
      student_id: createForm.student_id,
      student_admission_num: createForm.student_admission_num,
      academic_year_id: createForm.academic_year_id,
      requested_by_user_id: user?.id || ''
    };

    createRefundMutation.mutate(refundData);
  };

  const handleApproveRejectSubmit = () => {
    if (!selectedRefund) return;
    if (!user?.id) {
      toast.error('You must be logged in to approve or reject refunds');
      return;
    }

    if (approveForm.action === 'reject' && !approveForm.rejection_reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    approveRefundMutation.mutate({
      refundId: selectedRefund.id,
      action: approveForm.action,
      approvalRemarks: approveForm.action === 'reject' ? approveForm.rejection_reason : 'Approved',
      approvedByUserId: user.id
    });
  };

  const handleProcessSubmit = () => {
    if (!selectedRefund) return;
    if (!user?.id) {
      toast.error('You must be logged in to process refunds');
      return;
    }

    processRefundMutation.mutate({
      refundId: selectedRefund.id,
      processedByUserId: user.id,
      refundMethod: (processForm.reference_number ? 'bank_transfer' : 'cash') as 'cash' | 'bank_transfer' | 'cheque',
      refundReference: processForm.reference_number || 'Cash refund processed',
      processingRemarks: 'Refund processed via system'
    });
  };

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

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

  const sortedRefunds = useMemo(() => {
    const data = [...refunds];
    if (!sortKey || !sortDir) return data;
    return data.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortKey) {
        case 'refund_number': aVal = a.refund_number || ''; bVal = b.refund_number || ''; break;
        case 'student': aVal = a.student_admission_num || ''; bVal = b.student_admission_num || ''; break;
        case 'amount': aVal = String(a.refund_amount); bVal = String(b.refund_amount); break;
        case 'reason': aVal = a.refund_reason; bVal = b.refund_reason; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'date': aVal = a.requested_date; bVal = b.requested_date; break;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [refunds, sortKey, sortDir]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processed':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'requested':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading refunds...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          Failed to load refunds. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Refund Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>Create New Refund Request</DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateDialog(false)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <DialogDescription>
                  Create a new fee refund request for a student
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {!user?.id && (
                  <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                    <p className="text-sm text-red-600">
                      You must be logged in to create a refund request.
                    </p>
                  </div>
                )}

                  {/* Student Selection */}
                <div className="space-y-2">
                  <Label htmlFor="student_id">Student *</Label>
                  <SelectDropdown
                    options={studentOptions}
                    value={selectedStudentOption}
                    onChange={handleCreateFormStudentChange}
                    placeholder="Select a student"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    closeMenuOnSelect={true}
                    isSearchable={true}
                    blurInputOnSelect={false}
                    escapeClearsValue={false}
                    isClearable={false}
                    styles={{
                      menuPortal: base => ({ ...base, zIndex: 10000 }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 10000,
                        pointerEvents: 'auto'
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                        color: state.isSelected ? 'white' : 'black',
                        '&:hover': {
                          backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                        },
                      }),
                      control: (provided) => ({
                        ...provided,
                        pointerEvents: 'auto'
                      }),
                    }}
                    isLoading={studentsLoading}
                  />
                </div>



                {/* Fee Transaction ID */}
                <div className="space-y-2">
                  <Label htmlFor="fee_transaction_id">Fee Transaction *</Label>
                  <SelectDropdown
                    options={transactionOptions}
                    value={selectedTransactionOption}
                    onChange={handleCreateFormTransactionChange}
                    placeholder="Select a transaction"
                    className="w-full"
                    classNamePrefix="react-select"
                    menuPlacement="auto"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    closeMenuOnSelect={true}
                    isSearchable={true}
                    blurInputOnSelect={false}
                    escapeClearsValue={false}
                    isClearable={true}
                    isDisabled={!createForm.student_id}
                    isLoading={transactionsLoading}
                    styles={{
                      menuPortal: base => ({ ...base, zIndex: 10000 }),
                      menu: (provided) => ({
                        ...provided,
                        zIndex: 10000,
                        pointerEvents: 'auto'
                      }),
                      option: (provided, state) => ({
                        ...provided,
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
                        color: state.isSelected ? 'white' : 'black',
                        '&:hover': {
                          backgroundColor: state.isSelected ? '#3b82f6' : '#f3f4f6',
                        },
                      }),
                      control: (provided) => ({
                        ...provided,
                        pointerEvents: 'auto'
                      }),
                    }}
                  />
                  {!createForm.student_id ? (
                    <p className="text-sm text-muted-foreground">Please select a student first</p>
                  ) : null}
                </div>

                {/* Refund Amount */}
                <div className="space-y-2">
                  <Label htmlFor="refund_amount">Refund Amount *</Label>
                  <Input
                    id="refund_amount"
                    type="number"
                    value={createForm.refund_amount}
                    onChange={(e) => handleCreateFormChange('refund_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>

                {/* Refund Reason */}
                <div className="space-y-2">
                  <Label htmlFor="refund_reason">Refund Reason *</Label>
                  <Select
                    value={createForm.refund_reason}
                    onValueChange={(value) => handleCreateFormChange('refund_reason', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select refund reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fee_adjustment">Fee Adjustment</SelectItem>
                      <SelectItem value="student_withdrawal">Student Withdrawal</SelectItem>
                      <SelectItem value="excess_payment">Excess Payment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Detailed Reason */}
                <div className="space-y-2">
                  <Label htmlFor="detailed_reason">Detailed Reason</Label>
                  <Textarea
                    id="detailed_reason"
                    value={createForm.detailed_reason}
                    onChange={(e) => handleCreateFormChange('detailed_reason', e.target.value)}
                    placeholder="Provide detailed reason..."
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateRefund}
                    disabled={createRefundMutation.isPending || !user?.id}
                  >
                    {createRefundMutation.isPending ? 'Creating...' : 'Create Refund'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

      {/* Statistics Cards */}
      {refundStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Refund Amount</p>
                  <p className="text-2xl font-bold">₹{refundStats.total_refund_amount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Refunds</p>
                  <p className="text-2xl font-bold">{refundStats.total_pending_refunds}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Processed Refunds</p>
                  <p className="text-2xl font-bold">{refundStats.total_processed_refunds}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected Refunds</p>
                  <p className="text-2xl font-bold">{refunds.filter(r => r.status === 'rejected').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground mb-3">
            <Search className="h-3.5 w-3.5" />
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
                      {student.name} {student.admission_number ? `(${student.admission_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={searchParams.status}
                onValueChange={(value) => handleSearch('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Refund Reason</label>
              <Input
                value={searchParams.refund_reason}
                onChange={(e) => handleSearch('refund_reason', e.target.value)}
                placeholder="Filter by reason..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Requested Date From</label>
              <Input
                type="date"
                value={searchParams.requested_date_from}
                onChange={(e) => handleSearch('requested_date_from', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Requested Date To</label>
              <Input
                type="date"
                value={searchParams.requested_date_to}
                onChange={(e) => handleSearch('requested_date_to', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              Clear All Filters
            </Button>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Refunds Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Fee Refunds</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Refund
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-xs text-muted-foreground">S.No.</TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('refund_number')}>
                    <div className="flex items-center">Refund Number<SortIcon col="refund_number" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('student')}>
                    <div className="flex items-center">Student Admission<SortIcon col="student" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('amount')}>
                    <div className="flex items-center">Refund Amount<SortIcon col="amount" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('reason')}>
                    <div className="flex items-center">Reason<SortIcon col="reason" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Status<SortIcon col="status" /></div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('date')}>
                    <div className="flex items-center">Requested Date<SortIcon col="date" /></div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRefunds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No refunds found.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedRefunds.map((refund, index) => (
                    <TableRow key={refund.id} style={{ height: '48px' }}>
                      <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {refund.refund_number}
                      </TableCell>
                      <TableCell>
                        {refund.student_admission_num || 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{Number(refund.refund_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={refund.refund_reason}>
                          {refund.refund_reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(refund.status)}>
                          {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(refund.requested_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewRefund(refund)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          {refund.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveReject(refund)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve/Reject
                            </Button>
                          )}
                          {refund.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProcess(refund)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Process
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Refund Modal */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Refund Details
              {selectedRefund && (
                <Badge variant={getStatusBadge(selectedRefund.status)}>
                  {selectedRefund.status.charAt(0).toUpperCase() + selectedRefund.status.slice(1)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedRefund?.refund_number} • {selectedRefund ? new Date(selectedRefund.requested_date).toLocaleDateString() : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-6">
              {/* Refund Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Refund Amount</p>
                        <p className="text-2xl font-bold">₹{Number(selectedRefund.refund_amount).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Refund Reason</p>
                        <p className="text-lg font-semibold">{selectedRefund.refund_reason.toUpperCase()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Status</p>
                        <p className="text-lg font-semibold">{selectedRefund.status.charAt(0).toUpperCase() + selectedRefund.status.slice(1)}</p>
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
                        <p className="text-sm font-medium text-muted-foreground">Admission Number</p>
                        <p className="font-semibold">{selectedRefund.student_admission_num || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Student Name</p>
                        <p className="font-semibold">
                          {(() => {
                            const student = students.find(s => s.id === selectedRefund.student_id);
                            return student ? (student.display_name || student.name) : 'N/A';
                          })()}
                        </p>
                      </div>
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
                        <p className="font-semibold">
                          {selectedRefund.transaction_number || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Academic Year</p>
                        <p className="font-semibold">
                          {(() => {
                            const academicYear = academicYears.find(ay => ay.id === selectedRefund.academic_year_id);
                            return academicYear ? academicYear.title : 'Academic Year Not Found';
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Transaction Amount</p>
                        <p className="font-semibold text-green-600">
                          ₹{Number(selectedRefund.transaction_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
                        <p className="font-semibold">
                          {selectedRefund.payment_method?.toUpperCase() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Refund Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Refund Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Refund Reason</p>
                    <p className="text-sm">{selectedRefund.refund_reason}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Requested Date</p>
                      <p className="font-semibold">{new Date(selectedRefund.requested_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approved Date</p>
                      <p className="font-semibold">{selectedRefund.approved_date ? new Date(selectedRefund.approved_date).toLocaleDateString() : 'Pending'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Processed Date</p>
                      <p className="font-semibold">{selectedRefund.processed_date ? new Date(selectedRefund.processed_date).toLocaleDateString() : 'Pending'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approved Date</p>
                      <p className="font-semibold">{selectedRefund.approved_date ? new Date(selectedRefund.approved_date).toLocaleDateString() : 'Pending'}</p>
                    </div>
                  </div>
                  {selectedRefund.refund_reference && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Reference Number</p>
                      <p className="font-mono text-sm">{selectedRefund.refund_reference}</p>
                    </div>
                  )}
                  {selectedRefund.approval_remarks && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Approval Remarks</p>
                      <p className="text-sm">{selectedRefund.approval_remarks}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Modal */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve or Reject Refund</DialogTitle>
            <DialogDescription>
              Review and decide on the refund request for {selectedRefund?.refund_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={approveForm.action}
                onValueChange={(value) => setApproveForm(prev => ({ ...prev, action: value as 'approve' | 'reject' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {approveForm.action === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="rejection_reason">Rejection Reason *</Label>
                <Textarea
                  id="rejection_reason"
                  value={approveForm.rejection_reason}
                  onChange={(e) => setApproveForm(prev => ({ ...prev, rejection_reason: e.target.value }))}
                  placeholder="Provide reason for rejection..."
                  rows={3}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApproveRejectSubmit}
                disabled={approveRefundMutation.isPending || cancelRefundMutation.isPending}
              >
                {(approveRefundMutation.isPending || cancelRefundMutation.isPending) ? 'Processing...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Refund Modal */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process the approved refund for {selectedRefund?.refund_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reference_number">Reference Number (Optional)</Label>
              <Input
                id="reference_number"
                value={processForm.reference_number}
                onChange={(e) => setProcessForm(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder="Enter bank reference number..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProcessDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessSubmit}
                disabled={processRefundMutation.isPending}
              >
                {processRefundMutation.isPending ? 'Processing...' : 'Process Refund'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}