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
import { useToastContext } from '@/components/ToastProvider';
import { CustomDropdown } from '@/components/ui/dropdown';
import { useAuth, useTheme } from '@/contexts';
import {
  CommChannel,
  communicationApi,
  CommunicationLog,
  CommunicationTemplate,
  SendMessageRequest,
} from '@/src/api/communication';
import { classSectionsApi } from '@/src/api/masters';

type Tab = 'compose' | 'templates' | 'logs';
type Channel = CommChannel;

const CHANNEL_COLORS: Record<string, string> = {
  sms: '#10B981',
  whatsapp: '#25D366',
  email: '#3B82F6',
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
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { key: 'email', label: 'Email', icon: 'mail' },
];

const TARGET_TYPES = [
  { label: 'Individual Parent', value: 'individual_parent' },
  { label: 'Individual Student', value: 'individual_student' },
  { label: 'Individual Staff', value: 'individual_staff' },
  { label: 'Class + Section (Parents)', value: 'class_parents' },
  { label: 'Class + Section (Students)', value: 'class_students' },
  { label: 'All Parents', value: 'all_parents' },
  { label: 'All Students', value: 'all_students' },
  { label: 'All Staff', value: 'all_staff' },
  { label: 'All Users', value: 'all_users' },
  { label: 'Fee Defaulters', value: 'fee_defaulters' },
  { label: 'Role-Based', value: 'role_based' },
];

const CLASS_SPECIFIC = ['class_students', 'class_parents'];

const extractVariables = (body: string): string => {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  return matches.map((m) => m.replace(/\{\{|\}\}/g, '')).join(', ');
};

