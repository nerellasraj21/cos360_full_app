import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Linking } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMyDocuments, useUploadMyDocument, useDownloadDocument } from '@/src/api/hooks/students/documents';
import { useStudentProfile } from '@/src/api/hooks/profile/useStudentProfile';
import { useAuth } from '@/contexts/AuthContext';
import { ReadOrListPermissionGuard, CreatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

export default function MyDocumentsPage() {
  const { colors } = useTheme();
  const { showError, showInfo } = useToastContext();
  const { studentId, role, selectedStudent } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
  const pageTitle = isParent ? 'Child Documents' : 'My Documents';
  const { data: documentsData, isLoading, error } = useMyDocuments();
  const downloadMutation = useDownloadDocument();
  const uploadMutation = useUploadMyDocument();

  // Own name/admission number/class, same as the web app's Student Documents
  // header (GET /profile/student/me) — students never see a student picker.
  const { data: profile } = useStudentProfile({ enabled: !isParent && !!studentId });
  const fullName = profile ? `${profile.first_name} ${profile.last_name ?? ''}`.trim() : '';
  const classLabel = profile?.class_name
    ? `${profile.class_name}${profile.section_name ? ` - ${profile.section_name}` : ''}`
    : '';
  const meta = [profile?.admission_number, classLabel].filter(Boolean).join(' · ');
  const studentHeaderTitle = !isParent && fullName
    ? `Documents — ${fullName}${meta ? ` (${meta})` : ''}`
    : isParent && selectedStudent
    ? `${selectedStudent.first_name}'s Documents`
    : undefined;

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const documents = documentsData || [];

  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'certificate': return 'document';
      case 'medical': return 'medical';
      case 'identification': return 'card';
      default: return 'document';
    }
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
    if (!uploadType.trim() || !uploadFile) {
      showError('Validation', 'Please enter a document type and select a file');
      return;
    }
    uploadMutation.mutate(
      { document_type: uploadType.trim(), document_file: { uri: uploadFile.uri, type: uploadFile.type, name: uploadFile.name } },
      {
        onSuccess: () => {
          setShowUploadModal(false);
          setUploadType('');
          setUploadFile(null);
        },
      }
    );
  };

  const handleDownload = async (documentId: string) => {
    try {
      const blob = await downloadMutation.mutateAsync(documentId);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await Linking.openURL(reader.result as string);
        } catch {
          showInfo('Info', 'Document downloaded. Check your device to open it.');
        }
      };
      reader.onerror = () => showError('Error', 'Failed to process document');
      reader.readAsDataURL(blob);
    } catch {
      showError('Error', 'Failed to download document');
    }
  };

  const renderDocument = ({ item }: { item: any }) => (
    <ThemedView style={[styles.documentCard, { backgroundColor: colors.card }]}>
      <View style={styles.documentHeader}>
        <View style={styles.documentIcon}>
          <Ionicons name={getDocumentIcon(item.document_type) as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.documentInfo}>
          <ThemedText type="subtitle" style={styles.documentName}>
            {item.document_name}
          </ThemedText>
          <ThemedText style={styles.documentType}>{item.document_type}</ThemedText>
        </View>
      </View>

      <View style={styles.documentFooter}>
        <View style={styles.documentMeta}>
          <ThemedText style={styles.uploadDate}>
            Uploaded: {item.uploaded_at ? new Date(item.uploaded_at).toLocaleDateString() : 'N/A'}
          </ThemedText>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleDownload(item.id)}
            disabled={downloadMutation.isPending}
              accessibilityLabel="View"
          >
            <Ionicons name="eye" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleDownload(item.id)}
            disabled={downloadMutation.isPending}
              accessibilityLabel="Download"
          >
            <Ionicons name="download" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <AppLayout title={pageTitle}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading documents...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title={pageTitle}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Failed to load documents</ThemedText>
          {(isParent ? !selectedStudent : !studentId) && (
            <ThemedText style={styles.errorSubtext}>
              {isParent ? 'Select a student from the header' : 'Please select a student to view documents'}
            </ThemedText>
          )}
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}
      fallback={
        <AppLayout title={pageTitle}>
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access documents
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title={pageTitle}>
        <View style={styles.container}>
          {!isParent && (
            <CreatePermissionGuard
              resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}>
              <TouchableOpacity
                style={[styles.uploadButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowUploadModal(true)}
              >
                <Ionicons name="cloud-upload" size={20} color="white" />
                <ThemedText style={styles.uploadButtonText}>Upload New Document</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          )}

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {studentHeaderTitle && (
            <ThemedText type="subtitle" style={styles.cardTitle}>{studentHeaderTitle}</ThemedText>
          )}
          <FlatList
            data={documents}
            renderItem={renderDocument}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="folder" size={64} color={colors['muted-foreground']} />
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  No Documents Found
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  {isParent && !selectedStudent
                    ? 'Select a student from the header'
                    : isParent
                    ? `${selectedStudent!.first_name} doesn't have any documents yet`
                    : 'Documents issued to you will appear here.'}
                </ThemedText>
              </View>
            }
          />
        </View>
        </View>
      </AppLayout>

      {/* Upload Document Modal */}
      <Modal visible={showUploadModal} transparent animationType="slide" onRequestClose={() => setShowUploadModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={styles.modalTitle}>Upload Document</ThemedText>
              <TouchableOpacity onPress={() => { setShowUploadModal(false); setUploadType(''); setUploadFile(null); }}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ThemedText style={styles.fieldLabel}>Document Type *</ThemedText>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                value={uploadType}
                onChangeText={setUploadType}
                placeholder="e.g. Birth Certificate, ID Proof..."
                placeholderTextColor={colors['muted-foreground']}
              />
              <ThemedText style={[styles.fieldLabel, { marginTop: 10 }]}>File *</ThemedText>
              <TouchableOpacity
                style={[styles.filePicker, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={handlePickFile}
              >
                <Ionicons name="attach-outline" size={18} color={colors.primary} />
                <ThemedText style={[styles.filePickerText, { color: uploadFile ? colors.foreground : colors['muted-foreground'] }]}>
                  {uploadFile ? uploadFile.name : 'Tap to attach file'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: uploadMutation.isPending ? '#9CA3AF' : colors.primary }]}
                onPress={handleUploadSubmit}
                disabled={uploadMutation.isPending}
              >
                <Ionicons name="cloud-upload-outline" size={16} color="white" />
                <ThemedText style={styles.submitBtnText}>
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  uploadButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  documentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    marginBottom: 4,
  },
  documentType: {
    fontSize: 14,
    opacity: 0.7,
  },
  documentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentMeta: {
    flex: 1,
  },
  uploadDate: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    opacity: 0.75,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
    gap: 8,
    marginTop: 4,
  },
  filePickerText: {
    fontSize: 14,
    flex: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});