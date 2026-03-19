import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { useAllCertificates, useMyCertificates, useCertificateTypes } from '@/src/api/hooks/students/certificates';
import { studentCertificatesApi, studentAdmissionsApi } from '@/src/api/students';
import { DeletePermissionGuard, CreatePermissionGuard } from '@/src/components/mobile/MobilePermissionGuard';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

// ─── Shared certificate item ───────────────────────────────────────────────

function CertificateItem({ item, colors }: { item: any; colors: any }) {
  const handleDownload = async () => {
    try {
      const resp = await studentCertificatesApi.downloadCertificate(item.id);
      if (resp?.presigned_url) {
        await Linking.openURL(resp.presigned_url);
      } else {
        Alert.alert('Info', 'No download link available');
      }
    } catch {
      Alert.alert('Error', 'Could not get download link');
    }
  };

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
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={() =>
              Alert.alert('Revoke Certificate', 'Revoke this certificate?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Revoke', style: 'destructive', onPress: () => Alert.alert('Info', 'Revoke API call here') },
              ])
            }
          >
            <Ionicons name="close-circle-outline" size={15} color="white" />
            <ThemedText style={styles.actionText}>Revoke</ThemedText>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

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
    return (certsRaw as any[]).map((c) => ({
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

  return (
    <FlatList
      data={filtered}
      renderItem={({ item }) => <CertificateItem item={item} colors={colors} />}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
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
});
