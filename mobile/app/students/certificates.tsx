import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomDropdown } from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { studentCertificatesApi, studentAdmissionsApi, certificateTypesApi } from '@/src/api';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

interface Certificate {
  id: string;
  student_id: string;
  certificate_type_id: string;
  issue_date: string;
  description?: string;
  file_path?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  certificate_type?: string;
  student_name?: string;
  admission_number?: string;
}

interface CertificateType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export default function StudentCertificatesScreen() {
  const router = useRouter();
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();

  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedCertificateType, setSelectedCertificateType] = useState<string>('');

  // Fetch certificates data
  const { data: certificatesData, isLoading, refetch } = useQuery({
    queryKey: ['student-certificates', selectedStudent],
    queryFn: async () => {
      const response = await studentCertificatesApi.listCertificates(selectedStudent ? { student_id: selectedStudent } : undefined);
      return response;
    },
  });

  // Fetch students for dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['students-dropdown'],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      return response.items.map((student: any) => ({
        label: `${student.student.first_name} ${student.student.last_name} (${student.admission_number})`,
        value: student.id
      }));
    },
  });

  // Fetch certificate types
  const { data: certificateTypesData } = useQuery({
    queryKey: ['certificate-types'],
    queryFn: async () => {
      const response = await certificateTypesApi.listCertificateTypes();
      return response.items.map((type: any) => ({
        label: type.name,
        value: type.id
      }));
    },
  });

  // Mutation for uploading certificate
  const uploadCertificateMutation = useMutation({
    mutationFn: studentCertificatesApi.createCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
      Alert.alert('Success', 'Certificate uploaded successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to upload certificate. Please try again.');
      console.error('Upload certificate error:', error);
    },
  });

  const handleUploadCertificate = () => {
    if (!selectedStudent || !selectedCertificateType) {
      Alert.alert('Error', 'Please select a student and certificate type');
      return;
    }

    Alert.alert(
      'Upload Certificate',
      'File picker would be implemented here. Simulating upload...',
      [
        {
          text: 'Simulate Upload',
          onPress: () => {
            // Simulate file upload
            uploadCertificateMutation.mutate({
              student_id: selectedStudent,
              certificate_type_id: selectedCertificateType,
              issue_date: new Date().toISOString().split('T')[0],
              description: 'Certificate description',
              certificate_file: new File([], 'certificate.pdf'), // Mock file
            });
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderCertificateItem = ({ item }: { item: any }) => (
    <View style={[styles.certificateCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.certificateHeader}>
        <View style={styles.certificateInfo}>
          <ThemedText style={styles.certificateType}>{item.certificate_type || 'Certificate'}</ThemedText>
          <ThemedText style={styles.studentName}>
            {item.student_name} ({item.admission_number})
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
          <ThemedText style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.certificateDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            Issued: {new Date(item.issue_date).toLocaleDateString()}
          </ThemedText>
        </View>
        {item.description && (
          <View style={styles.detailRow}>
            <Ionicons name="document-text" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>{item.description}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.certificateActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
          onPress={() => Alert.alert('Download', 'Download functionality would be implemented')}
        >
          <Ionicons name="download" size={16} color="white" />
          <ThemedText style={styles.actionButtonText}>Download</ThemedText>
        </TouchableOpacity>

        <UpdatePermissionGuard 
          resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
            onPress={() => Alert.alert('Edit', 'Edit functionality would be implemented')}
          >
            <Ionicons name="create" size={16} color="white" />
            <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
          </TouchableOpacity>
        </UpdatePermissionGuard>
      </View>
    </View>
  );

  const renderCertificateTypes = () => {
    if (!certificateTypesData) return null;

    return (
      <View style={[styles.section, { backgroundColor: themeColors.card }]}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Certificate Types
        </ThemedText>
        {certificateTypesData.map((type: any) => (
          <View key={type.value} style={styles.certificateTypeRow}>
            <ThemedText style={styles.certificateTypeName}>{type.label}</ThemedText>
            <TouchableOpacity
              style={[styles.selectButton, selectedCertificateType === type.value && { backgroundColor: themeColors.primary }]}
              onPress={() => setSelectedCertificateType(type.value)}
            >
              <ThemedText style={[styles.selectButtonText, selectedCertificateType === type.value && { color: 'white' }]}>
                {selectedCertificateType === type.value ? 'Selected' : 'Select'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access student certificates
            </ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Student Certificates
          </ThemedText>
        </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <View style={[styles.filtersCard, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle" style={styles.filtersTitle}>
            Filters & Upload
          </ThemedText>

          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Student</ThemedText>
              <CustomDropdown
                data={studentsData || []}
                placeholder="Select student"
                value={selectedStudent}
                onChange={(value) => setSelectedStudent(value as string)}
                style={{ backgroundColor: themeColors.background }}
              />
            </View>
          </View>

          {renderCertificateTypes()}

          <CreatePermissionGuard 
            resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
            <TouchableOpacity
              style={[styles.uploadButton, { backgroundColor: themeColors.primary }]}
              onPress={handleUploadCertificate}
              disabled={uploadCertificateMutation.isPending}
            >
              <Ionicons name="cloud-upload" size={20} color="white" />
              <ThemedText style={styles.uploadButtonText}>
                {uploadCertificateMutation.isPending ? 'Uploading...' : 'Upload Certificate'}
              </ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

        {/* Certificates List */}
        <View style={[styles.certificatesCard, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle" style={styles.certificatesTitle}>
            Certificates
          </ThemedText>

          <FlatList
            data={certificatesData}
            renderItem={renderCertificateItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.certificatesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document" size={48} color={themeColors['muted-foreground']} />
                <ThemedText style={styles.emptyText}>
                  {selectedStudent ? 'No certificates found for selected student' : 'Select a student to view certificates'}
                </ThemedText>
              </View>
            }
          />
        </View>
      </ScrollView>
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterItem: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  section: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  certificateTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  certificateTypeName: {
    flex: 1,
    fontSize: 14,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  certificatesCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificatesTitle: {
    marginBottom: 16,
  },
  certificatesList: {
    paddingBottom: 16,
  },
  certificateCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  certificateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  certificateInfo: {
    flex: 1,
  },
  certificateType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 14,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  certificateDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  certificateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
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
    marginBottom: 20,
    opacity: 0.7,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
});