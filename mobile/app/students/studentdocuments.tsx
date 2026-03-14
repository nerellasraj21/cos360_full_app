import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { studentAdmissionsApi } from '@/src/api/students';
import { useAllDocuments } from '@/src/api/hooks/students/documents';

interface StudentOption {
  id: string;
  name: string;
}

export default function StudentDocumentsPage() {
  const { colors } = useTheme();
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Fetch students for dropdown
  const { data: studentOptions = [] } = useQuery({
    queryKey: ['students-dropdown-simple'],
    queryFn: () => studentAdmissionsApi.getActiveStudentsDropdownSimple(),
  });

  // Fetch documents for selected student
  const { data: documents = [], isLoading } = useAllDocuments({
    student_id: selectedStudent?.id,
  });

  const handleStudentSelect = (student: StudentOption) => {
    setSelectedStudent(student);
    setShowStudentModal(false);
  };

  const renderDocument = ({ item }: { item: any }) => (
    <ThemedView style={[styles.documentCard, { backgroundColor: colors.card }]}>
      <View style={styles.documentHeader}>
        <View style={styles.documentIcon}>
          <Ionicons name="document" size={24} color={colors.primary} />
        </View>
        <View style={styles.documentInfo}>
          <ThemedText type="subtitle" style={styles.documentName}>
            {item.document_name}
          </ThemedText>
          <ThemedText style={styles.documentType}>
            {item.document_type}
          </ThemedText>
        </View>
      </View>

      <View style={styles.documentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            Uploaded: {new Date(item.uploaded_at).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="eye" size={16} color="white" />
          <ThemedText style={styles.actionText}>View</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary }]}>
          <Ionicons name="download" size={16} color="white" />
          <ThemedText style={styles.actionText}>Download</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

  return (
    <AppLayout title="Student Documents">
      <View style={styles.container}>
        {/* Student Selector */}
        <ThemedView style={[styles.selectorCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Select Student
          </ThemedText>
          <TouchableOpacity
            style={[styles.studentSelector, { borderColor: colors.primary }]}
            onPress={() => setShowStudentModal(true)}
          >
            <ThemedText style={selectedStudent ? styles.selectedStudentText : styles.placeholderText}>
              {selectedStudent ? selectedStudent.name : 'Select a student'}
            </ThemedText>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
        </ThemedView>

        {/* Documents List */}
        {selectedStudent && (
          <View style={styles.documentsContainer}>
            <ThemedText type="subtitle" style={styles.documentsTitle}>
              Documents for {selectedStudent.name}
            </ThemedText>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ThemedText>Loading documents...</ThemedText>
              </View>
            ) : (
              <FlatList
                data={documents}
                renderItem={renderDocument}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="folder" size={64} color={colors['muted-foreground']} />
                    <ThemedText type="subtitle" style={styles.emptyTitle}>
                      No Documents Found
                    </ThemedText>
                    <ThemedText style={styles.emptyText}>
                      This student has no documents yet
                    </ThemedText>
                  </View>
                }
              />
            )}
          </View>
        )}

        {/* Student Selection Modal */}
        {showStudentModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={styles.modalTitle}>Select Student</ThemedText>
                <TouchableOpacity onPress={() => setShowStudentModal(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={studentOptions}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.studentOption}
                    onPress={() => handleStudentSelect(item)}
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
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  selectorCard: {
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
  documentsContainer: {
    flex: 1,
  },
  documentsTitle: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  documentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    marginBottom: 4,
  },
  documentType: {
    fontSize: 14,
    opacity: 0.7,
  },
  documentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minWidth: '45%',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
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
});