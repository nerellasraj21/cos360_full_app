import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useExpensePendingApprovalsProtected, useApproveExpenseTransactionProtected } from '@/hooks/use-expense-protected';
import { ReadOrListPermissionGuard, ApprovePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ExpenseApprovalsScreen() {
  const { colors } = useTheme();
  const { data: pendingApprovals, isLoading, error } = useExpensePendingApprovalsProtected();
  const approveMutation = useApproveExpenseTransactionProtected();

  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');

  const transactions = Array.isArray(pendingApprovals)
    ? pendingApprovals
    : pendingApprovals?.items || [];

  // Debug logging
  console.log('Expense Approvals - Raw data:', pendingApprovals);
  console.log('Expense Approvals - Processed array:', transactions);

  const handleApprove = (id: string) => {
    setSelectedTransactionId(id);
    setApprovalAction('approve');
    setApprovalComment('');
    setApprovalModalVisible(true);
  };

  const handleReject = (id: string) => {
    setSelectedTransactionId(id);
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

    approveMutation.mutate(
      { id: selectedTransactionId, data: { action: approvalAction, approval_comment: approvalComment.trim() } },
      {
        onSuccess: () => {
          console.log('Approval mutation success');
          setApprovalModalVisible(false);
        },
        onError: (error: any) => {
          console.log('Approval mutation error:', error);
          Alert.alert('Error', `Failed to ${approvalAction} transaction`);
        },
      }
    );
  };

  const renderTransactionItem = ({ item }: { item: any }) => (
    <ThemedView style={[styles.transactionCard, { backgroundColor: colors.card }]}>
      <View style={styles.transactionHeader}>
        <ThemedText type="subtitle" style={styles.vendorName}>
          {item.vendor_name}
        </ThemedText>
        <ThemedText style={[styles.amount, { color: colors.primary }]}>
          ₹{item.amount.toLocaleString()}
        </ThemedText>
      </View>

      <View style={styles.transactionDetails}>
        <ThemedText style={[styles.transactionInfo, { color: colors['muted-foreground'] }]}>
          {item.description}
        </ThemedText>
        <ThemedText style={[styles.transactionInfo, { color: colors['muted-foreground'] }]}>
          {new Date(item.transaction_date).toLocaleDateString()} • Type ID: {item.expense_type_id}
        </ThemedText>
      </View>

      <ApprovePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_APPROVALS}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(item.id)}
          >
            <Ionicons name="close" size={16} color="white" />
            <ThemedText style={styles.actionButtonText}>Reject</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <ThemedText style={styles.actionButtonText}>Approve</ThemedText>
          </TouchableOpacity>
        </View>
      </ApprovePermissionGuard>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <AppLayout title="Expense Approvals">
        <View style={styles.centerContainer}>
          <ThemedText>Loading pending approvals...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Expense Approvals">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading approvals
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_APPROVALS}>
      <AppLayout title="Expense Approvals">
        <View style={styles.container}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No pending approvals
              </ThemedText>
            </View>
          }
        />

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
  listContainer: {
    paddingBottom: 20,
  },
  transactionCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vendorName: {
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
  },
  transactionDetails: {
    marginBottom: 12,
  },
  transactionInfo: {
    fontSize: 14,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
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