import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppLayout } from '@/components';
import { useAuth, useAcademicYear, useTheme } from '@/contexts';
import { examsApi, ExamListItem, ExamStatus } from '@/src/api/exam';

// Web parity (MarkEntryExamList.tsx): only exams still open for mark entry
// (draft/active/locked) show up here — once an exam moves to published/finalized
// it drops off this list, same as it does on web.
const ENTRY_ALLOWED: ExamStatus[] = ['active', 'draft', 'locked'];

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

export default function MyMarksIndexScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { activeAcademicYearId } = useAcademicYear();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudentOrParent =
    roleName === 'student' ||
    ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Admin/Teacher has no "my marks" — redirect to exams list
  useEffect(() => {
    if (!isStudentOrParent) {
      router.replace('/exam/list' as any);
    }
  }, [isStudentOrParent]);

  const [search, setSearch] = useState('');

  // Web parity: fetch every exam for the selected academic year (no status
  // filter server-side) then narrow to entry-allowed statuses client-side —
  // matching MarkEntryExamList.tsx exactly instead of only 'published' exams.
  const { data, isLoading } = useQuery({
    queryKey: ['exams', activeAcademicYearId],
    queryFn: () => examsApi.list({ academic_year_id: activeAcademicYearId || undefined, size: 100 }),
    enabled: isStudentOrParent,
  });

  const allExams = Array.isArray(data) ? data : [];
  const markEntryExams = useMemo(
    () => allExams.filter(e => ENTRY_ALLOWED.includes(e.status)),
    [allExams],
  );

  const filteredExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return markEntryExams;
    return markEntryExams.filter(e =>
      e.exam_name.toLowerCase().includes(q) ||
      e.board.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  }, [markEntryExams, search]);

  const renderItem = ({ item }: { item: ExamListItem }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
        onPress={() => router.push(`/exam/my-marks/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={[styles.iconBox, { backgroundColor: '#556EE618' }]}>
          <Ionicons name="document-text" size={20} color="#556EE6" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.examName, { color: colors.foreground }]}>{item.exam_name}</Text>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[styles.examMeta, { color: colors['muted-foreground'] }]}>
            {item.board} · {item.exam_type} · {item.nature}
          </Text>
          <Text style={[styles.examDeadline, { color: colors['muted-foreground'] }]}>
            Deadline: {item.mark_entry_deadline ?? '—'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout title="My Marks">
      <View style={styles.filterHeader}>
        <Ionicons name="funnel-outline" size={14} color={colors['muted-foreground']} />
        <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Filters</Text>
      </View>
      <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
        <Ionicons name="search" size={16} color={colors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search exam, board, status..."
          placeholderTextColor={colors['muted-foreground']}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <Text style={{ color: colors['muted-foreground'] }}>Loading exams…</Text>
        </View>
      ) : markEntryExams.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            {allExams.length === 0
              ? 'No exams found for this academic year.'
              : 'No active exams for mark entry right now.'}
          </Text>
        </View>
      ) : filteredExams.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No exams match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredExams}
          keyExtractor={e => e.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 32 }}
          ListHeaderComponent={
            <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
              Tap an exam to view your marks
            </Text>
          }
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  hint: { fontSize: 13, marginBottom: 12 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, paddingTop: 12, marginBottom: 8 },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, marginHorizontal: 16,
    paddingHorizontal: 10, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14,
    borderWidth: 1, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  examName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  examMeta: { fontSize: 12, textTransform: 'capitalize' },
  examDeadline: { fontSize: 11, marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '700' },
});
