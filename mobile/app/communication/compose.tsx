import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import {
  communicationApi,
  CommunicationTemplate,
  SendMessageRequest,
} from '@/src/api/communication';

type Channel = 'sms' | 'whatsapp' | 'email';
type RecipientType = 'all' | 'class' | 'student' | 'staff' | 'parent';

export default function ComposeScreen() {
  const { colors, theme } = useTheme();
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [channel, setChannel] = useState<Channel>('sms');
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => communicationApi.getTemplates(),
  });

  const sendMutation = useMutation({
    mutationFn: (data: SendMessageRequest) => communicationApi.send(data),
    onSuccess: (res) => {
      Alert.alert('Sent', `Message sent to ${res.recipient_count} recipients.`);
      setSubject('');
      setBody('');
      setTemplateId('');
    },
    onError: () => Alert.alert('Error', 'Failed to send message. Check permissions.'),
  });

  const handleSend = () => {
    if (!body.trim()) {
      Alert.alert('Error', 'Message body is required');
      return;
    }
    Alert.alert(
      'Confirm Send',
      `Send ${channel.toUpperCase()} to ${recipientType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () =>
            sendMutation.mutate({
              recipient_type: recipientType,
              subject,
              body,
              channel,
              template_id: templateId || undefined,
            }),
        },
      ],
    );
  };

  const applyTemplate = (t: CommunicationTemplate) => {
    setSubject(t.subject ?? '');
    setBody(t.body ?? '');
    setTemplateId(t.id ?? '');
  };

  const CHANNELS: { key: Channel; label: string; icon: string }[] = [
    { key: 'sms', label: 'SMS', icon: 'chatbubble' },
    { key: 'email', label: 'Email', icon: 'mail' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  ];

  const RECIPIENTS: { key: RecipientType; label: string }[] = [
    { key: 'all', label: 'All Users' },
    { key: 'parent', label: 'All Parents' },
    { key: 'student', label: 'All Students' },
    { key: 'staff', label: 'All Staff' },
  ];

  return (
    <AppLayout title="Compose Message">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Channel */}
        <Text style={[styles.label, { color: colors.foreground }]}>Channel</Text>
        <View style={styles.chipRow}>
          {CHANNELS.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.chip,
                { borderColor: channel === c.key ? '#556ee6' : borderCol },
                channel === c.key && { backgroundColor: '#556ee618' },
              ]}
              onPress={() => setChannel(c.key)}
            >
              <Ionicons
                name={c.icon as any}
                size={14}
                color={channel === c.key ? '#556ee6' : colors['muted-foreground']}
              />
              <Text
                style={{
                  color: channel === c.key ? '#556ee6' : colors['muted-foreground'],
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recipients */}
        <Text style={[styles.label, { color: colors.foreground }]}>Send To</Text>
        <View style={styles.chipRow}>
          {RECIPIENTS.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.chip,
                { borderColor: recipientType === r.key ? '#10B981' : borderCol },
                recipientType === r.key && { backgroundColor: '#10B98118' },
              ]}
              onPress={() => setRecipientType(r.key)}
            >
              <Text
                style={{
                  color: recipientType === r.key ? '#10B981' : colors['muted-foreground'],
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Template picker */}
        {(templates ?? []).length > 0 && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Use Template</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              {(templates ?? []).map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templateChip,
                    {
                      borderColor: templateId === t.id ? '#556ee6' : borderCol,
                      backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
                    },
                  ]}
                  onPress={() => applyTemplate(t)}
                >
                  <Text
                    style={{
                      color: templateId === t.id ? '#556ee6' : colors.foreground,
                      fontSize: 12,
                    }}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Subject — email only */}
        {channel === 'email' && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Subject</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: borderCol }]}
              placeholder="Email subject"
              placeholderTextColor={colors['muted-foreground']}
              value={subject}
              onChangeText={setSubject}
            />
          </>
        )}

        {/* Body */}
        <Text style={[styles.label, { color: colors.foreground }]}>Message *</Text>
        <TextInput
          style={[styles.input, styles.textarea, { color: colors.foreground, borderColor: borderCol }]}
          placeholder="Type your message here..."
          placeholderTextColor={colors['muted-foreground']}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: '#556ee6' }]}
          onPress={handleSend}
          disabled={sendMutation.isPending}
        >
          <Ionicons name="send" size={18} color="white" />
          <Text style={styles.sendBtnText}>
            {sendMutation.isPending ? 'Sending...' : `Send ${channel.toUpperCase()}`}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  templateChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  textarea: { height: 120, marginBottom: 8 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  sendBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
