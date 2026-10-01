import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { AuditLog, examAuditApi } from '@/src/api/exam';
import { isAdminRole } from '@/src/lib/roles';

const PAGE_SIZE = 20;
const PURPLE = '#7C3AED';

// Web parity (src/pages/exam/AuditLog.tsx): same colour rule per action.
function actionColor(action: string) {
  const a = (action || '').toLowerCase();
  if (a.includes('delete') || a.includes('unlock')) return '#EF4444';
  if (a.includes('publish') || a.includes('compute')) return '#3B82F6';
  return '#6B7280';
}

// Backend may send either the raw model fields (performed_by/performed_at/reason)
// or the enriched web-parity fields (actor_name/actor_role/description/created_at).
// Prefer the enriched fields, falling back to the raw ones so nothing renders blank.
function entryName(e: AuditLog) {
  return e.actor_name || 'System';
}
function entryRole(e: AuditLog) {
  return e.actor_role;
}
function entryDescription(e: AuditLog) {
  return e.description || e.reason || e.action.replace(/_/g, ' ');
}
function entryTime(e: AuditLog) {
  return e.created_at || e.performed_at;
}

export default function ExamAuditLogScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { examId, examName } = useLocalSearchParams<{ examId?: string; examName?: string }>();

  const isAdmin = isAdminRole(role?.name);
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/exam/list');
    }
  }, [isAdmin, router]);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['exam-audit-log', examId, page],
    queryFn: () => examAuditApi.getLog(examId as string, { page, page_size: PAGE_SIZE }),
    enabled: !!examId && isAdmin,
  });

  const entries: AuditLog[] = Array.isArray(data) ? data : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e =>
      entryDescription(e).toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      entryName(e).toLowerCase().includes(q) ||
      (entryRole(e) ?? '').toLowerCase().includes(q)
    );
  }, [entries, search]);

  const renderItem = ({ item }: { item: AuditLog }) => {
    const color = actionColor(item.action);
    const role = entryRole(item);
    const time = entryTime(item);
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.cardTop}>
          <View style={[styles.actionBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.actionText, { color }]}>{item.action.replace(/_/g, ' ')}</Text>
          </View>
          {time ? (
            <Text style={[styles.timestamp, { color: colors['muted-foreground'] }]}>
              {new Date(time).toLocaleString()}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.description, { color: colors.foreground }]}>{entryDescription(item)}</Text>
        <Text style={[styles.meta, { color: colors['muted-foreground'] }]}>
          by {entryName(item)}{role ? ` (${role})` : ''}
        </Text>
      </View>
    );
  };

  if (!isAdmin) return null;

  return (
    <AppLayout title={examName ? `Audit Log — ${examName}` : 'Audit Log'}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor: borderCol }]}>
            <Ionicons name="search" size={16} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search action, actor, description..."
              placeholderTextColor={colors['muted-foreground'] as string}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Close">
                <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: borderCol }]}
            onPress={() => refetch()}
            disabled={isFetching}
            accessibilityLabel="Refresh"
          >
            <Ionicons name="refresh" size={16} color={colors['muted-foreground']} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={PURPLE} />
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={40} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No audit entries found.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={40} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No entries match your search.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            onRefresh={refetch}
            refreshing={isFetching && !isLoading}
            contentContainerStyle={{ padding: 16, paddingBottom: 8, gap: 8 }}
          />
        )}

        {/* Pagination — mirrors web's AuditLog.tsx */}
        <View style={styles.paginationRow}>
          <Text style={[styles.pageLabel, { color: colors['muted-foreground'] }]}>Page {page}</Text>
          <View style={styles.paginationBtns}>
            <TouchableOpacity
              style={[styles.pageBtn, { borderColor: borderCol, opacity: page <= 1 ? 0.4 : 1 }]}
              disabled={page <= 1}
              onPress={() => setPage(p => p - 1)}
            >
              <Ionicons name="chevron-back" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageBtn, { borderColor: borderCol, opacity: entries.length < PAGE_SIZE ? 0.4 : 1 }]}
              disabled={entries.length < PAGE_SIZE}
              onPress={() => setPage(p => p + 1)}
            >
              <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14 },
  card: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  actionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  actionText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  timestamp: { fontSize: 11 },
  description: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  meta: { fontSize: 12 },
  paginationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  pageLabel: { fontSize: 13 },
  paginationBtns: { flexDirection: 'row', gap: 8 },
  pageBtn: {
    width: 44, height: 44, borderRadius: 8, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
});
