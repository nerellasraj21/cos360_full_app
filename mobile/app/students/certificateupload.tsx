import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/themed-text-input';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { studentAdmissionsApi, certificateTypesApi, studentCertificatesApi } from '@/src/api/students';
import StudentSelector from '@/components/StudentSelector';
import { useToastContext } from '@/components/ToastProvider';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

interface CertificateForm {
  certificateName: string;
  certificateTypeId: string;
  studentId: string;
  issueDate: string;
  description: string;
}

interface StudentOption {
  id: string;
  name: string;
}

interface SelectedFile {
  uri: string;
  type?: string;
  name?: string;
  size?: number;
}

const certificateTypes = [
  'Academic',
  'Sports',
  'Conduct',
  'Achievement',
  'Participation',
  'Other'
];

function CertificateUploadPageContent() {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [formData, setFormData] = useState<CertificateForm>({
    certificateName: '',
    certificateTypeId: '',
    studentId: '',
    issueDate: '',
    description: '',
  });
  const [isUploading, setIsUploading] = useState(false);

  // Fetch students for dropdown
  const { data: studentOptions } = useQuery({
    queryKey: ['active-students-dropdown-simple'],
    queryFn: () => studentAdmissionsApi.getActiveStudentsDropdownSimple(),
  });

  // Fetch certificate types
  const { data: certificateTypes, isLoading: isLoadingTypes, error: typesError } = useQuery({
    queryKey: ['certificate-types'],
    queryFn: () => certificateTypesApi.listCertificateTypes(),
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          type: asset.mimeType,
          name: asset.name,
          size: asset.size,
        });
      }
    } catch (err) {
      showError('Error', 'Failed to pick document');
    }
  };

  const handleStudentSelect = (student: StudentOption) => {
    setSelectedStudent(student);
    updateFormData('studentId', student.id);
  };

  const handleSubmit = async () => {

    if (!selectedFile) {
      showError('Error', 'Please select a certificate file');
      return;
    }

    if (!formData.certificateName || !formData.certificateTypeId || !selectedStudent) {
      showError('Error', 'Please fill in all required fields');
      return;
    }

    setIsUploading(true);

    try {
      const uploadData = {
        student_id: selectedStudent.id,
        certificate_type_id: formData.certificateTypeId,
        issue_date: formData.issueDate || new Date().toISOString().split('T')[0],
        description: formData.certificateName,
        certificate_file: {
          uri: selectedFile.uri,
          type: selectedFile.type || 'application/octet-stream',
          name: selectedFile.name || 'certificate',
        } as any,
      };


      const result = await studentCertificatesApi.createCertificate(uploadData);

      showSuccess('Certificate Uploaded', 'Certificate uploaded successfully!');
      // Reset form
      setSelectedFile(null);
      setSelectedStudent(null);
      setFormData({
        certificateName: '',
        certificateTypeId: '',
        studentId: '',
        issueDate: '',
        description: '',
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to upload certificate';
      showError('Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const updateFormData = (field: keyof CertificateForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout title="Upload Certificate">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={[styles.uploadCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Certificate File
          </ThemedText>

          <TouchableOpacity
            style={[styles.filePicker, { borderColor: colors.primary }]}
            onPress={pickDocument}
          >
            <Ionicons name="cloud-upload" size={48} color={colors.primary} />
            <ThemedText style={styles.filePickerText}>
              {selectedFile ? selectedFile.name : 'Tap to select certificate file'}
            </ThemedText>
            <ThemedText style={styles.filePickerSubtext}>
              PDF or Image files supported
            </ThemedText>
          </TouchableOpacity>

          {!!selectedFile && (
            <View style={styles.fileInfo}>
              <Ionicons name="document" size={20} color={colors.primary} />
              <View style={styles.fileDetails}>
                <ThemedText style={styles.fileName}>{selectedFile.name}</ThemedText>
                <ThemedText style={styles.fileSize}>
                  {(selectedFile.size! / 1024 / 1024).toFixed(2)} MB
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>

        <ThemedView style={[styles.formCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Certificate Details
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Certificate Name *</ThemedText>
            <ThemedTextInput
              placeholder="Enter certificate name"
              value={formData.certificateName}
              onChangeText={(value) => updateFormData('certificateName', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Certificate Type *</ThemedText>
            {isLoadingTypes ? (
              <ThemedText style={styles.loadingText}>Loading certificate types...</ThemedText>
            ) : typesError ? (
              <ThemedText style={styles.errorText}>Failed to load certificate types</ThemedText>
            ) : (
              <View style={styles.typeSelector}>
                {certificateTypes?.items?.map((type: { id: string; name: string; description: string | null }) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      { backgroundColor: colors.card },
                      formData.certificateTypeId === type.id && { backgroundColor: colors.primary }
                    ]}
                    onPress={() => updateFormData('certificateTypeId', type.id)}
                  >
                    <ThemedText style={[
                      styles.typeButtonText,
                      formData.certificateTypeId === type.id && { color: 'white' }
                    ]}>
                      {type.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Select Student *</ThemedText>
            <TouchableOpacity
              style={[styles.studentSelector, { borderColor: colors.primary }]}
              onPress={() => setShowStudentModal(true)}
              accessibilityLabel="Select student"
            >
              <ThemedText style={selectedStudent ? styles.selectedStudentText : styles.placeholderText}>
                {selectedStudent ? selectedStudent.name : 'Select a student'}
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Issue Date</ThemedText>
            <ThemedTextInput
              placeholder="YYYY-MM-DD"
              value={formData.issueDate}
              onChangeText={(value) => updateFormData('issueDate', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <ThemedTextInput
              placeholder="Enter certificate description"
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              multiline
              numberOfLines={3}
            />
          </View>
        </ThemedView>

        <TouchableOpacity
          style={[
            styles.uploadButton,
            { backgroundColor: colors.primary },
            (!selectedFile || isUploading) && { opacity: 0.6 }
          ]}
          onPress={handleSubmit}
          disabled={!selectedFile || isUploading}
        >
          {isUploading ? (
            <Ionicons name="hourglass" size={20} color="white" />
          ) : (
            <Ionicons name="cloud-upload" size={20} color="white" />
          )}
          <ThemedText style={styles.uploadButtonText}>
            {isUploading ? 'Uploading...' : 'Upload Certificate'}
          </ThemedText>
        </TouchableOpacity>

        {/* Student Selection Modal */}
        {showStudentModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={styles.modalTitle}>Select Student</ThemedText>
                <TouchableOpacity onPress={() => setShowStudentModal(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={studentOptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.studentOption}
                    onPress={() => {
                      handleStudentSelect(item);
                      setShowStudentModal(false);
                    }}
                  >
                    <ThemedText style={styles.studentOptionText}>{item.name}</ThemedText>
                    {selectedStudent?.id === item.id && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyText}>No students available</ThemedText>
                  </View>
                }
              />
            </View>
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  uploadCard: {
    borderRadius: 12,
    padding: 20,
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
  filePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  filePickerText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  filePickerSubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
    textAlign: 'center',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
  },
  fileDetails: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.7,
  },
  formCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  studentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  selectedStudentText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  studentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  studentOptionText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    padding: 16,
  },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function CertificateUploadPage() {
  return (
    <ScreenAccessGate
      title="Upload Certificate"
      permissions={[['student_certificates', 'create'], ['student_certificates', 'update']]}
    >
      <CertificateUploadPageContent />
    </ScreenAccessGate>
  );
}
