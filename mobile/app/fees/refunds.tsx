import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear, useAuth } from '@/contexts';
import { FeeRefundResponse, FeeRefundRequest, feeRefundsApi, feeTransactionsApi } from '@/src/api/fees';
import { studentAdmissionsApi } from '@/src/api/students';
import { academicYearsApi } from '@/src/api/masters';
import { useStaffEnrollments } from '../../hooks/use-staff-api';
import { 
  ReadOrListPermissionGuard, 
  CreatePermissionGuard, 
  ApprovePermissionGuard 
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

import type { FeeRefundWithStatus, CreateRefundFormState, RefundReason } from '@/src/types/fee';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';


// Inline INR currency formatter
const formatReason = (reason?: string | null): string =>
  String(reason ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatINR = (amount: number | string | undefined | null): string => {
  const num = Number(amount ?? 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getRefundTransactionId = (refund: any): string => refund?.fee_transaction_id ?? refund?.transaction_id ?? '';

const getRefundDateKey = (refund: any): string => String(refund?.requested_date ?? refund?.refund_date ?? refund?.created_at ?? '').slice(0, 10);

const formatRefundDate = (refund: any): string => {
  const raw = refund?.requested_date ?? refund?.refund_date ?? refund?.created_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '-';
};

export default function FeeRefundsScreen() {
   const { isAuthenticated, isLoading: authLoading, role } = useAuth();
   const router = useRouter();
   const isFeeBlocked = roleBlocksFees(role?.name);

   const [isModalVisible, setIsModalVisible] = useState(false);
   const [editingRefund, setEditingRefund] = useState<FeeRefundWithStatus | null>(null);
   // M-5: Combined approve/reject action modal
   const [actionModal, setActionModal] = useState<{
     visible: boolean;
     refund: FeeRefundWithStatus | null;
     action: 'approve' | 'reject';
   }>({ visible: false, refund: null, action: 'approve' });
   const [actionRemarks, setActionRemarks] = useState('');

   // M-6: Process refund modal with reference number
   const [processModal, setProcessModal] = useState<{
     visible: boolean;
     refund: FeeRefundWithStatus | null;
   }>({ visible: false, refund: null });
   const [processReferenceNumber, setProcessReferenceNumber] = useState('');

  // Cancel refund modal with mandatory reason (matches web's cancel workflow)
  const [cancelModal, setCancelModal] = useState<{
    visible: boolean;
    refund: FeeRefundWithStatus | null;
  }>({ visible: false, refund: null });
  const [cancelReason, setCancelReason] = useState('');

  const [filters, setFilters] = useState({
    status: '',
    student_id: '',
    refund_reason: '',
    requested_date_from: '',
    requested_date_to: '',
  });

  const [summaryModal, setSummaryModal] = useState({
    visible: false,
    transactionId: '',
    transactionDetails: null as any,
  });

  const { colors } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm: confirmModal, modalProps } = useConfirmModal();

  const [formData, setFormData] = useState<CreateRefundFormState>({
    fee_transaction_id: '',
    refund_amount: 0,
    refund_reason: 'fee_adjustment',
    detailed_reason: '',
    student_id: '',
    student_admission_num: '',
    academic_year_id: activeAcademicYearId || '',
    requested_by_user_id: user?.id.toString() || '',
  });

  // Redirect to login if not authenticated
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

  // Queries
  const { data: refunds = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['feeRefunds', activeAcademicYearId],
    queryFn: () => feeRefundsApi.getFeeRefunds(activeAcademicYearId || undefined),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['feeTransactions', activeAcademicYearId],
    queryFn: () => feeTransactionsApi.getFeeTransactions(activeAcademicYearId || undefined),
  });

  const { data: studentsData } = useQuery<{ items: any[]; total_count: number; has_next: boolean }>({
    queryKey: ['studentsAdmissions', activeAcademicYearId],
    queryFn: () => studentAdmissionsApi.getStudentAdmissions({ academic_year_id: activeAcademicYearId || undefined } as any),
  });

  const students = studentsData?.items?.map((student: any) => ({
    id: student.id,
    display_name: `${student.student.first_name} ${student.student.last_name}`,
    admission_number: student.admission_number,
  })) || [];

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academicYearsDropdown'],
    queryFn: academicYearsApi.getAcademicYearsDropdown,
  });

  // C-4: Fetch real staff list from API using the existing hook
  const { data: staffQueryData } = useStaffEnrollments({ limit: 100 });
  const staffList = staffQueryData?.items || [];

  // Summary query
  const { data: refundSummary = null } = useQuery({
    queryKey: ['refundSummary', summaryModal.transactionId],
    queryFn: () => summaryModal.transactionId ? feeRefundsApi.getFeeRefundTransactionSummary(summaryModal.transactionId) : Promise.resolve(null),
    enabled: summaryModal.visible && !!summaryModal.transactionId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: feeRefundsApi.createFeeRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Fee refund created successfully');
    },
    onError: (error) => {
      showError('Failed to create fee refund', error.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: feeRefundsApi.approveFeeRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      showSuccess('Refund approved successfully');
    },
    onError: (error) => {
      showError('Failed to approve refund', error.message);
    },
  });

  const processMutation = useMutation({
    mutationFn: feeRefundsApi.processFeeRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      showSuccess('Refund processed successfully');
    },
    onError: (error) => {
      showError('Failed to process refund', error.message);
    },
  });

  // Proper cancel workflow (POST .../cancel with a reason) — matches web app.
  // Replaces the old hard-DELETE call, which discarded the refund record instead
  // of preserving an audit trail.
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      feeRefundsApi.cancelFeeRefund(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      showSuccess('Refund cancelled successfully');
    },
    onError: (error) => {
      showError('Failed to cancel refund', error.message);
    },
  });

  // C-1: Use actual status from API response; fallback to 'pending' if absent
  const refundsWithStatus: FeeRefundWithStatus[] = refunds.map((refund: any) => ({
    ...refund,
    status: (refund.status as FeeRefundWithStatus['status']) ?? 'pending',
  }));

  // Calculate statistics
  const statistics = refundsWithStatus.reduce(
      (acc, refund) => {
        acc.totalRefunds += 1;
        acc.totalAmount += Number(refund.refund_amount) || 0;
        if (refund.status === 'pending') acc.pendingCount += 1;
        if (refund.status === 'approved') acc.approvedCount += 1;
        if (refund.status === 'processed') acc.processedCount += 1;
        if (refund.status === 'rejected') acc.rejectedCount += 1;
        return acc;
      },
      { totalRefunds: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, processedCount: 0, rejectedCount: 0 }
    );

  const resetForm = () => {
    setFormData({
      fee_transaction_id: '',
      refund_amount: 0,
      refund_reason: 'fee_adjustment',
      detailed_reason: '',
      student_id: '',
      student_admission_num: '',
      academic_year_id: activeAcademicYearId || '',
      requested_by_user_id: user?.id.toString() || '',
    });
    setEditingRefund(null);
  };

  const handleCreate = () => {
    setEditingRefund(null);
    resetForm();
    setIsModalVisible(true);
  };

  // M-5: open combined action modal
  const handleApprove = (refund: FeeRefundWithStatus) => {
    setActionRemarks('');
    setActionModal({ visible: true, refund, action: 'approve' });
  };

  const handleReject = (refund: FeeRefundWithStatus) => {
    setActionRemarks('');
    setActionModal({ visible: true, refund, action: 'reject' });
  };

  const submitActionModal = () => {
    if (!actionModal.refund) return;
    if (!actionRemarks.trim()) {
      showError('Required', 'Please enter remarks before continuing.');
      return;
    }
    approveMutation.mutate({
      refund_id: actionModal.refund.id,
      action: actionModal.action,
      approval_remarks: actionRemarks.trim(),
    });
    setActionModal({ visible: false, refund: null, action: 'approve' });
  };

  // M-6: open process modal with reference number field
  const handleProcess = (refund: FeeRefundWithStatus) => {
    setProcessReferenceNumber('');
    setProcessModal({ visible: true, refund });
  };

  const submitProcessModal = () => {
    if (!processModal.refund) return;
    processMutation.mutate({
      refund_id: processModal.refund.id,
      ...(processReferenceNumber.trim() ? { reference_number: processReferenceNumber.trim() } : {}),
    });
    setProcessModal({ visible: false, refund: null });
  };

  // Opens the reason-collecting cancel modal (web requires cancellation_reason)
  const handleCancel = (refund: FeeRefundWithStatus) => {
    setCancelReason('');
    setCancelModal({ visible: true, refund });
  };

  const submitCancelModal = () => {
    if (!cancelModal.refund) return;
    if (!cancelReason.trim()) {
      showError('Required', 'Please enter a cancellation reason.');
      return;
    }
    cancelMutation.mutate({ id: cancelModal.refund.id, reason: cancelReason.trim() });
    setCancelModal({ visible: false, refund: null });
  };

  const handleViewSummary = (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    setSummaryModal({
      visible: true,
      transactionId,
      transactionDetails: transaction,
    });
  };

  const handleSubmit = () => {
    if (!formData.fee_transaction_id || !formData.refund_amount || !formData.refund_reason) {
      showError('Error', 'Please fill all required fields');
      return;
    }

    if (formData.refund_reason === 'other' && !formData.detailed_reason.trim()) {
      showError('Error', 'Detailed reason is required when reason is "other"');
      return;
    }

    if (formData.refund_amount <= 0) {
      showError('Error', 'Please enter a valid refund amount');
      return;
    }

    // Validate against transaction amount
    const transaction = transactions.find(t => t.id === formData.fee_transaction_id);
    if (transaction && formData.refund_amount > Number(transaction.total_amount)) {
      showError('Error', 'Refund amount cannot exceed transaction amount');
      return;
    }

    const data = {
      fee_transaction_id: formData.fee_transaction_id,
      refund_amount: formData.refund_amount,
      refund_reason: formData.refund_reason,
      detailed_reason: formData.detailed_reason,
      student_id: formData.student_id,
      student_admission_num: formData.student_admission_num,
      academic_year_id: formData.academic_year_id,
      requested_by_user_id: formData.requested_by_user_id,
    };

    createMutation.mutate(data as unknown as FeeRefundRequest);
  };

  const filteredRefunds = refundsWithStatus.filter(refund => {
    const transaction = transactions.find(t => t.id === getRefundTransactionId(refund));
    const student = students.find(s => s.id === ((refund as any).student_id ?? transaction?.student_id));

    if (filters.status && refund.status !== filters.status) return false;
    if (filters.student_id && student?.id !== filters.student_id) return false;
    if (filters.refund_reason && !(refund.refund_reason ?? '').toLowerCase().includes(filters.refund_reason.toLowerCase())) return false;
    if (filters.requested_date_from && getRefundDateKey(refund) < filters.requested_date_from) return false;
    if (filters.requested_date_to && getRefundDateKey(refund) > filters.requested_date_to) return false;
    return true;
  });

  const renderRefundItem = ({ item, index }: { item: FeeRefundWithStatus; index: number }) => {
    const transaction = transactions.find(t => t.id === getRefundTransactionId(item));
    const student = students.find(s => s.id === ((item as any).student_id ?? transaction?.student_id));
    const staffMember = staffList.find((s: any) => s.id === item.processed_by);
    const refundRef = (item as any).refund_number ?? item.id?.slice(-8) ?? 'N/A';

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return '#f59e0b';
        case 'approved': return '#10b981';
        case 'rejected': return colors.destructive;
        case 'processed': return '#3b82f6';
        case 'completed': return '#10b981';
        default: return colors['muted-foreground'];
      }
    };

    return (
      <View style={[styles.refundCard, { backgroundColor: colors.card }]}>
        <View style={styles.refundInfo}>
          <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
          <Text style={[styles.refundIdText, { color: colors.foreground }]}>
            Refund #{refundRef}
          </Text>
          <Text style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Student: {student?.display_name || (item as any).student_admission_num || 'Unknown'}
          </Text>
          {!!transaction?.transaction_number && (
            <Text style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
              Transaction: {transaction.transaction_number}
            </Text>
          )}
          <Text style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Amount: {formatINR(item.refund_amount)}
          </Text>
          <Text style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Reason: {formatReason(item.refund_reason)}
          </Text>
          <Text style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Date: {formatRefundDate(item)}
          </Text>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          {staffMember && (
            <Text style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
              Processed By: {staffMember.first_name} {staffMember.last_name}
            </Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleViewSummary(getRefundTransactionId(item))}
          >
            <Ionicons name="information-circle" size={16} color="white" />
          </TouchableOpacity>

          {item.status === 'pending' && (
            <>
              <ApprovePermissionGuard resource={PERMISSION_RESOURCES.FEE_REFUNDS} fallback={null} loadingFallback={null}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                  onPress={() => handleApprove(item)}
              accessibilityLabel="Confirm"
                >
                  <Ionicons name="checkmark" size={16} color="white" />
                </TouchableOpacity>
              </ApprovePermissionGuard>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.destructive }]}
                onPress={() => handleCancel(item)}
              accessibilityLabel="Close"
              >
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </>
          )}

          {item.status === 'approved' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleProcess(item)}
            >
              <Ionicons name="play" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <AppLayout title="Fee Refunds">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AppLayout>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (isFeeBlocked) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout title="Fee Refunds">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Refunds">
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.destructive }}>
            Error loading fee refunds
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['feeRefunds'] })}
          >
            <Text style={{ color: 'white' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_REFUNDS}>
      <AppLayout title="Fee Refunds">
        <View style={styles.container}>
        <FlatList
          data={filteredRefunds}
          keyExtractor={(item) => item.id}
          renderItem={renderRefundItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View>
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{statistics.totalRefunds}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{formatINR(statistics.totalAmount)}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Amount</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{statistics.pendingCount}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Pending</Text>
          </View>
        </View>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{statistics.approvedCount}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Approved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{statistics.processedCount}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Processed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.destructive }]}>{statistics.rejectedCount}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Rejected</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <CustomDropdown
            data={[
              { value: '', label: 'All Statuses' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'processed', label: 'Processed' },
              { value: 'completed', label: 'Completed' },
            ]}
            value={filters.status}
            onChange={(value) => setFilters(prev => ({ ...prev, status: String(value || '') }))}
            placeholder="Filter by Status"
          />
          <CustomDropdown
            data={[{ value: '', label: 'All Students' }, ...students.map(s => ({ value: s.id, label: s.display_name }))]}
            value={filters.student_id}
            onChange={(value) => setFilters(prev => ({ ...prev, student_id: String(value || '') }))}
            placeholder="Filter by Student"
          />
          <TextInput
            style={[styles.filterInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
            value={filters.refund_reason}
            onChangeText={(text) => setFilters(prev => ({ ...prev, refund_reason: text }))}
            placeholder="Filter by reason..."
            placeholderTextColor={colors['muted-foreground']}
          />
          <View style={styles.filterRow}>
            <TextInput
              style={[styles.filterInput, styles.filterHalf, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={filters.requested_date_from}
              onChangeText={(text) => setFilters(prev => ({ ...prev, requested_date_from: text }))}
              placeholder="From YYYY-MM-DD"
              placeholderTextColor={colors['muted-foreground']}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={[styles.filterInput, styles.filterHalf, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              value={filters.requested_date_to}
              onChangeText={(text) => setFilters(prev => ({ ...prev, requested_date_to: text }))}
              placeholder="To YYYY-MM-DD"
              placeholderTextColor={colors['muted-foreground']}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.header}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_REFUNDS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Request Refund</Text>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No fee refunds found
              </Text>
            </View>
          }
        />

        {/* Modal for Create */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Create Refund</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                <Text style={[styles.label, { color: colors.foreground }]}>Student *</Text>
                <CustomDropdown
                  data={students.map(s => ({
                    value: s.id,
                    label: `${s.display_name} (${s.admission_number})`
                  }))}
                  value={formData.student_id}
                  onChange={(value) => {
                    const studentId = String(value || '');
                    const student = students.find(s => s.id === studentId);
                    setFormData(prev => ({
                      ...prev,
                      student_id: studentId,
                      student_admission_num: student?.admission_number || '',
                      fee_transaction_id: '', // Reset transaction when student changes
                      refund_amount: 0,
                    }));
                  }}
                  placeholder="Select Student"
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Fee Transaction *</Text>
                <CustomDropdown
                  data={formData.student_id ? transactions.filter(t => t.student_id === formData.student_id).map(t => ({
                    value: t.id,
                    label: `${new Date(t.transaction_date || '').toLocaleDateString()} - ${formatINR(t.total_amount)} (${String(t.payment_method ?? '').replace(/_/g, ' ')})`
                  })) : []}
                  value={formData.fee_transaction_id}
                  onChange={(value) => {
                    const transactionId = String(value || '');
                    const transaction = transactions.find(t => t.id === transactionId);
                    setFormData(prev => ({
                      ...prev,
                      fee_transaction_id: transactionId,
                      refund_amount: Number(transaction?.total_amount) || 0,
                    }));
                  }}
                  placeholder={formData.student_id ? "Select Transaction" : "Select Student First"}
                  disabled={!formData.student_id}
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Refund Amount *</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  value={formData.refund_amount.toString()}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, refund_amount: parseFloat(text) || 0 }))}
                  placeholder="Enter refund amount"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Refund Reason *</Text>
                <CustomDropdown
                  data={[
                    { value: 'fee_adjustment', label: 'Fee Adjustment' },
                    { value: 'student_withdrawal', label: 'Student Withdrawal' },
                    { value: 'excess_payment', label: 'Excess Payment' },
                    { value: 'other', label: 'Other' },
                  ]}
                  value={formData.refund_reason}
                  onChange={(value) => setFormData(prev => ({ ...prev, refund_reason: value as RefundReason }))}
                  placeholder="Select Reason"
                />

                {formData.refund_reason === 'other' && (
                  <>
                    <Text style={[styles.label, { color: colors.foreground }]}>Detailed Reason *</Text>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.border,
                      }]}
                      value={formData.detailed_reason}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, detailed_reason: text }))}
                      placeholder="Enter detailed reason"
                      placeholderTextColor={colors['muted-foreground']}
                      multiline
                      numberOfLines={3}
                    />
                  </>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={{ color: colors.foreground }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  <Text style={styles.submitButtonText}>
                    {createMutation.isPending ? 'Creating...' : 'Create Refund'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Summary Modal */}
        <Modal
          visible={summaryModal.visible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSummaryModal(prev => ({ ...prev, visible: false }))}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Refund Summary{summaryModal.transactionDetails?.transaction_number ? ` - ${summaryModal.transactionDetails.transaction_number}` : ''}
                </Text>
                <TouchableOpacity onPress={() => setSummaryModal(prev => ({ ...prev, visible: false }))}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                {refundSummary ? (
                  <View>
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      Total Refunded: {formatINR(refundSummary.total_refunded)}
                    </Text>
                    <Text style={[styles.summaryText, { color: colors.foreground }]}>
                      Number of Refunds: {refundSummary.refunds?.length ?? 0}
                    </Text>
                    {refundSummary.refunds?.map((refund, index) => (
                      <View key={index} style={[styles.summaryRefundItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[styles.summaryRefundText, { color: colors.foreground }]}>
                          Amount: {formatINR(refund.refund_amount)}
                        </Text>
                        <Text style={[styles.summaryRefundText, { color: colors['muted-foreground'] }]}>
                          Reason: {formatReason(refund.refund_reason)}
                        </Text>
                        <Text style={[styles.summaryRefundText, { color: colors['muted-foreground'] }]}>
                          Date: {formatRefundDate(refund)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setSummaryModal(prev => ({ ...prev, visible: false }))}
                >
                  <Text style={{ color: colors.foreground }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* M-5: Combined Approve / Reject Action Modal with action selector */}
        <Modal
          visible={actionModal.visible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setActionModal({ visible: false, refund: null, action: 'approve' })}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Process Refund Action</Text>
                <TouchableOpacity onPress={() => setActionModal({ visible: false, refund: null, action: 'approve' })}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
                <Text style={[styles.label, { color: colors.foreground }]}>Action *</Text>
                <CustomDropdown
                  data={[
                    { value: 'approve', label: 'Approve' },
                    { value: 'reject', label: 'Reject' },
                  ]}
                  value={actionModal.action}
                  onChange={(value) =>
                    setActionModal(prev => ({
                      ...prev,
                      action: ((value as string) || 'approve') as 'approve' | 'reject',
                    }))
                  }
                  placeholder="Select Action"
                />

                <Text style={[styles.label, { color: colors.foreground, marginTop: 12 }]}>Remarks *</Text>
                <TextInput
                  value={actionRemarks}
                  onChangeText={setActionRemarks}
                  placeholder="Enter remarks..."
                  placeholderTextColor={colors['muted-foreground']}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  }]}
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setActionModal({ visible: false, refund: null, action: 'approve' })}
                >
                  <Text style={{ color: colors.foreground }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, {
                    backgroundColor: actionModal.action === 'approve' ? '#10B981' : '#EF4444',
                  }]}
                  onPress={submitActionModal}
                  disabled={approveMutation.isPending}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {actionModal.action === 'approve' ? 'Approve' : 'Reject'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* M-6: Process Refund Modal with Reference Number input */}
        <Modal
          visible={processModal.visible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setProcessModal({ visible: false, refund: null })}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Process Refund</Text>
                <TouchableOpacity onPress={() => setProcessModal({ visible: false, refund: null })}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                {processModal.refund && (
                  <Text style={[styles.refundDetails, { color: colors['muted-foreground'], marginBottom: 12 }]}>
                    Processing refund {(processModal.refund as any).refund_number ?? processModal.refund.id?.slice(-8) ?? 'N/A'} for {formatINR(processModal.refund.refund_amount)}
                  </Text>
                )}
                <Text style={[styles.label, { color: colors.foreground }]}>Reference Number (optional)</Text>
                <TextInput
                  value={processReferenceNumber}
                  onChangeText={setProcessReferenceNumber}
                  placeholder="Enter reference number"
                  placeholderTextColor={colors['muted-foreground']}
                  style={[styles.input, {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  }]}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setProcessModal({ visible: false, refund: null })}
                >
                  <Text style={{ color: colors.foreground }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={submitProcessModal}
                  disabled={processMutation.isPending}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {processMutation.isPending ? 'Processing...' : 'Process'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Cancel Refund Modal — collects a mandatory reason, matches web's cancel workflow */}
        <Modal
          visible={cancelModal.visible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setCancelModal({ visible: false, refund: null })}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>Cancel Refund</Text>
                <TouchableOpacity onPress={() => setCancelModal({ visible: false, refund: null })}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                {cancelModal.refund && (
                  <Text style={[styles.refundDetails, { color: colors['muted-foreground'], marginBottom: 12 }]}>
                    Cancelling refund {(cancelModal.refund as any).refund_number ?? cancelModal.refund.id?.slice(-8) ?? 'N/A'} for {formatINR(cancelModal.refund.refund_amount)}
                  </Text>
                )}
                <Text style={[styles.label, { color: colors.foreground }]}>Cancellation Reason *</Text>
                <TextInput
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="Enter reason for cancellation..."
                  placeholderTextColor={colors['muted-foreground']}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInput, {
                    borderColor: colors.border,
                    color: colors.foreground,
                    backgroundColor: colors.background,
                  }]}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setCancelModal({ visible: false, refund: null })}
                >
                  <Text style={{ color: colors.foreground }}>Keep Refund</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: '#EF4444' }]}
                  onPress={submitCancelModal}
                  disabled={cancelMutation.isPending}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        </View>
        <ConfirmModal {...modalProps} />
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  refundCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refundInfo: {
    flex: 1,
  },
  refundId: {
    marginBottom: 4,
  },
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  refundIdText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  refundDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  statusContainer: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
    flexShrink: 1,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
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
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 72,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 16,
  },
  summaryRefundItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryRefundText: {
    fontSize: 14,
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterHalf: {
    flex: 1,
  },
});