import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMyDocuments, useDownloadDocument } from '@/src/api/hooks/students/documents';
import { useAuth } from '@/contexts/AuthContext';
import { ReadOrListPermissionGuard, CreatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function MyDocumentsPage() {
  const { colors } = useTheme();
  const { studentId } = useAuth();
  const { data: documentsData, isLoading, error } = useMyDocuments();
  const downloadMutation = useDownloadDocument();

  const documents = documentsData || [];

  const getDocumentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'certificate':
        return 'document';
      case 'medical':
        return 'medical';
      case 'identification':
        return 'card';
      default:
        return 'document';
    }
  };

  const handleView = async (documentId: string) => {
    try {
      const blob = await downloadMutation.mutateAsync(documentId);
      Alert.alert('Success', 'Document opened successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to open document');
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
            onPress={() => handleView(item.id)}
            disabled={downloadMutation.isPending}
          >
            <Ionicons name="eye" size={16} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleView(item.id)}
            disabled={downloadMutation.isPending}
          >
            <Ionicons name="download" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <AppLayout title="My Documents">
        <View style={styles.loadingContainer}>
          <ThemedText>Loading documents...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="My Documents">
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Failed to load documents</ThemedText>
          {!studentId && (
            <ThemedText style={styles.errorSubtext}>
              Please select a student to view documents
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
        <AppLayout title="My Documents">
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access documents
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="My Documents">
        <View style={styles.container}>
          <CreatePermissionGuard 
            resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}>
            <TouchableOpacity style={[styles.uploadButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="cloud-upload" size={20} color="white" />
              <ThemedText style={styles.uploadButtonText}>Upload New Document</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>

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
                You don't have any documents yet
              </ThemedText>
            </View>
          }
        />
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
});