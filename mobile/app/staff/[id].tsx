import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { staffApi } from '@/src/api/staff';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const ROW = ({ label, value, colors }: { label: string; value: string | null | undefined; colors: any }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, { color: colors['muted-foreground'] }]}>{label}</Text>
    <Text style={[styles.rowValue, { color: colors.foreground }]}>{value || '—'}</Text>
  </View>
);

function StaffDetailScreenContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, theme } = useTheme();
  const router = useRouter();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: staff, isLoading, error } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffApi.getStaffEnrollmentById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <AppLayout title="Staff Detail">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  if (error || !staff) {
    return (
      <AppLayout title="Staff Detail">
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors['muted-foreground'] }]}>
            Could not load staff details.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={{ color: '#556ee6', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const fullName = `${staff.first_name ?? ''} ${staff.last_name ?? ''}`.trim();
  const initials = (staff.first_name?.[0] ?? '') + (staff.last_name?.[0] ?? '');

  return (
    <AppLayout title="Staff Detail">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Avatar + Name */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials.toUpperCase() || '?'}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{fullName || 'Staff Member'}</Text>
          <Text style={[styles.designation, { color: colors['muted-foreground'] }]}>
            {staff.designation_obj?.title ?? staff.designation?.title ?? 'No designation'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: staff.is_active ? '#10B981' : '#EF4444' }]}>
            <Text style={styles.statusText}>{staff.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        {/* Details card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Staff Information</Text>
          <ROW label="Employee ID" value={staff.employee_id} colors={colors} />
          <ROW label="Email" value={staff.email} colors={colors} />
          <ROW label="Phone" value={staff.phone} colors={colors} />
          <ROW label="Department" value={staff.department} colors={colors} />
          <ROW label="Date of Joining" value={staff.joining_date} colors={colors} />
        </View>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errorText: { fontSize: 15, textAlign: 'center' },
  backBtn: { marginTop: 8, padding: 10 },

  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#556ee6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: { color: 'white', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700' },
  designation: { fontSize: 14 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  statusText: { color: 'white', fontSize: 12, fontWeight: '600' },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rowLabel: { fontSize: 13, fontWeight: '600', flex: 0.45 },
  rowValue: { fontSize: 13, flex: 0.55, textAlign: 'right' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function StaffDetailScreen() {
  return (
    <ScreenAccessGate
      title="Staff Details"
      resources={['staff']}
    >
      <StaffDetailScreenContent />
    </ScreenAccessGate>
  );
}
