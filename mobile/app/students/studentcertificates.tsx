import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { useMyCertificates, useCertificateTypesDropdown, useIssuableCertificateTemplates, useGenerateIssuableCertificate } from '@/src/api/hooks/students/certificates';
import { studentCertificatesApi, studentAdmissionsApi, issuableCertificatesApi } from '@/src/api/students';
import { DeletePermissionGuard, CreatePermissionGuard } from '@/src/components/mobile/MobilePermissionGuard';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

// ─── Shared certificate item ───────────────────────────────────────────────

function CertificateItem({ item, colors, onRevoked, serialNo }: { item: any; colors: any; onRevoked?: () => void; serialNo?: number }) {
  const { showError, showSuccess } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
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

  const isReceived = item._cert_source === 'received';
  const isGenerated = item._cert_source === 'generated';
  const sourceLabel = isReceived ? 'Received' : isGenerated ? 'Generated' : 'Issued';
  const sourceBg = isReceived ? '#F59E0B' : isGenerated ? '#10B981' : colors.primary;

  return (
    <View style={[styles.certCard, { backgroundColor: colors.card }]}>
      {/* Source badge */}
      <View style={[styles.sourceBadge, { backgroundColor: `${sourceBg}20` }]}>
        <ThemedText style={[styles.sourceBadgeText, { color: sourceBg }]}>
          {sourceLabel}
        </ThemedText>
      </View>

      <View style={styles.certHeader}>
        <View style={styles.certInfo}>
          {serialNo != null && <ThemedText style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{serialNo}</ThemedText>}
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
        ) : isGenerated ? (
          <View style={[styles.actionButton, { backgroundColor: '#10B98120', flex: 1 }]}>
            <Ionicons name="sparkles-outline" size={15} color="#10B981" />
            <ThemedText style={[styles.actionText, { color: '#10B981' }]}>Generated from template</ThemedText>
          </View>
        ) : (
          <View style={[styles.actionButton, { backgroundColor: '#E5E7EB' }]}>
            <Ionicons name="document-outline" size={15} color="#9CA3AF" />
            <ThemedText style={[styles.actionText, { color: '#9CA3AF' }]}>No File</ThemedText>
          </View>
        )}
        <DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444', opacity: revokeMutation.isPending ? 0.5 : 1 }]}
            onPress={() => {
              confirm({
                title: 'Revoke Certificate',
                message: 'Revoke this certificate? This cannot be undone.',
                confirmLabel: 'Revoke',
                destructive: true,
                onConfirm: () => revokeMutation.mutate(),
              });
            }}
            disabled={revokeMutation.isPending}
          >
            <Ionicons name="close-circle-outline" size={15} color="white" />
            <ThemedText style={styles.actionText}>
              {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
            </ThemedText>
          </TouchableOpacity>
        </DeletePermissionGuard>
      </View>
      <ConfirmModal {...modalProps} />
    </View>
  );
}

// ─── Read-only view (student / parent) ────────────────��───────────────────

