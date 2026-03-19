import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { useExpenseTransactionProtected, useApproveExpenseTransactionProtected, useExpenseAttachmentsProtected } from '@/hooks/use-expense-protected';
import { ReadPermissionGuard, ApprovePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ExpenseTransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');

  const transactionId = Array.isArray(id) ? id[0] : id;

  const { data: transaction, isLoading, error, refetch } = useExpenseTransactionProtected(transactionId);
  const { data: attachments = [] } = useExpenseAttachmentsProtected(transactionId);
  const approveMutation = useApproveExpenseTransactionProtected();

  // Debug logging
  console.log('Transaction Detail - ID:', transactionId);
  console.log('Transaction Detail - Data:', transaction);
  console.log('Transaction Detail - Attachments:', attachments);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'paid': return '#3B82F6';
      case 'cancelled': return '#EF4444';
      default: return colors['muted-foreground'];
    }
  };

  const handleApprove = () => {
    console.log('Handle Approve - Transaction ID:', transactionId);
    console.log('Handle Approve - Transaction status:', transaction?.status);
    setApprovalAction('approve');
    setApprovalComment('');
    setApprovalModalVisible(true);
  };

  const handleReject = () => {
    console.log('Handle Reject - Transaction ID:', transactionId);
    console.log('Handle Reject - Transaction status:', transaction?.status);
    setApprovalAction('reject');
    setApprovalComment('');
    setApprovalModalVisible(true);
  };

  const handleApprovalSubmit = () => {
    if (!approvalComment.trim()) {
      Alert.alert('Error', 'Please enter an approval comment');
      return;
    }

    console.log('Approval submit - Action:', approvalAction);
    console.log('Approval submit - Comment:', approvalComment);

    approveMutation.mutate({ id: transactionId, data: { action: approvalAction, approval_comment: approvalComment.trim() } });
  };

  if (isLoading) {
    return (
      <AppLayout title="Transaction Details">
        <View style={styles.centerContainer}>
          <ThemedText>Loading transaction...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error || !transaction) {
    return (
      <AppLayout title="Transaction Details">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            {error ? 'Error loading transaction' : 'Transaction not found'}
          </ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <ThemedText style={{ color: 'white' }}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
      <AppLayout title="Transaction Details">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Transaction Header */}
        <ThemedView style={[styles.headerCard, { backgroundColor: colors.card }]}>
          <View style={styles.headerTop}>
            <ThemedText type="subtitle" style={styles.vendorName}>
              {transaction.vendor_name}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                {transaction.status}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.amount, { color: colors.primary }]}>
            ₹{transaction.amount.toLocaleString()}
          </ThemedText>

          <ThemedText style={[styles.date, { color: colors['muted-foreground'] }]}>
            {new Date(transaction.transaction_date).toLocaleDateString()}
          </ThemedText>
        </ThemedView>

        {/* Transaction Details */}
        <ThemedView style={[styles.detailCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Details</ThemedText>

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>
              Description:
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {transaction.description}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>
              Expense Type ID:
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {transaction.expense_type_id}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>
              Payment Method:
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {transaction.payment_method}
            </ThemedText>
          </View>

          {transaction.reference_number && (
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>
                Reference Number:
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {transaction.reference_number}
              </ThemedText>
            </View>
          )}

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>
              Created By:
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {transaction.created_by_user_id}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>
              Created At:
            </ThemedText>
            <ThemedText style={styles.detailValue}>
              {new Date(transaction.created_at).toLocaleString()}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Attachments */}
        {attachments && attachments.length > 0 && (
          <ThemedView style={[styles.detailCard, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Attachments</ThemedText>
            {attachments.map((attachment: any) => (
              <View key={attachment.id} style={styles.attachmentRow}>
                <Ionicons name="document-outline" size={20} color={colors.primary} />
                <View style={styles.attachmentInfo}>
                  <ThemedText style={styles.attachmentName}>
                    {attachment.original_filename}
                  </ThemedText>
                  <ThemedText style={[styles.attachmentMeta, { color: colors['muted-foreground'] }]}>
                    {attachment.document_type} • {(attachment.file_size / 1024).toFixed(1)} KB
                  </ThemedText>
                </View>
                <TouchableOpacity style={styles.downloadButton}>
                  <Ionicons name="download-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </ThemedView>
        )}

        {/* Action Buttons */}
        {(() => {
          console.log('Action Buttons - Transaction status check:', transaction.status);
          console.log('Action Buttons - Is pending?', transaction.status === 'pending');
          return transaction.status === 'pending' && (
            <ApprovePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_APPROVALS}>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={approveMutation.isPending}
                >
                  <Ionicons name="close" size={16} color="white" />
                  <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  <Ionicons name="checkmark" size={16} color="white" />
                  <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
                </TouchableOpacity>
              </View>
            </ApprovePermissionGuard>
          );
        })()}

        {/* Approval Modal */}
        <Modal
          visible={approvalModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setApprovalModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">
                  {approvalAction === 'approve' ? 'Approve Transaction' : 'Reject Transaction'}
                </ThemedText>
                <TouchableOpacity onPress={() => setApprovalModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <ThemedText style={styles.modalLabel}>
                  Approval Comment *
                </ThemedText>
                <TextInput
                  style={[styles.commentInput, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  value={approvalComment}
                  onChangeText={setApprovalComment}
                  placeholder={`Enter ${approvalAction} comment`}
                  placeholderTextColor={colors['muted-foreground']}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setApprovalModalVisible(false)}
                >
                  <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, {
                    backgroundColor: approvalAction === 'approve' ? '#10B981' : '#EF4444'
                  }]}
                  onPress={handleApprovalSubmit}
                  disabled={approveMutation.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {approveMutation.isPending ? 'Processing...' :
                     approvalAction === 'approve' ? 'Approve' : 'Reject'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
        </ScrollView>
      </AppLayout>
    </ReadPermissionGuard>
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
  backButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  headerCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vendorName: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
  },
  detailCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailLabel: {
    width: 120,
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  attachmentMeta: {
    fontSize: 12,
  },
  downloadButton: {
    padding: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
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
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    marginBottom: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
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
});