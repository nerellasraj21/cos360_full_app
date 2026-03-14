import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemedTextInput } from '@/components/themed-text-input';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { useUploadMyDocument } from '@/src/api/hooks/students/documents';

interface DocumentForm {
  documentName: string;
  documentType: string;
  studentId: string;
}

interface MockFile {
  name: string;
  size: number;
  uri: string;
  type: string;
}

const documentTypes = [
  'Certificate',
  'Medical',
  'Identification',
  'Academic',
  'Other'
];

export default function DocumentUploadPage() {
  const { colors } = useTheme();
  const { studentId, selectedStudent, role } = useAuth();
  const [selectedFile, setSelectedFile] = useState<MockFile | null>(null);
  const [formData, setFormData] = useState<DocumentForm>({
    documentName: '',
    documentType: '',
    studentId: studentId || selectedStudent?.id || '',
  });
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useUploadMyDocument();

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: false,
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (asset.size && asset.size > maxSize) {
          Alert.alert('Error', 'File size must be less than 5MB');
          return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(asset.mimeType || '')) {
          Alert.alert('Error', 'Only PDF, JPG, and PNG files are allowed');
          return;
        }

        setSelectedFile({
          name: asset.name,
          size: asset.size || 0,
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream'
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    console.log('selectedFile:', selectedFile);
    console.log('formData:', formData);
    console.log('studentId from auth:', studentId);
    console.log('selectedStudent:', selectedStudent);
    console.log('role:', role);

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a document file');
      return;
    }

    const currentStudentId = studentId || selectedStudent?.id;
    console.log('currentStudentId determined as:', currentStudentId);
    if (!formData.documentName || !formData.documentType || !currentStudentId) {
      console.log('Validation failed:', {
        documentName: formData.documentName,
        documentType: formData.documentType,
        studentId: currentStudentId
      });
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const uploadData = {
        document_name: formData.documentName,
        document_type: formData.documentType,
        document_file: {
          uri: selectedFile.uri,
          type: selectedFile.type,
          name: selectedFile.name,
        } as any,
      };

      console.log('Upload data being sent:', uploadData);
      console.log('Current student ID being used:', currentStudentId);

      await uploadMutation.mutateAsync(uploadData);

      // Reset form on success
      setSelectedFile(null);
      setFormData({
        documentName: '',
        documentType: '',
        studentId: studentId || selectedStudent?.id || '',
      });
    } catch (error) {
      // Error handling is done by the hook
    }
  };

  const updateFormData = (field: keyof DocumentForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout title="Upload Document">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ThemedView style={[styles.uploadCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Document File
          </ThemedText>

          <TouchableOpacity
            style={[styles.filePicker, { borderColor: colors.primary }]}
            onPress={pickDocument}
          >
            <Ionicons name="cloud-upload" size={48} color={colors.primary} />
            <ThemedText style={styles.filePickerText}>
              {selectedFile ? selectedFile.name : 'Tap to select document file'}
            </ThemedText>
            <ThemedText style={styles.filePickerSubtext}>
              PDF or Image files supported
            </ThemedText>
          </TouchableOpacity>

          {selectedFile && (
            <View style={styles.fileInfo}>
              <Ionicons name="document" size={20} color={colors.primary} />
              <View style={styles.fileDetails}>
                <ThemedText style={styles.fileName}>{selectedFile.name}</ThemedText>
                <ThemedText style={styles.fileSize}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </ThemedText>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close" size={20} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>

        <ThemedView style={[styles.formCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Document Details
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Document Name *</ThemedText>
            <ThemedTextInput
              placeholder="Enter document name"
              value={formData.documentName}
              onChangeText={(value) => updateFormData('documentName', value)}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Document Type *</ThemedText>
            <View style={styles.typeSelector}>
              {documentTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    { backgroundColor: colors.card },
                    formData.documentType === type && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => updateFormData('documentType', type)}
                >
                  <ThemedText style={[
                    styles.typeButtonText,
                    formData.documentType === type && { color: 'white' }
                  ]}>
                    {type}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>


        </ThemedView>

        <TouchableOpacity
          style={[
            styles.uploadButton,
            { backgroundColor: colors.primary },
            (!selectedFile || uploadMutation.isPending) && { opacity: 0.6 }
          ]}
          onPress={handleSubmit}
          disabled={!selectedFile || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Ionicons name="hourglass" size={20} color="white" />
          ) : (
            <Ionicons name="cloud-upload" size={20} color="white" />
          )}
          <ThemedText style={styles.uploadButtonText}>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </ThemedText>
        </TouchableOpacity>
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
});