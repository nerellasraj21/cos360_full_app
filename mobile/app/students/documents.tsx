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
import { studentDocumentsApi, studentAdmissionsApi } from '@/src/api';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

interface StudentDocument {
  id: string;
  student_id: string;
  document_type: string;
  document_name: string;
  file_path?: string;
  uploaded_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function StudentDocumentsScreen() {
  const router = useRouter();
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();

  const [selectedStudent, setSelectedStudent] = useState<string>('');

  // Fetch documents data
  const { data: documentsData, isLoading, refetch } = useQuery({
    queryKey: ['student-documents', selectedStudent],
    queryFn: async () => {
      const response = await studentDocumentsApi.listDocuments();
      let data = response;
      if (selectedStudent) {
        return data.filter((doc: any) => doc.student_id === selectedStudent);
      }
      return data;
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

  // Document types
  const documentTypes = [
    { label: 'Birth Certificate', value: 'Birth Certificate' },
    { label: 'ID Card', value: 'ID Card' },
    { label: 'Medical Report', value: 'Medical Report' },
    { label: 'Address Proof', value: 'Address Proof' },
    { label: 'Previous School Records', value: 'Previous School Records' },
    { label: 'Passport', value: 'Passport' },
    { label: 'Other', value: 'Other' },
  ];

  // Mutation for uploading document
  const uploadDocumentMutation = useMutation({
    mutationFn: studentDocumentsApi.uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents'] });
      Alert.alert('Success', 'Document uploaded successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to upload document. Please try again.');
      console.error('Upload document error:', error);
    },
  });

  const handleUploadDocument = (documentType: string) => {
    if (!selectedStudent) {
      Alert.alert('Error', 'Please select a student first');
      return;
    }

    Alert.alert(
      `Upload ${documentType}`,
      'File picker would be implemented here. Simulating upload...',
      [
        {
          text: 'Simulate Upload',
          onPress: () => {
            // Simulate file upload
            uploadDocumentMutation.mutate({
              student_id: selectedStudent,
              document_type: documentType,
              document_name: `${documentType} Document`,
              document_file: new File([], `${documentType.toLowerCase()}.pdf`), // Mock file
            } as any);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getFileIcon = (documentType: string) => {
    switch (documentType.toLowerCase()) {
      case 'birth certificate':
        return 'document-text';
      case 'id card':
        return 'card';
      case 'medical report':
        return 'medical';
      case 'address proof':
        return 'home';
      case 'passport':
        return 'airplane';
      default:
        return 'document';
    }
  };

  const renderDocumentItem = ({ item }: { item: StudentDocument }) => (
    <View style={[styles.documentCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.documentHeader}>
        <View style={styles.documentIcon}>
          <Ionicons name={getFileIcon(item.document_type) as any} size={24} color={themeColors.primary} />
        </View>
        <View style={styles.documentInfo}>
          <ThemedText style={styles.documentType}>{item.document_type}</ThemedText>
          <ThemedText style={styles.uploadDate}>
            Uploaded: {new Date(item.uploaded_at).toLocaleDateString()}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
          <ThemedText style={styles.statusText}>
            {item.is_active ? 'Active' : 'Inactive'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.documentActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
          onPress={() => Alert.alert('View', 'Document viewer would be implemented')}
        >
          <Ionicons name="eye" size={16} color="white" />
          <ThemedText style={styles.actionButtonText}>View</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
          onPress={() => Alert.alert('Download', 'Download functionality would be implemented')}
        >
          <Ionicons name="download" size={16} color="white" />
          <ThemedText style={styles.actionButtonText}>Download</ThemedText>
        </TouchableOpacity>

        <UpdatePermissionGuard 
          resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}>
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

  const renderUploadSection = () => (
    <CreatePermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}>
      <View style={[styles.uploadSection, { backgroundColor: themeColors.card }]}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Upload New Document
        </ThemedText>

        <View style={styles.documentTypesGrid}>
          {documentTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[styles.documentTypeButton, { backgroundColor: themeColors.background }]}
              onPress={() => handleUploadDocument(type.value)}
              disabled={uploadDocumentMutation.isPending}
            >
              <Ionicons name={getFileIcon(type.value) as any} size={20} color={themeColors.primary} />
              <ThemedText style={styles.documentTypeText}>{type.label}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </CreatePermissionGuard>
  );

  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access student documents
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
            Student Documents
          </ThemedText>
        </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Filters */}
        <View style={[styles.filtersCard, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle" style={styles.filtersTitle}>
            Filter by Student
          </ThemedText>

          <CustomDropdown
            data={studentsData || []}
            placeholder="Select student"
            value={selectedStudent}
            onChange={(value) => setSelectedStudent(value as string)}
            style={{ backgroundColor: themeColors.background }}
          />
        </View>

        {/* Upload Section */}
        {renderUploadSection()}

        {/* Documents List */}
        <View style={[styles.documentsCard, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle" style={styles.documentsTitle}>
            Documents
          </ThemedText>

          <FlatList
            data={documentsData}
            renderItem={renderDocumentItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.documentsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="folder-open" size={48} color={themeColors['muted-foreground']} />
                <ThemedText style={styles.emptyText}>
                  {selectedStudent ? 'No documents found for selected student' : 'Select a student to view documents'}
                </ThemedText>
                {!selectedStudent && (
                  <ThemedText style={styles.emptySubtext}>
                    Choose a student from the dropdown above to see their documents
                  </ThemedText>
                )}
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
    marginBottom: 12,
  },
  uploadSection: {
    borderRadius: 12,
    padding: 16,
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
  documentTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  documentTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: '48%',
    marginBottom: 8,
  },
  documentTypeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  documentsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentsTitle: {
    marginBottom: 16,
  },
  documentsList: {
    paddingBottom: 16,
  },
  documentCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  uploadDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  documentActions: {
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
  emptySubtext: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.5,
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