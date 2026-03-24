import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';

export default function AdminRolesScreen() {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1';

  return (
    <AppLayout title="Role Management">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={[styles.comingSoonCard, { borderColor: borderCol, backgroundColor: cardBg }]}>
          <Ionicons name="shield-checkmark" size={52} color={colors['muted-foreground']} />
          <Text style={[styles.title, { color: colors.foreground }]}>Role Management</Text>
          <Text style={[styles.desc, { color: colors['muted-foreground'] }]}>
            Configure roles and fine-grained access control. This screen is coming soon.
          </Text>
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  comingSoonCard: {
    borderRadius: 14, borderWidth: 1.5,
    borderStyle: 'dashed', padding: 40,
    marginTop: 32, alignItems: 'center', gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  desc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
