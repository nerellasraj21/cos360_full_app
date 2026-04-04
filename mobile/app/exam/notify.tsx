import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { PermissionGuard } from '@/components/PermissionGuards';
import { useToastContext } from '@/components/ToastProvider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/contexts';
import { examsApi, examNotificationsApi } from '@/src/api/exam';
import type { NotificationRequest } from '@/src/api/exam';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

type TargetAudience = 'students' | 'parents' | 'both';

const AUDIENCE_OPTIONS: { label: string; value: TargetAudience; icon: string }[] = [
  { label: 'Students', value: 'students', icon: 'school' },
  { label: 'Parents', value: 'parents', icon: 'people' },
  { label: 'Both', value: 'both', icon: 'people-circle' },
];

const ACCENT = '#EF4444';

export default function ExamNotifyScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('students');
  const [sendPush, setSendPush] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [sendSms, setSendSms] = useState(false);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#e5e7eb';

  const { data: examsData = [], isLoading: examsLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list({ size: 50 }),
  });

  const exams = Array.isArray(examsData) ? examsData : [];

  const notifyMutation = useMutation({
    mutationFn: ({ examId, data }: { examId: string; data: NotificationRequest }) =>
      examNotificationsApi.send(examId, data),
    onSuccess: (result) => {
      showSuccess(
        'Notifications Queued',
        `${result.notifications_queued} notification(s) queued successfully.`
      );
      setNotificationType('');
      setMessage('');
    },
    onError: (error: any) => {
      showError('Send Failed', error.message || 'Failed to send notifications');
    },
  });

  const handleSend = () => {
    if (!selectedExamId) {
      showError('Validation', 'Please select an exam');
      return;
    }
    if (!notificationType.trim()) {
      showError('Validation', 'Please enter a notification type');
      return;
    }
    if (!message.trim()) {
      showError('Validation', 'Please enter a message');
      return;
    }
    if (!sendPush && !sendEmail && !sendSms) {
      showError('Validation', 'Please select at least one delivery channel');
      return;
    }

    const payload: NotificationRequest = {
      notification_type: notificationType.trim(),
      message: message.trim(),
      target_audience: targetAudience,
      send_push: sendPush,
      send_email: sendEmail,
      send_sms: sendSms,
    };

    notifyMutation.mutate({ examId: selectedExamId, data: payload });
  };

  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <PermissionGuard
      resourceConstant={PERMISSION_RESOURCES.EXAMS}
      actionConstant="create"
      fallback={
        <AppLayout title="Exam Notifications">
          <View style={styles.centered}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>You don't have permission to send notifications</ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Exam Notifications">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Banner */}
          <View style={[styles.banner, { backgroundColor: ACCENT }]}>
            <View style={styles.bannerIcon}>
              <Ionicons name="notifications" size={26} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.bannerTitle}>Send Exam Notification</ThemedText>
              <ThemedText style={styles.bannerSub}>Notify students and parents about exam updates</ThemedText>
            </View>
          </View>

          {/* Exam Selector */}
          <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <ThemedText style={styles.sectionTitle}>Select Exam *</ThemedText>
            {examsLoading ? (
              <ThemedText style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading exams...</ThemedText>
            ) : exams.length === 0 ? (
              <ThemedText style={[styles.loadingText, { color: colors['muted-foreground'] }]}>No exams available</ThemedText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {exams.map(exam => (
                  <TouchableOpacity
                    key={exam.id}
                    style={[
                      styles.chip,
                      { borderColor: selectedExamId === exam.id ? ACCENT : borderCol },
                      selectedExamId === exam.id && { backgroundColor: ACCENT + '18' },
                    ]}
                    onPress={() => setSelectedExamId(exam.id)}
                    activeOpacity={0.7}
                  >
                    <ThemedText
                      style={[styles.chipText, selectedExamId === exam.id && { color: ACCENT, fontWeight: '600' }]}
                      numberOfLines={1}
                    >
                      {exam.exam_name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            {selectedExam && (
              <View style={[styles.selectedExamInfo, { backgroundColor: ACCENT + '10' }]}>
                <Ionicons name="school" size={16} color={ACCENT} />
                <ThemedText style={[styles.selectedExamText, { color: ACCENT }]}>
                  {selectedExam.exam_name} · {selectedExam.exam_type} · {selectedExam.status.toUpperCase()}
                </ThemedText>
              </View>
            )}
          </ThemedView>

          {/* Notification Type */}
          <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <ThemedText style={styles.sectionTitle}>Notification Type *</ThemedText>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="e.g. exam_reminder, result_published, schedule_change"
              placeholderTextColor={colors['muted-foreground']}
              value={notificationType}
              onChangeText={setNotificationType}
              autoCapitalize="none"
            />
          </ThemedView>

          {/* Message */}
          <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <ThemedText style={styles.sectionTitle}>Message *</ThemedText>
            <TextInput
              style={[styles.textarea, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Enter the notification message..."
              placeholderTextColor={colors['muted-foreground']}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <ThemedText style={[styles.charCount, { color: colors['muted-foreground'] }]}>
              {message.length} characters
            </ThemedText>
          </ThemedView>

          {/* Target Audience */}
          <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <ThemedText style={styles.sectionTitle}>Target Audience *</ThemedText>
            <View style={styles.audienceRow}>
              {AUDIENCE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.audienceBtn,
                    { borderColor: targetAudience === opt.value ? ACCENT : borderCol },
                    targetAudience === opt.value && { backgroundColor: ACCENT + '18' },
                  ]}
                  onPress={() => setTargetAudience(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={20}
                    color={targetAudience === opt.value ? ACCENT : colors['muted-foreground']}
                  />
                  <ThemedText
                    style={[styles.audienceBtnText, targetAudience === opt.value && { color: ACCENT, fontWeight: '600' }]}
                  >
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ThemedView>

          {/* Delivery Channels */}
          <ThemedView style={[styles.section, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <ThemedText style={styles.sectionTitle}>Delivery Channels *</ThemedText>
            {[
              { label: 'Push Notification', value: sendPush, setter: setSendPush, icon: 'notifications' },
              { label: 'Email', value: sendEmail, setter: setSendEmail, icon: 'mail' },
              { label: 'SMS', value: sendSms, setter: setSendSms, icon: 'chatbubble' },
            ].map(channel => (
              <TouchableOpacity
                key={channel.label}
                style={styles.channelRow}
                onPress={() => channel.setter(!channel.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={channel.value ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={channel.value ? ACCENT : colors['muted-foreground']}
                />
                <Ionicons name={channel.icon as any} size={18} color={colors['muted-foreground']} />
                <ThemedText style={styles.channelLabel}>{channel.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </ThemedView>

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: notifyMutation.isPending ? colors['muted-foreground'] : ACCENT },
            ]}
            onPress={handleSend}
            disabled={notifyMutation.isPending}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={20} color="white" />
            <ThemedText style={styles.sendBtnText}>
              {notifyMutation.isPending ? 'Sending...' : 'Send Notification'}
            </ThemedText>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </AppLayout>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  accessDeniedText: { fontSize: 15, textAlign: 'center' },
  banner: {
    borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16, overflow: 'hidden',
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  section: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 0.3 },
  loadingText: { fontSize: 13, fontStyle: 'italic' },
  chipRow: { gap: 8, paddingBottom: 4 },
  chip: {
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 180,
  },
  chipText: { fontSize: 13 },
  selectedExamInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    padding: 10, borderRadius: 8,
  },
  selectedExamText: { fontSize: 13, fontWeight: '500', flex: 1 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  textarea: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 100 },
  charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
  audienceRow: { flexDirection: 'row', gap: 8 },
  audienceBtn: {
    flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 12,
    alignItems: 'center', gap: 6,
  },
  audienceBtnText: { fontSize: 12 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  channelLabel: { fontSize: 15 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 14, marginTop: 4,
  },
  sendBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
