import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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
import { studentCertificatesApi, certificateTypesApi, studentAdmissionsApi } from '@/src/api';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

// ─── Shared certificate card ───────────────────────────────────────────────

function CertificateCard({ cert, colors }: { cert: any; colors: any }) {
  const { showError } = useToastContext();
  const handleDownload = async () => {
    try {
      const resp = await studentCertificatesApi.downloadCertificate(cert.id);
      if (resp.presigned_url) {
        await Linking.openURL(resp.presigned_url);
      } else {
        showError('No Download Link', 'No download link available');
      }
    } catch {
      showError('Error', 'Failed to get download link');
    }
  };

  return (
    <View style={[styles.certCard, { backgroundColor: colors.background }]}>
      <View style={styles.certCardLeft}>
        <View style={[styles.certIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="document-text" size={22} color={colors.primary} />
        </View>
        <View style={styles.certInfo}>
          <ThemedText style={styles.certType}>{cert.type_name || 'Certificate'}</ThemedText>
          {cert.issue_date ? (
            <ThemedText style={styles.certDate}>
              Issued: {new Date(cert.issue_date).toLocaleDateString()}
            </ThemedText>
          ) : null}
          {cert.remarks ? (
            <ThemedText style={styles.certRemarks} numberOfLines={1}>
              {cert.remarks}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {cert.file_path ? (
        <TouchableOpacity
          style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
          onPress={handleDownload}
        >
          <Ionicons name="download-outline" size={16} color="white" />
        </TouchableOpacity>
      ) : (
        <View style={[styles.downloadBtn, { backgroundColor: '#E5E7EB' }]}>
          <Ionicons name="document-outline" size={16} color="#9CA3AF" />
        </View>
      )}
    </View>
  );
}

// ─── Student / Parent read-only view ──────────────────────────────────────

function MyCertificatesView({ studentId, title }: { studentId?: string; title?: string }) {
  const { colors } = useTheme();

  const { data: certs, isLoading } = useQuery({
    queryKey: ['my-certificates', studentId],
    queryFn: () =>
      studentId
        ? studentCertificatesApi.myChildCertificates(studentId)
        : studentCertificatesApi.myCertificates(),
  });

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {title && (
        <ThemedText style={styles.viewTitle}>{title}</ThemedText>
      )}

      {isLoading ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>Loading...</ThemedText>
        </View>
      ) : certs && certs.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Certificates ({certs.length})
          </ThemedText>
          {certs.map((cert: any) => (
            <CertificateCard key={cert.id} cert={cert} colors={colors} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyText}>No certificates found</ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Staff / Admin view ────────────────────────────────────────────────────

function AdminCertificatesView() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCertTypeId, setSelectedCertTypeId] = useState('');

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

  const { data: certTypes } = useQuery({
    queryKey: ['certificate-types-dropdown'],
    queryFn: async () => {
      const response = await certificateTypesApi.listCertificateTypes();
      return response.items.map((t: any) => ({ label: t.name, value: t.id }));
    },
  });

  const { data: certs, isLoading } = useQuery({
    queryKey: ['student-certificates', selectedStudent],
    queryFn: () =>
      selectedStudent
        ? studentCertificatesApi.getCertificatesByStudent(selectedStudent)
        : studentCertificatesApi.listCertificates({ limit: 50 }),
  });

  const uploadMutation = useMutation({
    mutationFn: studentCertificatesApi.createCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
      showSuccess('Certificate Created', 'Certificate created successfully');
    },
    onError: () => showError('Error', 'Failed to create certificate'),
  });

  const handleIssue = () => {
    if (!selectedStudent || !selectedCertTypeId) {
      Alert.alert('Required', 'Please select a student and certificate type');
      return;
    }
    Alert.alert(
      'Issue Certificate',
      'This will issue a certificate for the selected student.',
      [
        {
          text: 'Issue',
          onPress: () =>
            uploadMutation.mutate({
              student_id: selectedStudent,
              certificate_type_id: selectedCertTypeId,
              issue_date: new Date().toISOString().split('T')[0],
            }),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Filters */}
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

      {/* Issue Certificate */}
      <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Issue Certificate</ThemedText>

          <ThemedText style={styles.fieldLabel}>Certificate Type</ThemedText>
          <CustomDropdown
            data={certTypes || []}
            placeholder="Select Type"
            value={selectedCertTypeId}
            onChange={(val) => setSelectedCertTypeId(val as string)}
            style={{ backgroundColor: colors.background, marginBottom: 12 }}
          />

          <TouchableOpacity
            style={[
              styles.issueBtn,
              { backgroundColor: colors.primary },
              uploadMutation.isPending && { opacity: 0.7 },
            ]}
            onPress={handleIssue}
            disabled={uploadMutation.isPending}
          >
            <Ionicons name="ribbon-outline" size={18} color="white" />
            <ThemedText style={styles.issueBtnText}>
              {uploadMutation.isPending ? 'Issuing...' : 'Issue Certificate'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </CreatePermissionGuard>

      {/* Certificates list */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          {selectedStudent ? 'Student Certificates' : 'All Certificates'}
        </ThemedText>

        {isLoading ? (
          <ThemedText style={styles.emptyText}>Loading...</ThemedText>
        ) : certs && certs.length > 0 ? (
          certs.map((cert: any) => (
            <CertificateCard key={cert.id} cert={cert} colors={colors} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={40} color={colors['muted-foreground']} />
            <ThemedText style={styles.emptyText}>
              {selectedStudent ? 'No certificates for this student' : 'No certificates found'}
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudentCertificatesScreen() {
  const { role, studentId, selectedStudent } = useAuth();
  const { colors } = useTheme();

  const roleName = role?.name?.toLowerCase();
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName || '');

  let content: React.ReactNode;
  if (isStudent) {
    content = <MyCertificatesView />;
  } else if (isParent && selectedStudent) {
    content = (
      <MyCertificatesView
        studentId={selectedStudent.id}
        title={`${selectedStudent.first_name}'s Certificates`}
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
    content = <AdminCertificatesView />;
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}
      fallback={
        <AppLayout title="Certificates">
          <View style={styles.accessDenied}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don&apos;t have permission to access certificates
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Certificates">{content}</AppLayout>
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.65,
    marginBottom: 6,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  certCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  certIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  certInfo: {
    flex: 1,
  },
  certType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  certDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  certRemarks: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 1,
  },
  downloadBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  issueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 6,
  },
  issueBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 10,
    opacity: 0.6,
    fontSize: 14,
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
