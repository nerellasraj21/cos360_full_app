import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Linking, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCertificates, useMyCertificates, useCertificateTypes, useCreateCertificate } from '@/src/api/hooks/students/certificates';
import { studentCertificatesApi, studentAdmissionsApi } from '@/src/api/students';
import { DeletePermissionGuard, CreatePermissionGuard } from '@/src/components/mobile/MobilePermissionGuard';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

// ─── Shared certificate item ───────────────────────────────────────────────

function CertificateItem({ item, colors, onRevoked }: { item: any; colors: any; onRevoked?: () => void }) {
  const { showError, showSuccess } = useToastContext();
  const queryClient = useQueryClient();

  const handleDownload = async () => {
    try {
      const resp = await studentCertificatesApi.downloadCertificate(item.id);
      if (resp?.presigned_url) {
        await Linking.openURL(resp.presigned_url);
      } else {
        showError('No Download Link', 'No download link available');
      }
    } catch {
      showError('Error', 'Could not get download link');
    }
  };

  const revokeMutation = useMutation({
    mutationFn: () => studentCertificatesApi.deleteCertificate(item.id),
    onSuccess: () => {
      showSuccess('Revoked', 'Certificate revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      onRevoked?.();
    },
    onError: () => showError('Error', 'Failed to revoke certificate'),
  });

  return (
    <View style={[styles.certCard, { backgroundColor: colors.card }]}>
      <View style={styles.certHeader}>
        <View style={styles.certInfo}>
          <ThemedText style={styles.certType}>{item.type_name || 'Certificate'}</ThemedText>
          {item.student_name ? (
            <ThemedText style={styles.certStudent}>{item.student_name}</ThemedText>
          ) : null}
        </View>
        <View style={styles.certMeta}>
          {item.issue_date ? (
            <ThemedText style={styles.certDate}>
              {new Date(item.issue_date).toLocaleDateString()}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {item.remarks ? (
        <View style={styles.detailRow}>
          <Ionicons name="document-text-outline" size={14} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText} numberOfLines={2}>{item.remarks}</ThemedText>
        </View>
      ) : null}

      <View style={styles.actionButtons}>
        {item.file_path ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
          >
            <Ionicons name="download-outline" size={15} color="white" />
            <ThemedText style={styles.actionText}>Download</ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={[styles.actionButton, { backgroundColor: '#E5E7EB' }]}>
            <Ionicons name="document-outline" size={15} color="#9CA3AF" />
            <ThemedText style={[styles.actionText, { color: '#9CA3AF' }]}>No File</ThemedText>
          </View>
        )}
        <DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444', opacity: revokeMutation.isPending ? 0.6 : 1 }]}
            onPress={() =>
              Alert.alert('Revoke Certificate', 'Revoke this certificate? This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Revoke', style: 'destructive', onPress: () => revokeMutation.mutate() },
              ])
            }
            disabled={revokeMutation.isPending}
          >
            <Ionicons name="close-circle-outline" size={15} color="white" />
            <ThemedText style={styles.actionText}>
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
            </ThemedText>
          </TouchableOpacity>
        </DeletePermissionGuard>
      </View>
    </View>
  );
}

// ─── Read-only view (student / parent) ────────────────────────────────────

function ReadOnlyCertificates({ title }: { title?: string }) {
  const { colors } = useTheme();
  const { data: certs = [], isLoading } = useMyCertificates();

  return (
    <FlatList
      data={certs as any[]}
      renderItem={({ item }) => <CertificateItem item={item} colors={colors} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={title ? (
        <ThemedText style={styles.viewTitle}>{title}</ThemedText>
      ) : undefined}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="ribbon-outline" size={56} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyTitle}>
            {isLoading ? 'Loading...' : 'No Certificates Found'}
          </ThemedText>
        </View>
      }
    />
  );
}

// ─── Parent view ────────────────────────────────────────────────────────────

