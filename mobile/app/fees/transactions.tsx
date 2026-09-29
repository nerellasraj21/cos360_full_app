import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear, useAuth } from '@/contexts';
import { FeeTransactionResponse, FeeTransactionCreateRequest, FeeTransactionItemRequest, feeTransactionsApi, feeReceiptsApi, feeTypesApi, feeTermsApi } from '@/src/api/fees';
import { legacyStaffApi } from '@/src/api/staff';
import { studentAdmissionsApi } from '@/src/api/students';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

// Currency helper (M-1)
const formatINR = (amount: number | string | null | undefined) =>
  `₹${Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type TxStatus = 'paid' | 'pending' | 'partial' | 'cancelled';

const STATUS_COLORS: Record<TxStatus | 'default', { bg: string; text: string }> = {
  paid:      { bg: '#dcfce7', text: '#16a34a' },
  pending:   { bg: '#fef9c3', text: '#854d0e' },
  partial:   { bg: '#ffedd5', text: '#9a3412' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
  default:   { bg: '#f1f5f9', text: '#475569' },
};

function deriveStatus(transaction: FeeTransactionResponse): TxStatus {
  // Honour explicit status field from API (e.g. 'cancelled')
  const apiStatus = (transaction as any).status as string | undefined;
  if (apiStatus === 'cancelled') return 'cancelled';
  const items = transaction.transaction_items ?? [];
  if (items.length === 0) return 'pending';
  const totalDue  = items.reduce((s, i) => s + (i.amount_due  ?? 0), 0);
  const totalPaid = items.reduce((s, i) => s + (i.amount_paid ?? 0), 0);
  if (totalPaid <= 0)        return 'pending';
  if (totalPaid >= totalDue) return 'paid';
  return 'partial';
}

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'upi',           label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  // C-3: removed 'online' and 'card' — not in backend Literal enum
];

type PaymentMethod = 'cash' | 'cheque' | 'upi' | 'bank_transfer'; // C-3: matches backend Literal

// Component
export default function FeeTransactionsScreen() {
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const router = useRouter();
  const isFeeBlocked = roleBlocksFees(role?.name);

  const [isModalVisible, setIsModalVisible]         = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FeeTransactionResponse | null>(null);
  const [currentStep, setCurrentStep]               = useState(1);
  const [stepError, setStepError]                   = useState('');

  const [formData, setFormData] = useState({
    student_id:            '',
    student_admission_num: '',
    academic_year_id:      '',
    total_amount:          0,
    payment_method:        'cash' as PaymentMethod,
    transaction_date:      new Date().toISOString().split('T')[0],
    remarks:               '',
    collected_by:          '',
    upi_reference:         '',
    cheque_number:         '',
    cheque_date:           '', // C-3: backend requires cheque_date for cheque payments
    cheque_bank:           '', // C-3: backend requires cheque_bank for cheque payments
    bank_reference:        '',
    bank_name:             '', // C-3: backend requires bank_name for bank_transfer
    transaction_items:     [] as FeeTransactionItemRequest[],
  });

  const [filters, setFilters] = useState({
    student_id: '',
    status:     '',
    date_from:  '',
    date_to:    '',
  });

  const [outstandingFeesModal, setOutstandingFeesModal] = useState({
    visible:     false,
    studentId:   '',
    studentName: '',
  });

  const { colors } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee
  // module, even via a deep link into a specific fee sub-screen.
  useEffect(() => {
    if (isFeeBlocked) router.replace('/(tabs)');
  }, [isFeeBlocked, router]);

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['feeTransactions', activeAcademicYearId],
    queryFn:  () => feeTransactionsApi.getFeeTransactions(activeAcademicYearId || undefined),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['studentsDropdown'],
    queryFn:  () => studentAdmissionsApi.studentsDropdown({ active_only: true }),
  });

  const { data: feeTerms = [] } = useQuery({
    queryKey: ['feeTerms', activeAcademicYearId],
    queryFn:  () => feeTermsApi.getFeeTerms(activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined),
  });

  const { data: feeTypes = [] } = useQuery({
    queryKey: ['feeTypes', activeAcademicYearId],
    queryFn:  () => feeTypesApi.getFeeTypes(),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staffDropdown'],
    queryFn:  () => legacyStaffApi.getStaff(),
  });

  const { data: outstandingFees = [] } = useQuery({
    queryKey: ['outstandingFees', outstandingFeesModal.studentId],
    queryFn:  () => outstandingFeesModal.studentId ? feeTransactionsApi.getStudentOutstandingFees(outstandingFeesModal.studentId) : Promise.resolve([]),
    enabled: outstandingFeesModal.visible && !!outstandingFeesModal.studentId,
  });

  const createMutation = useMutation({
    mutationFn: feeTransactionsApi.createFeeTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTransactions'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Fee transaction created successfully');
    },
    onError: (err: Error) => {
      showError('Failed to create fee transaction', err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeTransactionCreateRequest> }) => feeTransactionsApi.updateFeeTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTransactions'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Fee transaction updated successfully');
    },
    onError: (err: Error) => {
      showError('Failed to update fee transaction', err.message);
    },
  });

  const generateReceiptMutation = useMutation({
    mutationFn: feeReceiptsApi.generateFeeReceipt,
    onSuccess: () => { showSuccess('Receipt generated successfully'); },
    onError: (err: Error) => { showError('Failed to generate receipt', err.message); },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setFormData({
      student_id:            '',
      student_admission_num: '',
      academic_year_id:      '',
      total_amount:          0,
      payment_method:        'cash',
      transaction_date:      new Date().toISOString().split('T')[0],
      remarks:               '',
      collected_by:          '',
      upi_reference:         '',
      cheque_number:         '',
      cheque_date:           '',
      cheque_bank:           '',
      bank_reference:        '',
      bank_name:             '',
      transaction_items:     [],
    });
    setEditingTransaction(null);
    setCurrentStep(1);
    setStepError('');
  };

  const handleCreate = () => {
    setEditingTransaction(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (transaction: FeeTransactionResponse) => {
    setEditingTransaction(transaction);
    setFormData({
      student_id:            transaction.student_id,
      student_admission_num: transaction.student_admission_num,
      academic_year_id:      transaction.academic_year_id,
      total_amount:          transaction.total_amount,
      payment_method:        transaction.payment_method as PaymentMethod,
      transaction_date:      transaction.transaction_date || new Date().toISOString().split('T')[0],
      remarks:               transaction.remarks     || '',
      collected_by:          transaction.collected_by || '',
      upi_reference:         transaction.upi_reference || '',
      cheque_number:         transaction.cheque_number  || '',
      cheque_date:           transaction.cheque_date    || '',
      cheque_bank:           transaction.cheque_bank    || '',
      bank_reference:        transaction.bank_reference || '',
      bank_name:             transaction.bank_name      || '',
      transaction_items:     (transaction.transaction_items || []).map(item => ({ ...item, amount_due: item.amount_due ?? 0, amount_paid: item.amount_paid ?? 0 })),
    });
    setStepError('');
    setIsModalVisible(true);
  };

  const handleSubmit = () => {
    if (!formData.student_id) { setStepError('Please select a student'); return; }
    if (formData.transaction_items.length === 0) { setStepError('Please add at least one transaction item'); return; }
    for (let i = 0; i < formData.transaction_items.length; i++) {
      const item = formData.transaction_items[i];
      if (!item.fee_type_id || !item.term_date_id || item.amount_paid <= 0) { // C-2: renamed field
        setStepError(`Please fill all required fields for item ${i + 1}`);
        return;
      }
      if (item.amount_paid > (item.amount_due ?? 0)) {
        setStepError(`Amount paid cannot exceed amount due for item ${i + 1}`);
        return;
      }
    }
    setStepError('');
    const data: FeeTransactionCreateRequest = {
      student_id:            formData.student_id,
      student_admission_num: formData.student_admission_num,
      academic_year_id:      formData.academic_year_id,
      total_amount:          formData.total_amount,
      payment_method:        formData.payment_method as FeeTransactionCreateRequest['payment_method'],
      transaction_items:     formData.transaction_items,
      transaction_date:      formData.transaction_date  || undefined,
      remarks:               formData.remarks            || undefined,
      collected_by:          formData.collected_by       || undefined,
      upi_reference:         formData.upi_reference      || undefined,
      cheque_number:         formData.cheque_number       || undefined,
      cheque_date:           formData.cheque_date         || undefined, // C-3: backend required for cheque
      cheque_bank:           formData.cheque_bank         || undefined, // C-3: backend required for cheque
      bank_reference:        formData.bank_reference      || undefined,
      bank_name:             formData.bank_name           || undefined, // C-3: backend required for bank_transfer
    };
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleGenerateReceipt = (transactionId: string) => {
    generateReceiptMutation.mutate(transactionId);
  };

  const handleViewOutstandingFees = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setOutstandingFeesModal({ visible: true, studentId, studentName: student?.display_name || studentId });
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.student_id && transaction.student_id !== filters.student_id) return false;
    if (filters.status) {
      const derived = deriveStatus(transaction);
      if (derived !== filters.status) return false;
    }
    if (filters.date_from && transaction.transaction_date) {
      if (transaction.transaction_date < filters.date_from) return false;
    }
    if (filters.date_to && transaction.transaction_date) {
      if (transaction.transaction_date > filters.date_to) return false;
    }
    return true;
  });


  const renderTransactionItem = ({ item, index }: { item: FeeTransactionResponse; index: number }) => {
    const student     = students.find(s => s.id === item.student_id);
    const staffMember = staff.find(s => s.id === item.collected_by);
    const txStatus    = deriveStatus(item);
    const statusColors = STATUS_COLORS[txStatus] ?? STATUS_COLORS.default;
    return (
      <View style={[styles.transactionCard, { backgroundColor: colors.card }]}>
        <View style={styles.transactionInfo}>
          <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
          <View style={styles.transactionHeaderRow}>
            <Text style={[styles.transactionId, { color: colors.foreground }]}>
              #{item.id.slice(0, 8)}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusPillText, { color: statusColors.text }]}>
                {txStatus.charAt(0).toUpperCase() + txStatus.slice(1)}
              </Text>
            </View>
          </View>
          <View style={styles.transactionAmountRow}>
            <Text style={[styles.transactionDetails, { color: colors['muted-foreground'], flex: 1 }]}>
              {student?.display_name || item.student_id}
            </Text>
            <Text style={[styles.transactionAmount, { color: colors.foreground }]}>
              {formatINR(item.total_amount ?? 0)}
            </Text>
          </View>
          <Text style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
            Items: {item.transaction_items?.length || 0} · {item.payment_method}
          </Text>
          <Text style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
            {item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : 'N/A'}
          </Text>
          {staffMember && (
            <Text style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
              Collected by: {staffMember.first_name} {staffMember.last_name}
            </Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TRANSACTIONS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleViewOutstandingFees(item.student_id)}
          >
            <Ionicons name="cash-outline" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={() => handleGenerateReceipt(item.id)}
          >
            <Ionicons name="document" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };


  // Auth/loading guards (M-3)
  if (authLoading) {
    return (
      <AppLayout title="Fee Transactions">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors?.primary ?? '#556ee6'} />
        </View>
      </AppLayout>
    );
  }
  if (!isAuthenticated) { return null; }
  if (isFeeBlocked) { return null; }
  if (isLoading) {
    return (
      <AppLayout title="Fee Transactions">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors?.primary ?? '#556ee6'} />
        </View>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout title="Fee Transactions">
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.destructive }}>Error loading fee transactions</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['feeTransactions'] })}
          >
            <Text style={{ color: 'white' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }


  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_TRANSACTIONS}>
      <AppLayout title="Fee Transactions">
        <View style={styles.container}>

          {/* Filters (C-14) */}
          <View style={styles.filtersContainer}>
            <CustomDropdown
              data={[
                { value: '', label: 'All Students' },
                ...students.map(s => ({ value: s.id, label: s.display_name })),
              ]}
              value={filters.student_id}
              onChange={(value) => setFilters(prev => ({ ...prev, student_id: String(value || '') }))}
              placeholder="Filter by Student"
            />
            <CustomDropdown
              data={[
                { value: '', label: 'All Statuses' },
                { value: 'paid', label: 'Paid' },
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: String(value || '') }))}
              placeholder="Filter by Status"
            />
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>From Date</Text>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={filters.date_from}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, date_from: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.dateField}>
                <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>To Date</Text>
                <TextInput
                  style={[styles.filterInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={filters.date_to}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, date_to: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>


          <View style={styles.header}>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TRANSACTIONS}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.addButtonText}>Add Transaction</Text>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderTransactionItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  No fee transactions found
                </Text>
              </View>
            }
          />


          {/* Multi-Step Modal */}
          <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    {editingTransaction ? 'Edit Fee Transaction' : 'Add Fee Transaction'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                    <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>
                <View style={styles.stepIndicator}>
                  {[1, 2, 3].map((step) => (
                    <View key={step} style={styles.stepContainer}>
                      <View style={[styles.stepCircle, { backgroundColor: currentStep >= step ? colors.primary : colors.muted }]}>
                        <Text style={[styles.stepText, { color: currentStep >= step ? 'white' : colors['muted-foreground'] }]}>{step}</Text>
                      </View>
                      <Text style={[styles.stepLabel, { color: currentStep >= step ? colors.primary : colors['muted-foreground'] }]}>
                        {step === 1 ? 'Student' : step === 2 ? 'Payment' : 'Items'}
                      </Text>
                    </View>
                  ))}
                </View>
                <ScrollView style={styles.form}>

                  {/* Step 1: Student */}
                  {currentStep === 1 && (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>Student *</Text>
                      <CustomDropdown
                        data={students.map(s => ({ value: s.id, label: s.display_name }))}
                        value={formData.student_id}
                        onChange={(value) => {
                          const studentId = String(value || '');
                          const student   = students.find(s => s.id === studentId);
                          setStepError('');
                          setFormData(prev => ({
                            ...prev,
                            student_id:            studentId,
                            student_admission_num: student?.admission_number || '',
                            academic_year_id:      activeAcademicYearId || '',
                            transaction_items:     [],
                            total_amount:          0,
                          }));
                        }}
                        placeholder="Select Student"
                        disabled={isSubmitting}
                      />
                      {stepError !== '' && <Text style={styles.errorText}>{stepError}</Text>}
                      <Text style={[styles.label, { color: colors.foreground }]}>Admission Number</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                        value={formData.student_admission_num}
                        editable={false}
                        placeholder="Auto-filled"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </>
                  )}


                  {/* Step 2: Payment */}
                  {currentStep === 2 && (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>Payment Method *</Text>
                      <CustomDropdown
                        data={PAYMENT_METHOD_OPTIONS}
                        value={formData.payment_method}
                        onChange={(value) => {
                          setStepError('');
                          setFormData(prev => ({
                            ...prev,
                            payment_method: (value as PaymentMethod) || 'cash',
                            upi_reference: '', cheque_number: '', cheque_date: '', cheque_bank: '', bank_reference: '', bank_name: '', // C-3
                          }));
                        }}
                        placeholder="Select Payment Method"
                        disabled={isSubmitting}
                      />

                      {formData.payment_method === 'upi' && (
                        <>
                          <Text style={[styles.label, { color: colors.foreground }]}>UPI Reference</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                            value={formData.upi_reference}
                            onChangeText={(text) => { setStepError(''); setFormData(prev => ({ ...prev, upi_reference: text })); }}
                            placeholder="Enter UPI reference" placeholderTextColor={colors['muted-foreground']} editable={!isSubmitting}
                          />
                        </>
                      )}
                      {formData.payment_method === 'cheque' && (
                        <>
                          <Text style={[styles.label, { color: colors.foreground }]}>Cheque Number</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                            value={formData.cheque_number}
                            onChangeText={(text) => { setStepError(''); setFormData(prev => ({ ...prev, cheque_number: text })); }}
                            placeholder="Enter cheque number" placeholderTextColor={colors['muted-foreground']} editable={!isSubmitting}
                          />
                          {/* C-3: cheque_date required by backend */}
                          <Text style={[styles.label, { color: colors.foreground }]}>Cheque Date</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                            value={formData.cheque_date}
                            onChangeText={(text) => { setStepError(''); setFormData(prev => ({ ...prev, cheque_date: text })); }}
                            placeholder="YYYY-MM-DD" placeholderTextColor={colors['muted-foreground']} editable={!isSubmitting}
                          />
                          {/* C-3: cheque_bank required by backend */}
                          <Text style={[styles.label, { color: colors.foreground }]}>Bank Name</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                            value={formData.cheque_bank}
                            onChangeText={(text) => { setStepError(''); setFormData(prev => ({ ...prev, cheque_bank: text })); }}
                            placeholder="Enter bank name" placeholderTextColor={colors['muted-foreground']} editable={!isSubmitting}
                          />
                        </>
                      )}
                      {formData.payment_method === 'bank_transfer' && (
                        <>
                          <Text style={[styles.label, { color: colors.foreground }]}>Bank Reference</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                            value={formData.bank_reference}
                            onChangeText={(text) => { setStepError(''); setFormData(prev => ({ ...prev, bank_reference: text })); }}
                            placeholder="Enter bank reference" placeholderTextColor={colors['muted-foreground']} editable={!isSubmitting}
                          />
                          {/* C-3: bank_name required by backend */}
                          <Text style={[styles.label, { color: colors.foreground }]}>Bank Name</Text>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                            value={formData.bank_name}
                            onChangeText={(text) => { setStepError(''); setFormData(prev => ({ ...prev, bank_name: text })); }}
                            placeholder="Enter bank name" placeholderTextColor={colors['muted-foreground']} editable={!isSubmitting}
                          />
                        </>
                      )}

                      <Text style={[styles.label, { color: colors.foreground }]}>Transaction Date *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                        value={formData.transaction_date}
                        onChangeText={(text) => { setStepError(''); setFormData(prev => ({ ...prev, transaction_date: text })); }}
                        placeholder="YYYY-MM-DD" placeholderTextColor={colors['muted-foreground']} keyboardType="numeric" editable={!isSubmitting}
                      />
                      {stepError !== '' && <Text style={styles.errorText}>{stepError}</Text>}
                      <Text style={[styles.label, { color: colors.foreground }]}>Collected By</Text>
                      <CustomDropdown
                        data={[{ value: '', label: 'Select Staff' }, ...staff.map(s => ({ value: s.id, label: (s.first_name + '  ' + (s.last_name || '' )).trim() }))]}
                        value={formData.collected_by}
                        onChange={(value) => setFormData(prev => ({ ...prev, collected_by: String(value || '') }))}
                        placeholder="Select Staff" disabled={isSubmitting}
                      />
                    </>
                  )}


                  {/* Step 3: Items */}
                  {currentStep === 3 && (
                    <>
                      <View style={styles.itemsHeader}>
                        <Text style={[styles.label, { color: colors.foreground }]}>Transaction Items</Text>
                        <TouchableOpacity
                          style={[styles.addItemButton, { backgroundColor: isSubmitting ? colors['muted-foreground'] : colors.primary }]}
                          onPress={() => {
                            const newItem: FeeTransactionItemRequest = { fee_type_id: '', term_date_id: '', amount_due: 0, amount_paid: 0, description: '' }; // C-2
                            setFormData(prev => ({
                              ...prev,
                              transaction_items: [...prev.transaction_items, newItem],
                              total_amount: prev.transaction_items.reduce((sum, i) => sum + (i.amount_paid || 0), 0),
                            }));
                          }}
                          disabled={isSubmitting}
                        >
                          <Ionicons name="add" size={16} color="white" />
                          <Text style={styles.addItemText}>Add Item</Text>
                        </TouchableOpacity>
                      </View>

                      {formData.transaction_items.map((item, index) => (
                        <View key={index} style={[styles.itemCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <View style={styles.itemHeader}>
                            <Text style={[styles.itemTitle, { color: colors.foreground }]}>Item {index + 1}</Text>
                            <TouchableOpacity
                              onPress={() => setFormData(prev => ({ ...prev, transaction_items: prev.transaction_items.filter((_, i) => i !== index) }))}
                              disabled={isSubmitting}
              accessibilityLabel="Delete"
                            >
                              <Ionicons name="trash" size={20} color={isSubmitting ? colors['muted-foreground'] : colors.destructive} />
                            </TouchableOpacity>
                          </View>
                          <CustomDropdown
                            data={feeTypes.map(type => ({ value: type.id, label: type.type_name }))}
                            value={item.fee_type_id}
                            onChange={(value) => {
                              const newItems = [...formData.transaction_items];
                              newItems[index].fee_type_id = String(value || '');
                              newItems[index].term_date_id = ''; // C-2: renamed field
                              newItems[index].amount_due  = 0;
                              setFormData(prev => ({ ...prev, transaction_items: newItems, total_amount: newItems.reduce((sum, i) => sum + (i.amount_paid || 0), 0) }));
                            }}
                            placeholder="Select Fee Type" disabled={isSubmitting}
                          />
                          <CustomDropdown
                            data={(() => {
                              const selectedFeeType = feeTypes.find(type => type.id === item.fee_type_id);
                              if (!selectedFeeType) return [];
                              const filteredTerms = feeTerms.filter(term => term.id === selectedFeeType.fee_term_id);
                              return filteredTerms.flatMap(term =>
                                term.fee_term_dates?.map(date => ({
                                  value: date.id,
                                  label: term.term_name + '  -  ' + new Date(date.fee_term_date).toLocaleDateString() + '  (' + formatINR(date.amount) + ')'
                                })) || []
                              );
                            })()}
                            value={item.term_date_id} // C-2
                            onChange={(value) => {
                              const newItems = [...formData.transaction_items];
                              newItems[index].term_date_id = String(value || ''); // C-2
                              const selectedTerm = feeTerms.flatMap(term => term.fee_term_dates || []).find(date => date.id === String(value || ''));
                              newItems[index].amount_due = selectedTerm ? selectedTerm.amount : 0;
                              setFormData(prev => ({ ...prev, transaction_items: newItems, total_amount: newItems.reduce((sum, i) => sum + (i.amount_paid || 0), 0) }));
                            }}
                            placeholder="Select Fee Term Date" disabled={isSubmitting}
                          />

                          <View style={styles.amountRow}>
                            <View style={styles.amountField}>
                              <Text style={[styles.amountLabel, { color: colors.foreground }]}>Amount Due *</Text>
                              <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                                value={(item.amount_due || 0).toString()}
                                onChangeText={(text) => {
                                  const newItems = [...formData.transaction_items];
                                  newItems[index].amount_due = parseFloat(text) || 0;
                                  setFormData(prev => ({ ...prev, transaction_items: newItems }));
                                }}
                                placeholder="0.00" placeholderTextColor={colors['muted-foreground']} keyboardType="numeric" editable={!isSubmitting}
                              />
                            </View>
                            <View style={styles.amountField}>
                              <Text style={[styles.amountLabel, { color: colors.foreground }]}>Amount Paid *</Text>
                              <TextInput
                                style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                                value={(item.amount_paid || 0).toString()}
                                onChangeText={(text) => {
                                  const newItems = [...formData.transaction_items];
                                  newItems[index].amount_paid = parseFloat(text) || 0;
                                  setFormData(prev => ({ ...prev, transaction_items: newItems, total_amount: newItems.reduce((sum, i) => sum + (i.amount_paid || 0), 0) }));
                                }}
                                placeholder="0.00" placeholderTextColor={colors['muted-foreground']} keyboardType="numeric" editable={!isSubmitting}
                              />
                            </View>
                          </View>
                          <TextInput
                            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
                            value={item.description}
                            onChangeText={(text) => {
                              const newItems = [...formData.transaction_items];
                              newItems[index].description = text;
                              setFormData(prev => ({ ...prev, transaction_items: newItems }));
                            }}
                            placeholder="Description (optional)" placeholderTextColor={colors['muted-foreground']} editable={!isSubmitting}
                          />
                        </View>
                      ))}

                      {formData.transaction_items.length > 0 && (
                        <View style={[styles.totalContainer, { backgroundColor: colors['info-muted'] as string ?? '#f0f9ff' }]}>
                          <Text style={[styles.totalText, { color: colors['info-muted-foreground'] as string ?? '#1d4ed8' }]}>
                            Total Amount: {formatINR(formData.transaction_items.reduce((sum, i) => sum + (i.amount_paid || 0), 0))}
                          </Text>
                        </View>
                      )}
                      {stepError !== '' && <Text style={styles.errorText}>{stepError}</Text>}
                      <Text style={[styles.label, { color: colors.foreground }]}>Remarks</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                        value={formData.remarks}
                        onChangeText={(text) => setFormData(prev => ({ ...prev, remarks: text }))}
                        placeholder="Enter remarks" placeholderTextColor={colors['muted-foreground']} multiline editable={!isSubmitting}
                      />
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={() => setIsModalVisible(false)}>
                    <Text style={{ color: colors.foreground }}>Cancel</Text>
                  </TouchableOpacity>
                  {currentStep > 1 && (
                    <TouchableOpacity
                      style={[styles.secondaryButton, { borderColor: colors.border }]}
                      onPress={() => { setStepError(''); setCurrentStep(prev => prev - 1); }}
                      disabled={isSubmitting}
                    >
                      <Text style={{ color: isSubmitting ? colors['muted-foreground'] : colors.foreground }}>Previous</Text>
                    </TouchableOpacity>
                  )}
                  {currentStep < 3 ? (
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: isSubmitting ? colors['muted-foreground'] : colors.primary }]}
                      onPress={() => {
                        if (currentStep === 1 && !formData.student_id) { setStepError('Please select a student'); return; }
                        if (currentStep === 2 && !formData.transaction_date) { setStepError('Please enter transaction date'); return; }
                        setStepError('');
                        setCurrentStep(prev => prev + 1);
                      }}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.submitButtonText}>Next</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.submitButton, { backgroundColor: colors.primary }]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.submitButtonText}>
                        {isSubmitting ? 'Saving...' : editingTransaction ? 'Update' : 'Create'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Modal>


          {/* Outstanding Fees Modal */}
          <Modal visible={outstandingFeesModal.visible} animationType="slide" transparent={true} onRequestClose={() => setOutstandingFeesModal(prev => ({ ...prev, visible: false }))}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    Outstanding Fees - {outstandingFeesModal.studentName}
                  </Text>
                  <TouchableOpacity onPress={() => setOutstandingFeesModal(prev => ({ ...prev, visible: false }))}
              accessibilityLabel="Close">
                    <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.form}>
                  {outstandingFees.length > 0 ? (
                    outstandingFees.map((fee, index) => (
                      <View key={index} style={[styles.outstandingFeeItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.outstandingFeeText, { color: colors.foreground }]}>Total Amount: {formatINR(fee.total_amount ?? 0)}</Text>
                        <Text style={[styles.outstandingFeeText, { color: colors['muted-foreground'] }]}>Date: {fee.transaction_date ? new Date(fee.transaction_date).toLocaleDateString() : 'N/A'}</Text>
                        <Text style={[styles.outstandingFeeText, { color: colors['muted-foreground'] }]}>Items: {fee.transaction_items?.length || 0}</Text>
                        <Text style={[styles.outstandingFeeText, { color: colors['muted-foreground'] }]}>Remarks: {fee.remarks || 'N/A'}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.outstandingFeeText, { textAlign: 'center', color: colors['muted-foreground'] }]}>No outstanding fees found</Text>
                  )}
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={() => setOutstandingFeesModal(prev => ({ ...prev, visible: false }))}>
                    <Text style={{ color: colors.foreground }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

        </View>
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}


const styles = StyleSheet.create({
  container:               { flex: 1, padding: 16 },
  centerContainer:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filtersContainer:        { marginBottom: 16, gap: 8 },
  filterLabel:             { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  dateRow:                 { flexDirection: 'row', gap: 12 },
  dateField:               { flex: 1 },
  filterInput:             { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  header:                  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 16 },
  addButton:               { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText:           { color: 'white', marginLeft: 8, fontWeight: '600' },
  listContainer:           { paddingBottom: 20 },
  transactionCard:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, marginBottom: 8, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  transactionInfo:         { flex: 1, marginRight: 8 },
  transactionHeaderRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  serialNo:                { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  transactionId:           { fontSize: 15, fontWeight: '700' },
  statusPill:              { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusPillText:          { fontSize: 11, fontWeight: '600' },
  transactionAmountRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  transactionAmount:       { fontSize: 15, fontWeight: '700' },
  transactionDetails:      { fontSize: 13, marginBottom: 2 },
  actionButtons:           { flexDirection: 'column', gap: 6 },
  actionButton:            { padding: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  emptyContainer:          { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyText:               { marginTop: 16, textAlign: 'center' },
  modalOverlay:            { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent:            { width: '90%', maxWidth: 400, borderRadius: 12, padding: 20, maxHeight: '85%' },
  modalHeader:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:              { fontSize: 18, fontWeight: '600', flex: 1, marginRight: 8 },
  stepIndicator:           { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 20 },
  stepContainer:           { alignItems: 'center' },
  stepCircle:              { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepText:                { fontSize: 16, fontWeight: '600' },
  stepLabel:               { fontSize: 12 },
  form:                    { marginBottom: 20 },
  label:                   { marginBottom: 8, fontWeight: '600' },
  input:                   { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  errorText:               { color: '#dc2626', fontSize: 13, marginBottom: 8, marginTop: -8 },
  itemsHeader:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addItemButton:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addItemText:             { color: 'white', marginLeft: 4, fontSize: 14, fontWeight: '600' },
  itemCard:                { padding: 16, marginBottom: 12, borderRadius: 8, borderWidth: 1 },
  itemHeader:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemTitle:               { fontSize: 16, fontWeight: '600' },
  amountRow:               { flexDirection: 'row', gap: 12, marginBottom: 12 },
  amountField:             { flex: 1 },
  amountLabel:             { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  totalContainer:          { padding: 16, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  totalText:               { fontSize: 18, fontWeight: '600' },
  modalActions:            { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelButton:            { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  secondaryButton:         { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  submitButton:            { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText:        { color: 'white', fontWeight: '600' },
  retryButton:             { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  outstandingFeeItem:      { padding: 12, marginBottom: 8, borderRadius: 8, borderWidth: 1 },
  outstandingFeeText:      { fontSize: 14, marginBottom: 4 },
});
