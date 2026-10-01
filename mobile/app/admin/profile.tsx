import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { adminUsersApi } from '@/src/api/users';

const ROW = ({ label, value, colors }: { label: string; value: string | null | undefined; colors: any }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, { color: colors['muted-foreground'] }]}>{label}</Text>
    <Text style={[styles.rowValue, { color: colors.foreground }]}>{value || '—'}</Text>
  </View>
);

export default function AdminProfileScreen() {
  const { user, role } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const cardBg  = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: profile, isLoading } = useQuery({
    queryKey: ['adminProfile', user?.id],
    queryFn: () => adminUsersApi.getUserDetails(user!.id),
    enabled: !!user?.id,
  });

  const initial = (user?.username ?? 'A').charAt(0).toUpperCase();

  return (
    <AppLayout title="My Profile">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Avatar hero */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={[styles.username, { color: colors.foreground }]}>{user?.username}</Text>
          <Text style={[styles.role, { color: colors['muted-foreground'] }]}>
            {role?.name ?? 'Administrator'}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account Details</Text>
            <ROW label="Username" value={user?.username} colors={colors} />
            <ROW label="Email" value={profile?.email ?? user?.email} colors={colors} />
            <ROW label="Full Name" value={profile?.entity_name} colors={colors} />
            <ROW label="Role" value={profile?.role_name ?? role?.name} colors={colors} />
            <ROW label="Status" value={profile?.is_active ? 'Active' : 'Inactive'} colors={colors} />
          </View>
        )}

        <TouchableOpacity
          style={[styles.changePwdBtn, { borderColor: borderCol }]}
          onPress={() => router.push('/profile/change-password' as any)}
        >
          <Ionicons name="lock-closed-outline" size={18} color="#556ee6" />
          <Text style={{ color: '#556ee6', fontWeight: '600', fontSize: 14 }}>Change Password</Text>
          <Ionicons name="chevron-forward" size={16} color="#556ee6" />
        </TouchableOpacity>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#556ee6', justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  avatarText: { color: 'white', fontSize: 28, fontWeight: '700' },
  username: { fontSize: 22, fontWeight: '700' },
  role: { fontSize: 14 },
  centered: { paddingVertical: 32, alignItems: 'center' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rowLabel: { fontSize: 13, fontWeight: '600', flex: 0.45 },
  rowValue: { fontSize: 13, flex: 0.55, textAlign: 'right' },
  changePwdBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
});
