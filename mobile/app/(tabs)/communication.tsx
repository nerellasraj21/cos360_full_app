import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import {
  communicationApi,
  CommunicationLog,
  CommunicationTemplate,
  SendMessageRequest,
} from '@/src/api/communication';

type Tab = 'compose' | 'templates' | 'logs';
type Channel = 'sms' | 'email' | 'push';
type RecipientType = 'all' | 'class' | 'student' | 'staff' | 'parent';

const CHANNEL_COLORS: Record<string, string> = {
  sms: '#10B981',
  email: '#3B82F6',
  push: '#8B5CF6',
};

const STATUS_COLOR: Record<string, string> = {
  sent: '#10B981',
  failed: '#EF4444',
  pending: '#F59E0B',
};

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'compose', label: 'Compose', icon: 'create-outline' },
  { key: 'templates', label: 'Templates', icon: 'document-text-outline' },
  { key: 'logs', label: 'Logs', icon: 'time-outline' },
];

const CHANNELS: { key: Channel; label: string; icon: string }[] = [
  { key: 'sms', label: 'SMS', icon: 'chatbubble' },
  { key: 'email', label: 'Email', icon: 'mail' },
  { key: 'push', label: 'Push', icon: 'notifications' },
];

const RECIPIENTS: { key: RecipientType; label: string }[] = [
  { key: 'all', label: 'All Users' },
  { key: 'parent', label: 'All Parents' },
  { key: 'student', label: 'All Students' },
  { key: 'staff', label: 'All Staff' },
];

