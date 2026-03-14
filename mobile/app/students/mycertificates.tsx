import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMyCertificates, useDownloadCertificateDocument } from '@/src/api/hooks/students/certificates';
import { useAuth } from '@/contexts/AuthContext';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function MyCertificatesPage() {
  const { colors } = useTheme();
  const { studentId } = useAuth();
  const { data: certificates, isLoading, error } = useMyCertificates();
  const downloadMutation = useDownloadCertificateDocument();

  const handleDownload = async (certificateId: string) => {
    try {
      const blob = await downloadMutation.mutateAsync(certificateId);
      // Handle download - in React Native, this would typically open the file
      Alert.alert('Success', 'Certificate downloaded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to download certificate');
    }
  };

  const renderCertificate = ({ item }: { item: any }) => (
    <ThemedView style={[styles.certificateCard, { backgroundColor: colors.card }]}>
      <View style={styles.certificateHeader}>
        <View style={styles.certificateIcon}>
          <Ionicons name="document" size={24} color={colors.primary} />
        </View>
        <View style={styles.certificateInfo}>
          <ThemedText type="subtitle" style={styles.certificateName}>
            {item.certificate_type_name || 'Certificate'}
          </ThemedText>
          <ThemedText style={styles.certificateType}>
            {item.description || 'No description'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.certificateFooter}>
        <ThemedText style={styles.issueDate}>
          Issued: {item.issue_date ? new Date(item.issue_date).toLocaleDateString() : 'N/A'}
        </ThemedText>
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
      </View>
    </ThemedView>
  );

  if (isLoading) {
    return (
      <AppLayout title="My Certificates">
        <View style={styles.loadingContainer}>
          <ThemedText>Loading certificates...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="My Certificates">
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>Failed to load certificates</ThemedText>
          {!studentId && (
            <ThemedText style={styles.errorSubtext}>
              Please select a student to view certificates
            </ThemedText>
          )}
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}
      fallback={
        <AppLayout title="My Certificates">
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access certificates
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="My Certificates">
        <View style={styles.container}>
        <FlatList
          data={certificates || []}
          renderItem={renderCertificate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Certificates Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                You don't have any certificates yet
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
  issueDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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