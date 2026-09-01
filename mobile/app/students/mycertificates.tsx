import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMyCertificates, useDownloadCertificateDocument } from '@/src/api/hooks/students/certificates';
import { useAuth } from '@/contexts/AuthContext';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';
import { useToastContext } from '@/components/ToastProvider';

// Screen-level access control — mirrors the web's CertificatePage guard
// (`student_certificates` list / list_own / list_related), so a student holding
// only own-scoped permissions is not denied.
export default function MyCertificatesPage() {
  const { role } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  return (
    <ScreenAccessGate
      title={isParent ? 'Child Certificates' : 'My Certificates'}
      resources={['student_certificates']}
      permissions={[
        ['student_certificates', 'read_own'],
        ['student_certificates', 'list_own'],
        ['student_certificates', 'read_related'],
        ['student_certificates', 'list_related'],
      ]}
      message="You don't have permission to view Certificates."
    >
      <MyCertificatesContent />
    </ScreenAccessGate>
  );
}

function MyCertificatesContent() {
  const { colors } = useTheme();
  const { showError } = useToastContext();
  const { studentId, role, selectedStudent } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
  const pageTitle = isParent ? 'Child Certificates' : 'My Certificates';
  const { data: certificates, isLoading, error } = useMyCertificates();
  const downloadMutation = useDownloadCertificateDocument();

  const items = certificates ?? [];

  const handleDownload = async (certificateId: string) => {
    try {
      const result = await downloadMutation.mutateAsync(certificateId);
      if (result?.presigned_url) {
        await Linking.openURL(result.presigned_url);
      } else {
        showError('Error', 'No download link available for this certificate');
      }
    } catch {
      showError('Error', 'Failed to download certificate');
    }
  };

  const renderCertificate = ({ item, index }: { item: any; index: number }) => (
    <ThemedView style={[styles.certificateCard, { backgroundColor: colors.card }]}>
      <View style={styles.certificateHeader}>
        <View style={styles.certificateIcon}>
          <Ionicons name="document" size={24} color={colors.primary} />
        </View>
        <View style={styles.certificateInfo}>
          <ThemedText style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</ThemedText>
          <ThemedText type="subtitle" style={styles.certificateName}>
            {item.type_name || 'Certificate'}
          </ThemedText>
          <ThemedText style={styles.certificateType}>
            {item.remarks || 'No remarks'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.certificateFooter}>
        <View style={styles.footerMeta}>
          <ThemedText style={styles.issueDate}>
            Issued: {item.issue_date ? new Date(item.issue_date).toLocaleDateString() : 'N/A'}
          </ThemedText>
          {item.file_path ? (
            <View style={[styles.fileBadge, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="document-text-outline" size={11} color={colors.primary} />
              <ThemedText style={[styles.fileBadgeText, { color: colors.primary }]}>Uploaded</ThemedText>
            </View>
          ) : (
            <View style={[styles.fileBadge, { backgroundColor: `${colors['muted-foreground']}18` }]}>
              <ThemedText style={[styles.fileBadgeText, { color: colors['muted-foreground'] }]}>No file</ThemedText>
            </View>
          )}
        </View>
        {item.file_path ? (
          <TouchableOpacity
            style={[styles.downloadButton, { backgroundColor: colors.primary }]}
            onPress={() => handleDownload(item.id)}
            disabled={downloadMutation.isPending}
          >
            <Ionicons name="download" size={16} color="white" />
            <ThemedText style={styles.downloadText}>
              {downloadMutation.isPending ? 'Downloading...' : 'Download'}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <AppLayout title={pageTitle}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading your certificates...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title={pageTitle}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Failed to load certificates</ThemedText>
          {(isParent ? !selectedStudent : !studentId) && (
            <ThemedText style={styles.errorSubtext}>
              {isParent ? 'Select a student from the header' : 'Please select a student to view certificates'}
            </ThemedText>
          )}
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={pageTitle}>
      <View style={styles.container}>
        <FlatList
          data={items}
          renderItem={renderCertificate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.listHeaderTitle}>
                Certificates
              </ThemedText>
              <ThemedText style={[styles.listHeaderCount, { color: colors['muted-foreground'] }]}>
                ({items.length} total)
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No certificates found.
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {isParent && !selectedStudent
                  ? 'Select a student from the header'
                  : isParent
                  ? `Certificates issued to ${selectedStudent!.first_name} will appear here.`
                  : 'Certificates issued to you will appear here.'}
              </ThemedText>
            </View>
          }
        />
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  container: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  listHeaderTitle: {
    fontSize: 16,
  },
  listHeaderCount: {
    fontSize: 13,
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
  listContainer: {
    paddingBottom: 20,
  },
  certificateCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  certificateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  certificateInfo: {
    flex: 1,
  },
  certificateName: {
    marginBottom: 4,
  },
  certificateType: {
    fontSize: 14,
    opacity: 0.7,
  },
  certificateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  issueDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  fileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  fileBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  downloadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
});
