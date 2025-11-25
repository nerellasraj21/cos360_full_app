import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useAllCertificates, useCertificateTypes } from '@/src/api/hooks/students/certificates';
import { studentAdmissionsApi } from '@/src/api/students';
import { CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/src/components/mobile/MobilePermissionGuard';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

interface StudentCertificate {
  id: string;
  student_id: string;
  certificate_type_id: string;
  issue_date: string;
  description?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
  studentName?: string;
  certificateName?: string;
  certificateType?: string;
  status?: 'active' | 'revoked';
}

export default function StudentCertificatesPage() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Fetch certificates
  const { data: certificatesData, isLoading } = useAllCertificates();

  // Fetch certificate types for mapping
  const { data: certificateTypesData } = useCertificateTypes();

  // Fetch students for name mapping
  const { data: studentsData } = useQuery({
    queryKey: ['students-for-certificates'],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      return response.items.reduce((acc: any, student: any) => {
        acc[student.id] = `${student.student.first_name} ${student.student.last_name}`;
        return acc;
      }, {});
    },
  });

  const getCertificateTypeName = (typeId: string) => {
    const type = certificateTypesData?.items?.find((t: any) => t.id === typeId);
    return type?.name || 'Unknown';
  };

  const getStudentName = (studentId: string) => {
    return studentsData?.[studentId] || 'Unknown Student';
  };

  const enrichedCertificates = certificatesData?.map((cert: any) => ({
    ...cert,
    studentName: getStudentName(cert.student_id),
    certificateName: cert.description || `Certificate ${cert.id}`,
    certificateType: getCertificateTypeName(cert.certificate_type_id),
    status: 'active' as const, // Assuming all are active unless we have a status field
  })) || [];

  const filteredCertificates = enrichedCertificates.filter(cert => {
    const matchesSearch = cert.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.certificateName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || cert.certificateType === selectedType;
    return matchesSearch && matchesType;
  });

  const certificateTypes = [...new Set(enrichedCertificates.map(cert => cert.certificateType))];

  const renderCertificate = ({ item }: { item: StudentCertificate }) => (
    <ThemedView style={[styles.certificateCard, { backgroundColor: colors.card }]}>
      <View style={styles.certificateHeader}>
        <View style={styles.certificateInfo}>
          <ThemedText type="subtitle" style={styles.studentName}>
            {item.studentName}
          </ThemedText>
          <ThemedText style={styles.certificateName}>{item.certificateName}</ThemedText>
        </View>
        <View style={[styles.statusBadge, {
          backgroundColor: item.status === 'active' ? '#10B981' : '#EF4444'
        }]}>
          <ThemedText style={styles.statusText}>
            {item.status === 'active' ? 'Active' : 'Revoked'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.certificateDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="document" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>Type: {item.certificateType}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={colors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            Issued: {new Date(item.issue_date).toLocaleDateString()}
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
        <DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#EF4444' }]}>
            <Ionicons name="close" size={16} color="white" />
            <ThemedText style={styles.actionText}>Revoke</ThemedText>
          </TouchableOpacity>
        </DeletePermissionGuard>
      </View>
    </ThemedView>
  );

  return (
    <AppLayout title="Student Certificates">
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={20} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors['card-foreground'] }]}
            placeholder="Search by student or certificate..."
            placeholderTextColor={colors['muted-foreground']}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Type Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.card }]}
            onPress={() => setSelectedType('')}
          >
            <ThemedText style={[styles.filterText, !selectedType && { color: colors.primary }]}>
              All Types
            </ThemedText>
          </TouchableOpacity>
          {certificateTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterButton, { backgroundColor: colors.card }]}
              onPress={() => setSelectedType(type)}
            >
              <ThemedText style={[styles.filterText, selectedType === type && { color: colors.primary }]}>
                {type}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Add Certificate Button */}
        <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_CERTIFICATES}>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.addButtonText}>Add Certificate</ThemedText>
          </TouchableOpacity>
        </CreatePermissionGuard>

        <FlatList
          data={filteredCertificates}
          renderItem={renderCertificate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document" size={64} color={colors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Certificates Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchQuery || selectedType
                  ? 'Try adjusting your search or filters'
                  : 'No student certificates available'}
              </ThemedText>
            </View>
          }
        />
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  certificateCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  certificateInfo: {
    flex: 1,
  },
  studentName: {
    marginBottom: 4,
  },
  certificateName: {
    fontSize: 14,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  certificateDetails: {
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
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 2,
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
});