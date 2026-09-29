import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Linking } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { useAllDocuments, useMyDocuments } from '@/src/api/hooks/students/documents';
import { studentDocumentsApi, studentAdmissionsApi } from '@/src/api/students';
import { useToastContext } from '@/components/ToastProvider';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDocIcon = (type: string, source?: string) => {
  if (source === 'receipt') return 'receipt-outline';
  if (source === 'certificate') return 'ribbon-outline';
  const t = (type || '').toLowerCase();
  if (t.includes('birth')) return 'document-text-outline';
  if (t.includes('id')) return 'card-outline';
  if (t.includes('medical')) return 'medkit-outline';
  if (t.includes('address')) return 'home-outline';
  if (t.includes('passport')) return 'airplane-outline';
  if (t.includes('transfer')) return 'swap-horizontal-outline';
  return 'document-outline';
};

const SOURCE_COLORS: Record<string, string> = {
  document: '#3B82F6',
  certificate: '#8B5CF6',
  receipt: '#F59E0B',
};

const SOURCE_LABELS: Record<string, string> = {
  document: 'Document',
  certificate: 'Certificate',
  receipt: 'Receipt',
};

// ─── Document item ─────────────────────────────────────────────────────────

function DocumentItem({ item, colors }: { item: any; colors: any }) {
  const { showError, showInfo } = useToastContext();
  const isDocument = !item.source || item.source === 'document';

  const downloadMutation = useMutation({
    mutationFn: () => studentDocumentsApi.downloadDocument(item.id),
  });

  const handleDownload = async () => {
    try {
      const blob = await downloadMutation.mutateAsync();
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          await Linking.openURL(reader.result as string);
        } catch {
          showInfo('Info', 'Document downloaded. Check your device to open it.');
        }
      };
      reader.onerror = () => showError('Error', 'Failed to process document');
      reader.readAsDataURL(blob);
    } catch {
      showError('Error', 'Failed to download document');
    }
  };

  const source: string = item.source || 'document';
  const sourceColor = SOURCE_COLORS[source] ?? colors.primary;
  const sourceLabel = SOURCE_LABELS[source] ?? 'Document';

  const displayName =
    source === 'certificate'
      ? (item.type_name ?? item.certificate_category ?? 'Certificate')
      : source === 'receipt'
      ? (item.receipt_number ?? 'Receipt')
      : (item.document_type || 'Document');

  return (
    <View style={[styles.docCard, { backgroundColor: colors.card }]}>
      {/* Source badge */}
      <View style={[styles.sourceBadge, { backgroundColor: `${sourceColor}20` }]}>
        <ThemedText style={[styles.sourceBadgeText, { color: sourceColor }]}>
          {sourceLabel}
        </ThemedText>
      </View>

      <View style={styles.docHeader}>
        <View style={[styles.docIconBox, { backgroundColor: `${sourceColor}15` }]}>
          <Ionicons name={getDocIcon(displayName, source) as any} size={22} color={sourceColor} />
        </View>
        <View style={styles.docInfo}>
          <ThemedText style={styles.docType}>{displayName}</ThemedText>
          <ThemedText style={styles.docDate}>
            {item.upload_date
              ? `Date: ${new Date(item.upload_date).toLocaleDateString()}`
              : ''}
          </ThemedText>
        </View>
      </View>

      {/* Download buttons only for uploaded documents */}
      {isDocument && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary, opacity: downloadMutation.isPending ? 0.5 : 1 }]}
            onPress={handleDownload}
            disabled={downloadMutation.isPending}
          >
            <Ionicons name="eye-outline" size={15} color="white" />
            <ThemedText style={styles.actionText}>View</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981', opacity: downloadMutation.isPending ? 0.5 : 1 }]}
            onPress={handleDownload}
            disabled={downloadMutation.isPending}
          >
            <Ionicons name="download-outline" size={15} color="white" />
            <ThemedText style={styles.actionText}>
              {downloadMutation.isPending ? 'Loading...' : 'Download'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Read-only view (student) ─────────────────────────────────────────────

function MyDocumentsList() {
  const { colors } = useTheme();
  const { data: docs = [], isLoading } = useMyDocuments();

  return (
    <FlatList
      data={docs as any[]}
      renderItem={({ item }) => <DocumentItem item={item} colors={colors} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={56} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyTitle}>
            {isLoading ? 'Loading...' : 'No Documents Found'}
          </ThemedText>
        </View>
      }
    />
  );
}

