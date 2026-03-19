import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { useAllDocuments, useMyDocuments } from '@/src/api/hooks/students/documents';
import { studentDocumentsApi, studentAdmissionsApi } from '@/src/api/students';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const getDocIcon = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('birth')) return 'document-text-outline';
  if (t.includes('id')) return 'card-outline';
  if (t.includes('medical')) return 'medkit-outline';
  if (t.includes('address')) return 'home-outline';
  if (t.includes('passport')) return 'airplane-outline';
  if (t.includes('transfer')) return 'swap-horizontal-outline';
  return 'document-outline';
};

// ─── Document item ─────────────────────────────────────────────────────────

function DocumentItem({ item, colors }: { item: any; colors: any }) {
  return (
    <View style={[styles.docCard, { backgroundColor: colors.card }]}>
      <View style={styles.docHeader}>
        <View style={[styles.docIconBox, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name={getDocIcon(item.document_type) as any} size={22} color={colors.primary} />
        </View>
        <View style={styles.docInfo}>
          <ThemedText style={styles.docType}>{item.document_type || 'Document'}</ThemedText>
          <ThemedText style={styles.docDate}>
            {item.upload_date
              ? `Uploaded: ${new Date(item.upload_date).toLocaleDateString()}`
              : ''}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => Alert.alert('View', 'Document viewer coming soon')}
        >
          <Ionicons name="eye-outline" size={15} color="white" />
          <ThemedText style={styles.actionText}>View</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10B981' }]}
          onPress={() => Alert.alert('Download', 'Download coming soon')}
        >
          <Ionicons name="download-outline" size={15} color="white" />
          <ThemedText style={styles.actionText}>Download</ThemedText>
        </TouchableOpacity>
      </View>
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
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  const { data: studentOptions = [] } = useQuery({
    queryKey: ['students-active-simple'],
    queryFn: () => studentAdmissionsApi.getActiveStudentsDropdownSimple(),
  });

  const { data: docs = [], isLoading } = useAllDocuments(
    selectedStudentId ? { student_id: selectedStudentId } : undefined,
  );

  const filteredStudents = (studentOptions as any[]).filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <FlatList
        data={docs as any[]}
        renderItem={({ item }) => <DocumentItem item={item} colors={colors} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Student selector */}
            <View style={[styles.selectorCard, { backgroundColor: colors.card }]}>
              <ThemedText style={styles.selectorLabel}>Student</ThemedText>
              <TouchableOpacity
                style={[styles.selector, { borderColor: colors.border }]}
                onPress={() => setShowPicker(true)}
              >
                <ThemedText style={selectedStudentId ? styles.selectorValue : styles.selectorPlaceholder}>
                  {selectedStudentName || 'Select a student'}
                </ThemedText>
                <Ionicons name="chevron-down" size={18} color={colors['muted-foreground']} />
              </TouchableOpacity>
              {selectedStudentId && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setSelectedStudentId(null); setSelectedStudentName(''); }}
                >
                  <ThemedText style={[styles.clearText, { color: colors.primary }]}>
                    Clear (show all)
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={56} color={colors['muted-foreground']} />
            <ThemedText style={styles.emptyTitle}>
              {isLoading
                ? 'Loading...'
                : selectedStudentId
                ? 'No documents for this student'
                : 'Select a student to filter, or documents will show here'}
            </ThemedText>
          </View>
        }
      />

      {/* Student picker modal */}
      {showPicker && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Student</ThemedText>
              <TouchableOpacity onPress={() => { setShowPicker(false); setSearch(''); }}>
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
              <Ionicons name="search" size={16} color={colors['muted-foreground']} />
              <TextInput
                style={[styles.searchInput, { color: colors['card-foreground'] }]}
                placeholder="Search..."
                placeholderTextColor={colors['muted-foreground']}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.studentOption,
                    { borderBottomColor: colors.border },
                    selectedStudentId === item.id && { backgroundColor: `${colors.primary}10` },
                  ]}
                  onPress={() => {
                    setSelectedStudentId(item.id);
                    setSelectedStudentName(item.name);
                    setShowPicker(false);
                    setSearch('');
                  }}
                >
                  <ThemedText style={styles.studentOptionText}>{item.name}</ThemedText>
                  {selectedStudentId === item.id && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyTitle}>No students found</ThemedText>
                </View>
              }
            />
          </View>
        </View>
      )}
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudentDocumentsPage() {
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
    padding: 14,
    marginBottom: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectorPlaceholder: {
    fontSize: 15,
    opacity: 0.45,
  },
  clearBtn: {
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  clearText: {
    fontSize: 13,
    fontWeight: '500',
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  studentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  studentOptionText: {
    fontSize: 15,
    flex: 1,
  },
});
