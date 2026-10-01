import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAcademicYear, useTheme } from '@/contexts';
import { examsApi, ExamListItem, ExamStatus } from '@/src/api/exam';

// Web parity (HallTicketsExamList.tsx): a list of exams (draft ones excluded —
// hall tickets aren't relevant until an exam goes active) with a row per exam
// leading to /exam/hall-tickets/[examId]. That screen then branches by role:
// admins get the compute/publish/override management view, students/parents
// get their own (or their child's) eligibility + attendance status — see
// `app/exam/hall-tickets/[examId].tsx`. Available to every role; the exam
// hub's Hall Tickets card gates entry (see `hasHallTicketAccess` in
// `app/(tabs)/exam.tsx`).

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

export default function HallTicketsListScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const [search, setSearch] = useState('');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const { data: examsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['exams', 'hall-tickets-list', activeAcademicYearId],
    queryFn: () => examsApi.list({ academic_year_id: activeAcademicYearId || undefined, size: 100 }),
  });

  const exams = useMemo(() => (Array.isArray(examsData) ? examsData : []), [examsData]);
  // Hall tickets are relevant for non-draft exams only.
  const ticketExams = useMemo(() => exams.filter(e => e.status !== 'draft'), [exams]);

  const filteredExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q === '') return ticketExams;
    return ticketExams.filter((e: ExamListItem) =>
      e.exam_name.toLowerCase().includes(q) ||
      e.board.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  }, [ticketExams, search]);

  return (
    <AppLayout title="Hall Tickets">
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >

        <View style={styles.headerRow}>
          <Ionicons name="ticket" size={20} color="#F59E0B" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Hall Tickets</Text>
            <Text style={[styles.headerSub, { color: colors['muted-foreground'] }]}>
              Eligibility and hall ticket status for each exam
            </Text>
          </View>
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
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Loading exams…</Text>
          </View>
        ) : ticketExams.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Ionicons name="ticket-outline" size={44} color={colors['muted-foreground']} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No exams available</Text>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {exams.length === 0
                ? 'No exams found for this academic year.'
                : 'No exams are in an active state for hall ticket management.'}
            </Text>
          </View>
        ) : filteredExams.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No exams match your search.</Text>
          </View>
        ) : (
          filteredExams.map((exam, idx) => {
            const sc = STATUS_COLORS[exam.status] ?? STATUS_COLORS.draft;
            return (
              <TouchableOpacity
                key={exam.id}
                style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => router.push(`/exam/hall-tickets/${exam.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.cardIndex, { color: colors['muted-foreground'] }]}>{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {exam.exam_name}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.boardPill, { backgroundColor: colors['muted-foreground'] + '18' }]}>
                        <Text style={[styles.boardText, { color: colors['muted-foreground'] }]}>{exam.board}</Text>
                      </View>
                      <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>{exam.exam_type}</Text>
                      <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>·</Text>
                      <Text style={[styles.metaText, { color: colors['muted-foreground'], textTransform: 'capitalize' }]}>{exam.nature}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{exam.status.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={[styles.cardFooter, { borderTopColor: borderCol }]}>
                  <View style={{ flex: 1 }} />
                  <View style={styles.manageBtn}>
                    <Ionicons name="ticket-outline" size={13} color="#F59E0B" />
                    <Text style={styles.manageBtnText}>Manage</Text>
                    <Ionicons name="chevron-forward" size={13} color="#F59E0B" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, height: 40, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  emptyCard: {
    borderRadius: 14, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  card: {
    borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardIndex: { fontSize: 12, fontWeight: '600', paddingTop: 2, minWidth: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 5 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  boardPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  boardText: { fontSize: 10, fontWeight: '700' },
  metaText: { fontSize: 11 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manageBtnText: { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
});
