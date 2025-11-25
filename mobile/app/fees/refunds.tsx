import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear, useAuth } from '@/contexts';
import { FeeRefundResponse, FeeRefundRequest, feeRefundsApi, feeTransactionsApi } from '@/src/api/fees';
import { studentAdmissionsApi } from '@/src/api/students';
import { academicYearsApi } from '@/src/api/masters';
import { staffApi } from '@/src/api/staff';
import { 
  ReadOrListPermissionGuard, 
  CreatePermissionGuard, 
  ApprovePermissionGuard 
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { Staff } from '@/src/types/masters/staff';
import { FeeRefundWithStatus, CreateRefundFormState, RefundReason } from '@/src/types/fees';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';


export default function FeeRefundsScreen() {
   const { isAuthenticated, isLoading: authLoading } = useAuth();
   const router = useRouter();

   const [isModalVisible, setIsModalVisible] = useState(false);
   const [editingRefund, setEditingRefund] = useState<FeeRefundWithStatus | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    student_id: '',
  });

  const [summaryModal, setSummaryModal] = useState({
    visible: false,
    transactionId: '',
    transactionDetails: null as any,
  });

  const [statistics, setStatistics] = useState({
    totalRefunds: 0,
    totalAmount: 0,
    pendingCount: 0,
    approvedCount: 0,
    processedCount: 0,
  });

  const { colors } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

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

  // Queries
  const { data: refunds = [], isLoading, error } = useQuery({
    queryKey: ['feeRefunds', activeAcademicYearId],
    queryFn: () => feeRefundsApi.getFeeRefunds(activeAcademicYearId || undefined),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['feeTransactions', activeAcademicYearId],
    queryFn: () => feeTransactionsApi.getFeeTransactions(activeAcademicYearId || undefined),
  });

  const { data: studentsData } = useQuery<{ items: any[]; total_count: number; has_next: boolean }>({
    queryKey: ['studentsAdmissions', activeAcademicYearId],
    queryFn: () => studentAdmissionsApi.getStudentAdmissions({ academic_year_id: activeAcademicYearId || undefined }),
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

  // TODO: Add staff query when API is fixed
  const staff: Staff[] = [];

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

  const deleteMutation = useMutation({
    mutationFn: feeRefundsApi.deleteFeeRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      showSuccess('Refund cancelled successfully');
    },
    onError: (error) => {
      showError('Failed to cancel refund', error.message);
    },
  });

  // Calculate status for each refund (simplified logic)
  const refundsWithStatus: FeeRefundWithStatus[] = refunds.map(refund => ({
    ...refund,
    status: 'pending' as const, // Default to pending, would be determined by backend workflow
  }));

  // Calculate statistics
  useEffect(() => {
    const stats = refundsWithStatus.reduce(
      (acc, refund) => {
        acc.totalRefunds += 1;
        acc.totalAmount += Number(refund.refund_amount) || 0;
        if (refund.status === 'pending') acc.pendingCount += 1;
        if (refund.status === 'approved') acc.approvedCount += 1;
        if (refund.status === 'processed') acc.processedCount += 1;
        return acc;
      },
      { totalRefunds: 0, totalAmount: 0, pendingCount: 0, approvedCount: 0, processedCount: 0 }
    );
    setStatistics(stats);
  }, [refundsWithStatus]);

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

  const handleApprove = (refund: FeeRefundWithStatus) => {
    Alert.alert(
      'Approve Refund',
      `Are you sure you want to approve refund ${refund.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => approveMutation.mutate({ refund_id: refund.id }),
        },
      ]
    );
  };

  const handleProcess = (refund: FeeRefundWithStatus) => {
    Alert.alert(
      'Process Refund',
      `Are you sure you want to process refund ${refund.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: () => processMutation.mutate({ refund_id: refund.id }),
        },
      ]
    );
  };

  const handleCancel = (refund: FeeRefundWithStatus) => {
    Alert.alert(
      'Cancel Refund',
      `Are you sure you want to cancel refund ${refund.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(refund.id),
        },
      ]
    );
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
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (formData.refund_reason === 'other' && !formData.detailed_reason.trim()) {
      Alert.alert('Error', 'Detailed reason is required when reason is "other"');
      return;
    }

    if (formData.refund_amount <= 0) {
      Alert.alert('Error', 'Please enter a valid refund amount');
      return;
    }

    // Validate against transaction amount
    const transaction = transactions.find(t => t.id === formData.fee_transaction_id);
    if (transaction && formData.refund_amount > transaction.total_amount) {
      Alert.alert('Error', 'Refund amount cannot exceed transaction amount');
      return;
    }

    const data: FeeRefundRequest = {
      transaction_id: formData.fee_transaction_id,
      refund_amount: formData.refund_amount,
      refund_reason: formData.refund_reason,
      refund_date: new Date().toISOString().split('T')[0],
      processed_by: formData.requested_by_user_id,
      refund_method: 'cash',
      academic_year_id: formData.academic_year_id,
    };

    createMutation.mutate(data);
  };

  const filteredRefunds = refundsWithStatus.filter(refund => {
    const transaction = transactions.find(t => t.id === refund.transaction_id);
    const student = students.find(s => s.id === transaction?.student_id);

    if (filters.status && refund.status !== filters.status) return false;
    if (filters.student_id && student?.id !== filters.student_id) return false;
    return true;
  });

  const renderRefundItem = ({ item }: { item: FeeRefundWithStatus }) => {
    const transaction = transactions.find(t => t.id === item.transaction_id);
    const student = students.find(s => s.id === transaction?.student_id);
    const staffMember = staff.find(s => s.id === item.processed_by);

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
      <ThemedView style={[styles.refundCard, { backgroundColor: colors.card }]}>
        <View style={styles.refundInfo}>
          <ThemedText type="subtitle" style={styles.refundId}>
            Refund #{item.id?.slice(-8) || 'N/A'}
          </ThemedText>
          <ThemedText style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Student: {student?.display_name || 'Unknown'}
          </ThemedText>
          <ThemedText style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Transaction: {transaction?.id?.slice(-8) || item.transaction_id?.slice(-8) || 'N/A'}
          </ThemedText>
          <ThemedText style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Amount: ₹{item.refund_amount ?? 0}
          </ThemedText>
          <ThemedText style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Reason: {item.refund_reason}
          </ThemedText>
          <ThemedText style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
            Date: {new Date(item.refund_date).toLocaleDateString()}
          </ThemedText>
          <View style={styles.statusContainer}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </ThemedText>
          </View>
          {staffMember && (
            <ThemedText style={[styles.refundDetails, { color: colors['muted-foreground'] }]}>
              Processed By: {staffMember.first_name} {staffMember.last_name}
            </ThemedText>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleViewSummary(item.transaction_id)}
          >
            <Ionicons name="information-circle" size={16} color="white" />
          </TouchableOpacity>

          {item.status === 'pending' && (
            <>
              <ApprovePermissionGuard resource={PERMISSION_RESOURCES.FEE_REFUNDS}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#10b981' }]}
                  onPress={() => handleApprove(item)}
                >
                  <Ionicons name="checkmark" size={16} color="white" />
                </TouchableOpacity>
              </ApprovePermissionGuard>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.destructive }]}
                onPress={() => handleCancel(item)}
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
      </ThemedView>
    );
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <AppLayout title="Fee Refunds">
        <View style={styles.centerContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout title="Fee Refunds">
        <View style={styles.centerContainer}>
          <ThemedText>Loading fee refunds...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Refunds">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading fee refunds
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['feeRefunds'] })}
          >
            <ThemedText style={{ color: 'white' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_REFUNDS}>
      <AppLayout title="Fee Refunds">
        <View style={styles.container}>
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <ThemedView style={[styles.statCard, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.statValue}>{statistics.totalRefunds}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total Refunds</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.statCard, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.statValue}>₹{statistics.totalAmount.toFixed(2)}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total Amount</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.statCard, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.statValue}>{statistics.pendingCount}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Pending</ThemedText>
          </ThemedView>
          <ThemedView style={[styles.statCard, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.statValue}>{statistics.approvedCount}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Approved</ThemedText>
          </ThemedView>
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
        </View>

        <View style={styles.header}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_REFUNDS}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
            >
              <Ionicons name="add" size={20} color="white" />
              <ThemedText style={styles.addButtonText}>Request Refund</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

        <FlatList
          data={filteredRefunds}
          keyExtractor={(item) => item.id}
          renderItem={renderRefundItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No fee refunds found
              </ThemedText>
            </ThemedView>
          }
        />

        {/* Modal for Create */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Create Refund</ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.form}>
                <ThemedText style={styles.label}>Student *</ThemedText>
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

                <ThemedText style={styles.label}>Fee Transaction *</ThemedText>
                <CustomDropdown
                  data={formData.student_id ? transactions.filter(t => t.student_id === formData.student_id).map(t => ({
                    value: t.id,
                    label: `${new Date(t.transaction_date || '').toLocaleDateString()} - ₹${t.total_amount} (${t.payment_method})`
                  })) : []}
                  value={formData.fee_transaction_id}
                  onChange={(value) => {
                    const transactionId = String(value || '');
                    const transaction = transactions.find(t => t.id === transactionId);
                    setFormData(prev => ({
                      ...prev,
                      fee_transaction_id: transactionId,
                      refund_amount: transaction?.total_amount || 0,
                    }));
                  }}
                  placeholder={formData.student_id ? "Select Transaction" : "Select Student First"}
                  disabled={!formData.student_id}
                />

                <ThemedText style={styles.label}>Refund Amount *</ThemedText>
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

                <ThemedText style={styles.label}>Refund Reason *</ThemedText>
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
                    <ThemedText style={styles.label}>Detailed Reason *</ThemedText>
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
                  <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {createMutation.isPending ? 'Creating...' : 'Create Refund'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>

        {/* Summary Modal */}
        <Modal
          visible={summaryModal.visible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSummaryModal(prev => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">
                  Refund Summary - Transaction {summaryModal.transactionId?.slice(-8) || 'N/A'}
                </ThemedText>
                <TouchableOpacity onPress={() => setSummaryModal(prev => ({ ...prev, visible: false }))}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.form}>
                {refundSummary ? (
                  <View>
                    <ThemedText style={styles.summaryText}>
                      Total Refunded: ₹{refundSummary.total_refunded ?? 0}
                    </ThemedText>
                    <ThemedText style={styles.summaryText}>
                      Number of Refunds: {refundSummary.refunds?.length ?? 0}
                    </ThemedText>
                    {refundSummary.refunds?.map((refund, index) => (
                      <ThemedView key={index} style={[styles.summaryRefundItem, { backgroundColor: colors.background }]}>
                        <ThemedText style={styles.summaryRefundText}>
                          Amount: ₹{refund.refund_amount ?? 0}
                        </ThemedText>
                        <ThemedText style={[styles.summaryRefundText, { color: colors['muted-foreground'] }]}>
                          Reason: {refund.refund_reason}
                        </ThemedText>
                        <ThemedText style={[styles.summaryRefundText, { color: colors['muted-foreground'] }]}>
                          Date: {new Date(refund.refund_date).toLocaleDateString()}
                        </ThemedText>
                      </ThemedView>
                    ))}
                  </View>
                ) : (
                  <ThemedText style={[styles.summaryText, { textAlign: 'center' }]}>
                    Loading summary...
                  </ThemedText>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setSummaryModal(prev => ({ ...prev, visible: false }))}
                >
                  <ThemedText style={{ color: colors.foreground }}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
        </View>
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
    paddingVertical: 8,
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
  },
  actionButton: {
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
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
});