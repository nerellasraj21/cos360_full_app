import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { examsApi, examHallTicketsApi, HallTicketEligibility } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

type TabKey = 'eligible' | 'ineligible';

export default function HallTicketsScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

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

  const activeData = activeTab === 'eligible'
    ? (eligibleData ?? [])
    : (ineligibleData ?? []);

  const isLoading = activeTab === 'eligible' ? loadingEligible : loadingIneligible;

  const renderItem = ({ item }: { item: HallTicketEligibility }) => (
    <View style={[styles.studentCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.studentName, { color: colors.foreground }]}>
          {item.student_name ?? item.student_id}
        </Text>
        {item.admission_number && (
          <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>{item.admission_number}</Text>
        )}
        {item.ineligibility_reason && !item.is_eligible && (
          <View style={styles.reasonRow}>
            <Ionicons name="alert-circle" size={12} color="#EF4444" />
            <Text style={styles.reason}>{item.ineligibility_reason}</Text>
          </View>
        )}

        <View style={styles.statsChips}>
          {item.attendance_percent !== undefined && (
            <View style={[styles.chip, { backgroundColor: '#556ee618' }]}>
              <Text style={[styles.chipText, { color: '#556ee6' }]}>
                Att: {item.attendance_percent.toFixed(0)}%
              </Text>
            </View>
          )}
          <View style={[styles.chip, { backgroundColor: item.fee_paid ? '#10B98118' : '#EF444418' }]}>
            <Text style={[styles.chipText, { color: item.fee_paid ? '#10B981' : '#EF4444' }]}>
              Fee: {item.fee_paid ? 'paid' : 'unpaid'}
            </Text>
          </View>
          {(item.attendance_override || item.fee_override) && (
            <View style={[styles.chip, { backgroundColor: '#F59E0B18' }]}>
              <Text style={[styles.chipText, { color: '#F59E0B' }]}>Overridden</Text>
            </View>
          )}
        </View>
      </View>

      {canOverride && (
        <TouchableOpacity
          style={[styles.overrideBtn, { backgroundColor: item.is_eligible ? '#EF444415' : '#10B98115' }]}
          onPress={() =>
            Alert.alert(
              item.is_eligible ? 'Mark Ineligible' : 'Mark Eligible',
              `Override ${item.student_name ?? 'this student'} to ${item.is_eligible ? 'ineligible' : 'eligible'}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Override', onPress: () => overrideMutation.mutate({ studentId: item.student_id, eligible: !item.is_eligible }) },
              ]
            )
          }
        >
          <Ionicons
            name={item.is_eligible ? 'close-circle-outline' : 'checkmark-circle-outline'}
            size={18}
            color={item.is_eligible ? '#EF4444' : '#10B981'}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <AppLayout title="Hall Tickets">
      <View style={styles.container}>

        {/* Exam Selector */}
        {!examId && (
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Select Exam</Text>
            <View style={styles.chips}>
              {(examsData ?? []).map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.chip, { backgroundColor: selectedExamId === e.id ? colors.primary : cardBg, borderColor: borderCol }]}
                  onPress={() => setSelectedExamId(e.id)}
                >
                  <Text style={[styles.chipText, { color: selectedExamId === e.id ? 'white' : colors['muted-foreground'] as string }]}>
                    {e.exam_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
                <Ionicons name="calculator" size={15} color="white" />
                <Text style={styles.actionBtnText}>
                  {computeMutation.isPending ? 'Computing…' : 'Compute'}
                </Text>
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
                <Ionicons name="send" size={15} color="white" />
                <Text style={styles.actionBtnText}>
                  {publishMutation.isPending ? 'Publishing…' : 'Publish'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tab Bar */}
        {!!selectedExamId && (
          <View style={[styles.tabBar, { backgroundColor: colors.muted }]}>
            {(['eligible', 'ineligible'] as TabKey[]).map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && { backgroundColor: cardBg }]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={tab === 'eligible' ? 'checkmark-circle' : 'close-circle'}
                  size={16}
                  color={tab === 'eligible' ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.tabText, { color: colors['muted-foreground'] }, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'eligible'
                    ? `Eligible (${eligibleData?.length ?? 0})`
                    : `Ineligible (${ineligibleData?.length ?? 0})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* List */}
        {!selectedExamId ? (
          <View style={styles.centered}>
            <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select an exam to manage hall tickets</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading students…</Text>
          </View>
        ) : activeData.length === 0 ? (
          <View style={styles.centered}>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No {activeTab} students found</Text>
            {canCompute && activeTab === 'eligible' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6', marginTop: 12 }]}
                onPress={() => computeMutation.mutate()}
              >
                <Text style={styles.actionBtnText}>Compute Eligibility</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={activeData}
            keyExtractor={item => item.student_id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionsBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 10, padding: 3, marginBottom: 4 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: 8,
  },
  tabText: { fontSize: 13 },
  tabTextActive: { fontWeight: '700', color: undefined },
  studentCard: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  studentName: { fontSize: 14, fontWeight: '600' },
  admNo: { fontSize: 11, marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  reason: { fontSize: 11, color: '#EF4444', flex: 1 },
  statsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  chipText: { fontSize: 11, fontWeight: '500' },
  overrideBtn: { padding: 8, borderRadius: 8, marginLeft: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
});