export default function CommunicationTab() {
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('compose');

  // Compose state
  const [channel, setChannel] = useState<Channel>('sms');
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');

  // Templates modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null);
  const [form, setForm] = useState<{ name: string; subject: string; body: string; channel: Channel }>({
    name: '', subject: '', body: '', channel: 'sms',
  });

  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudentOrParent = ['student', 'parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Queries
  const { data: templates } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => communicationApi.getTemplates(),
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['comm-logs'],
    queryFn: () => communicationApi.getLogs(),
    enabled: activeTab === 'logs',
  });

  // Send message mutation
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

  // Template mutations
  const createMutation = useMutation({
    mutationFn: communicationApi.createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-templates'] });
      setShowModal(false);
      resetForm();
    },
    onError: () => Alert.alert('Error', 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      communicationApi.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-templates'] });
      setShowModal(false);
      resetForm();
    },
    onError: () => Alert.alert('Error', 'Failed to update template'),
  });

  const deleteMutation = useMutation({
    mutationFn: communicationApi.deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comm-templates'] }),
    onError: () => Alert.alert('Error', 'Failed to delete template'),
  });

  const resetForm = () => {
    setForm({ name: '', subject: '', body: '', channel: 'sms' });
    setEditing(null);
  };

  const openEdit = (t: CommunicationTemplate) => {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject ?? '', body: t.body ?? '', channel: t.channel as Channel });
    setShowModal(true);
  };

  const handleDelete = (t: CommunicationTemplate) => {
    Alert.alert('Delete Template', `Delete "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(t.id) },
    ]);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.body.trim()) {
      Alert.alert('Error', 'Name and body are required');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleSend = () => {
    if (!body.trim()) {
      Alert.alert('Error', 'Message body is required');
      return;
    }
    Alert.alert('Confirm Send', `Send ${channel.toUpperCase()} to ${recipientType}?`, [
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
    ]);
  };

  const applyTemplate = (t: CommunicationTemplate) => {
    setSubject(t.subject ?? '');
    setBody(t.body ?? '');
    setTemplateId(t.id ?? '');
  };

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
      {/* In-page Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: borderCol, backgroundColor: colors.background }]}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t.icon as any}
                size={16}
                color={active ? '#556ee6' : colors['muted-foreground']}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? '#556ee6' : colors['muted-foreground'] },
                  active && { fontWeight: '700' },
                ]}
              >
                {t.label}
              </Text>
              {active && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Compose ── */}
      {activeTab === 'compose' && (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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

          {(templates ?? []).length > 0 && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>Use Template</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {(templates ?? []).map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.templateChip,
                      {
                        borderColor: templateId === t.id ? '#556ee6' : borderCol,
                        backgroundColor: cardBg,
                      },
                    ]}
                    onPress={() => applyTemplate(t)}
                  >
                    <Text style={{ color: templateId === t.id ? '#556ee6' : colors.foreground, fontSize: 12 }}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

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
      )}

      {/* ── Templates ── */}
      {activeTab === 'templates' && (
        <View style={{ flex: 1, padding: 16 }}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: '#556ee6' }]}
            onPress={() => { resetForm(); setShowModal(true); }}
          >
            <Ionicons name="add" size={18} color="white" />
            <Text style={styles.addBtnText}>New Template</Text>
          </TouchableOpacity>

          <FlatList
            data={templates ?? []}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
                <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>No templates yet</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardName, { color: colors.foreground }]}>{item.name}</Text>
                    <View
                      style={[
                        styles.channelBadge,
                        { backgroundColor: (CHANNEL_COLORS[item.channel] ?? '#888') + '20' },
                      ]}
                    >
                      <Text style={[styles.channelBadgeText, { color: CHANNEL_COLORS[item.channel] ?? '#888' }]}>
                        {item.channel.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.cardBody, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: '#556ee618' }]}
                    onPress={() => openEdit(item)}
                  >
                    <Ionicons name="create-outline" size={16} color="#556ee6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: '#EF444418' }]}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
      )}

      {/* ── Logs ── */}
      {activeTab === 'logs' && (
        logsLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : (
          <FlatList
            data={logs ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.logList}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="mail-outline" size={48} color={colors['muted-foreground']} />
                <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>No messages sent yet</Text>
              </View>
            }
            renderItem={({ item }: { item: CommunicationLog }) => (
              <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.subject || '(No subject)'}
                  </Text>
                  <View
                    style={[
                      styles.channelBadge,
                      { backgroundColor: (STATUS_COLOR[item.status] ?? '#888') + '20' },
                    ]}
                  >
                    <Text style={[styles.channelBadgeText, { color: STATUS_COLOR[item.status] ?? '#888' }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardBody, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                  {item.body}
                </Text>
                <View style={styles.logMeta}>
                  <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                    {item.channel.toUpperCase()} • {item.recipient_type} • {item.recipient_count} recipients
                  </Text>
                  <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                    {new Date(item.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </Text>
                </View>
              </View>
            )}
          />
        )
      )}

      {/* Template create/edit modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? 'Edit Template' : 'New Template'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {(['name', 'subject', 'body'] as const).map((field) => (
                <View key={field}>
                  <Text style={[styles.label, { color: colors.foreground }]}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                    {field !== 'subject' ? ' *' : ''}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.foreground, borderColor: borderCol },
                      field === 'body' && styles.textarea,
                    ]}
                    placeholder={field === 'body' ? 'Template content...' : ''}
                    placeholderTextColor={colors['muted-foreground']}
                    value={form[field]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [field]: v }))}
                    multiline={field === 'body'}
                    numberOfLines={field === 'body' ? 5 : 1}
                    textAlignVertical={field === 'body' ? 'top' : 'center'}
                  />
                </View>
              ))}

              <Text style={[styles.label, { color: colors.foreground }]}>Channel</Text>
              <View style={styles.chipRow}>
                {(['sms', 'email', 'push'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chip,
                      { borderColor: form.channel === c ? CHANNEL_COLORS[c] : borderCol },
                      form.channel === c && { backgroundColor: CHANNEL_COLORS[c] + '18' },
                    ]}
                    onPress={() => setForm((f) => ({ ...f, channel: c }))}
                  >
                    <Text
                      style={{
                        color: form.channel === c ? CHANNEL_COLORS[c] : colors['muted-foreground'],
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {c.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#556ee6' }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  restrictedTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  restrictedSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: { fontSize: 13 },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: '#556ee6',
    borderRadius: 2,
  },

  // Compose
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
  templateChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
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

  // Templates / Logs shared card
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  addBtnText: { color: 'white', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 14, fontWeight: '600', flex: 1 },
  channelBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  channelBadgeText: { fontSize: 10, fontWeight: '700' },
  cardBody: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'column', gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Logs
  logList: { padding: 16, gap: 10, paddingBottom: 32 },
  logMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  metaText: { fontSize: 11 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
});
