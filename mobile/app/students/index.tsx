import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { studentAdmissionsApi, StudentAdmissionResponse } from '@/src/api/students';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const PAGE_SIZE = 30;

function StudentListScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg  = theme === 'dark' ? '#1a1a2e' : '#f8fafc';

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['studentList', page, PAGE_SIZE],
    queryFn: () => studentAdmissionsApi.listAdmissions({ skip: page * PAGE_SIZE, limit: PAGE_SIZE }),
    staleTime: 60_000,
  });

  const all: StudentAdmissionResponse[] = data?.items ?? [];
  const total = data?.total_count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search.trim()
    ? all.filter((s) => {
        const name = `${s.student.first_name} ${s.student.last_name}`.toLowerCase();
        const adm  = (s.admission_number ?? '').toLowerCase();
        const q    = search.toLowerCase();
        return name.includes(q) || adm.includes(q);
      })
    : all;

  const renderStudent = ({ item, index }: { item: StudentAdmissionResponse; index: number }) => {
    const name = `${item.student.first_name} ${item.student.last_name}`;
    const initials = (item.student.first_name?.[0] ?? '') + (item.student.last_name?.[0] ?? '');
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
        onPress={() => router.push(`/students/${item.student.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.meta, { color: colors['muted-foreground'] }]}>
            {[item.admission_number, item.admitted_class_id].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]} />
        <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout title={`Students (${total})`}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { borderBottomColor: borderCol }]}>
        <Ionicons name="search" size={18} color={colors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, backgroundColor: inputBg }]}
          placeholder="Search by name or admission no..."
          placeholderTextColor={colors['muted-foreground']}
          value={search}
          onChangeText={(v) => { setSearch(v); setPage(0); }}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}
              accessibilityLabel="Close">
            <Ionicons name="close-circle" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[{ color: colors['muted-foreground'], fontSize: 14 }]}>No students found.</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, { opacity: page === 0 ? 0.5 : 1 }]}
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
              accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={18} color="#556ee6" />
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: colors['muted-foreground'] }]}>
                  {page + 1} / {totalPages}
                  {isFetching ? '  ⟳' : ''}
                </Text>
                <TouchableOpacity
                  style={[styles.pageBtn, { opacity: page >= totalPages - 1 ? 0.5 : 1 }]}
                  onPress={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
              accessibilityLabel="Next"
                >
                  <Ionicons name="chevron-forward" size={18} color="#556ee6" />
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={renderStudent}
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 8, borderRadius: 8 },
  list: { padding: 16, gap: 8, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#556ee6', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 14, fontWeight: '700' },
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 1 },
  name: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  meta: { fontSize: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingVertical: 12,
  },
  pageBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#556ee618',
  },
  pageInfo: { fontSize: 13, fontWeight: '600' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function StudentListScreen() {
  return (
    <ScreenAccessGate
      title="Students"
      resources={['students', 'student_admissions']}
    >
      <StudentListScreenContent />
    </ScreenAccessGate>
  );
}