export default function CommunicationTab() {
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const [activeTab, setActiveTab] = useState<Tab>('compose');

  // Compose state
  const [channel, setChannel] = useState<Channel>('sms');
  const [targetType, setTargetType] = useState<string | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  // Templates filter state
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Logs filter state
  const [logChannel, setLogChannel] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [logFromDate, setLogFromDate] = useState('');
  const [logToDate, setLogToDate] = useState('');

  // Templates modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null);
  const [form, setForm] = useState<{
    name: string;
    subject: string;
    body: string;
    channel: Channel;
  }>({ name: '', subject: '', body: '', channel: 'sms' });

  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const inputBg = theme === 'dark' ? '#1a1a2e' : '#f8fafc';

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

  const { data: classes } = useQuery({
    queryKey: ['class-sections-list'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: true }),
    enabled: activeTab === 'compose',
  });

  const { data: sections } = useQuery({
    queryKey: ['sections-by-class', classId],
    queryFn: () => classSectionsApi.getSectionsByClass(classId!),
    enabled: !!classId && CLASS_SPECIFIC.includes(targetType ?? ''),
  });

  // Mutations
  const sendMutation = useMutation({
    mutationFn: (data: SendMessageRequest) => communicationApi.send(data),
    onSuccess: (res) => {
      showSuccess('Message Sent', `Delivered to ${res.recipient_count} recipients.`);
      setTargetType(null);
      setClassId(null);
      setSectionId(null);
      setTemplateId(null);
    },
    onError: () => showError('Send Failed', 'Could not send message. Please try again.'),
  });

  const createMutation = useMutation({
    mutationFn: communicationApi.createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-templates'] });
      setShowModal(false);
      resetForm();
      showSuccess('Template Created', 'New template has been saved.');
    },
    onError: () => showError('Create Failed', 'Could not create template.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      communicationApi.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-templates'] });
      setShowModal(false);
      resetForm();
      showSuccess('Template Updated', 'Changes have been saved.');
    },
    onError: () => showError('Update Failed', 'Could not update template.'),
  });

  const deleteMutation = useMutation({
    mutationFn: communicationApi.deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-templates'] });
      showSuccess('Deleted', 'Template has been deleted.');
    },
    onError: () => showError('Delete Failed', 'Could not delete template.'),
  });

  const resetForm = () => {
    setForm({ name: '', subject: '', body: '', channel: 'sms' });
    setEditing(null);
  };

  const openEdit = (t: CommunicationTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      subject: t.subject ?? '',
      body: t.body ?? '',
      channel: (t.channel as Channel) ?? 'sms',
    });
    setShowModal(true);
  };

  const handleDelete = (t: CommunicationTemplate) => {
    Alert.alert('Delete Template', `Delete "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(t.id) },
    ]);
  };

  const handleTemplateSubmit = () => {
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
    if (!targetType) { Alert.alert('Error', 'Please select a target type'); return; }
    if (CLASS_SPECIFIC.includes(targetType) && !classId) { Alert.alert('Error', 'Please select a class'); return; }
    if (!templateId) { Alert.alert('Error', 'Please select a template'); return; }

    const label = TARGET_TYPES.find((t) => t.value === targetType)?.label ?? targetType;
    Alert.alert('Confirm Send', `Send ${channel.toUpperCase()} to "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Now',
        onPress: () =>
          sendMutation.mutate({
            recipient_type: targetType,
            class_ids: classId ? [classId] : undefined,
            channel,
            template_id: templateId,
          } as any),
      },
    ]);
  };

  // Dropdown data
  const classesDropdown = (classes ?? []).map((c) => ({ label: c.name || '', value: c.id }));
  const sectionsDropdown = (sections ?? []).map((s) => ({ label: s.name || '', value: s.id }));

  // Templates for compose dropdown — filter by selected channel
  const composeTemplatesDropdown = (templates ?? [])
    .filter((t) => t.channel === channel)
    .map((t) => ({ label: t.name || '', value: t.id }));

  // Filtered templates for the Templates tab list
  const filteredTemplates = (templates ?? []).filter((t) => {
    const matchChannel = !filterChannel || t.channel === filterChannel;
    const matchStatus =
      !filterStatus ||
      (filterStatus === 'active' ? t.is_active : !t.is_active);
    const matchSearch =
      !searchText || t.name.toLowerCase().includes(searchText.toLowerCase());
    return matchChannel && matchStatus && matchSearch;
  });

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
              <Ionicons name={t.icon as any} size={16} color={active ? '#556ee6' : colors['muted-foreground']} />
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

          {/* 1. SELECT CHANNEL */}
          <Text style={[styles.sectionHeading, { color: colors['muted-foreground'] }]}>
            1. SELECT CHANNEL
          </Text>
          <View style={styles.channelRow}>
            {CHANNELS.map((c) => {
              const active = channel === c.key;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={[
                    styles.channelCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: active ? '#556ee6' : borderCol,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                  onPress={() => { setChannel(c.key); setTemplateId(null); }}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={28}
                    color={active ? '#556ee6' : colors['muted-foreground']}
                  />
                  <Text style={[styles.channelLabel, { color: active ? '#556ee6' : colors.foreground }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 2. SELECT RECIPIENTS */}
          <Text style={[styles.sectionHeading, { color: colors['muted-foreground'] }]}>
            2. SELECT RECIPIENTS
          </Text>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Target Type *</Text>
          <CustomDropdown
            data={TARGET_TYPES}
            placeholder="Select target type..."
            value={targetType}
            onChange={(v) => {
              setTargetType(v as string);
              setClassId(null);
              setSectionId(null);
            }}
            search={false}
          />

          {CLASS_SPECIFIC.includes(targetType ?? '') && (
            <View style={styles.classRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Class *</Text>
                <CustomDropdown
                  data={classesDropdown}
                  placeholder="Select Class"
                  value={classId}
                  onChange={(v) => { setClassId(v as string); setSectionId(null); }}
                  search={false}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Section *</Text>
                <CustomDropdown
                  data={sectionsDropdown}
                  placeholder="Select Section"
                  value={sectionId}
                  onChange={(v) => setSectionId(v as string)}
                  disabled={!classId}
                  search={false}
                />
              </View>
            </View>
          )}

          {/* 3. SELECT TEMPLATE */}
          <Text style={[styles.sectionHeading, { color: colors['muted-foreground'] }]}>
            3. SELECT TEMPLATE
          </Text>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Template *</Text>
          <CustomDropdown
            data={composeTemplatesDropdown}
            placeholder={
              composeTemplatesDropdown.length === 0
                ? `No ${channel.toUpperCase()} templates available`
                : 'Select template...'
            }
            value={templateId}
            onChange={(v) => setTemplateId(v as string)}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: '#556ee6', opacity: sendMutation.isPending ? 0.7 : 1 },
            ]}
            onPress={handleSend}
            disabled={sendMutation.isPending}
          >
            <Ionicons name="send" size={18} color="white" />
            <Text style={styles.sendBtnText}>
              {sendMutation.isPending ? 'Sending...' : 'Send Now'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 48 }} />
        </ScrollView>
      )}

      {/* ── Templates ── */}
      {activeTab === 'templates' && (
        <View style={{ flex: 1 }}>
          {/* Toolbar */}
          <View style={[styles.toolbar, { borderBottomColor: borderCol, backgroundColor: colors.background }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              {/* Channel filters */}
              {([null, 'sms', 'whatsapp', 'email'] as const).map((ch) => {
                const active = filterChannel === ch;
                return (
                  <TouchableOpacity
                    key={String(ch)}
                    style={[
                      styles.filterChip,
                      { borderColor: active ? '#556ee6' : borderCol },
                      active && { backgroundColor: '#556ee618' },
                    ]}
                    onPress={() => setFilterChannel(ch)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: active ? '#556ee6' : colors['muted-foreground'],
                      }}
                    >
                      {ch === null ? 'All Channels' : ch === 'whatsapp' ? 'WhatsApp' : ch.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {/* Status filters */}
              {([null, 'active', 'inactive'] as const).map((s) => {
                const active = filterStatus === s;
                const col = '#10B981';
                return (
                  <TouchableOpacity
                    key={String(s)}
                    style={[
                      styles.filterChip,
                      { borderColor: active ? col : borderCol },
                      active && { backgroundColor: col + '18' },
                    ]}
                    onPress={() => setFilterStatus(s)}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: active ? col : colors['muted-foreground'],
                      }}
                    >
                      {s === null ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.toolbarBottom}>
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg },
                ]}
                placeholder="Search templates..."
                placeholderTextColor={colors['muted-foreground']}
                value={searchText}
                onChangeText={setSearchText}
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#556ee6' }]}
                onPress={() => { resetForm(); setShowModal(true); }}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text style={styles.addBtnText}>New Template</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredTemplates}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 32 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
                <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>No templates found</Text>
              </View>
            }
            renderItem={({ item }) => {
              const vars = extractVariables(item.body ?? '');
              const chColor = CHANNEL_COLORS[item.channel] ?? '#888';
              return (
                <View style={[styles.listCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    {/* Name + badges */}
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: chColor + '20' }]}>
                        <Text style={[styles.badgeText, { color: chColor }]}>
                          {item.channel === 'whatsapp' ? 'WA' : item.channel.toUpperCase()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: item.is_active ? '#10B98120' : '#88888820' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: item.is_active ? '#10B981' : '#888888' },
                          ]}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    {/* Variables */}
                    {vars ? (
                      <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
                        Variables: {vars}
                      </Text>
                    ) : null}
                    {/* Last modified */}
                    <Text style={[styles.cardDate, { color: colors['muted-foreground'] }]}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('en-IN')
                        : '—'}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#556ee618' }]}
                      onPress={() => openEdit(item)}
                    >
                      <Ionicons name="create-outline" size={16} color="#556ee6" />
                    </TouchableOpacity>
                    {item.is_active && (
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: '#EF444418' }]}
                        onPress={() => handleDelete(item)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ── Logs ── */}
      {activeTab === 'logs' && (
        <View style={{ flex: 1 }}>
          {/* Filter bar */}
          <View style={[styles.toolbar, { borderBottomColor: borderCol, backgroundColor: colors.background }]}>
            <View style={styles.logFilterRow}>
              <CustomDropdown
                data={[
                  { label: 'All Channels', value: '' },
                  { label: 'SMS', value: 'sms' },
                  { label: 'WhatsApp', value: 'whatsapp' },
                  { label: 'Email', value: 'email' },
                ]}
                placeholder="All Channels"
                value={logChannel ?? ''}
                onChange={(v) => setLogChannel(v ? (v as string) : null)}
                search={false}
                style={{ height: 40 }}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <CustomDropdown
                data={[
                  { label: 'All Status', value: '' },
                  { label: 'Sent', value: 'sent' },
                  { label: 'Failed', value: 'failed' },
                  { label: 'Pending', value: 'pending' },
                ]}
                placeholder="All Status"
                value={logStatus ?? ''}
                onChange={(v) => setLogStatus(v ? (v as string) : null)}
                search={false}
                style={{ height: 40 }}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
            </View>
            <View style={styles.logDateRow}>
              <View style={styles.logDateField}>
                <Text style={[styles.logDateLabel, { color: colors['muted-foreground'] }]}>From</Text>
                <TextInput
                  style={[styles.logDateInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor={colors['muted-foreground']}
                  value={logFromDate}
                  onChangeText={setLogFromDate}
                />
              </View>
              <View style={styles.logDateField}>
                <Text style={[styles.logDateLabel, { color: colors['muted-foreground'] }]}>To</Text>
                <TextInput
                  style={[styles.logDateInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                  placeholder="mm/dd/yyyy"
                  placeholderTextColor={colors['muted-foreground']}
                  value={logToDate}
                  onChangeText={setLogToDate}
                />
              </View>
            </View>
          </View>

          {logsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#556ee6" />
            </View>
          ) : (
            <FlatList
              data={(logs ?? []).filter((item) => {
                const matchChannel = !logChannel || item.channel === logChannel;
                const matchStatus = !logStatus || item.status === logStatus;
                return matchChannel && matchStatus;
              })}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.logList}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons name="mail-outline" size={48} color={colors['muted-foreground']} />
                  <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>No logs found.</Text>
                </View>
              }
              renderItem={({ item }: { item: CommunicationLog }) => (
                <View style={[styles.listCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.subject || '(No subject)'}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: (CHANNEL_COLORS[item.channel] ?? '#888') + '20' }]}>
                        <Text style={[styles.badgeText, { color: CHANNEL_COLORS[item.channel] ?? '#888' }]}>
                          {item.channel === 'whatsapp' ? 'WA' : item.channel.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#888') + '20' }]}>
                        <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? '#888' }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                      {item.body}
                    </Text>
                    <Text style={[styles.cardDate, { color: colors['muted-foreground'] }]}>
                      {item.recipient_type} • {item.recipient_count} recipients •{' '}
                      {new Date(item.sent_at).toLocaleString('en-IN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Template create / edit modal */}
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
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                    {field !== 'subject' ? ' *' : ''}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.foreground,
                        borderColor: borderCol,
                        backgroundColor: inputBg,
                      },
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

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Channel</Text>
              <View style={styles.chipRow}>
                {(['sms', 'whatsapp', 'email'] as const).map((c) => {
                  const col = CHANNEL_COLORS[c];
                  const active = form.channel === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.chip,
                        { borderColor: active ? col : borderCol },
                        active && { backgroundColor: col + '18' },
                      ]}
                      onPress={() => setForm((f) => ({ ...f, channel: c }))}
                    >
                      <Text
                        style={{
                          color: active ? col : colors['muted-foreground'],
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {c === 'whatsapp' ? 'WhatsApp' : c.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#556ee6' }]}
                onPress={handleTemplateSubmit}
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
  // Access restricted
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  restrictedTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  restrictedSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Tab bar
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
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
  sectionHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },

  channelRow: { flexDirection: 'row', gap: 10 },
  channelCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  channelLabel: { fontSize: 13, fontWeight: '600' },

  classRow: { flexDirection: 'row', gap: 10 },

  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    marginTop: 24,
  },
  sendBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  // Templates toolbar
  toolbar: { borderBottomWidth: 1, paddingBottom: 10 },
  filterRow: { paddingHorizontal: 12, paddingTop: 10 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
  },
  toolbarBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },

  // Shared list card
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  cardName: { fontSize: 14, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardMeta: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  cardDate: { fontSize: 11 },
  rowActions: { flexDirection: 'column', gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Logs
  logList: { padding: 12, gap: 8, paddingBottom: 32 },
  logFilterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  logDateRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 10, alignItems: 'center' },
  logDateField: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  logDateLabel: { fontSize: 13, fontWeight: '600' },
  logDateInput: { flex: 1, height: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 13 },

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

  // Form
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 4 },
  textarea: { height: 120, textAlignVertical: 'top' },
});