function ReadOnlyCertificates({ title }: { title?: string }) {
  const { colors } = useTheme();
  const { data: certs = [], isLoading } = useMyCertificates();

  return (
    <FlatList
      data={certs as any[]}
      renderItem={({ item, index }) => <CertificateItem item={item} colors={colors} serialNo={index + 1} />}
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
      renderItem={({ item, index }) => <CertificateItem item={item} colors={colors} serialNo={index + 1} />}
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToastContext();

  // ── Cascade / search state ──────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [classId, setClassId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');

  // ── Upload tab state ────────────────────────────────────────────
  const [uploadTab, setUploadTab] = useState<'received' | 'issued'>('received');
  // Issued sub-tab: upload a file vs generate from template
  const [issuedSubTab, setIssuedSubTab] = useState<'upload' | 'generate'>('upload');

  // Received form
  const [recvTypeId, setRecvTypeId] = useState('');
  const [recvRemarks, setRecvRemarks] = useState('');
  const [recvFile, setRecvFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  // Issued upload form
  const [issuedTypeId, setIssuedTypeId] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [issuedRemarks, setIssuedRemarks] = useState('');
  const [issuedFile, setIssuedFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  // Generate issuable form
  const [genTemplateId, setGenTemplateId] = useState('');
  const [genRemarks, setGenRemarks] = useState('');

  // ── Data queries ────────────────────────────────────────────────
  const { data: allStudentsData = [] } = useQuery({
    queryKey: ['students-dropdown-all'],
    queryFn: () => studentAdmissionsApi.studentsDropdown({ active_only: true }),
  });

  const { data: classesData = [] } = useQuery({
    queryKey: ['cert-selector-classes'],
    queryFn: () => studentCertificatesApi.getSelectorClasses(),
  });

  const { data: sectionsData = [] } = useQuery({
    queryKey: ['cert-selector-sections', classId],
    queryFn: () => studentCertificatesApi.getSelectorSections(classId),
    enabled: !!classId,
  });

  const { data: cascadeStudents = [] } = useQuery({
    queryKey: ['cert-selector-students', classId, sectionId],
    queryFn: () => studentCertificatesApi.getSelectorStudents(classId, sectionId || undefined),
    enabled: !!classId,
  });

  const { data: typesData = [] } = useCertificateTypesDropdown();
  const { data: templatesData = [] } = useIssuableCertificateTemplates();
  const generateMutation = useGenerateIssuableCertificate();

  const { data: studentCertsRaw, isLoading: certsLoading } = useQuery({
    queryKey: ['certs-by-student', selectedStudentId],
    queryFn: () => studentCertificatesApi.getCertificatesByStudent(selectedStudentId, { limit: 100 }),
    enabled: !!selectedStudentId,
  });

  // Issuable (template-generated) certificates for this student — separate backend table
  const { data: issuableIssuedRaw, isLoading: issuableLoading } = useQuery({
    queryKey: ['issuable-certs-by-student', selectedStudentId],
    queryFn: () => issuableCertificatesApi.listIssuedCertificates({ student_id: selectedStudentId }),
    enabled: !!selectedStudentId,
  });

  // ── Derived ─────────────────────────────────────────────────────
  const studentCerts = useMemo(() => {
    const regular: any[] = Array.isArray(studentCertsRaw)
      ? studentCertsRaw
      : (studentCertsRaw as any)?.items ?? [];
    const issuable: any[] = (issuableIssuedRaw ?? []).map((c: any) => {
      const tpl = (templatesData as any[]).find((t: any) => t.id === c.template_id);
      return {
        ...c,
        _cert_source: 'generated' as const,
        type_name: tpl?.name ?? 'Generated Certificate',
        issue_date: c.issued_date ?? c.issue_date,
      };
    });
    return [...regular, ...issuable];
  }, [studentCertsRaw, issuableIssuedRaw, templatesData]);

  const searchResults = useMemo(() => {
    if (!searchInput.trim()) return [];
    const q = searchInput.toLowerCase();
    return (allStudentsData as any[]).filter((s: any) =>
      (s.display_name || '').toLowerCase().includes(q) ||
      (s.admission_number || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [allStudentsData, searchInput]);

  const classOptions = useMemo(() =>
    (classesData as any[]).map((c: any) => ({ label: c.name, value: c.id })), [classesData]);
  const sectionOptions = useMemo(() =>
    (sectionsData as any[]).map((s: any) => ({ label: s.name, value: s.id })), [sectionsData]);
  const cascadeStudentOptions = useMemo(() =>
    (cascadeStudents as any[]).map((s: any) => ({
      label: s.admission_no ? `${s.full_name} (${s.admission_no})` : s.full_name,
      value: s.student_id,
    })), [cascadeStudents]);
  const typeOptions = useMemo(() =>
    (typesData as any[]).map((t: any) => ({ label: t.name, value: t.id })), [typesData]);

  const templateOptions = useMemo(() =>
    (templatesData as any[])
      .filter((t: any) => t.is_active === true || t.is_active === 'True')
      .map((t: any) => ({ label: t.name, value: t.id })),
  [templatesData]);

  // ── Selection handlers ──────────────────────────────────────────
  const handleSelectFromSearch = (s: any) => {
    setSelectedStudentId(s.id);
    setSelectedStudentName(s.display_name || '');
    setSearchInput(s.display_name || '');
    setShowSuggestions(false);
    setClassId('');
    setSectionId('');
  };

  const handleClassChange = (val: string) => {
    setClassId(val); setSectionId(''); setSelectedStudentId(''); setSelectedStudentName('');
  };

  const handleSectionChange = (val: string) => {
    setSectionId(val); setSelectedStudentId(''); setSelectedStudentName('');
  };

  const handleStudentFromCascade = (val: string) => {
    setSelectedStudentId(val);
    const found = (cascadeStudents as any[]).find((s: any) => s.student_id === val);
    setSelectedStudentName(found?.full_name ?? '');
  };

  const handleClear = () => {
    setSearchInput(''); setClassId(''); setSectionId('');
    setSelectedStudentId(''); setSelectedStudentName(''); setShowSuggestions(false);
  };

  // ── File picker ─────────────────────────────────────────────────
  const pickFile = async (onFile: (f: { uri: string; name: string; type: string }) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const a = result.assets[0];
        onFile({ uri: a.uri, name: a.name, type: a.mimeType || 'application/octet-stream' });
      }
    } catch { showError('Error', 'Failed to pick file'); }
  };

  // ── Upload mutations ────────────────────────────────────────────
  // Pass studentId as a mutation variable so onSuccess always invalidates the right key
  const receivedMutation = useMutation({
    mutationFn: (studentId: string) => {
      if (!studentId || !recvTypeId || !recvFile)
        throw new Error('Student, certificate type, and file are required');
      return studentCertificatesApi.createReceived({
        student_id: studentId, certificate_type_id: recvTypeId,
        remarks: recvRemarks || undefined,
        file: { uri: recvFile.uri, type: recvFile.type, name: recvFile.name },
      });
    },
    onSuccess: (_data, studentId) => {
      showSuccess('Uploaded', 'Document uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['certs-by-student', studentId] });
      setRecvTypeId(''); setRecvRemarks(''); setRecvFile(null);
    },
    onError: (err: any) => showError('Error', err?.message || 'Upload failed'),
  });

  const issuedMutation = useMutation({
    mutationFn: (studentId: string) => {
      if (!studentId || !issuedTypeId || !issuedDate || !issuedFile)
        throw new Error('Certificate type, issue date, and file are required');
      return studentCertificatesApi.createIssued({
        student_id: studentId, certificate_type_id: issuedTypeId,
        issue_date: issuedDate, remarks: issuedRemarks || undefined,
        file: { uri: issuedFile.uri, type: issuedFile.type, name: issuedFile.name },
      });
    },
    onSuccess: (_data, studentId) => {
      showSuccess('Issued', 'Certificate issued successfully');
      queryClient.invalidateQueries({ queryKey: ['certs-by-student', studentId] });
      setIssuedTypeId(''); setIssuedDate(new Date().toISOString().split('T')[0]);
      setIssuedRemarks(''); setIssuedFile(null);
    },
    onError: (err: any) => showError('Error', err?.message || 'Issue failed'),
  });

  // ── Render helpers ──────────────────────────────────────────────
  const FiltersSection = (
    <View style={[styles.filterCard, { backgroundColor: colors.card }]}>
      {/* Header row */}
      <View style={styles.filterHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="filter-outline" size={16} color={colors['muted-foreground']} />
          <ThemedText style={[styles.filterTitle, { color: colors['muted-foreground'] }]}>Filters</ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.clearBtn2, { borderColor: colors.border,
            opacity: (!classId && !searchInput && !selectedStudentId) ? 0.5 : 1 }]}
          onPress={handleClear}
          disabled={!classId && !searchInput && !selectedStudentId}
        >
          <ThemedText style={styles.clearBtnText2}>Clear</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Search box */}
      <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors['muted-foreground']} />
        <TextInput
          style={[styles.searchBoxInput, { color: colors.foreground }]}
          placeholder="Search by name, admission no..."
          placeholderTextColor={colors['muted-foreground']}
          value={searchInput}
          onChangeText={(v) => { setSearchInput(v); setShowSuggestions(true); }}
          onFocus={() => searchInput && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        />
        {searchInput ? (
          <TouchableOpacity onPress={() => { setSearchInput(''); setShowSuggestions(false); }}
              accessibilityLabel="Close">
            <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Search suggestions */}
      {showSuggestions && searchResults.length > 0 && (
        <View style={[styles.suggestionBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {(searchResults as any[]).map((s: any) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
              onPress={() => handleSelectFromSearch(s)}
            >
              <ThemedText style={styles.suggestionName}>{s.display_name || s.name}</ThemedText>
              {s.admission_number ? (
                <ThemedText style={[styles.suggestionAdm, { color: colors['muted-foreground'] }]}>
                  {s.admission_number}
                </ThemedText>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Class */}
      <ThemedText style={[styles.filterFieldLabel, { color: colors['muted-foreground'] }]}>Class</ThemedText>
      <CustomDropdown
        data={classOptions}
        placeholder="Select class"
        value={classId}
        onChange={(v) => handleClassChange(v as string)}
        search
      />

      {classId ? (
        <>
          <ThemedText style={[styles.filterFieldLabel, { color: colors['muted-foreground'] }]}>Section</ThemedText>
          <CustomDropdown
            data={sectionOptions}
            placeholder="All sections"
            value={sectionId}
            onChange={(v) => handleSectionChange(v as string)}
          />
          <ThemedText style={[styles.filterFieldLabel, { color: colors['muted-foreground'] }]}>Student</ThemedText>
          <CustomDropdown
            data={cascadeStudentOptions}
            placeholder={cascadeStudents.length === 0 ? 'No students found' : 'Select student'}
            value={selectedStudentId}
            onChange={(v) => handleStudentFromCascade(v as string)}
            search
          />
        </>
      ) : null}

      {/* Selected student banner */}
      {selectedStudentId && selectedStudentName ? (
        <View style={[styles.selectedBanner, { backgroundColor: `${colors.primary}12` }]}>
          <Ionicons name="person-outline" size={14} color={colors.primary} />
          <ThemedText style={{ fontSize: 13, color: colors.primary }}>
            {'Selected: '}
            <ThemedText style={{ fontWeight: '700', color: colors.primary }}>{selectedStudentName}</ThemedText>
          </ThemedText>
        </View>
      ) : null}
    </View>
  );

  const UploadSection = selectedStudentId ? (
    <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
      <View style={[styles.uploadCard, { backgroundColor: colors.card }]}>
        <ThemedText style={styles.uploadTitle}>Upload for {selectedStudentName}</ThemedText>
        {/* Tabs */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, uploadTab === 'received' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setUploadTab('received')}
          >
            <ThemedText style={[styles.tabBtnText, uploadTab === 'received' && { color: 'white' }]}>
              Received Document
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, uploadTab === 'issued' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setUploadTab('issued')}
          >
            <ThemedText style={[styles.tabBtnText, uploadTab === 'issued' && { color: 'white' }]}>
              Issue Certificate
            </ThemedText>
          </TouchableOpacity>
        </View>

        {uploadTab === 'received' ? (
          <View style={styles.formSection}>
            <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Certificate Type *</ThemedText>
            <CustomDropdown data={typeOptions} placeholder="Select type" value={recvTypeId}
              onChange={(v) => setRecvTypeId(v as string)} />
            <ThemedText style={[styles.fieldLabel, { marginTop: 10, color: colors['muted-foreground'] }]}>Document File *</ThemedText>
            <TouchableOpacity style={[styles.filePicker, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => pickFile(setRecvFile)}>
              <Ionicons name="attach-outline" size={18} color={colors.primary} />
              <ThemedText style={[styles.filePickerText, { color: recvFile ? colors.foreground : colors['muted-foreground'] }]}>
                {recvFile ? recvFile.name : 'Tap to attach file (PDF/JPG/PNG/DOCX, max 10MB)'}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.fieldLabel, { marginTop: 10, color: colors['muted-foreground'] }]}>Remarks</ThemedText>
            <TextInput style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 60 }]}
              value={recvRemarks} onChangeText={setRecvRemarks} placeholder="Optional remarks (max 500 characters)"
              placeholderTextColor={colors['muted-foreground']} multiline maxLength={500} />
            <View style={styles.formBtns}>
              <TouchableOpacity
                style={[styles.submitBtn2, { flex: 1, backgroundColor: receivedMutation.isPending ? colors.muted : colors.primary }]}
                onPress={() => receivedMutation.mutate(selectedStudentId)} disabled={receivedMutation.isPending}>
                <Ionicons name="cloud-upload-outline" size={15} color="white" />
                <ThemedText style={styles.submitBtnText}>{receivedMutation.isPending ? 'Uploading...' : 'Upload Document'}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]}
                onPress={() => { setRecvTypeId(''); setRecvRemarks(''); setRecvFile(null); }}>
                <Ionicons name="refresh-outline" size={15} color={colors.foreground} />
                <ThemedText style={[styles.resetBtnText, { color: colors.foreground }]}>Reset</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.formSection}>
            {/* Issue sub-tabs: Upload File vs Generate Issuable */}
            <View style={[styles.subTabRow, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.subTabBtn, issuedSubTab === 'upload' && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                onPress={() => setIssuedSubTab('upload')}
              >
                <Ionicons name="attach-outline" size={14} color={issuedSubTab === 'upload' ? colors.primary : colors['muted-foreground']} />
                <ThemedText style={[styles.subTabBtnText, { color: issuedSubTab === 'upload' ? colors.primary : colors['muted-foreground'] }]}>
                  Upload File
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subTabBtn, issuedSubTab === 'generate' && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                onPress={() => setIssuedSubTab('generate')}
              >
                <Ionicons name="sparkles-outline" size={14} color={issuedSubTab === 'generate' ? colors.primary : colors['muted-foreground']} />
                <ThemedText style={[styles.subTabBtnText, { color: issuedSubTab === 'generate' ? colors.primary : colors['muted-foreground'] }]}>
                  Generate Issuable
                </ThemedText>
              </TouchableOpacity>
            </View>

            {issuedSubTab === 'upload' ? (
              /* ── Upload Certificate File ── */
              <>
                <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Certificate Type *</ThemedText>
                <CustomDropdown data={typeOptions} placeholder="Select type" value={issuedTypeId}
                  onChange={(v) => setIssuedTypeId(v as string)} />
                <ThemedText style={[styles.fieldLabel, { marginTop: 10, color: colors['muted-foreground'] }]}>Issue Date *</ThemedText>
                <TextInput style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
                  value={issuedDate} onChangeText={setIssuedDate} placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors['muted-foreground']} />
                <ThemedText style={[styles.fieldLabel, { marginTop: 10, color: colors['muted-foreground'] }]}>Certificate File *</ThemedText>
                <TouchableOpacity style={[styles.filePicker, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => pickFile(setIssuedFile)}>
                  <Ionicons name="attach-outline" size={18} color={colors.primary} />
                  <ThemedText style={[styles.filePickerText, { color: issuedFile ? colors.foreground : colors['muted-foreground'] }]}>
                    {issuedFile ? issuedFile.name : 'Tap to attach file (PDF/JPG/PNG/DOCX, max 10MB)'}
                  </ThemedText>
                </TouchableOpacity>
                <ThemedText style={[styles.fieldLabel, { marginTop: 10, color: colors['muted-foreground'] }]}>Remarks</ThemedText>
                <TextInput style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 60 }]}
                  value={issuedRemarks} onChangeText={setIssuedRemarks} placeholder="Optional remarks (max 500 characters)"
                  placeholderTextColor={colors['muted-foreground']} multiline maxLength={500} />
                <View style={styles.formBtns}>
                  <TouchableOpacity
                    style={[styles.submitBtn2, { flex: 1, backgroundColor: issuedMutation.isPending ? colors.muted : colors.primary }]}
                    onPress={() => issuedMutation.mutate(selectedStudentId)} disabled={issuedMutation.isPending}>
                    <Ionicons name="ribbon-outline" size={15} color="white" />
                    <ThemedText style={styles.submitBtnText}>{issuedMutation.isPending ? 'Issuing...' : 'Issue Certificate'}</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]}
                    onPress={() => { setIssuedTypeId(''); setIssuedDate(new Date().toISOString().split('T')[0]); setIssuedRemarks(''); setIssuedFile(null); }}>
                    <Ionicons name="refresh-outline" size={15} color={colors.foreground} />
                    <ThemedText style={[styles.resetBtnText, { color: colors.foreground }]}>Reset</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              /* ── Generate Issuable Certificate ── */
              <>
                <View style={styles.manageTemplatesRow}>
                  <ThemedText style={[styles.fieldLabel, { color: colors['muted-foreground'], marginTop: 0 }]}>
                    Select Certificate Template *
                  </ThemedText>
                  <TouchableOpacity
                    style={[styles.manageTemplatesBtn, { borderColor: colors.primary }]}
                    onPress={() => router.push('/students/certificatetemplates')}
                  >
                    <Ionicons name="settings-outline" size={13} color={colors.primary} />
                    <ThemedText style={[styles.manageTemplatesBtnText, { color: colors.primary }]}>
                      Manage Templates
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                {templateOptions.length === 0 ? (
                  <View style={[styles.noTemplatesBox, { backgroundColor: `${colors['muted-foreground']}10`, borderColor: colors.border }]}>
                    <Ionicons name="document-text-outline" size={32} color={colors['muted-foreground']} />
                    <ThemedText style={[styles.noTemplatesText, { color: colors['muted-foreground'] }]}>
                      No certificate templates found.{'\n'}Tap &quot;Manage Templates&quot; above to create one.
                    </ThemedText>
                  </View>
                ) : (
                  <>
                    <CustomDropdown
                      data={templateOptions}
                      placeholder="Select a template"
                      value={genTemplateId}
                      onChange={(v) => setGenTemplateId(v as string)}
                      search
                    />

                    {genTemplateId ? (
                      <View style={[styles.templateInfoBox, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}30` }]}>
                        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                        <ThemedText style={[styles.templateInfoText, { color: colors.primary }]}>
                          The certificate will be generated using the selected template and the student&apos;s information.
                        </ThemedText>
                      </View>
                    ) : null}

                    <ThemedText style={[styles.fieldLabel, { marginTop: 10, color: colors['muted-foreground'] }]}>
                      Remarks (optional)
                    </ThemedText>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, minHeight: 60 }]}
                      value={genRemarks}
                      onChangeText={setGenRemarks}
                      placeholder="Optional remarks (max 500 characters)"
                      placeholderTextColor={colors['muted-foreground']}
                      multiline
                      maxLength={500}
                    />

                    <View style={styles.formBtns}>
                      <TouchableOpacity
                        style={[styles.submitBtn2, { flex: 1, backgroundColor: (generateMutation.isPending || !genTemplateId) ? colors.muted : '#8B5CF6' }]}
                        disabled={generateMutation.isPending || !genTemplateId}
                        onPress={() => {
                          const tpl = (templatesData as any[]).find((t: any) => t.id === genTemplateId);
                          if (!tpl) return;
                          generateMutation.mutate({
                            student_id: selectedStudentId,
                            template_id: genTemplateId,
                            edited_html: tpl.html_template,
                            remarks: genRemarks || undefined,
                          }, {
                            onSuccess: () => {
                              setGenTemplateId('');
                              setGenRemarks('');
                              // Invalidate the issuable list so the generated cert appears
                              queryClient.invalidateQueries({ queryKey: ['issuable-certs-by-student', selectedStudentId] });
                            },
                          });
                        }}
                      >
                        <Ionicons name="sparkles-outline" size={15} color="white" />
                        <ThemedText style={styles.submitBtnText}>
                          {generateMutation.isPending ? 'Generating...' : 'Generate Certificate'}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.resetBtn, { borderColor: colors.border }]}
                        onPress={() => { setGenTemplateId(''); setGenRemarks(''); }}
                      >
                        <Ionicons name="refresh-outline" size={15} color={colors.foreground} />
                        <ThemedText style={[styles.resetBtnText, { color: colors.foreground }]}>Reset</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </CreatePermissionGuard>
  ) : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      contentContainerStyle={styles.scrollContent}
    >
      {FiltersSection}
      {UploadSection}

      {/* Certificate list */}
      {selectedStudentId ? (
        <>
          <View style={styles.certListHeader}>
            <ThemedText style={styles.certListTitle}>
              Certificates — {selectedStudentName}
            </ThemedText>
            {studentCerts.length > 0 && (
              <ThemedText style={[styles.certListCount, { color: colors['muted-foreground'] }]}>
                ({studentCerts.length} total)
              </ThemedText>
            )}
          </View>
          {(certsLoading || issuableLoading) ? (
            <View style={[styles.emptyCard2, { backgroundColor: colors.card }]}>
              <ThemedText style={styles.emptyTitle}>Loading...</ThemedText>
            </View>
          ) : studentCerts.length === 0 ? (
            <View style={[styles.emptyCard2, { backgroundColor: colors.card }]}>
              <Ionicons name="ribbon-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={styles.emptyTitle}>No certificates found for this student</ThemedText>
            </View>
          ) : (
            <View style={styles.certListBody}>
              {studentCerts.map((item: any, index: number) => (
                <CertificateItem key={item.id} item={item} colors={colors} serialNo={index + 1} />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={[styles.emptyCard2, { backgroundColor: colors.card }]}>
          <Ionicons name="search-outline" size={48} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyTitle}>
            Select a student above to view their certificates
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md. Own-record
// (student/parent) views are gated on `read_own`/`list_own`/`read_related`/
// `list_related`; the admin certificate-management view needs plain read/list.
export default function StudentCertificatesPage() {
  return (
    <ScreenAccessGate
      title="Student Certificates"
      resources={['student_certificates']}
      permissions={[
        ['student_certificates', 'read_own'],
        ['student_certificates', 'list_own'],
        ['student_certificates', 'read_related'],
        ['student_certificates', 'list_related'],
      ]}
    >
      <StudentCertificatesPageContent />
    </ScreenAccessGate>
  );
}

function StudentCertificatesPageContent() {
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
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  sourceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 8,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // ── Filter card ──────────────────────────────────────────────────
  filterCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  filterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterTitle: { fontSize: 13, fontWeight: '600' },
  clearBtn2: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearBtnText2: { fontSize: 13, fontWeight: '500' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchBoxInput: { flex: 1, fontSize: 14 },
  suggestionBox: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionName: { fontSize: 14, fontWeight: '500', flex: 1 },
  suggestionAdm: { fontSize: 12, marginLeft: 8 },
  filterFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  // ── Upload card ─────────────────────────────────────────────────
  uploadCard: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tabBtnText: { fontSize: 13, fontWeight: '600' },
  formSection: { padding: 16 },
  formBtns: { flexDirection: 'row', gap: 8, marginTop: 14 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  resetBtnText: { fontSize: 13, fontWeight: '600' },
  // ── Cert list header ─────────────────────────────────────────────
  certListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  certListTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  certListCount: { fontSize: 13 },
  emptyCard2: {
    borderRadius: 12,
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  certListBody: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
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
  // ── Issued sub-tabs ──────────────────────────────────────────────
  subTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  manageTemplatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  manageTemplatesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  manageTemplatesBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.04)',
    gap: 5,
  },
  subTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Generate issuable ────────────────────────────────────────────
  templateInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  templateInfoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  noTemplatesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  noTemplatesText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
