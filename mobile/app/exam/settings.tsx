import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { ExamSettings, examSettingsApi } from '@/src/api/exam';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

export default function ExamSettingsScreen() {
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  const [form, setForm] = useState<ExamSettings>({});
  const [dirty, setDirty] = useState(false);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const canUpdate = hasPermission?.('exam_settings', 'update');

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
        grace_max_per_subject: settings.grace_max_per_subject ?? 0,
        grace_max_subjects: settings.grace_max_subjects ?? 0,
        grace_auto_apply: settings.grace_auto_apply ?? false,
        reconduct_max_failed_subjects: settings.reconduct_max_failed_subjects ?? 2,
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
    onError: () => showError('Error', 'Failed to save settings.'),
  });

  const setField = <K extends keyof ExamSettings>(key: K, value: ExamSettings[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setDirty(true);
  };

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

        {/* General */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={18} color="#556ee6" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Board Configuration</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Default Board</Text>
          <View style={styles.chipRow}>
            {(['CBSE', 'ICSE', 'State', 'BTech', 'Custom'] as const).map(b => (
              <TouchableOpacity
                key={b}
                style={[
                  styles.chip,
                  {
                    backgroundColor: form.default_board === b ? '#556ee6' : inputBg,
                    borderColor: form.default_board === b ? '#556ee6' : borderCol,
                  },
                ]}
                onPress={() => {
                  setField('default_board', b);
                  if (b !== 'Custom') setField('custom_board_name', '');
                }}
                disabled={!canUpdate}
              >
                <Text style={[styles.chipText, { color: form.default_board === b ? 'white' : colors['muted-foreground'] as string }]}>
                  {b}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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

        {/* Hall Ticket */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card-outline" size={18} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Hall Ticket</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Minimum Attendance % for Hall Ticket</Text>
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
            Students below this attendance threshold will be flagged as ineligible.
          </Text>
        </View>

        {/* Grace Marks */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={18} color="#10B981" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Grace Marks</Text>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Max Grace per Subject</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={String(form.grace_max_per_subject ?? '')}
                onChangeText={v => setField('grace_max_per_subject', Number(v) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors['muted-foreground']}
                editable={!!canUpdate}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Max Subjects with Grace</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={String(form.grace_max_subjects ?? '')}
                onChangeText={v => setField('grace_max_subjects', Number(v) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors['muted-foreground']}
                editable={!!canUpdate}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Auto-apply grace marks</Text>
              <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
                Automatically add grace when a student is close to passing
              </Text>
            </View>
            <Switch
              value={form.grace_auto_apply ?? false}
              onValueChange={v => setField('grace_auto_apply', v)}
              disabled={!canUpdate}
              trackColor={{ false: borderCol, true: '#556ee6' }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Reconduct Policy */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="refresh-circle-outline" size={18} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Reconduct Policy</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Max Failed Subjects for Reconduct</Text>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
            value={String(form.reconduct_max_failed_subjects ?? '')}
            onChangeText={v => setField('reconduct_max_failed_subjects', Number(v) || 0)}
            keyboardType="numeric"
            placeholder="2"
            placeholderTextColor={colors['muted-foreground']}
            editable={!!canUpdate}
          />
          <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
            Students with more failed subjects than this cannot appear for re-examination.
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 4,
  },
  hint: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  row: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },
  updatedAt: { fontSize: 12, textAlign: 'center', marginBottom: 16 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#556ee6', borderRadius: 10, paddingVertical: 14, marginBottom: 8,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
