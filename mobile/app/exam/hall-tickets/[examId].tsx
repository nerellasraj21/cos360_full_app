import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useToastContext } from '@/components/ToastProvider';
import { useAuth, useTheme } from '@/contexts';
import apiClient from '@/src/api/client';
import { examsApi, examHallTicketsApi, HallTicketEligibility } from '@/src/api/exam';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { isAdminRole } from '@/src/lib/roles';
import { getValidAccessToken } from '@/services/authUtils';

// Web parity (HallTicketEligibility.tsx): this screen branches by role —
// admin gets the eligibility management panel (compute / publish / override /
// download), student/parent get a read-only card showing whether they (or
// their child) are eligible for the hall ticket, along with attendance % and
// fee status. Reached from the exam list at `app/exam/hall-tickets.tsx`.

const PARENT_ROLE_NAMES = ['parent', 'guardian', 'father', 'mother'];

const ineligibilityText = (reason?: string | null) => {
  const r = (reason ?? '').toUpperCase();
  if (r === 'FEE_PENDING') return 'Fee payment pending';
  if (r === 'LOW_ATTENDANCE') return 'Attendance below required percentage';
  if (r === 'BOTH') return 'Fee payment pending and attendance below requirement';
  return 'Contact your administrator for details';
};

// Downloads a file from an authenticated endpoint using FileSystem (not
// Linking.openURL, which cannot send auth headers and returns 401 for
// protected download endpoints).
const downloadAuthenticatedFile = async (
  url: string,
  filename: string,
  mimeType: string,
  showError: (title: string, message?: string) => void,
) => {
  try {
    const token = await getValidAccessToken(false);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    if (Platform.OS === 'web') {
      const response = await fetch(url, { headers });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } else {
      const FileSystem = await import('expo-file-system/legacy');
      const Sharing = await import('expo-sharing');
      const localUri = FileSystem.documentDirectory + filename;
      const result = await FileSystem.downloadAsync(url, localUri, { headers });
      await Sharing.shareAsync(result.uri, { mimeType, UTI: mimeType });
    }
  } catch {
    showError('Download Failed', 'Could not download file. Please try again.');
  }
};

