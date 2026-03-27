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

export default function ExamAuditScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exams-for-audit'],
    queryFn: () => examsApi.list({ size: 100 }),
    enabled: !!(hasPermission?.('exam_audit_logs', 'list')),
  });

  const filtered = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(e =>
      e.exam_name.toLowerCase().includes(q) ||
      (e.board ?? '').toLowerCase().includes(q) ||
      (e.status ?? '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const renderItem = ({ item }: { item: ExamListItem }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.exam_name}</Text>
            <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
              {item.board} · {item.exam_type} · {item.academic_year_title ?? item.academic_year_id}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.viewBtn, { borderColor: '#7C3AED30', backgroundColor: '#7C3AED10' }]}
          onPress={() => router.push(`/exam/${item.id}` as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={14} color="#7C3AED" />
          <Text style={[styles.viewBtnText, { color: '#7C3AED' }]}>View Audit Log</Text>
          <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <AppLayout title="Exam Audit Logs">
      <View style={styles.container}>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={18} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors['card-foreground'] as string }]}
            placeholder="Search by name, board, or status…"
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

        {isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading exams…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {search ? 'No matching exams' : 'No exams found'}
            </Text>
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
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15 },
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
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  viewBtnText: { fontSize: 13, fontWeight: '600' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
});
