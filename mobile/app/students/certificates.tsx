import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import {
  studentCertificatesApi,
  certificateTypesApi,
  type CertificateRead,
  type ReactNativeFile,
} from '@/src/api/students';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

// ─── Shared certificate card ───────────────────────────────────────────────

function CertificateCard({
  cert,
  colors,
  onDelete,
}: {
  cert: CertificateRead;
  colors: any;
  onDelete?: () => void;
}) {
  const { showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();

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

  const confirmDelete = () => {
    confirm({
      title: 'Delete Certificate',
      message: `Delete "${cert.type_name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => onDelete?.(),
    });
  };

  const categoryColor =
    cert.certificate_category === 'issued' ? '#10B981' : '#6366F1';

  return (
    <View style={[styles.certCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.certCardLeft}>
        <View style={[styles.certIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="document-text" size={20} color={colors.primary} />
        </View>
        <View style={styles.certInfo}>
          <ThemedText style={styles.certType}>{cert.type_name || 'Certificate'}</ThemedText>
          <View style={styles.certMeta}>
            {cert.certificate_category ? (
              <View style={[styles.catBadge, { backgroundColor: `${categoryColor}18` }]}>
                <ThemedText style={[styles.catBadgeText, { color: categoryColor }]}>
                  {cert.certificate_category === 'issued' ? 'Issued' : 'Received'}
                </ThemedText>
              </View>
            ) : null}
            {cert.issue_date ? (
              <ThemedText style={styles.certDate}>
                {new Date(cert.issue_date).toLocaleDateString('en-US', {
                  month: '2-digit', day: '2-digit', year: 'numeric',
                })}
              </ThemedText>
            ) : null}
          </View>
          {cert.remarks ? (
            <ThemedText style={styles.certRemarks} numberOfLines={1}>
              {cert.remarks}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={styles.certActions}>
        {cert.file_path ? (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
          >
            <Ionicons name="download-outline" size={15} color="white" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.iconBtn, { backgroundColor: '#E5E7EB' }]}>
            <Ionicons name="document-outline" size={15} color="#9CA3AF" />
          </View>
        )}
        {onDelete ? (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: '#FEE2E2' }]}
            onPress={confirmDelete}
          >
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        ) : null}
      </View>
      <ConfirmModal {...modalProps} />
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
          {certs.map((cert) => (
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

// ─── Admin / Staff view ────────────────────────────────────────────────────

type UploadTab = 'received' | 'issued';

function AdminCertificatesView() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  // Cascade selector state
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Upload state
  const [uploadTab, setUploadTab] = useState<UploadTab>('issued');

  // Issued form
  const [issuedTypeId, setIssuedTypeId] = useState('');
  const [issuedRemarks, setIssuedRemarks] = useState('');
  const [issuedFile, setIssuedFile] = useState<ReactNativeFile | null>(null);

  // Received form
  const [recvTypeId, setRecvTypeId] = useState('');
  const [recvRemarks, setRecvRemarks] = useState('');
  const [recvFile, setRecvFile] = useState<ReactNativeFile | null>(null);

  // ── Cascade data ──
  const { data: classesRaw = [] } = useQuery({
    queryKey: ['cert-selector-classes'],
    queryFn: studentCertificatesApi.getSelectorClasses,
  });
  const classes = classesRaw.map((c) => ({ label: c.class_name, value: c.id }));

  const { data: sectionsRaw = [] } = useQuery({
    queryKey: ['cert-selector-sections', classId],
    queryFn: () => studentCertificatesApi.getSelectorSections(classId),
    enabled: !!classId,
  });
  const sections = [
    { label: 'All Sections', value: '' },
    ...sectionsRaw.map((s) => ({ label: s.section_name, value: s.id })),
  ];

  const { data: studentsRaw = [] } = useQuery({
    queryKey: ['cert-selector-students', classId, sectionId],
    queryFn: () =>
      studentCertificatesApi.getSelectorStudents(classId, sectionId || undefined),
    enabled: !!classId,
  });
  const students = studentsRaw.map((s) => ({
    label: `${s.first_name} ${s.last_name} (${s.admission_number})`,
    value: s.id,
  }));

  // ── Certificate types ──
  const { data: certTypesData } = useQuery({
    queryKey: ['cert-types-dropdown'],
    queryFn: () => certificateTypesApi.listCertificateTypes({ limit: 200 }),
  });
  const certTypes = (certTypesData?.items ?? []).map((t) => ({
    label: t.name,
    value: t.id,
  }));

  // ── Certificates for selected student ──
  const { data: certs = [], isLoading: certsLoading } = useQuery({
    queryKey: ['student-certificates', selectedStudentId],
    queryFn: () => studentCertificatesApi.getCertificatesByStudent(selectedStudentId),
    enabled: !!selectedStudentId,
  });

  // ── Mutations ──
  const issuedMutation = useMutation({
    mutationFn: studentCertificatesApi.createIssued,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
      showSuccess('Issued', 'Certificate issued successfully');
      setIssuedTypeId('');
      setIssuedRemarks('');
      setIssuedFile(null);
    },
    onError: () => showError('Error', 'Failed to issue certificate'),
  });

  const receivedMutation = useMutation({
    mutationFn: studentCertificatesApi.createReceived,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
      showSuccess('Uploaded', 'Received document uploaded successfully');
      setRecvTypeId('');
      setRecvRemarks('');
      setRecvFile(null);
    },
    onError: () => showError('Error', 'Failed to upload received document'),
  });

  const deleteMutation = useMutation({
    mutationFn: studentCertificatesApi.deleteCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-certificates'] });
      showSuccess('Deleted', 'Certificate deleted');
    },
    onError: () => showError('Error', 'Failed to delete certificate'),
  });

  // ── Handlers ──
  const pickFile = async (onPicked: (file: ReactNativeFile) => void) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      onPicked({
        uri: asset.uri,
        type: asset.mimeType ?? 'application/octet-stream',
        name: asset.name ?? 'file',
      });
    }
  };

  const handleIssueSubmit = () => {
    if (!selectedStudentId || !issuedTypeId || !issuedFile) {
      showError('Required', 'Please select student, certificate type and a file');
      return;
    }
    issuedMutation.mutate({
      student_id: selectedStudentId,
      certificate_type_id: issuedTypeId,
      issue_date: new Date().toISOString().split('T')[0],
      remarks: issuedRemarks || undefined,
      file: issuedFile,
    });
  };

  const handleReceivedSubmit = () => {
    if (!selectedStudentId || !recvTypeId || !recvFile) {
      showError('Required', 'Please select student, certificate type and a file');
      return;
    }
    receivedMutation.mutate({
      student_id: selectedStudentId,
      certificate_type_id: recvTypeId,
      remarks: recvRemarks || undefined,
      file: recvFile,
    });
  };

  const selectedStudentLabel =
    students.find((s) => s.value === selectedStudentId)?.label?.split('(')[0].trim() ?? '';

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* ── Cascade Selector ── */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.cardTitle}>Select Student</ThemedText>

        <ThemedText style={styles.fieldLabel}>Class *</ThemedText>
        <CustomDropdown
          data={classes}
          placeholder="Select class"
          value={classId}
          onChange={(val) => {
            setClassId(val as string);
            setSectionId('');
            setSelectedStudentId('');
          }}
          style={{ backgroundColor: colors.background, marginBottom: 12 }}
        />

        {classId ? (
          <>
            <ThemedText style={styles.fieldLabel}>Section</ThemedText>
            <CustomDropdown
              data={sections}
              placeholder="All sections"
              value={sectionId}
              onChange={(val) => {
                setSectionId(val as string);
                setSelectedStudentId('');
              }}
              style={{ backgroundColor: colors.background, marginBottom: 12 }}
            />

            <ThemedText style={styles.fieldLabel}>Student *</ThemedText>
            <CustomDropdown
              data={students}
              placeholder={students.length === 0 ? 'No students found' : 'Select student'}
              value={selectedStudentId}
              onChange={(val) => setSelectedStudentId(val as string)}
              style={{ backgroundColor: colors.background }}
            />
          </>
        ) : null}
      </View>

      {/* ── Upload form (shown after student selected) ── */}
      {selectedStudentId ? (
        <>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <ThemedText type="subtitle" style={styles.cardTitle}>
                {selectedStudentLabel ? `Upload for ${selectedStudentLabel}` : 'Upload Certificate'}
              </ThemedText>

              {/* Tabs */}
              <View style={[styles.tabRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.tab, uploadTab === 'issued' && { backgroundColor: colors.primary }]}
                  onPress={() => setUploadTab('issued')}
                >
                  <ThemedText style={[styles.tabText, uploadTab === 'issued' && styles.tabTextActive]}>
                    Issue Certificate
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, uploadTab === 'received' && { backgroundColor: colors.primary }]}
                  onPress={() => setUploadTab('received')}
                >
                  <ThemedText style={[styles.tabText, uploadTab === 'received' && styles.tabTextActive]}>
                    Received Document
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {uploadTab === 'issued' ? (
                <View>
                  <ThemedText style={styles.fieldLabel}>Certificate Type *</ThemedText>
                  <CustomDropdown
                    data={certTypes}
                    placeholder="Select type"
                    value={issuedTypeId}
                    onChange={(val) => setIssuedTypeId(val as string)}
                    style={{ backgroundColor: colors.background, marginBottom: 12 }}
                  />

                  <ThemedText style={styles.fieldLabel}>Certificate File *</ThemedText>
                  <TouchableOpacity
                    style={[styles.filePicker, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => pickFile(setIssuedFile)}
                  >
                    <Ionicons name="attach-outline" size={18} color={colors.primary} />
                    <ThemedText style={styles.filePickerText} numberOfLines={1}>
                      {issuedFile ? issuedFile.name : 'Choose file (PDF/JPG/PNG/DOCX)'}
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: colors.primary },
                      issuedMutation.isPending && styles.btnDisabled,
                    ]}
                    onPress={handleIssueSubmit}
                    disabled={issuedMutation.isPending}
                  >
                    <Ionicons name="ribbon-outline" size={17} color="white" />
                    <ThemedText style={styles.submitBtnText}>
                      {issuedMutation.isPending ? 'Issuing...' : 'Issue Certificate'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <ThemedText style={styles.fieldLabel}>Certificate Type *</ThemedText>
                  <CustomDropdown
                    data={certTypes}
                    placeholder="Select type"
                    value={recvTypeId}
                    onChange={(val) => setRecvTypeId(val as string)}
                    style={{ backgroundColor: colors.background, marginBottom: 12 }}
                  />

                  <ThemedText style={styles.fieldLabel}>Document File *</ThemedText>
                  <TouchableOpacity
                    style={[styles.filePicker, { borderColor: colors.border, backgroundColor: colors.background }]}
                    onPress={() => pickFile(setRecvFile)}
                  >
                    <Ionicons name="attach-outline" size={18} color={colors.primary} />
                    <ThemedText style={styles.filePickerText} numberOfLines={1}>
                      {recvFile ? recvFile.name : 'Choose file (PDF/JPG/PNG/DOCX)'}
                    </ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      { backgroundColor: colors.primary },
                      receivedMutation.isPending && styles.btnDisabled,
                    ]}
                    onPress={handleReceivedSubmit}
                    disabled={receivedMutation.isPending}
                  >
                    <Ionicons name="cloud-upload-outline" size={17} color="white" />
                    <ThemedText style={styles.submitBtnText}>
                      {receivedMutation.isPending ? 'Uploading...' : 'Upload Document'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </CreatePermissionGuard>

          {/* Certificates list */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Certificates{certs.length > 0 ? ` (${certs.length})` : ''}
            </ThemedText>

            {certsLoading ? (
              <ThemedText style={styles.emptyText}>Loading...</ThemedText>
            ) : certs.length > 0 ? (
              certs.map((cert) => (
                <CertificateCard
                  key={cert.id}
                  cert={cert}
                  colors={colors}
                  onDelete={() => deleteMutation.mutate(cert.id)}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={36} color={colors['muted-foreground']} />
                <ThemedText style={styles.emptyText}>No certificates for this student</ThemedText>
              </View>
            )}
          </View>
        </>
      ) : null}
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
  tabRow: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.65,
  },
  tabTextActive: {
    color: 'white',
    opacity: 1,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  filePickerText: {
    flex: 1,
    fontSize: 13,
    opacity: 0.7,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  certCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  certIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  certInfo: {
    flex: 1,
  },
  certType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  certMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  certDate: {
    fontSize: 11,
    opacity: 0.55,
  },
  certRemarks: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
  },
  certActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
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