// ---------------------------------------------------------------------------
// Student / Parent view — own (or child's) hall ticket only. Backend filters
// /eligible and /ineligible by JWT identity for the student role, returning
// only that student's own record (web parity comment, HallTicketEligibility.tsx).
// ---------------------------------------------------------------------------
function SelfServiceHallTicketView({ examId, childId, childName }: { examId: string; childId?: string; childName?: string }) {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  const { data: exam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.getById(examId),
    enabled: !!examId,
  });

  const eligibleQuery = useQuery({
    queryKey: ['hall-tickets-eligible', examId],
    queryFn: () => examHallTicketsApi.getEligible(examId),
    enabled: !!examId,
  });
  const ineligibleQuery = useQuery({
    queryKey: ['hall-tickets-ineligible', examId],
    queryFn: () => examHallTicketsApi.getIneligible(examId),
    enabled: !!examId,
  });
  const isLoading = eligibleQuery.isLoading || ineligibleQuery.isLoading;
  const eligible = eligibleQuery.data ?? [];
  const ineligible = ineligibleQuery.data ?? [];

  // Parent: filter to the selected child's record. Student: backend already
  // returns at most one record (their own).
  const ticket: HallTicketEligibility | null = childId
    ? eligible.find(t => t.student_id === childId) ?? ineligible.find(t => t.student_id === childId) ?? null
    : eligible[0] ?? ineligible[0] ?? null;

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!ticket) return;
    setDownloading(true);
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = `${baseUrl}${examHallTicketsApi.downloadUrl(examId, ticket.student_id)}`;
    await downloadAuthenticatedFile(url, 'hall-ticket.pdf', 'application/pdf', showError);
    setDownloading(false);
    showSuccess('Hall ticket downloaded');
  };

  const accentColor = ticket?.is_eligible ? '#10B981' : '#EF4444';
  const subtitle = childName
    ? `Showing hall ticket for ${childName}`
    : 'Your hall ticket eligibility status';
  const notEnrolledText = childName
    ? `${childName} is not enrolled in this exam.`
    : 'You are not enrolled in this exam.';

  return (
    <AppLayout title={`Hall Ticket — ${exam?.exam_name ?? '...'}`}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>{subtitle}</Text>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : !ticket ? (
          <View style={[styles.emptyCard, { borderColor: borderCol }]}>
            <Ionicons name="ticket-outline" size={44} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>{notEnrolledText}</Text>
          </View>
        ) : (
          <>
            {/* Status banner */}
            <View style={[styles.statusCard, { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}40` }]}>
              <Ionicons
                name={ticket.is_eligible ? 'checkmark-circle' : 'close-circle'}
                size={40}
                color={accentColor}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.statusTitle, { color: accentColor }]}>
                  {ticket.is_eligible
                    ? `${childName ? `${childName} is` : 'You are'} eligible for the hall ticket`
                    : `${childName ? `${childName} is` : 'You are'} not eligible for the hall ticket`}
                </Text>
                {ticket.is_eligible && ticket.hall_ticket_number ? (
                  <Text style={[styles.statusSub, { color: colors['muted-foreground'] }]}>
                    Hall Ticket No: <Text style={{ fontWeight: '700' }}>{ticket.hall_ticket_number}</Text>
                  </Text>
                ) : null}
                {!ticket.is_eligible ? (
                  <Text style={[styles.statusSub, { color: colors['muted-foreground'] }]}>
                    {ineligibilityText(ticket.ineligibility_reason)}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Attendance & Fee stat cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Attendance</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {ticket.attendance_percent != null ? `${Number(ticket.attendance_percent).toFixed(1)}%` : '—'}
                </Text>
                <Text style={[styles.statNote, { color: ticket.attendance_ok ? '#10B981' : '#EF4444' }]}>
                  {ticket.attendance_ok ? 'Meets requirement' : 'Below requirement'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Fee Status</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {ticket.fee_paid ? 'Paid' : 'Pending'}
                </Text>
                <Text style={[styles.statNote, { color: ticket.fee_paid ? '#10B981' : '#EF4444' }]}>
                  {ticket.fee_paid ? 'All fees cleared' : 'Payment required'}
                </Text>
              </View>
            </View>

            {ticket.is_eligible && exam?.hall_ticket_published && (
              <TouchableOpacity
                style={[styles.downloadBtn, { opacity: downloading ? 0.6 : 1 }]}
                onPress={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="download" size={16} color="white" />
                )}
                <Text style={styles.downloadBtnText}>Download Hall Ticket</Text>
              </TouchableOpacity>
            )}
            {ticket.is_eligible && !exam?.hall_ticket_published && (
              <View style={[styles.noticeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.noticeText, { color: colors['muted-foreground'] }]}>
                  Hall tickets have not been published yet. Check back later.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}

// ---------------------------------------------------------------------------
// Admin view — every enrolled student's eligibility, with compute / publish /
// override / download management (web parity: AdminHallTicketView).
// ---------------------------------------------------------------------------
type TabKey = 'eligible' | 'ineligible';

function AdminHallTicketView({ examId }: { examId: string }) {
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const [activeTab, setActiveTab] = useState<TabKey>('eligible');

  const isDark    = theme === 'dark';
  const cardBg    = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textMain  = colors.foreground as string;
  const textMuted = colors['muted-foreground'] as string;

  // Web parity: hall-ticket authorization is granted under the "exams"
  // resource — compute / publish / override map to "update"; downloads to "read".
  const canCompute  = hasPermission?.('exams', 'update');
  const canPublish  = hasPermission?.('exams', 'update');
  const canOverride = hasPermission?.('exams', 'update');
  const canDownload = hasPermission?.('exams', 'read');

  const { data: exam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.getById(examId),
    enabled: !!examId,
  });

  const downloadAuthed = (url: string, filename: string, mimeType: string) =>
    downloadAuthenticatedFile(url, filename, mimeType, showError);

  const handleDownloadOne = (studentId: string) => {
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = `${baseUrl}${examHallTicketsApi.downloadUrl(examId, studentId)}`;
    downloadAuthed(url, `hall_ticket_${studentId}.pdf`, 'application/pdf');
  };

  const handleDownloadAll = () => {
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const url = `${baseUrl}${examHallTicketsApi.downloadAllUrl(examId)}`;
    downloadAuthed(url, `hall_tickets_${examId}.zip`, 'application/zip');
  };

  const { data: eligibleData, isLoading: loadingEligible } = useQuery({
    queryKey: ['hall-tickets-eligible', examId],
    queryFn: () => examHallTicketsApi.getEligible(examId),
    enabled: !!examId,
  });

  const { data: ineligibleData, isLoading: loadingIneligible } = useQuery({
    queryKey: ['hall-tickets-ineligible', examId],
    queryFn: () => examHallTicketsApi.getIneligible(examId),
    enabled: !!examId,
  });

  const computeMutation = useMutation({
    mutationFn: () => examHallTicketsApi.computeEligibility(examId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hall-tickets-eligible', examId] });
      qc.invalidateQueries({ queryKey: ['hall-tickets-ineligible', examId] });
      showSuccess('Eligibility Computed', 'Eligibility computed successfully.');
    },
    onError: () => showError('Error', 'Failed to compute eligibility.'),
  });

  const publishMutation = useMutation({
    mutationFn: () => examHallTicketsApi.publish(examId),
    onSuccess: () => showSuccess('Hall Tickets Published', 'Hall tickets published.'),
    onError: () => showError('Error', 'Failed to publish hall tickets.'),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ studentId, eligible }: { studentId: string; eligible: boolean }) =>
      examHallTicketsApi.overrideEligibility(examId, studentId, {
        attendance_override: eligible,
        fee_override: eligible,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hall-tickets-eligible', examId] });
      qc.invalidateQueries({ queryKey: ['hall-tickets-ineligible', examId] });
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
    <AppLayout title={`Hall Tickets — ${exam?.exam_name ?? '...'}`}>
      <View style={styles.container}>

        {/* Action Buttons */}
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

        {/* Tab Bar */}
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

        {/* Content */}
        {isLoading ? (
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

                    {!!item.ineligibility_reason && !item.is_eligible ? (
                      <Text style={styles.reasonText}>{item.ineligibility_reason}</Text>
                    ) : null}

                    <View style={styles.cardStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="calendar-outline" size={13} color={textMuted} />
                        <Text style={[styles.statLabelInline, { color: textMuted }]}>Att.</Text>
                        {item.attendance_percent != null ? (
                          <View style={[styles.statBadge, { backgroundColor: `${attColor}18` }]}>
                            <Text style={[styles.statBadgeText, { color: attColor }]}>
                              {item.attendance_percent.toFixed(0)}%
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.statLabelInline, { color: textMuted }]}>—</Text>
                        )}
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
                      <View style={styles.statItem}>
                        <Ionicons name="card-outline" size={13} color={textMuted} />
                        <Text style={[styles.statLabelInline, { color: textMuted }]}>Fee</Text>
                        <View style={[styles.statBadge, { backgroundColor: item.fee_paid ? '#10B98118' : '#EF444418' }]}>
                          <Text style={[styles.statBadgeText, { color: item.fee_paid ? '#10B981' : '#EF4444' }]}>
                            {item.fee_paid ? 'Paid' : 'Unpaid'}
                          </Text>
                        </View>
                      </View>
                    </View>

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

// ---------------------------------------------------------------------------
// Router — picks the view for the current role (web parity: HallTicketEligibility).
// ---------------------------------------------------------------------------
export default function HallTicketDetailScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { role, selectedStudent } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';

  if (roleName === 'student') {
    return <SelfServiceHallTicketView examId={examId} />;
  }
  if (PARENT_ROLE_NAMES.includes(roleName)) {
    return (
      <SelfServiceHallTicketView
        examId={examId}
        childId={selectedStudent?.id}
        childName={selectedStudent?.name}
      />
    );
  }
  if (isAdminRole(roleName)) {
    return <AdminHallTicketView examId={examId} />;
  }
  // Teacher / other staff without admin: same read-only management view,
  // action buttons already self-gate on the "exams":"update" permission.
  return <AdminHallTicketView examId={examId} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 12, marginBottom: 14 },

  /* Self-service status card */
  statusCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14,
  },
  statusTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  statusSub: { fontSize: 12, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14 },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statNote: { fontSize: 11, marginTop: 4, fontWeight: '600' },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#556ee6', borderRadius: 12, paddingVertical: 13,
  },
  downloadBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  noticeCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  noticeText: { fontSize: 13, textAlign: 'center' },

  emptyCard: {
    borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', padding: 32,
    alignItems: 'center', gap: 10,
  },

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

  eligBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  eligBadgeText: { fontSize: 11, fontWeight: '600' },

  overrideBadge: { backgroundColor: '#F59E0B18', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  overrideBadgeText: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
  reasonText: { fontSize: 12, color: '#EF4444', marginBottom: 6 },

  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabelInline: { fontSize: 12 },
  statBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  statBadgeText: { fontSize: 11, fontWeight: '600' },
  statDivider: { width: 1, height: 16, marginHorizontal: 4 },

  cardFooter: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, marginTop: 6 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cardActionText: { fontSize: 13, fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
});
