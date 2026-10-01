import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import apiClient from '@/src/api/client';
import { examHallTicketsApi, HallTicketEligibility } from '@/src/api/exam';
import { getValidAccessToken } from '@/services/authUtils';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const downloadAuthenticatedFile = async (
  url: string,
  filename: string,
  mimeType: string,
  showError: (title: string, message?: string) => void,
): Promise<boolean> => {
  try {
    const token = await getValidAccessToken(false);
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    if (Platform.OS === 'web') {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error('Download failed');
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
      if (result.status && result.status >= 400) throw new Error('Download failed');
      await Sharing.shareAsync(result.uri, { mimeType, UTI: mimeType });
    }
    return true;
  } catch {
    showError('Download Failed', 'Could not download file. Please try again.');
    return false;
  }
};

function HallTicketDownloadScreenContent() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const [busyId, setBusyId] = useState<string | null>(null);
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: tickets, isLoading, isError, refetch, isRefetching } = useQuery<HallTicketEligibility[]>({
    queryKey: ['hall-tickets-eligible', examId],
    queryFn: () => examHallTicketsApi.getEligible(examId),
    enabled: !!examId,
  });

  const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');

  const downloadOne = async (ticket: HallTicketEligibility) => {
    setBusyId(ticket.student_id);
    const ok = await downloadAuthenticatedFile(
      `${baseUrl}${examHallTicketsApi.downloadUrl(examId, ticket.student_id)}`,
      `hall_ticket_${ticket.student_id}.pdf`,
      'application/pdf',
      showError,
    );
    setBusyId(null);
    if (ok) showSuccess('Hall ticket downloaded');
  };

  const downloadAll = async () => {
    setBusyId('all');
    const ok = await downloadAuthenticatedFile(
      `${baseUrl}${examHallTicketsApi.downloadAllUrl(examId)}`,
      `hall_tickets_${examId}.zip`,
      'application/zip',
      showError,
    );
    setBusyId(null);
    if (ok) showSuccess('Hall tickets downloaded');
  };

  return (
    <AppLayout title="Hall Ticket Download">
      <View style={styles.flex}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981', opacity: busyId === 'all' || (tickets ?? []).length === 0 ? 0.5 : 1 }]}
            onPress={downloadAll}
            disabled={busyId === 'all' || (tickets ?? []).length === 0}
          >
            {busyId === 'all' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="download" size={16} color="white" />
            )}
            <Text style={styles.actionBtnText}>Download All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={tickets ?? []}
            keyExtractor={(t) => t.student_id}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name={isError ? 'alert-circle-outline' : 'ticket-outline'} size={48} color={colors['muted-foreground']} />
                <Text style={{ color: colors['muted-foreground'], fontSize: 14, textAlign: 'center' }}>
                  {isError ? 'Could not load hall tickets. Pull down to retry.' : 'No eligible students found for this exam.'}
                </Text>
              </View>
            }
            renderItem={({ item: ticket }) => (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.ticketIcon}>
                  <Ionicons name="ticket" size={20} color="#556ee6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: colors.foreground }]} numberOfLines={1}>
                    {ticket.student_name || 'Student'}
                  </Text>
                  <Text style={[styles.studentMeta, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                    {[ticket.admission_number, ticket.hall_ticket_number].filter(Boolean).join(' | ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.dlBtn, { backgroundColor: '#10B98118' }]}
                  onPress={() => downloadOne(ticket)}
                  disabled={busyId === ticket.student_id}
                  accessibilityLabel="Download hall ticket"
                >
                  {busyId === ticket.student_id ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <Ionicons name="download-outline" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 40, gap: 10, flexGrow: 1 },
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, minHeight: 44, borderRadius: 12,
  },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  centered: { alignItems: 'center', paddingVertical: 48 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  ticketIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#556ee618', justifyContent: 'center', alignItems: 'center',
  },
  studentName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  studentMeta: { fontSize: 12 },
  dlBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});

export default function HallTicketDownloadScreen() {
  return (
    <ScreenAccessGate
      title="Hall Ticket"
      resources={['exams']}
      permissions={[['exams', 'read']]}
    >
      <HallTicketDownloadScreenContent />
    </ScreenAccessGate>
  );
}