// ─── Parent view ────────────────────────────────────────────────────────────

function ParentDocumentsList() {
  const { selectedStudent } = useAuth();
  const { colors } = useTheme();

  const { data: docs, isLoading } = useQuery({
    queryKey: ['docs-child', selectedStudent?.id],
    queryFn: () => studentDocumentsApi.listDocuments({ student_id: selectedStudent!.id }),
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
      data={(docs || []) as any[]}
      renderItem={({ item }) => <DocumentItem item={item} colors={colors} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <ThemedText style={styles.viewTitle}>
          {selectedStudent.first_name}&apos;s Documents
        </ThemedText>
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={56} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyTitle}>
            {isLoading ? 'Loading...' : 'No Documents Found'}
          </ThemedText>
        </View>
      }
    />
  );
}

// ─── Admin view ────────────────────────────────────────────────────────────

function AdminDocumentsList() {
  const { colors } = useTheme();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Use the full dropdown endpoint (same as web app) to get all students with display_name
  const { data: studentOptions = [] } = useQuery({
    queryKey: ['students-dropdown-all'],
    queryFn: () => studentAdmissionsApi.studentsDropdown({ active_only: true }),
  });

  const { data: docs = [], isLoading } = useAllDocuments(
    selectedStudentId ? { student_id: selectedStudentId } : undefined,
  );

  const dropdownData = (studentOptions as any[]).map((s) => ({
    label: s.display_name || s.name || '',
    value: s.id,
  }));

  return (
    <FlatList
      data={selectedStudentId ? (docs as any[]) : []}
      renderItem={({ item }) => <DocumentItem item={item} colors={colors} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={[styles.selectorCard, { backgroundColor: colors.card }]}>
          <ThemedText style={styles.selectorCardTitle}>Select Student</ThemedText>
          <ThemedText style={styles.selectorLabel}>Student</ThemedText>
          <View style={styles.selectorRow}>
            <View style={{ flex: 1 }}>
              <CustomDropdown
                data={dropdownData}
                placeholder="Select a student"
                value={selectedStudentId || ''}
                onChange={(val) => setSelectedStudentId(val as string)}
                search
              />
            </View>
            {selectedStudentId ? (
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: colors.border }]}
                onPress={() => setSelectedStudentId(null)}
              >
                <ThemedText style={styles.clearText}>Clear</ThemedText>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
          <Ionicons name="search-outline" size={48} color={colors['muted-foreground']} />
          <ThemedText style={styles.emptyTitle}>
            {isLoading
              ? 'Loading...'
              : selectedStudentId
              ? 'No documents for this student'
              : 'Please select a student to view their documents.'}
          </ThemedText>
        </View>
      }
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function StudentDocumentsPageContent() {
  const { role } = useAuth();
  const roleName = role?.name?.toLowerCase();
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName || '');

  let content: React.ReactNode;
  if (isStudent) {
    content = <MyDocumentsList />;
  } else if (isParent) {
    content = <ParentDocumentsList />;
  } else {
    content = <AdminDocumentsList />;
  }

  return (
    <AppLayout title="Student Documents">
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  selectorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  selectorCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.7,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 12,
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
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
  docCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docType: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  docDate: {
    fontSize: 12,
    opacity: 0.55,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
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
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.65,
  },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function StudentDocumentsPage() {
  return (
    <ScreenAccessGate
      title="Student Documents"
      resources={['student_documents']}
    >
      <StudentDocumentsPageContent />
    </ScreenAccessGate>
  );
}
