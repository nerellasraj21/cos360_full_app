import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { studentDocumentsApi, studentAdmissionsApi } from '@/src/api';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

const DOCUMENT_TYPES = [
  'Birth Certificate',
  'ID Card',
  'Medical Report',
  'Address Proof',
  'Previous School Records',
  'Passport',
  'Transfer Certificate',
  'Other',
];

const getDocIcon = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('birth')) return 'document-text';
  if (t.includes('id')) return 'card';
  if (t.includes('medical')) return 'medkit';
  if (t.includes('address')) return 'home';
  if (t.includes('passport')) return 'airplane';
  if (t.includes('transfer')) return 'swap-horizontal';
  return 'document';
};

// ─── Document card ─────────────────────────────────────────────────────────

function DocumentCard({ doc, colors }: { doc: any; colors: any }) {
  return (
    <View style={[styles.docCard, { backgroundColor: colors.background }]}>
      <View style={[styles.docIcon, { backgroundColor: `${colors.primary}15` }]}>
        <Ionicons name={getDocIcon(doc.document_type) as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.docInfo}>
        <ThemedText style={styles.docType}>{doc.document_type}</ThemedText>
        <ThemedText style={styles.docDate}>
          {new Date(doc.upload_date).toLocaleDateString()}
        </ThemedText>
      </View>
      <TouchableOpacity
        style={[styles.docAction, { backgroundColor: `${colors.primary}18` }]}
        onPress={() => Alert.alert('View', 'Document viewer coming soon')}
      >
        <Ionicons name="eye-outline" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Student / Parent read-only view ───────────────────────────────────────

function MyDocumentsView({ studentId, title }: { studentId?: string; title?: string }) {
  const { colors } = useTheme();

  const { data: docs, isLoading } = useQuery({
    queryKey: ['my-documents', studentId],
    queryFn: () => studentDocumentsApi.listDocuments(studentId ? { student_id: studentId } : undefined),
  });

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {title && <ThemedText style={styles.viewTitle}>{title}</ThemedText>}

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>Documents</ThemedText>
        {isLoading ? (
          <ThemedText style={styles.emptyText}>Loading...</ThemedText>
        ) : docs && docs.length > 0 ? (
          docs.map((doc: any) => <DocumentCard key={doc.id} doc={doc} colors={colors} />)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={40} color={colors['muted-foreground']} />
            <ThemedText style={styles.emptyText}>No documents found</ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Staff / Admin view ────────────────────────────────────────────────────

function AdminDocumentsView() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const [selectedStudent, setSelectedStudent] = useState('');

  const { data: studentsData } = useQuery({
    queryKey: ['students-dropdown'],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      return response.items.map((s: any) => ({
        label: `${s.student.first_name} ${s.student.last_name} (${s.admission_number})`,
        value: s.student.id,
      }));
    },
  });

  const { data: docs, isLoading } = useQuery({
    queryKey: ['student-documents', selectedStudent],
    queryFn: () =>
      studentDocumentsApi.listDocuments(
        selectedStudent ? { student_id: selectedStudent } : undefined,
      ),
  });

  const uploadMutation = useMutation({
    mutationFn: studentDocumentsApi.uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-documents'] });
      showSuccess('Document Uploaded', 'Document uploaded successfully');
    },
    onError: () => showError('Error', 'Failed to upload document'),
  });

  const handleUpload = (docType: string) => {
    if (!selectedStudent) {
      Alert.alert('Required', 'Please select a student first');
      return;
    }
    Alert.alert(
      `Upload ${docType}`,
      'Select a file to upload',
      [
        {
          text: 'Choose File',
          onPress: () =>
            Alert.alert('Info', 'File picker integration needed for device files'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Student filter */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>Filter by Student</ThemedText>
        <CustomDropdown
          data={studentsData || []}
          placeholder="All Students"
          value={selectedStudent}
          onChange={(val) => setSelectedStudent(val as string)}
          style={{ backgroundColor: colors.background }}
        />
      </View>

      {/* Upload section */}
      <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}>
        {selectedStudent ? (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Upload Document</ThemedText>
            <View style={styles.docTypesGrid}>
              {DOCUMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, { backgroundColor: colors.background }]}
                  onPress={() => handleUpload(type)}
                >
                  <Ionicons
                    name={getDocIcon(type) as any}
                    size={18}
                    color={colors.primary}
                  />
                  <ThemedText style={styles.typeText}>{type}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}
      </CreatePermissionGuard>

      {/* Documents list */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          {selectedStudent ? 'Student Documents' : 'All Documents'}
        </ThemedText>

        {isLoading ? (
          <ThemedText style={styles.emptyText}>Loading...</ThemedText>
        ) : docs && docs.length > 0 ? (
          docs.map((doc: any) => <DocumentCard key={doc.id} doc={doc} colors={colors} />)
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={40} color={colors['muted-foreground']} />
            <ThemedText style={styles.emptyText}>
              {selectedStudent ? 'No documents for this student' : 'Select a student to view documents'}
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudentDocumentsScreen() {
  const { role, studentId, selectedStudent } = useAuth();
  const { colors } = useTheme();

  const roleName = role?.name?.toLowerCase();
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName || '');

  let content: React.ReactNode;
  if (isStudent) {
    content = <MyDocumentsView />;
  } else if (isParent && selectedStudent) {
    content = (
      <MyDocumentsView
        studentId={selectedStudent.id}
        title={`${selectedStudent.first_name}'s Documents`}
      />
    );
  } else if (isParent && !selectedStudent) {
    content = (
      <View style={styles.emptyState}>
        <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
        <ThemedText style={styles.emptyText}>Please select a student from the header</ThemedText>
      </View>
    );
  } else {
    content = <AdminDocumentsView />;
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_DOCUMENTS}
      fallback={
        <AppLayout title="Documents">
          <View style={styles.accessDenied}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don&apos;t have permission to access documents
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Documents">{content}</AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 16,
  },
  viewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    marginBottom: 12,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 11,
    opacity: 0.55,
  },
  docAction: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  docTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
    minWidth: '47%',
    marginBottom: 2,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.6,
    fontSize: 13,
    textAlign: 'center',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 14,
    opacity: 0.65,
  },
});
