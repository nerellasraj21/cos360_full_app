import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import {
  useExpenseTransactionProtected,
  useApproveExpenseTransactionProtected,
  useExpenseAttachmentsProtected,
  useExpenseTypeDropdownProtected,
  useUploadExpenseAttachmentProtected,
} from '@/hooks/use-expense-protected';
import { ReadPermissionGuard, ApprovePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { ExpenseTypeDropdown } from '@/src/types/expense';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getValidAccessToken, getClientSchema } from '../../../services/authUtils';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  upi: 'UPI',
};

const STATUS_COLORS: Record<string, string> = {
  pending:   '#F59E0B',
  approved:  '#10B981',
  paid:      '#3B82F6',
  cancelled: '#EF4444',
  rejected:  '#EF4444',
};

export default function ExpenseTransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComment, setApprovalComment] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('');
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const transactionId = Array.isArray(id) ? id[0] : id;

  const { data: transaction, isLoading, error } = useExpenseTransactionProtected(transactionId);
  const { data: attachments = [] } = useExpenseAttachmentsProtected(transactionId);
  const { data: typeDropdown = [] } = useExpenseTypeDropdownProtected();
  const approveMutation = useApproveExpenseTransactionProtected();
  const uploadMutation = useUploadExpenseAttachmentProtected();

  const getTypeName = (typeId: string) => {
    const found = (typeDropdown as ExpenseTypeDropdown[]).find((t) => t.id === typeId);
    return found?.name ?? typeId;
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] ?? colors['muted-foreground'];

  const handleApprove = () => {
    setApprovalAction('approve');
    setApprovalComment('');
    setApprovalModalVisible(true);
  };

  const handleReject = () => {
    setApprovalAction('reject');
    setApprovalComment('');
    setApprovalModalVisible(true);
  };

  const handleApprovalSubmit = () => {
    if (!approvalComment.trim()) {
      showError('Error', 'Please enter an approval comment');
      return;
    }
    approveMutation.mutate(
      { id: transactionId, data: { action: approvalAction, approval_comment: approvalComment.trim() } },
      {
        onSuccess: () => {
          setApprovalModalVisible(false);
          showSuccess(
            approvalAction === 'approve' ? 'Approved' : 'Rejected',
            `Transaction has been ${approvalAction === 'approve' ? 'approved' : 'rejected'}.`
          );
        },
        onError: () => showError('Error', `Failed to ${approvalAction} transaction.`),
      }
    );
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadFile({ uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
      }
    } catch {
      showError('Error', 'Failed to pick file');
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadDocType.trim()) {
      showError('Validation', 'Please enter a document type');
      return;
    }
    if (!uploadFile) {
      showError('Validation', 'Please select a file');
      return;
    }
    uploadMutation.mutate(
      {
        transactionId,
        file: uploadFile as any,
        documentType: uploadDocType.trim(),
      },
      {
        onSuccess: () => {
          setUploadModalVisible(false);
          setUploadDocType('');
          setUploadFile(null);
          showSuccess('Uploaded', 'Attachment uploaded successfully.');
        },
        onError: () => showError('Upload Failed', 'Failed to upload attachment.'),
      }
    );
  };

  // Parity fix: use FileSystem.downloadAsync with auth headers — Linking.openURL returns 401
  // on authenticated endpoints in both dev and production Play Store builds
  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const token = await getValidAccessToken(false);
      const schema = await getClientSchema();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (schema) headers.cschema = schema;
      const url = `${API_BASE_URL}/expense/attachments/${attachmentId}/download`;
      const localUri = FileSystem.documentDirectory + filename;
      const result = await FileSystem.downloadAsync(url, localUri, { headers });
      await Sharing.shareAsync(result.uri);
    } catch {
      showError('Download Failed', `Could not download ${filename}. Please try again.`);
    }
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

  const statusColor = getStatusColor(transaction.status);

  return (
    <ReadPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS}>
      <AppLayout title="Transaction Details">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* Header card */}
          <ThemedView style={[styles.headerCard, { backgroundColor: colors.card }]}>
            <View style={styles.headerTop}>
              <ThemedText type="subtitle" style={{ flex: 1 }}>
                {transaction.vendor_name ?? 'N/A'}
              </ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <ThemedText style={[styles.statusText, { color: statusColor }]}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.amount, { color: colors.primary }]}>
              ₹{Number(transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </ThemedText>
            <ThemedText style={[styles.date, { color: colors['muted-foreground'] }]}>
              {new Date(transaction.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </ThemedText>
          </ThemedView>

          {/* Details card */}
          <ThemedView style={[styles.detailCard, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Details</ThemedText>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>Description:</ThemedText>
              <ThemedText style={styles.detailValue}>{transaction.description}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>Expense Type:</ThemedText>
              <ThemedText style={styles.detailValue}>{getTypeName(transaction.expense_type_id)}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>Payment Method:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {PAYMENT_METHOD_LABELS[transaction.payment_method] ?? transaction.payment_method}
              </ThemedText>
            </View>

            {transaction.reference_number ? (
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>Reference No:</ThemedText>
                <ThemedText style={styles.detailValue}>{transaction.reference_number}</ThemedText>
              </View>
            ) : null}

            {transaction.approved_at ? (
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>Approved At:</ThemedText>
                <ThemedText style={styles.detailValue}>
                  {new Date(transaction.approved_at).toLocaleString('en-IN')}
                </ThemedText>
              </View>
            ) : null}

            {transaction.approval_comment ? (
              <View style={styles.detailRow}>
                <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>Approval Note:</ThemedText>
                <ThemedText style={styles.detailValue}>{transaction.approval_comment}</ThemedText>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>Created At:</ThemedText>
              <ThemedText style={styles.detailValue}>
                {new Date(transaction.created_at).toLocaleString('en-IN')}
              </ThemedText>
            </View>
          </ThemedView>

          {/* Attachments */}
          <ThemedView style={[styles.detailCard, { backgroundColor: colors.card }]}>
            <View style={styles.attachmentsHeader}>
              <ThemedText type="subtitle" style={[styles.sectionTitle, { marginBottom: 0 }]}>
                Attachments {(attachments as any[]).length > 0 ? `(${(attachments as any[]).length})` : ''}
              </ThemedText>
              {transaction.status !== 'approved' && transaction.status !== 'cancelled' && (
                <TouchableOpacity
                  style={[styles.addAttachmentBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary }]}
                  onPress={() => { setUploadDocType(''); setUploadFile(null); setUploadModalVisible(true); }}
                >
                  <Ionicons name="attach" size={15} color={colors.primary} />
                  <ThemedText style={[styles.addAttachmentText, { color: colors.primary }]}>Add</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {(attachments as any[]).length === 0 ? (
              <ThemedText style={[styles.noAttachmentsText, { color: colors['muted-foreground'] }]}>
                No attachments yet
              </ThemedText>
            ) : (
              (attachments as any[]).map((attachment: any) => (
                <View key={attachment.id} style={[styles.attachmentRow, { backgroundColor: colors.background }]}>
                  <Ionicons name="document-outline" size={20} color={colors.primary} />
                  <View style={styles.attachmentInfo}>
                    <ThemedText style={styles.attachmentName} numberOfLines={1}>
                      {attachment.original_filename}
                    </ThemedText>
                    <ThemedText style={[styles.attachmentMeta, { color: colors['muted-foreground'] }]}>
                      {attachment.document_type} • {(attachment.file_size / 1024).toFixed(1)} KB
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownload(attachment.id, attachment.original_filename)}
                  >
                    <Ionicons name="download-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ThemedView>

          {/* Bottom actions: Edit + Approve/Reject */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.editButton, { borderColor: colors.primary }]}
              onPress={() => router.push(`/expense/transactions/edit/${transactionId}` as any)}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <ThemedText style={[styles.editButtonText, { color: colors.primary }]}>Edit Transaction</ThemedText>
            </TouchableOpacity>
          </View>

          {transaction.status === 'pending' && (
            <ApprovePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_APPROVALS}>
              <View style={styles.approvalActions}>
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
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Upload Attachment Modal */}
        <Modal
          visible={uploadModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setUploadModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Add Attachment</ThemedText>
                <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <ThemedText style={styles.modalLabel}>Document Type *</ThemedText>
                <TextInput
                  style={[styles.commentInput, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                    minHeight: 44,
                  }]}
                  value={uploadDocType}
                  onChangeText={setUploadDocType}
                  placeholder="e.g. invoice, receipt, quote"
                  placeholderTextColor={colors['muted-foreground']}
                />
                <TouchableOpacity
                  style={[styles.filePickerBtn, {
                    backgroundColor: colors.background,
                    borderColor: uploadFile ? colors.primary : colors.border,
                  }]}
                  onPress={handlePickFile}
                >
                  <Ionicons
                    name={uploadFile ? 'document-text' : 'cloud-upload-outline'}
                    size={20}
                    color={uploadFile ? colors.primary : colors['muted-foreground']}
                  />
                  <ThemedText style={{ color: uploadFile ? colors.primary : colors['muted-foreground'], flex: 1 }} numberOfLines={1}>
                    {uploadFile ? uploadFile.name : 'Tap to select file'}
                  </ThemedText>
                  {uploadFile && (
                    <TouchableOpacity onPress={() => setUploadFile(null)}>
                      <Ionicons name="close-circle" size={18} color={colors['muted-foreground']} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setUploadModalVisible(false)}
                >
                  <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleUploadSubmit}
                  disabled={uploadMutation.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>

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
                <ThemedText style={styles.modalLabel}>Comment *</ThemedText>
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
                    backgroundColor: approvalAction === 'approve' ? '#10B981' : '#EF4444',
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
      </AppLayout>
    </ReadPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  headerCard: {
    padding: 20, borderRadius: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  amount: { fontSize: 32, fontWeight: '700', marginBottom: 4 },
  date: { fontSize: 14 },
  detailCard: {
    padding: 20, borderRadius: 12, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  sectionTitle: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', marginBottom: 12 },
  detailLabel: { width: 130, fontSize: 14, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 14 },
  attachmentRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, marginBottom: 8,
  },
  attachmentInfo: { flex: 1, marginLeft: 12 },
  attachmentName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  attachmentMeta: { fontSize: 12 },
  downloadButton: { padding: 8 },
  attachmentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addAttachmentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  addAttachmentText: { fontSize: 13, fontWeight: '600' },
  noAttachmentsText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 8 },
  filePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12,
  },
  bottomActions: { marginBottom: 12 },
  editButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 14, borderRadius: 8, borderWidth: 1.5,
  },
  editButtonText: { fontWeight: '600', fontSize: 15 },
  approvalActions: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 24,
  },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderRadius: 8, gap: 8,
  },
  rejectButton: { backgroundColor: '#EF4444' },
  approveButton: { backgroundColor: '#10B981' },
  actionButtonText: { color: 'white', fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: { width: '90%', maxWidth: 400, borderRadius: 12, padding: 20, maxHeight: '80%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  modalBody: { marginBottom: 20 },
  modalLabel: { marginBottom: 8, fontWeight: '600', fontSize: 16 },
  commentInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, minHeight: 80 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  submitButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitButtonText: { color: 'white', fontWeight: '600' },
});
