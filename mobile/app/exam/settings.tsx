import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { CustomDropdown, DropdownOption } from '@/components/ui/dropdown';
import { useAuth, useTheme } from '@/contexts';
import { ExamSettings, examSettingsApi } from '@/src/api/exam';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { isAdminRole } from '@/src/lib/roles';

// Web parity (ExamSettingsPage): CBSE / ICSE / State / BTech / Custom.
const BOARD_OPTIONS: DropdownOption[] = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'State', label: 'State Board' },
  { value: 'BTech', label: 'BTech' },
  { value: 'Custom', label: 'Custom' },
];

export default function ExamSettingsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  // Web parity (ExamSettingsPage): exam settings are admin-only.
  const isAdmin = isAdminRole(role?.name);
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/exam/list');
    }
  }, [isAdmin, router]);

  const [form, setForm] = useState<ExamSettings>({});
  const [dirty, setDirty] = useState(false);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  // Web parity: exam settings authorization is granted under the "exams"
  // resource — see mobile backend files/exam_settings_endpoints.py.
  const canUpdate = hasPermission?.('exams', 'update');

  const { data: settings, isLoading } = useQuery({
    queryKey: ['exam-settings'],
    queryFn: () => examSettingsApi.get(),
  });

  useEffect(() => {
    if (settings) {
      setForm({
        default_board: settings.default_board ?? '',
        custom_board_name: settings.custom_board_name ?? '',
        hall_ticket_min_attendance: settings.hall_ticket_min_attendance ?? 75,
        hall_ticket_min_fee_paid_pct: settings.hall_ticket_min_fee_paid_pct,
      });
      setDirty(false);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data: ExamSettings) => examSettingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-settings'] });
      setDirty(false);
      showSuccess('Saved', 'Exam settings updated.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to save settings.')),
  });

  const setField = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  };

  // Non-admins are redirected by the effect above; render nothing meanwhile.
  if (!isAdmin) return null;

  if (isLoading) {
    return (
      <AppLayout title="Exam Settings">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Exam Settings">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Board Configuration */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={18} color="#556ee6" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Board Configuration</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors['muted-foreground'] }]}>
            Default examination board settings
          </Text>

          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Default Board</Text>
          <CustomDropdown
            data={BOARD_OPTIONS}
            value={form.default_board || null}
            onChange={v => {
              setField('default_board', (v as string) ?? '');
              if (v !== 'Custom') setField('custom_board_name', '');
            }}
            placeholder="Select default board"
            search={false}
            disabled={!canUpdate}
          />

          {form.default_board === 'Custom' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'], marginTop: 12 }]}>Custom Board Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.custom_board_name ?? ''}
                onChangeText={v => setField('custom_board_name', v)}
                placeholder="Enter custom board name"
                placeholderTextColor={colors['muted-foreground']}
                editable={!!canUpdate}
              />
            </>
          )}
        </View>

        {/* Hall Ticket Settings */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hall Ticket Settings</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors['muted-foreground'] }]}>
            Attendance threshold for hall ticket eligibility
          </Text>

          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Minimum Attendance %</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
            value={String(form.hall_ticket_min_attendance ?? '')}
            onChangeText={v => setField('hall_ticket_min_attendance', Number(v) || 0)}
            keyboardType="numeric"
            placeholder="75"
            placeholderTextColor={colors['muted-foreground']}
            editable={!!canUpdate}
          />
          <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
            Students below this threshold are ineligible
          </Text>
        </View>

        {/* Fee Payment Policy */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash-outline" size={18} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fee Payment Policy</Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors['muted-foreground'] }]}>
            Minimum fee payment required as of exam date
          </Text>

          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Minimum Fee Paid %</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
            value={String(form.hall_ticket_min_fee_paid_pct ?? '')}
            onChangeText={v => setField('hall_ticket_min_fee_paid_pct', v ? Number(v) : undefined)}
            keyboardType="numeric"
            placeholder="60"
            placeholderTextColor={colors['muted-foreground']}
            editable={!!canUpdate}
          />
          <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
            Students below this fee payment % cannot appear for exam
          </Text>
        </View>

        {/* Updated at */}
        {settings?.updated_at && (
          <Text style={[styles.updatedAt, { color: colors['muted-foreground'] }]}>
            Last updated: {new Date(settings.updated_at).toLocaleString()}
          </Text>
        )}

        {canUpdate && (
          <TouchableOpacity
            style={[styles.saveBtn, { opacity: !dirty || updateMutation.isPending ? 0.5 : 1 }]}
            onPress={() => updateMutation.mutate(form)}
            disabled={!dirty || updateMutation.isPending}
          >
            <Ionicons name="checkmark-circle" size={18} color="white" />
            <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save Settings'}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  section: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginBottom: 14, lineHeight: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 4,
  },
  hint: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  updatedAt: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#556ee6', borderRadius: 10, paddingVertical: 14, marginBottom: 8,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
