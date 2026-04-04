import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useTheme } from '@/contexts';
import { examsApi, examHallTicketsApi, HallTicketEligibility } from '@/src/api/exam';
import apiClient from '@/src/api/client';
// expo-file-system + expo-sharing used for authenticated binary downloads
// Linking.openURL cannot send auth headers, so authenticated PDF/ZIP endpoints need this pattern
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getValidAccessToken, getClientSchema } from '../../services/authUtils';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { useToastContext } from '@/components/ToastProvider';

type TabKey = 'eligible' | 'ineligible';

export default function HallTicketsScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const isDark    = theme === 'dark';
  const cardBg    = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textMain  = colors.foreground as string;
  const textMuted = colors['muted-foreground'] as string;

  const { confirm, modalProps } = useConfirmModal();
  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [activeTab, setActiveTab] = useState<TabKey>('eligible');

  const canCompute  = hasPermission?.('exam_hall_tickets', 'create');
  const canPublish  = hasPermission?.('exam_hall_tickets', 'approve');
  const canOverride = hasPermission?.('exam_hall_tickets', 'create');
  const canDownload = hasPermission?.('exam_hall_tickets', 'list') || hasPermission?.('exam_hall_tickets', 'read');

  // Downloads a file from an authenticated endpoint using FileSystem (not Linking.openURL,
  // which cannot send auth headers and returns 401 for protected download endpoints)
  const downloadAuthenticatedFile = async (url: string, filename: string, mimeType: string) => {
    try {
      const token = await getValidAccessToken(false);
      const schema = await getClientSchema();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (schema) headers.cschema = schema;

      const localUri = FileSystem.documentDirectory + filename;
      const result = await FileSystem.downloadAsync(url, localUri, { headers });
      await Sharing.shareAsync(result.uri, { mimeType, UTI: mimeType });
    } catch {
      showError('Download Failed', 'Could not download file. Please try again.');
    }
  };

  const handleDownloadOne = (studentId: string) => {
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = `${baseUrl}/exams/${selectedExamId}/hall-tickets/download?student_id=${studentId}`;
    downloadAuthenticatedFile(url, `hall_ticket_${studentId}.pdf`, 'application/pdf');
  };

  const handleDownloadAll = () => {
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = `${baseUrl}/exams/${selectedExamId}/hall-tickets/download-all`;
    downloadAuthenticatedFile(url, `hall_tickets_${selectedExamId}.zip`, 'application/zip');
  };

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
      showSuccess('Eligibility Computed', 'Eligibility computed successfully.');
    },
    onError: () => showError('Error', 'Failed to compute eligibility.'),
  });

  const publishMutation = useMutation({
    mutationFn: () => examHallTicketsApi.publish(selectedExamId),
    onSuccess: () => showSuccess('Hall Tickets Published', 'Hall tickets published.'),
    onError: () => showError('Error', 'Failed to publish hall tickets.'),
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
      showSuccess('Eligibility Updated', 'Student eligibility updated successfully.');
    },
    onError: () => showError('Error', 'Failed to override eligibility.'),
  });

  const handleOverride = (item: HallTicketEligibility) => {
    const title = item.is_eligible ? 'Mark Ineligible' : 'Mark Eligible';
    const message = `Override ${item.student_name ?? 'this student'} to ${item.is_eligible ? 'ineligible' : 'eligible'}?`;
    confirm({
      title,
      message,
      confirmLabel: 'Override',
      destructive: false,
      onConfirm: () => overrideMutation.mutate({ studentId: item.student_id, eligible: !item.is_eligible }),
    });
  };

  const activeData: HallTicketEligibility[] =
    activeTab === 'eligible' ? (eligibleData ?? []) : (ineligibleData ?? []);
  const isLoading = activeTab === 'eligible' ? loadingEligible : loadingIneligible;

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
                onPress={() => {
                  confirm({
                    title: 'Compute Eligibility',
                    message: 'Check attendance and fee status for all students?',
                    confirmLabel: 'Compute',
                    onConfirm: () => computeMutation.mutate(),
                  });
                }}
                disabled={computeMutation.isPending}
              >
                <Ionicons name="calculator" size={14} color="white" />
                <Text style={styles.actionBtnText}>{computeMutation.isPending ? 'Computing…' : 'Compute'}</Text>
              </TouchableOpacity>
            )}
            {canPublish && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  confirm({
                    title: 'Publish Hall Tickets',
                    message: 'Publish hall tickets to all eligible students?',
                    confirmLabel: 'Publish',
                    onConfirm: () => publishMutation.mutate(),
                  });
                }}
                disabled={publishMutation.isPending}
              >
                <Ionicons name="send" size={14} color="white" />
                <Text style={styles.actionBtnText}>{publishMutation.isPending ? 'Publishing…' : 'Publish'}</Text>
              </TouchableOpacity>
            )}
            {canDownload && activeTab === 'eligible' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                onPress={() => {
                  confirm({
                    title: 'Download All',
                    message: 'Download all eligible hall tickets as ZIP?',
                    confirmLabel: 'Download',
                    onConfirm: handleDownloadAll,
                  });
                }}
              >
                <Ionicons name="download" size={14} color="white" />
                <Text style={styles.actionBtnText}>Download All</Text>
              </TouchableOpacity>
            )}
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

        {/* Content */}
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
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {activeData.map((item, index) => {
              const attColor = item.attendance_percent != null
                ? (item.attendance_percent >= 75 ? '#10B981' : '#EF4444')
                : textMuted;
              const accentColor = item.is_eligible ? '#10B981' : '#EF4444';

              return (
                <View key={item.student_id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
                  <View style={{ flex: 1, padding: 12 }}>

                    {/* Header: index + name + badges */}
                    <View style={styles.cardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardSno, { color: textMuted }]}>{'#' + (index + 1)}</Text>
                        <Text style={[styles.cardName, { color: textMain }]} numberOfLines={1}>
                          {item.student_name ?? item.student_id}
                        </Text>
                        <Text style={[styles.cardAdmNo, { color: textMuted }]}>
                          {item.admission_number ?? '—'}
                        </Text>
                      </View>
                      <View style={styles.badgeStack}>
                        <View style={[styles.eligBadge, { backgroundColor: `${accentColor}18` }]}>
                          <Text style={[styles.eligBadgeText, { color: accentColor }]}>
                            {item.is_eligible ? 'Eligible' : 'Ineligible'}
                          </Text>
                        </View>
                        {(item.attendance_override || item.fee_override) ? (
                          <View style={styles.overrideBadge}>
                            <Text style={styles.overrideBadgeText}>Overridden</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Ineligibility reason */}
                    {!!item.ineligibility_reason && !item.is_eligible ? (
                      <Text style={styles.reasonText}>{item.ineligibility_reason}</Text>
                    ) : null}

                    {/* Stats: Attendance + Fee */}
                    <View style={styles.cardStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="calendar-outline" size={13} color={textMuted} />
                        <Text style={[styles.statLabel, { color: textMuted }]}>Att.</Text>
                        {item.attendance_percent != null ? (
                          <View style={[styles.statBadge, { backgroundColor: `${attColor}18` }]}>
                            <Text style={[styles.statBadgeText, { color: attColor }]}>
                              {item.attendance_percent.toFixed(0)}%
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.statLabel, { color: textMuted }]}>—</Text>
                        )}
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
                      <View style={styles.statItem}>
                        <Ionicons name="card-outline" size={13} color={textMuted} />
                        <Text style={[styles.statLabel, { color: textMuted }]}>Fee</Text>
                        <View style={[styles.statBadge, { backgroundColor: item.fee_paid ? '#10B98118' : '#EF444418' }]}>
                          <Text style={[styles.statBadgeText, { color: item.fee_paid ? '#10B981' : '#EF4444' }]}>
                            {item.fee_paid ? 'Paid' : 'Unpaid'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Footer: Override + Download */}
                    {(canOverride || (canDownload && activeTab === 'eligible')) ? (
                      <View style={[styles.cardFooter, { borderTopColor: borderCol }]}>
                        {canOverride ? (
                          <TouchableOpacity
                            style={styles.cardAction}
                            onPress={() => handleOverride(item)}
                          >
                            <Ionicons
                              name={item.is_eligible ? 'close-circle-outline' : 'checkmark-circle-outline'}
                              size={15}
                              color={item.is_eligible ? '#EF4444' : '#10B981'}
                            />
                            <Text style={[styles.cardActionText, { color: item.is_eligible ? '#EF4444' : '#10B981' }]}>
                              {item.is_eligible ? 'Mark Ineligible' : 'Mark Eligible'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {canDownload && activeTab === 'eligible' ? (
                          <TouchableOpacity
                            style={styles.cardAction}
                            onPress={() => handleDownloadOne(item.student_id)}
                          >
                            <Ionicons name="download-outline" size={15} color="#3B82F6" />
                            <Text style={[styles.cardActionText, { color: '#3B82F6' }]}>Download PDF</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}

                  </View>
                </View>
              );
            })}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>
      <ConfirmModal {...modalProps} />
    </AppLayout>
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

  /* Cards */
  listContent: { padding: 12 },
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  cardSno: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardAdmNo: { fontSize: 12, marginTop: 2 },
  badgeStack: { alignItems: 'flex-end', gap: 4 },

  /* Eligibility badge */
  eligBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  eligBadgeText: { fontSize: 11, fontWeight: '600' },

  /* Override / reason */
  overrideBadge: { backgroundColor: '#F59E0B18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  overrideBadgeText: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  reasonText: { fontSize: 12, color: '#EF4444', marginBottom: 6 },

  /* Stats row */
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 12 },
  statBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  statBadgeText: { fontSize: 11, fontWeight: '600' },
  statDivider: { width: 1, height: 16, marginHorizontal: 4 },

  /* Footer actions */
  cardFooter: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, marginTop: 6 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cardActionText: { fontSize: 13, fontWeight: '600' },

  /* Empty / loading */
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
});
