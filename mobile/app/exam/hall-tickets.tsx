import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { examsApi, examHallTicketsApi, HallTicketEligibility } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

type TabKey = 'eligible' | 'ineligible';

const COL_SNO   = 44;
const COL_NAME  = 160;
const COL_ADM   = 100;
const COL_ATT   = 80;
const COL_FEE   = 80;
const COL_STATUS = 90;
const COL_ACT   = 60;

export default function HallTicketsScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();

  const isDark     = theme === 'dark';
  const cardBg     = isDark ? '#1a1a2e' : '#ffffff';
  const headerBg   = isDark ? '#111827' : '#f8fafc';
  const borderCol  = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const rowAlt     = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
  const textMain   = colors.foreground as string;
  const textMuted  = colors['muted-foreground'] as string;

  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('eligible');

  const canCompute = hasPermission?.('exam_hall_tickets', 'create');
  const canPublish = hasPermission?.('exam_hall_tickets', 'approve');
  const canOverride = hasPermission?.('exam_hall_tickets', 'create');

  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list(),
    enabled: !examId,
  });

  const { data: eligibleData, isLoading: loadingEligible } = useQuery({
    queryKey: ['hall-tickets-eligible', selectedExamId],
    queryFn: () => examHallTicketsApi.getEligible(selectedExamId),
    enabled: !!selectedExamId,
  });

  const { data: ineligibleData, isLoading: loadingIneligible } = useQuery({
    queryKey: ['hall-tickets-ineligible', selectedExamId],
    queryFn: () => examHallTicketsApi.getIneligible(selectedExamId),
    enabled: !!selectedExamId,
  });

  const computeMutation = useMutation({
    mutationFn: () => examHallTicketsApi.computeEligibility(selectedExamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hall-tickets-eligible', selectedExamId] });
      qc.invalidateQueries({ queryKey: ['hall-tickets-ineligible', selectedExamId] });
      Alert.alert('Success', 'Eligibility computed successfully.');
    },
    onError: () => Alert.alert('Error', 'Failed to compute eligibility.'),
  });

  const publishMutation = useMutation({
    mutationFn: () => examHallTicketsApi.publish(selectedExamId),
    onSuccess: () => Alert.alert('Success', 'Hall tickets published.'),
    onError: () => Alert.alert('Error', 'Failed to publish hall tickets.'),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ studentId, eligible }: { studentId: string; eligible: boolean }) =>
      examHallTicketsApi.overrideEligibility(selectedExamId, studentId, {
        attendance_override: eligible,
        fee_override: eligible,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hall-tickets-eligible', selectedExamId] });
      qc.invalidateQueries({ queryKey: ['hall-tickets-ineligible', selectedExamId] });
    },
    onError: () => Alert.alert('Error', 'Failed to override eligibility.'),
  });

  const activeData: HallTicketEligibility[] =
    activeTab === 'eligible' ? (eligibleData ?? []) : (ineligibleData ?? []);
  const isLoading = activeTab === 'eligible' ? loadingEligible : loadingIneligible;

  /* ── Header row ── */
  const TableHeader = () => (
    <View style={[styles.row, { backgroundColor: headerBg, borderBottomColor: borderCol, borderBottomWidth: 1 }]}>
      <Cell w={COL_SNO}  isHeader label="S.No."    textColor={textMuted} />
      <Cell w={COL_NAME} isHeader label="Student"  textColor={textMuted} />
      <Cell w={COL_ADM}  isHeader label="Adm No."  textColor={textMuted} />
      <Cell w={COL_ATT}  isHeader label="Att %"    textColor={textMuted} center />
      <Cell w={COL_FEE}  isHeader label="Fee"      textColor={textMuted} center />
      <Cell w={COL_STATUS} isHeader label="Status" textColor={textMuted} center />
      {canOverride && <Cell w={COL_ACT} isHeader label="Action" textColor={textMuted} center />}
    </View>
  );

  /* ── Data row ── */
  const renderRow = (item: HallTicketEligibility, index: number) => {
    const bg = index % 2 === 1 ? rowAlt : cardBg;
    const attColor = item.attendance_percent != null
      ? (item.attendance_percent >= 75 ? '#10B981' : '#EF4444')
      : textMuted;

    return (
      <View
        key={item.student_id}
        style={[styles.row, { backgroundColor: bg, borderBottomColor: borderCol, borderBottomWidth: 1 }]}
      >
        {/* S.No */}
        <View style={[styles.cell, { width: COL_SNO }]}>
          <Text style={[styles.cellText, { color: textMuted }]}>{index + 1}</Text>
        </View>

        {/* Student name + override note */}
        <View style={[styles.cell, { width: COL_NAME }]}>
          <Text style={[styles.cellText, { color: textMain, fontWeight: '600' }]} numberOfLines={1}>
            {item.student_name ?? item.student_id}
          </Text>
          {(item.attendance_override || item.fee_override) && (
            <View style={styles.overrideBadge}>
              <Text style={styles.overrideBadgeText}>Overridden</Text>
            </View>
          )}
          {item.ineligibility_reason && !item.is_eligible && (
            <Text style={styles.reasonText} numberOfLines={1}>{item.ineligibility_reason}</Text>
          )}
        </View>

        {/* Adm No */}
        <View style={[styles.cell, { width: COL_ADM }]}>
          <Text style={[styles.cellText, { color: textMuted }]} numberOfLines={1}>
            {item.admission_number ?? '—'}
          </Text>
        </View>

        {/* Attendance */}
        <View style={[styles.cell, { width: COL_ATT, alignItems: 'center' }]}>
          {item.attendance_percent != null ? (
            <View style={[styles.badge, { backgroundColor: `${attColor}18` }]}>
              <Text style={[styles.badgeText, { color: attColor }]}>
                {item.attendance_percent.toFixed(0)}%
              </Text>
            </View>
          ) : (
            <Text style={[styles.cellText, { color: textMuted }]}>—</Text>
          )}
        </View>

        {/* Fee */}
        <View style={[styles.cell, { width: COL_FEE, alignItems: 'center' }]}>
          <View style={[styles.badge, { backgroundColor: item.fee_paid ? '#10B98118' : '#EF444418' }]}>
            <Text style={[styles.badgeText, { color: item.fee_paid ? '#10B981' : '#EF4444' }]}>
              {item.fee_paid ? 'Paid' : 'Unpaid'}
            </Text>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.cell, { width: COL_STATUS, alignItems: 'center' }]}>
          <View style={[styles.badge, { backgroundColor: item.is_eligible ? '#10B98118' : '#EF444418' }]}>
            <Text style={[styles.badgeText, { color: item.is_eligible ? '#10B981' : '#EF4444' }]}>
              {item.is_eligible ? 'Eligible' : 'Ineligible'}
            </Text>
          </View>
        </View>

        {/* Action */}
        {canOverride && (
          <View style={[styles.cell, { width: COL_ACT, alignItems: 'center' }]}>
            <TouchableOpacity
              style={[styles.actionIcon, { backgroundColor: item.is_eligible ? '#EF444415' : '#10B98115' }]}
              onPress={() =>
                Alert.alert(
                  item.is_eligible ? 'Mark Ineligible' : 'Mark Eligible',
                  `Override ${item.student_name ?? 'this student'} to ${item.is_eligible ? 'ineligible' : 'eligible'}?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Override',
                      onPress: () =>
                        overrideMutation.mutate({ studentId: item.student_id, eligible: !item.is_eligible }),
                    },
                  ]
                )
              }
            >
              <Ionicons
                name={item.is_eligible ? 'close-circle-outline' : 'checkmark-circle-outline'}
                size={16}
                color={item.is_eligible ? '#EF4444' : '#10B981'}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <AppLayout title="Hall Tickets">
      <View style={styles.container}>

        {/* Exam Selector chips */}
        {!examId && (
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: textMuted }]}>Select Exam</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {(examsData ?? []).map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedExamId === e.id ? colors.primary : cardBg,
                      borderColor: selectedExamId === e.id ? colors.primary : borderCol,
                    },
                  ]}
                  onPress={() => setSelectedExamId(e.id)}
                >
                  <Text style={[styles.chipText, { color: selectedExamId === e.id ? '#fff' : textMuted }]}>
                    {e.exam_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Action Buttons */}
        {!!selectedExamId && (
          <View style={styles.actionsBar}>
            {canCompute && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() =>
                  Alert.alert('Compute Eligibility', 'Check attendance and fee status for all students?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Compute', onPress: () => computeMutation.mutate() },
                  ])
                }
                disabled={computeMutation.isPending}
              >
                <Ionicons name="calculator" size={14} color="white" />
                <Text style={styles.actionBtnText}>{computeMutation.isPending ? 'Computing…' : 'Compute'}</Text>
              </TouchableOpacity>
            )}
            {canPublish && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() =>
                  Alert.alert('Publish Hall Tickets', 'Publish hall tickets to all eligible students?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Publish', onPress: () => publishMutation.mutate() },
                  ])
                }
                disabled={publishMutation.isPending}
              >
                <Ionicons name="send" size={14} color="white" />
                <Text style={styles.actionBtnText}>{publishMutation.isPending ? 'Publishing…' : 'Publish'}</Text>
              </TouchableOpacity>
            )}

            {/* Summary counts */}
            <View style={{ flex: 1 }} />
            <View style={styles.countChip}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.countText, { color: textMuted }]}>{eligibleData?.length ?? 0} eligible</Text>
            </View>
            <View style={styles.countChip}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.countText, { color: textMuted }]}>{ineligibleData?.length ?? 0} ineligible</Text>
            </View>
          </View>
        )}

        {/* Tab Bar */}
        {!!selectedExamId && (
          <View style={[styles.tabBar, { backgroundColor: colors.muted, borderColor: borderCol }]}>
            {(['eligible', 'ineligible'] as TabKey[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { backgroundColor: cardBg }]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={tab === 'eligible' ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={tab === 'eligible' ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.tabText, { color: textMuted }, activeTab === tab && { color: textMain, fontWeight: '700' }]}>
                  {tab === 'eligible'
                    ? `Eligible (${eligibleData?.length ?? 0})`
                    : `Ineligible (${ineligibleData?.length ?? 0})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Table */}
        {!selectedExamId ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={48} color={textMuted} />
            <Text style={[styles.emptyText, { color: textMuted }]}>Select an exam to manage hall tickets</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: textMuted }}>Loading students…</Text>
          </View>
        ) : activeData.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-outline" size={40} color={textMuted} />
            <Text style={[styles.emptyText, { color: textMuted }]}>No {activeTab} students found</Text>
            {canCompute && activeTab === 'eligible' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6', marginTop: 16 }]}
                onPress={() => computeMutation.mutate()}
              >
                <Ionicons name="calculator" size={14} color="white" />
                <Text style={styles.actionBtnText}>Compute Eligibility</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Outer card wrapper */}
            <View style={[styles.tableCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                  <TableHeader />
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {activeData.map((item, idx) => renderRow(item, idx))}
                  </ScrollView>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </AppLayout>
  );
}

/* ── Cell helper ── */
function Cell({
  w, label, isHeader = false, textColor, center = false,
}: {
  w: number; label: string; isHeader?: boolean; textColor: string; center?: boolean;
}) {
  return (
    <View style={[styles.cell, { width: w, alignItems: center ? 'center' : 'flex-start' }]}>
      <Text style={[styles.cellText, { color: textColor }, isHeader && styles.headerText]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* Filter / chips */
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chipsScroll: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },

  /* Actions bar */
  actionsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
  countChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  countText: { fontSize: 11, fontWeight: '500' },

  /* Tabs */
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, borderRadius: 10,
    padding: 3, marginBottom: 8, borderWidth: 1,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8,
  },
  tabText: { fontSize: 12 },

  /* Table */
  tableCard: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 14,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    flex: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { paddingHorizontal: 10, paddingVertical: 11 },
  cellText: { fontSize: 12 },
  headerText: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },

  /* Badges */
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  overrideBadge: { backgroundColor: '#F59E0B18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 2, alignSelf: 'flex-start' },
  overrideBadgeText: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  reasonText: { fontSize: 10, color: '#EF4444', marginTop: 2 },

  actionIcon: { padding: 7, borderRadius: 8 },

  /* Empty */
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
});
