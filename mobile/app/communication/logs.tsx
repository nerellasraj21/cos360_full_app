import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { communicationApi, CommunicationLog } from '@/src/api/communication';

const STATUS_COLOR: Record<string, string> = {
  sent: '#10B981',
  failed: '#EF4444',
  pending: '#F59E0B',
};

export default function LogsScreen() {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: logs, isLoading } = useQuery({
    queryKey: ['comm-logs'],
    queryFn: () => communicationApi.getLogs(),
  });

  const renderItem = ({ item }: { item: CommunicationLog }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.subject, { color: colors.foreground }]} numberOfLines={1}>
          {item.subject || '(No subject)'}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: (STATUS_COLOR[item.status] ?? '#888') + '20' },
          ]}
        >
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? '#888' }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.body, { color: colors['muted-foreground'] }]} numberOfLines={2}>
        {item.body}
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          {item.channel.toUpperCase()} • {item.recipient_type} • {item.recipient_count} recipients
        </Text>
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          {new Date(item.sent_at).toLocaleString('en-IN', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <AppLayout title="Message Logs">
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      ) : (
        <FlatList
          data={logs ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="mail-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No messages sent yet
              </Text>
            </View>
          }
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subject: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 11 },
});
