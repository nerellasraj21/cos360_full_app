import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';

const COMM_LINKS = [
  {
    id: 'compose',
    title: 'Compose',
    description: 'Send SMS, email or push notification',
    icon: 'create',
    color: '#556ee6',
    route: '/communication/compose',
  },
  {
    id: 'templates',
    title: 'Templates',
    description: 'Manage reusable message templates',
    icon: 'document-text',
    color: '#10B981',
    route: '/communication/templates',
  },
  {
    id: 'logs',
    title: 'Message Logs',
    description: 'View history of all sent messages',
    icon: 'time',
    color: '#F59E0B',
    route: '/communication/logs',
  },
];

export default function CommunicationTab() {
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const router = useRouter();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudentOrParent = ['student', 'parent', 'guardian', 'father', 'mother'].includes(roleName);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  if (isStudentOrParent) {
    return (
      <AppLayout title="Communication">
        <View style={styles.restricted}>
          <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.restrictedTitle, { color: colors.foreground }]}>Access Restricted</Text>
          <Text style={[styles.restrictedSub, { color: colors['muted-foreground'] }]}>
            Communication tools are only available to staff and admin.
          </Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Communication">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
          Send messages and manage communication
        </Text>

        {COMM_LINKS.map((link) => (
          <TouchableOpacity
            key={link.id}
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push(link.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: link.color + '20' }]}>
              <Ionicons name={link.icon as any} size={24} color={link.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{link.title}</Text>
              <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>
                {link.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  restrictedTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  restrictedSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  container: { padding: 16 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});
