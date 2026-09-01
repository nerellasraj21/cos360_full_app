import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import apiClient from '@/src/api/client';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

interface HallTicket {
  id: string;
  student_id: string;
  exam_id: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  download_url?: string;
}

function HallTicketDownloadScreenContent() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: tickets, isLoading } = useQuery<HallTicket[]>({
    queryKey: ['hallTickets', examId],
    queryFn: async () => {
      const res = await apiClient.get(`/exam/hall-tickets/${examId}`);
      return res.data.items ?? res.data ?? [];
    },
    enabled: !!examId,
  });

  const generateMutation = useMutation({
    mutationFn: () => apiClient.post(`/exam/hall-tickets/${examId}/generate`),
    onSuccess: () => showSuccess('Hall tickets generated successfully'),
    onError: () => showError('Failed to generate hall tickets'),
  });

  const downloadOne = async (ticket: HallTicket) => {
    try {
      const res = await apiClient.get(`/exam/hall-tickets/${ticket.id}/download`);
      const url = res.data?.url ?? res.data?.download_url;
      if (url) {
        await Linking.openURL(url);
      } else {
        showError('No download URL returned.');
      }
    } catch {
      showError('Download failed');
    }
  };

  const downloadAll = async () => {
    try {
      const res = await apiClient.get(`/exam/hall-tickets/${examId}/download-all`);
      const url = res.data?.url ?? res.data?.download_url;
      if (url) {
        await Linking.openURL(url);
        showSuccess('Download started');
      } else {
        showError('No download URL returned.');
      }
    } catch {
      showError('Bulk download failed');
    }
  };

  return (
    <AppLayout title="Hall Ticket Download">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#556ee6', opacity: generateMutation.isPending ? 0.5 : 1 }]}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <Ionicons name="refresh" size={16} color="white" />
            <Text style={styles.actionBtnText}>
              {generateMutation.isPending ? 'Generating...' : 'Generate All'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            onPress={downloadAll}
          >
            <Ionicons name="download" size={16} color="white" />
            <Text style={styles.actionBtnText}>Download All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : (tickets ?? []).length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="ticket-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[{ color: colors['muted-foreground'], fontSize: 14, textAlign: 'center' }]}>
              No hall tickets found. Click "Generate All" to create them.
            </Text>
          </View>
        ) : (
          <View style={styles.ticketList}>
            {tickets!.map((ticket) => (
              <View key={ticket.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.ticketIcon}>
                  <Ionicons name="ticket" size={20} color="#556ee6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.studentName, { color: colors.foreground }]} numberOfLines={1}>
                    {ticket.student_name ?? ticket.student_id}
                  </Text>
                  <Text style={[styles.studentMeta, { color: colors['muted-foreground'] }]}>
                    {[ticket.admission_number, ticket.class_name, ticket.section_name]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.dlBtn, { backgroundColor: '#10B98118' }]}
                  onPress={() => downloadOne(ticket)}
              accessibilityLabel="Download"
                >
                  <Ionicons name="download-outline" size={18} color="#10B981" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 12,
  },
  actionBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  centered: { alignItems: 'center', paddingVertical: 48 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12, paddingHorizontal: 16 },
  ticketList: { gap: 10 },
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
  dlBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function HallTicketDownloadScreen() {
  return (
    <ScreenAccessGate
      title="Hall Ticket"
      resources={['exam_hall_tickets']}
      permissions={[
        ['exam_hall_tickets', 'read_own'],
        ['exam_hall_tickets', 'download'],
        ['exam_hall_tickets', 'read_related'],
        ['exam_hall_tickets', 'list_related'],
      ]}
    >
      <HallTicketDownloadScreenContent />
    </ScreenAccessGate>
  );
}