function ParentCertificates() {
  const { selectedStudent } = useAuth();
  const { colors } = useTheme();

  const { data: certs, isLoading } = useQuery({
    queryKey: ['certs-child', selectedStudent?.id],
    queryFn: () => studentCertificatesApi.myChildCertificates(selectedStudent!.id),
    enabled: !!selectedStudent?.id,
  });

  if (!selectedStudent) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
        <ThemedText style={styles.emptyTitle}>Select a student from the header</ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={(certs || []) as any[]}
      renderItem={({ item }) => <CertificateItem item={item} colors={colors} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <ThemedText style={styles.viewTitle}>
          {selectedStudent.first_name}&apos;s Certificates
        </ThemedText>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="ribbon-outline" size={56} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyTitle}>
            {isLoading ? 'Loading...' : 'No Certificates Found'}
          </ThemedText>
        </View>
      }
    />
  );
}

// ─── Admin view ────────────────────────────────────────────────────────────

function AdminCertificates() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showError } = useToastContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Issue certificate modal state
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueStudentId, setIssueStudentId] = useState('');
  const [issueTypeId, setIssueTypeId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [issueRemarks, setIssueRemarks] = useState('');
  const [issueFile, setIssueFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const resetIssueForm = () => {
    setIssueStudentId('');
    setIssueTypeId('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setIssueRemarks('');
    setIssueFile(null);
  };

  const issueMutation = useMutation({
    mutationFn: () => {
      if (!issueStudentId || !issueTypeId || !issueDate || !issueFile) {
        throw new Error('Please fill all required fields and attach a file');
      }
      return studentCertificatesApi.createIssued({
        student_id: issueStudentId,
        certificate_type_id: issueTypeId,
        issue_date: issueDate,
        remarks: issueRemarks || undefined,
        file: { uri: issueFile.uri, type: issueFile.type, name: issueFile.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      setShowIssueModal(false);
      resetIssueForm();
    },
    onError: (err: any) => showError('Error', err?.message || 'Failed to issue certificate'),
  });

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setIssueFile({ uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
      }
    } catch {
      showError('Error', 'Failed to pick file');
    }
  };

  // For student name mapping
  const { data: studentsMap } = useQuery({
    queryKey: ['students-name-map'],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      return response.items.reduce((acc: Record<string, string>, s: any) => {
        acc[s.student.id] = `${s.student.first_name} ${s.student.last_name}`;
        return acc;
      }, {});
    },
  });

  const { data: certsRaw = [], isLoading } = useAllCertificates();
  const { data: typesData } = useCertificateTypes();

  const certs = useMemo(() => {
    const list: any[] = Array.isArray(certsRaw) ? certsRaw : (certsRaw as any)?.items ?? [];
    return list.map((c) => ({
      ...c,
      student_name: studentsMap?.[c.student_id] ?? '',
    }));
  }, [certsRaw, studentsMap]);

  const allTypes = useMemo(() => {
    if (!typesData?.items) return [];
    return typesData.items.map((t: any) => t.name);
  }, [typesData]);

  const filtered = useMemo(() => {
    return certs.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (c.type_name || '').toLowerCase().includes(q) ||
        (c.student_name || '').toLowerCase().includes(q);
      const matchType = !selectedTypeFilter || c.type_name === selectedTypeFilter;
      return matchSearch && matchType;
    });
  }, [certs, searchQuery, selectedTypeFilter]);

  // student options for issue modal
  const studentOptions = useMemo(() => {
    if (!studentsMap) return [];
    return Object.entries(studentsMap).map(([id, name]) => ({ label: name as string, id }));
  }, [studentsMap]);

  const typeOptions = useMemo(() => {
    if (!typesData?.items) return [];
    return typesData.items.map((t: any) => ({ label: t.name, id: t.id }));
  }, [typesData]);

  return (
    <>
    <FlatList
      data={filtered}
      renderItem={({ item }) => <CertificateItem item={item} colors={colors} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          {/* Issue Certificate button */}
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
            <TouchableOpacity
              style={[styles.issueBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowIssueModal(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color="white" />
              <ThemedText style={styles.issueBtnText}>Issue Certificate</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={18} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: colors['card-foreground'] }]}
              placeholder="Search by student or type..."
              placeholderTextColor={colors['muted-foreground']}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors['muted-foreground']} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Type filter chips */}
          {allTypes.length > 0 && (
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !selectedTypeFilter && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedTypeFilter('')}
              >
                <ThemedText style={[styles.chipText, !selectedTypeFilter && { color: 'white' }]}>
                  All
                </ThemedText>
              </TouchableOpacity>
              {allTypes.map((t: string) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, selectedTypeFilter === t && { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedTypeFilter(t === selectedTypeFilter ? '' : t)}
                >
                  <ThemedText
                    style={[styles.chipText, selectedTypeFilter === t && { color: 'white' }]}
                  >
                    {t}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="ribbon-outline" size={56} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyTitle}>
            {isLoading ? 'Loading...' : 'No Certificates Found'}
          </ThemedText>
          {(searchQuery || selectedTypeFilter) && !isLoading ? (
            <ThemedText style={styles.emptyText}>Try adjusting your filters</ThemedText>
          ) : null}
        </View>
      }
    />

    {/* Issue Certificate Modal */}
    <Modal visible={showIssueModal} transparent animationType="slide" onRequestClose={() => setShowIssueModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <ThemedText style={styles.modalTitle}>Issue Certificate</ThemedText>
            <TouchableOpacity onPress={() => { setShowIssueModal(false); resetIssueForm(); }}>
              <Ionicons name="close" size={22} color={colors['muted-foreground']} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.fieldLabel}>Student *</ThemedText>
            {studentOptions.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.optionRow,
                  { borderBottomColor: colors.border },
                  issueStudentId === s.id && { backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => setIssueStudentId(s.id)}
              >
                <ThemedText style={styles.optionText}>{s.label}</ThemedText>
                {issueStudentId === s.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}

            <ThemedText style={[styles.fieldLabel, { marginTop: 12 }]}>Certificate Type *</ThemedText>
            {typeOptions.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.optionRow,
                  { borderBottomColor: colors.border },
                  issueTypeId === t.id && { backgroundColor: `${colors.primary}15` },
                ]}
                onPress={() => setIssueTypeId(t.id)}
              >
                <ThemedText style={styles.optionText}>{t.label}</ThemedText>
                {issueTypeId === t.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}

            <ThemedText style={[styles.fieldLabel, { marginTop: 12 }]}>Issue Date *</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={issueDate}
              onChangeText={setIssueDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors['muted-foreground']}
            />

            <ThemedText style={[styles.fieldLabel, { marginTop: 4 }]}>Remarks</ThemedText>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 60 }]}
              value={issueRemarks}
              onChangeText={setIssueRemarks}
              placeholder="Optional remarks"
              placeholderTextColor={colors['muted-foreground']}
              multiline
            />

            <ThemedText style={[styles.fieldLabel, { marginTop: 4 }]}>Certificate File *</ThemedText>
            <TouchableOpacity
              style={[styles.filePicker, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={handlePickFile}
            >
              <Ionicons name="attach-outline" size={18} color={colors.primary} />
              <ThemedText style={[styles.filePickerText, { color: issueFile ? colors.foreground : colors['muted-foreground'] }]}>
                {issueFile ? issueFile.name : 'Tap to attach file'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn2, { backgroundColor: issueMutation.isPending ? colors['muted'] : colors.primary }]}
              onPress={() => issueMutation.mutate()}
              disabled={issueMutation.isPending}
            >
              <Ionicons name="ribbon-outline" size={16} color="white" />
              <ThemedText style={styles.submitBtnText}>
                {issueMutation.isPending ? 'Issuing...' : 'Issue Certificate'}
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudentCertificatesPage() {
  const { role } = useAuth();
  const roleName = role?.name?.toLowerCase();
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName || '');

  let content: React.ReactNode;
  if (isStudent) {
    content = <ReadOnlyCertificates />;
  } else if (isParent) {
    content = <ParentCertificates />;
  } else {
    content = <AdminCertificates />;
  }

  return (
    <AppLayout title="Student Certificates">
      <View style={styles.container}>{content}</View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewTitle: {
    fontSize: 15,
    fontWeight: '600',
    padding: 16,
    paddingBottom: 8,
    opacity: 0.8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  certCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  certHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  certInfo: {
    flex: 1,
  },
  certType: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  certStudent: {
    fontSize: 12,
    opacity: 0.6,
  },
  certMeta: {
    alignItems: 'flex-end',
  },
  certDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.7,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.5,
  },
  issueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  issueBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    opacity: 0.75,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
    gap: 8,
  },
  filePickerText: {
    fontSize: 14,
    flex: 1,
  },
  submitBtn2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});
