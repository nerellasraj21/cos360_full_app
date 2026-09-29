import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { announcementsApi, SendHolidayNoticeParams } from '@/src/api/announcements';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

/** YYYY-MM-DD, matches the plain-text date fields used elsewhere in the app (e.g. Communication > Logs). */
const DATE_PLACEHOLDER = 'YYYY-MM-DD';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function AnnouncementsScreenContent() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [reason, setReason] = useState('');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#1a1a2e' : '#f8fafc';

  const sendMutation = useMutation({
    mutationFn: (params: SendHolidayNoticeParams) => announcementsApi.sendHolidayNotice(params),
    onSuccess: (res) => {
      showSuccess('Announcement Queued', res.detail);
      setHolidayName('');
      setHolidayDate('');
      setReason('');
    },
    onError: (error: any) => {
      showError('Send Failed', error?.response?.data?.detail || 'Could not send holiday announcement.');
    },
  });

  const isFormValid = holidayName.trim() && DATE_RE.test(holidayDate.trim()) && reason.trim();

  const handleSend = () => {
    if (!holidayName.trim()) { showError('Error', 'Holiday name is required'); return; }
    if (!DATE_RE.test(holidayDate.trim())) { showError('Error', `Holiday date must be in ${DATE_PLACEHOLDER} format`); return; }
    if (!reason.trim()) { showError('Error', 'Reason is required'); return; }
    sendMutation.mutate({
      holiday_name: holidayName.trim(),
      holiday_date: holidayDate.trim(),
      reason: reason.trim(),
    });
  };

  return (
    <AppLayout title="Announcements">
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.banner, { backgroundColor: '#556ee6' }]}>
          <View style={styles.bannerIcon}>
            <Ionicons name="megaphone" size={26} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Holiday Announcement</Text>
            <Text style={styles.bannerSub}>
              Sends an SMS to every parent notifying them the school will remain closed.
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Holiday Name *</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
            placeholder="e.g. Independence Day"
            placeholderTextColor={colors['muted-foreground']}
            value={holidayName}
            onChangeText={setHolidayName}
          />

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Holiday Date *</Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
            placeholder={DATE_PLACEHOLDER}
            placeholderTextColor={colors['muted-foreground']}
            value={holidayDate}
            onChangeText={setHolidayDate}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Reason *</Text>
          <TextInput
            style={[
              styles.input,
              styles.textarea,
              { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg },
            ]}
            placeholder="e.g. National holiday"
            placeholderTextColor={colors['muted-foreground']}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {!!holidayName.trim() && !!holidayDate.trim() && !!reason.trim() && (
            <View style={[styles.previewBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
              <Text style={[styles.previewLabel, { color: colors['muted-foreground'] }]}>Message Preview</Text>
              <Text style={[styles.previewText, { color: colors.foreground }]}>
                School will remain closed on {holidayDate} for {holidayName}. — COS360
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: '#556ee6', opacity: !isFormValid || sendMutation.isPending ? 0.5 : 1 },
          ]}
          onPress={handleSend}
          disabled={!isFormValid || sendMutation.isPending}
        >
          <Ionicons name="send" size={18} color="white" />
          <Text style={styles.sendBtnText}>
            {sendMutation.isPending ? 'Sending...' : 'Send to All Parents'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  banner: {
    borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 3 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 17 },
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  textarea: { minHeight: 80 },
  previewBox: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 16,
  },
  previewLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  previewText: { fontSize: 13, lineHeight: 19 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, paddingVertical: 15, gap: 8,
  },
  sendBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function AnnouncementsScreen() {
  return (
    <ScreenAccessGate
      title="Announcements"
      resources={['announcements']}
    >
      <AnnouncementsScreenContent />
    </ScreenAccessGate>
  );
}
