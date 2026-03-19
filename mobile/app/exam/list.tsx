import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { examsApi, ExamListItem, ExamStatus } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

const STATUSES: { label: string; value: ExamStatus | '' }[] = [
  { label: 'All',       value: '' },
  { label: 'Draft',     value: 'draft' },
  { label: 'Active',    value: 'active' },
  { label: 'Locked',    value: 'locked' },
  { label: 'Published', value: 'published' },
  { label: 'Finalized', value: 'finalized' },
];

export default function ExamListScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | ''>('');

  const canCreate = hasPermission?.('exams', 'create');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exams', statusFilter],
    queryFn: () => examsApi.list({ exam_status: statusFilter || undefined, size: 50 }),
    enabled: !!(hasPermission?.('exams', 'list')),
  });

  const filtered = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(e =>
      e.exam_name.toLowerCase().includes(q) ||
      (e.exam_type ?? '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const renderItem = ({ item }: { item: ExamListItem }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
        onPress={() => router.push(`/exam/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.exam_name}</Text>
            <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
              {item.exam_type} · {item.nature} · {item.academic_year_title ?? item.academic_year_id}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="layers-outline" size={13} color={colors['muted-foreground']} />
            <Text style={[styles.dateText, { color: colors['muted-foreground'] }]}>
              {item.board} · {item.level.replace(/_/g, ' ')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout title="All Exams">
      <View style={styles.container}>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={18} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors['card-foreground'] as string }]}
            placeholder="Search exams..."
            placeholderTextColor={colors['muted-foreground'] as string}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status filter chips */}
        <View style={styles.filterRow}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.filterChip,
                { backgroundColor: statusFilter === s.value ? colors.primary : cardBg, borderColor: borderCol },
              ]}
              onPress={() => setStatusFilter(s.value)}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === s.value ? 'white' : colors['muted-foreground'] as string }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading exams…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {search ? 'No matching exams' : 'No exams found'}
            </Text>
            {canCreate && !search && (
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/exam/create' as any)}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.createBtnText}>Create First Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            onRefresh={refetch}
            refreshing={isLoading}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            ListHeaderComponent={
              <Text style={[styles.count, { color: colors['muted-foreground'] }]}>
                {filtered.length} exam{filtered.length !== 1 ? 's' : ''}
              </Text>
            }
          />
        )}

        {/* FAB */}
        {canCreate && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/exam/create' as any)}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  count: { fontSize: 12, marginBottom: 10 },
  card: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16,
  },
  createBtnText: { color: 'white', fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
  },
});
