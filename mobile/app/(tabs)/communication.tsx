import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
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
  CommunicationTemplate,
  LogDetail,
  LogFilters,
  LogsPage,
  NotificationLog,
  PreviewCountParams,
  SendRequest,
  TargetType,
} from '@/src/api/communication';
import { classSectionsApi } from '@/src/api/masters';

// ─── Constants ──────────────────────────────────────────────────────────────

type Tab = 'compose' | 'templates' | 'logs';

const CHANNEL_COLORS: Record<string, string> = {
  sms: '#10B981',
  whatsapp: '#25D366',
  email: '#3B82F6',
};

const STATUS_COLORS: Record<string, string> = {
  sent: '#10B981',
  delivered: '#10B981',
  failed: '#EF4444',
  queued: '#F59E0B',
};

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'compose', label: 'Compose', icon: 'create-outline' },
  { key: 'templates', label: 'Templates', icon: 'document-text-outline' },
  { key: 'logs', label: 'Logs', icon: 'time-outline' },
];

const CHANNELS: { key: CommChannel; label: string; icon: string }[] = [
  { key: 'sms', label: 'SMS', icon: 'chatbubble' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { key: 'email', label: 'Email', icon: 'mail' },
];

const TARGET_TYPES: { label: string; value: TargetType }[] = [
  { label: 'Individual Parent', value: 'individual_parent' },
  { label: 'Individual Student', value: 'individual_student' },
  { label: 'Individual Staff', value: 'individual_staff' },
  { label: 'Class + Section (Parents)', value: 'class_section_parents' },
  { label: 'Class + Section (Students)', value: 'class_section_students' },
  { label: 'All Parents', value: 'all_parents' },
  { label: 'All Students', value: 'all_students' },
  { label: 'All Staff', value: 'all_staff' },
  { label: 'All Users', value: 'all_users' },
  { label: 'Fee Defaulters', value: 'fee_defaulters' },
  { label: 'Role-Based', value: 'role_based' },
];

const CLASS_SPECIFIC: TargetType[] = ['class_section_parents', 'class_section_students'];
const LOG_PAGE_SIZE = 20;

const VARIABLE_SUGGESTIONS = [
  'name', 'parent_name', 'student_name', 'staff_name',
  'class_name', 'section_name', 'amount', 'due_date',
];

const ROLES_DROPDOWN = [
  { label: 'Teacher', value: 'Teacher' },
  { label: 'Admin', value: 'Admin' },
  { label: 'Accountant', value: 'Accountant' },
  { label: 'Librarian', value: 'Librarian' },
  { label: 'Receptionist', value: 'Receptionist' },
];

/** Variables that are auto-resolved by the system — users don't fill these. */
const SYSTEM_VARS = new Set([
  'name', 'parent_name', 'student_name', 'staff_name', 'class_name', 'section_name',
]);

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extracts unique {{var}} names from a template body. */
const extractVariables = (body: string): string[] => {
  const matches = body.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
};

/** Builds the target_ref object required by the send API. */
const buildTargetRef = (
  targetType: TargetType,
  classId: string | null,
  sectionId: string | null,
  parentId: string,
  studentId: string,
  staffId: string,
  selectedRole: string | null,
) => {
  switch (targetType) {
    case 'individual_parent': return { parent_id: parentId };
    case 'individual_student': return { student_id: studentId };
    case 'individual_staff': return { staff_id: staffId };
    case 'class_section_parents':
    case 'class_section_students': return { class_id: classId!, section_id: sectionId! };
    case 'role_based': return { role: selectedRole! };
    default: return {};
  }
};

/** Returns true when all required fields for the selected target type are filled. */
const isRefComplete = (
  targetType: TargetType | null,
  classId: string | null,
  sectionId: string | null,
  parentId: string,
  studentId: string,
  staffId: string,
  selectedRole: string | null,
): boolean => {
  if (!targetType) return false;
  switch (targetType) {
    case 'class_section_parents':
    case 'class_section_students': return !!classId && !!sectionId;
    case 'individual_parent': return !!parentId.trim();
    case 'individual_student': return !!studentId.trim();
    case 'individual_staff': return !!staffId.trim();
    case 'role_based': return !!selectedRole;
    default: return true;
  }
};

/** Builds PreviewCountParams for the preview API. Returns null if not enough info yet. */
const buildPreviewParams = (
  targetType: TargetType | null,
  classId: string | null,
  sectionId: string | null,
  parentId: string,
  studentId: string,
  staffId: string,
  selectedRole: string | null,
): PreviewCountParams | null => {
  if (!targetType) return null;
  switch (targetType) {
    case 'class_section_parents':
    case 'class_section_students':
      if (!classId || !sectionId) return null;
      return { target_type: targetType, class_id: classId, section_id: sectionId };
    case 'individual_parent':
      if (!parentId.trim()) return null;
      return { target_type: targetType, parent_id: parentId };
    case 'individual_student':
      if (!studentId.trim()) return null;
      return { target_type: targetType, student_id: studentId };
    case 'individual_staff':
      if (!staffId.trim()) return null;
      return { target_type: targetType, staff_id: staffId };
    case 'role_based':
      if (!selectedRole) return null;
      return { target_type: targetType, role: selectedRole };
    default:
      return { target_type: targetType };
  }
};

/** Replaces {{var}} placeholders with filled values or [var] hints. */
const buildPreviewText = (body: string, extraVars: Record<string, string>): string =>
  body.replace(/\{\{(\w+)\}\}/g, (_, v) => {
    if (SYSTEM_VARS.has(v)) return `[${v}]`;
    return extraVars[v]?.trim() ? extraVars[v] : `[${v}]`;
  });

/** Human-readable description of the chosen target. */
const getTargetLabel = (
  targetType: TargetType | null,
  classId: string | null,
  sectionId: string | null,
  classes: { id: string; name: string }[],
  sections: { id: string; name: string }[],
  parentId: string,
  studentId: string,
  staffId: string,
  selectedRole: string | null,
): string => {
  if (!targetType) return '—';
  const cn = classes.find((c) => c.id === classId)?.name ?? classId ?? '?';
  const sn = sections.find((s) => s.id === sectionId)?.name ?? sectionId ?? '?';
  switch (targetType) {
    case 'class_section_parents': return `${cn} – ${sn} (Parents)`;
    case 'class_section_students': return `${cn} – ${sn} (Students)`;
    case 'individual_parent': return `Parent: ${parentId}`;
    case 'individual_student': return `Student: ${studentId}`;
    case 'individual_staff': return `Staff: ${staffId}`;
    case 'role_based': return `Role: ${selectedRole ?? '?'}`;
    default: return TARGET_TYPES.find((t) => t.value === targetType)?.label ?? targetType;
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

// ─── Component ──────────────────────────────────────────────────────────────

export default function CommunicationTab() {
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const [activeTab, setActiveTab] = useState<Tab>('compose');

  // Compose state
  const [channel, setChannel] = useState<CommChannel>('sms');
  const [targetType, setTargetType] = useState<TargetType | null>(null);
  const [classId, setClassId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [parentId, setParentId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [extraVars, setExtraVars] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  // Templates filter state
  const [filterChannel, setFilterChannel] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');

  // Logs filter state
  const [logChannel, setLogChannel] = useState<string | null>(null);
  const [logStatus, setLogStatus] = useState<string | null>(null);
  const [logFromDate, setLogFromDate] = useState('');
  const [logToDate, setLogToDate] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Template modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null);
  const [form, setForm] = useState<{
    name: string;
    subject: string;
    body: string;
    channel: CommChannel;
  }>({ name: '', subject: '', body: '', channel: 'sms' });
  // Track cursor position without controlling it (avoids feedback loop on controlled selection)
  const bodySelectionRef = useRef({ start: 0, end: 0 });
  const bodyInputRef = useRef<TextInput>(null);

  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const inputBg = theme === 'dark' ? '#1a1a2e' : '#f8fafc';

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudentOrParent = ['student', 'parent', 'guardian', 'father', 'mother'].includes(roleName);

  // ── Queries ─────────────────────────────────────────────────────────────

  const { data: templates } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => communicationApi.getTemplates(),
  });

  const logsFilters: LogFilters = {
    channel: (logChannel as CommChannel) || undefined,
    status: (logStatus as 'queued' | 'sent' | 'delivered' | 'failed') || undefined,
    date_from: logFromDate || undefined,
    date_to: logToDate || undefined,
    page: logPage,
    page_size: LOG_PAGE_SIZE,
  };

  const { data: logsPage, isLoading: logsLoading } = useQuery<LogsPage>({
    queryKey: ['comm-logs', logsFilters],
    queryFn: () => communicationApi.getLogs(logsFilters),
    enabled: activeTab === 'logs',
  });
  const logs = logsPage?.items ?? [];
  const logTotal = logsPage?.total ?? 0;
  const logTotalPages = Math.ceil(logTotal / LOG_PAGE_SIZE);

  const { data: classes } = useQuery({
    queryKey: ['class-sections-list'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: true }),
    enabled: activeTab === 'compose',
  });

  const { data: sections } = useQuery({
    queryKey: ['sections-by-class', classId],
    queryFn: () => classSectionsApi.getSectionsByClass(classId!),
    enabled: !!classId && !!targetType && CLASS_SPECIFIC.includes(targetType),
  });

  const previewParams = buildPreviewParams(
    targetType, classId, sectionId, parentId, studentId, staffId, selectedRole,
  );
  const { data: previewData, isFetching: previewFetching } = useQuery({
    queryKey: ['comm-preview-count', previewParams],
    queryFn: () => communicationApi.getPreviewCount(previewParams!),
    enabled: !!previewParams,
    staleTime: 30_000,
  });

  const { data: logDetail, isLoading: logDetailLoading } = useQuery({
    queryKey: ['comm-log-detail', selectedLogId],
    queryFn: () => communicationApi.getLogDetail(selectedLogId!),
    enabled: !!selectedLogId,
  });

  // ── Mutations ────────────────────────────────────────────────────────────

  const sendMutation = useMutation({
    mutationFn: (data: SendRequest) => communicationApi.send(data),
    onSuccess: (res) => {
      showSuccess('Messages Queued', `${res.queued_count} messages queued successfully.`);
      setShowConfirm(false);
      setTargetType(null);
      setClassId(null);
      setSectionId(null);
      setParentId('');
      setStudentId('');
      setStaffId('');
      setSelectedRole(null);
      setTemplateId(null);
      setExtraVars({});
      qc.invalidateQueries({ queryKey: ['comm-logs'] });
      setActiveTab('logs');
    },
    onError: (error: any) => {
      setShowConfirm(false);
      const status = error?.response?.status;
      if (status === 429) showError('Rate Limited', 'Too many requests. Please wait and try again.');
      else if (status === 403) showError('Permission Denied', 'You do not have permission to send messages.');
      else showError('Send Failed', error?.response?.data?.detail || 'Could not send message.');
    },
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
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof communicationApi.updateTemplate>[1] }) =>
      communicationApi.updateTemplate(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-templates'] });
      setShowModal(false);
      resetForm();
      showSuccess('Template Updated', 'Changes have been saved.');
    },
    onError: () => showError('Update Failed', 'Could not update template.'),
  });

  const deactivateMutation = useMutation({
    mutationFn: communicationApi.deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm-templates'] });
      showSuccess('Deactivated', 'Template has been deactivated.');
    },
    onError: () => showError('Failed', 'Could not deactivate template.'),
  });

  // ── Derived state ────────────────────────────────────────────────────────

  const classesDropdown = (classes ?? []).map((c) => ({ label: c.name ?? '', value: c.id }));
  const sectionsDropdown = (sections ?? []).map((s) => ({ label: s.name ?? '', value: s.id }));

  const composeTemplatesDropdown = (templates ?? [])
    .filter((t) => t.channel === channel && t.is_active)
    .map((t) => ({ label: t.name, value: t.id }));

  const filteredTemplates = (templates ?? []).filter((t) => {
    const matchChannel = !filterChannel || t.channel === filterChannel;
    const matchStatus =
      !filterStatus || (filterStatus === 'active' ? t.is_active : !t.is_active);
    const matchSearch = !searchText || t.name.toLowerCase().includes(searchText.toLowerCase());
    return matchChannel && matchStatus && matchSearch;
  });

  const selectedTemplate = (templates ?? []).find((t) => t.id === templateId) ?? null;
  const userVars = (selectedTemplate?.variables ?? []).filter((v) => !SYSTEM_VARS.has(v));

  const detectedFormVars = extractVariables(form.body);
  const smsCredits = form.channel === 'sms' && form.body ? Math.ceil(form.body.length / 160) : 0;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ name: '', subject: '', body: '', channel: 'sms' });
    setEditing(null);
    bodySelectionRef.current = { start: 0, end: 0 };
  };

  /** Inserts {{varName}} at the cursor position tracked via ref, then moves cursor after insert. */
  const insertVariable = (varName: string) => {
    const insert = `{{${varName}}}`;
    const { start, end } = bodySelectionRef.current;
    const newBody = form.body.slice(0, start) + insert + form.body.slice(end);
    const newCursor = start + insert.length;
    setForm((f) => ({ ...f, body: newBody }));
    bodySelectionRef.current = { start: newCursor, end: newCursor };
    setTimeout(() => {
      bodyInputRef.current?.setNativeProps({
        selection: { start: newCursor, end: newCursor },
      });
    }, 50);
  };

  const openEdit = (t: CommunicationTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      subject: t.subject ?? '',
      body: t.body ?? '',
      channel: t.channel,
    });
    setShowModal(true);
  };

  const handleDeactivate = (t: CommunicationTemplate) => {
    Alert.alert(
      'Deactivate Template',
      `Deactivate "${t.name}"? It will no longer be available for sending.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => deactivateMutation.mutate(t.id),
        },
      ],
    );
  };

  const handleTemplateSubmit = () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Template name is required'); return; }
    if (!form.body.trim()) { Alert.alert('Error', 'Message body is required'); return; }
    if (form.channel === 'email' && !form.subject?.trim()) {
      Alert.alert('Error', 'Subject is required for email templates');
      return;
    }
    const detectedVars = extractVariables(form.body);
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        data: {
          name: form.name.trim(),
          body: form.body.trim(),
          subject: form.channel === 'email' ? form.subject.trim() : null,
          variables: detectedVars,
        },
      });
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        channel: form.channel,
        body: form.body.trim(),
        subject: form.channel === 'email' ? form.subject.trim() : null,
        variables: detectedVars,
      });
    }
  };

  const handleSend = () => {
    if (!targetType) { Alert.alert('Error', 'Please select a target type'); return; }
    if (!isRefComplete(targetType, classId, sectionId, parentId, studentId, staffId, selectedRole)) {
      Alert.alert('Error', 'Please complete all recipient fields'); return;
    }
    if (!templateId) { Alert.alert('Error', 'Please select a template'); return; }
    if (userVars.some((v) => !extraVars[v]?.trim())) {
      Alert.alert('Error', 'Please fill all required template variables'); return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSend = () => {
    if (!targetType || !templateId) return;
    const targetRef = buildTargetRef(
      targetType, classId, sectionId, parentId, studentId, staffId, selectedRole,
    );
    const filteredExtra = userVars.reduce<Record<string, string>>((acc, v) => {
      acc[v] = extraVars[v] ?? '';
      return acc;
    }, {});
    sendMutation.mutate({
      channel,
      target_type: targetType,
      target_ref: targetRef,
      template_id: templateId,
      extra_variables: userVars.length > 0 ? filteredExtra : undefined,
    });
  };

  // ── Access restricted ────────────────────────────────────────────────────

  if (isStudentOrParent) {
    return (
      <AppLayout title="Communication">
        <View style={styles.restricted}>
          <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.restrictedTitle, { color: colors.foreground }]}>
            Access Restricted
          </Text>
          <Text style={[styles.restrictedSub, { color: colors['muted-foreground'] }]}>
            Communication tools are only available to staff and admin.
          </Text>
        </View>
      </AppLayout>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Communication">

      {/* ── In-page Tab Bar ── */}
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

      {/* ════════════════════════════════════
          COMPOSE TAB
      ════════════════════════════════════ */}
      {activeTab === 'compose' && (
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

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
                  onPress={() => { setChannel(c.key); setTemplateId(null); setExtraVars({}); }}
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
              setTargetType(v as TargetType);
              setClassId(null);
              setSectionId(null);
              setParentId('');
              setStudentId('');
              setStaffId('');
              setSelectedRole(null);
            }}
            search={false}
          />

          {/* Class + Section */}
          {!!targetType && CLASS_SPECIFIC.includes(targetType) && (
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

          {/* Individual Parent ID */}
          {targetType === 'individual_parent' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Parent ID (UUID) *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter parent UUID..."
                placeholderTextColor={colors['muted-foreground']}
                value={parentId}
                onChangeText={setParentId}
                autoCapitalize="none"
              />
            </>
          )}

          {/* Individual Student ID */}
          {targetType === 'individual_student' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Student ID (UUID) *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter student UUID..."
                placeholderTextColor={colors['muted-foreground']}
                value={studentId}
                onChangeText={setStudentId}
                autoCapitalize="none"
              />
            </>
          )}

          {/* Individual Staff ID */}
          {targetType === 'individual_staff' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Staff ID (UUID) *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter staff UUID..."
                placeholderTextColor={colors['muted-foreground']}
                value={staffId}
                onChangeText={setStaffId}
                autoCapitalize="none"
              />
            </>
          )}

          {/* Role selector */}
          {targetType === 'role_based' && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Role *</Text>
              <CustomDropdown
                data={ROLES_DROPDOWN}
                placeholder="Select role..."
                value={selectedRole}
                onChange={(v) => setSelectedRole(v as string)}
                search={false}
              />
            </>
          )}

          {/* Preview count */}
          {targetType && (
            <View style={[styles.previewCount, { backgroundColor: '#556ee610', borderColor: '#556ee640' }]}>
              <Ionicons name="people-outline" size={14} color="#556ee6" />
              <Text style={[styles.previewCountText, { color: '#556ee6' }]}>
                {previewFetching
                  ? 'Fetching recipients...'
                  : previewData
                  ? `Estimated recipients: ~${previewData.estimated_count}`
                  : isRefComplete(targetType, classId, sectionId, parentId, studentId, staffId, selectedRole)
                  ? 'Fetching recipients...'
                  : 'Complete fields to see recipient count'}
              </Text>
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
                ? `No active ${channel.toUpperCase()} templates`
                : 'Select template...'
            }
            value={templateId}
            onChange={(v) => { setTemplateId(v as string); setExtraVars({}); }}
          />

          {/* Template preview */}
          {selectedTemplate && (
            <View style={[styles.previewBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
              <Text style={[styles.previewLabel, { color: colors['muted-foreground'] }]}>
                Preview
              </Text>
              <Text style={[styles.previewText, { color: colors.foreground }]}>
                {buildPreviewText(selectedTemplate.body ?? '', extraVars)}
              </Text>
              {channel === 'sms' && (
                <Text style={[styles.smsHint, { color: colors['muted-foreground'] }]}>
                  {selectedTemplate.body?.length ?? 0} chars ·{' '}
                  {Math.ceil((selectedTemplate.body?.length ?? 0) / 160)} SMS credit
                  {Math.ceil((selectedTemplate.body?.length ?? 0) / 160) !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}

          {/* 4. FILL IN VARIABLES */}
          {userVars.length > 0 && (
            <>
              <Text style={[styles.sectionHeading, { color: colors['muted-foreground'] }]}>
                4. FILL IN VARIABLES
              </Text>
              {userVars.map((v) => (
                <View key={v}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
                    {v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} *
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                    placeholder={`Enter ${v}...`}
                    placeholderTextColor={colors['muted-foreground']}
                    value={extraVars[v] ?? ''}
                    onChangeText={(val) => setExtraVars((prev) => ({ ...prev, [v]: val }))}
                  />
                </View>
              ))}
            </>
          )}

          {/* Send button */}
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

      {/* ════════════════════════════════════
          TEMPLATES TAB
      ════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <View style={{ flex: 1 }}>
          {/* Toolbar */}
          <View style={[styles.toolbar, { borderBottomColor: borderCol, backgroundColor: colors.background }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
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
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#556ee6' : colors['muted-foreground'] }}>
                      {ch === null ? 'All Channels' : ch === 'whatsapp' ? 'WhatsApp' : ch.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? col : colors['muted-foreground'] }}>
                      {s === null ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.toolbarBottom}>
              <TextInput
                style={[styles.searchInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
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
                <Text style={styles.addBtnText}>New</Text>
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
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: chColor + '20' }]}>
                        <Text style={[styles.badgeText, { color: chColor }]}>
                          {item.channel === 'whatsapp' ? 'WA' : item.channel.toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: item.is_active ? '#10B98120' : '#88888820' }]}>
                        <Text style={[styles.badgeText, { color: item.is_active ? '#10B981' : '#888888' }]}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    {vars.length > 0 && (
                      <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
                        Variables: {vars.map((v) => `{{${v}}}`).join(', ')}
                      </Text>
                    )}
                    <Text style={[styles.cardDate, { color: colors['muted-foreground'] }]}>
                      {item.updated_at || item.created_at
                        ? new Date(item.updated_at ?? item.created_at).toLocaleDateString('en-IN')
                        : '—'}
                    </Text>
                  </View>

                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#556ee618' }]}
                      onPress={() => openEdit(item)}
                      accessibilityLabel="Edit template"
                    >
                      <Ionicons name="create-outline" size={16} color="#556ee6" />
                    </TouchableOpacity>
                    {item.is_active && (
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: '#EF444418' }]}
                        onPress={() => handleDeactivate(item)}
                        accessibilityLabel="Deactivate template"
                      >
                        <Ionicons name="ban-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ════════════════════════════════════
          LOGS TAB
      ════════════════════════════════════ */}
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
                onChange={(v) => { setLogChannel(v ? (v as string) : null); setLogPage(1); }}
                search={false}
                style={{ height: 40 }}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <CustomDropdown
                data={[
                  { label: 'All Status', value: '' },
                  { label: 'Queued', value: 'queued' },
                  { label: 'Sent', value: 'sent' },
                  { label: 'Delivered', value: 'delivered' },
                  { label: 'Failed', value: 'failed' },
                ]}
                placeholder="All Status"
                value={logStatus ?? ''}
                onChange={(v) => { setLogStatus(v ? (v as string) : null); setLogPage(1); }}
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
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors['muted-foreground']}
                  value={logFromDate}
                  onChangeText={(v) => { setLogFromDate(v); setLogPage(1); }}
                />
              </View>
              <View style={styles.logDateField}>
                <Text style={[styles.logDateLabel, { color: colors['muted-foreground'] }]}>To</Text>
                <TextInput
                  style={[styles.logDateInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors['muted-foreground']}
                  value={logToDate}
                  onChangeText={(v) => { setLogToDate(v); setLogPage(1); }}
                />
              </View>
            </View>
          </View>

          {logsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#556ee6" />
            </View>
          ) : (
            <>
              <FlatList
                data={logs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.logList}
                ListEmptyComponent={
                  <View style={styles.centered}>
                    <Ionicons name="mail-outline" size={48} color={colors['muted-foreground']} />
                    <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>No logs found.</Text>
                  </View>
                }
                renderItem={({ item }: { item: NotificationLog }) => {
                  const chColor = CHANNEL_COLORS[item.channel] ?? '#888';
                  const stColor = STATUS_COLORS[item.status] ?? '#888';
                  return (
                    <View style={[styles.listCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.cardTop}>
                          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
                            {item.recipient_name}
                          </Text>
                          <View style={[styles.badge, { backgroundColor: chColor + '20' }]}>
                            <Text style={[styles.badgeText, { color: chColor }]}>
                              {item.channel === 'whatsapp' ? 'WA' : item.channel.toUpperCase()}
                            </Text>
                          </View>
                          <View style={[styles.badge, { backgroundColor: stColor + '20' }]}>
                            <Text style={[styles.badgeText, { color: stColor }]}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
                          {item.target_type.replace(/_/g, ' ')}
                        </Text>
                        {item.recipient_phone && (
                          <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
                            📱 {item.recipient_phone}
                          </Text>
                        )}
                        {item.recipient_email && (
                          <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
                            ✉ {item.recipient_email}
                          </Text>
                        )}
                        <Text style={[styles.cardDate, { color: colors['muted-foreground'] }]}>
                          {formatDate(item.created_at)}
                        </Text>
                      </View>
                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: '#556ee618' }]}
                          onPress={() => setSelectedLogId(item.id)}
                          accessibilityLabel="View log detail"
                        >
                          <Ionicons name="eye-outline" size={16} color="#556ee6" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />

              {/* Pagination */}
              {logTotal > 0 && (
                <View style={[styles.pagination, { borderTopColor: borderCol, backgroundColor: colors.background }]}>
                  <TouchableOpacity
                    style={[styles.pageBtn, { opacity: logPage === 1 ? 0.35 : 1 }]}
                    onPress={() => setLogPage((p) => Math.max(1, p - 1))}
                    disabled={logPage === 1}
                  >
                    <Ionicons name="chevron-back" size={18} color="#556ee6" />
                  </TouchableOpacity>

                  <Text style={[styles.pageInfo, { color: colors['muted-foreground'] }]}>
                    {(logPage - 1) * LOG_PAGE_SIZE + 1}–{Math.min(logPage * LOG_PAGE_SIZE, logTotal)} of {logTotal}
                  </Text>

                  <TouchableOpacity
                    style={[styles.pageBtn, { opacity: logPage >= logTotalPages ? 0.35 : 1 }]}
                    onPress={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                    disabled={logPage >= logTotalPages}
                  >
                    <Ionicons name="chevron-forward" size={18} color="#556ee6" />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* ════════════════════════════════════
          TEMPLATE CREATE / EDIT MODAL
      ════════════════════════════════════ */}
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

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Template name..."
                placeholderTextColor={colors['muted-foreground']}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />

              {/* Subject (email only) */}
              {form.channel === 'email' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Subject *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                    placeholder="Email subject..."
                    placeholderTextColor={colors['muted-foreground']}
                    value={form.subject}
                    onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))}
                  />
                </>
              )}

              {/* Body */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Message Body *</Text>
              <TextInput
                ref={bodyInputRef}
                style={[
                  styles.input,
                  styles.textarea,
                  { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg, fontFamily: 'monospace' },
                ]}
                placeholder={'Template content...\nUse {{variable}} for dynamic values.'}
                placeholderTextColor={colors['muted-foreground']}
                value={form.body}
                onChangeText={(v) => setForm((f) => ({ ...f, body: v }))}
                onSelectionChange={(e) => { bodySelectionRef.current = e.nativeEvent.selection; }}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              {/* Insert Variable chips */}
              <Text style={[styles.insertVarLabel, { color: colors['muted-foreground'] }]}>
                Insert variable:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.insertVarScroll}
                keyboardShouldPersistTaps="always"
              >
                {VARIABLE_SUGGESTIONS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.insertVarChip, { backgroundColor: '#556ee618', borderColor: '#556ee640' }]}
                    onPress={() => insertVariable(v)}
                  >
                    <Text style={{ fontSize: 11, color: '#556ee6', fontWeight: '700' }}>{`{{${v}}}`}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Char count + SMS credits */}
              <View style={styles.bodyMeta}>
                <Text style={{ fontSize: 11, color: colors['muted-foreground'] }}>
                  {form.body.length} chars
                </Text>
                {form.channel === 'sms' && form.body.length > 0 && (
                  <Text style={{ fontSize: 11, color: colors['muted-foreground'] }}>
                    {smsCredits} SMS credit{smsCredits !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              {/* Detected variables */}
              {detectedFormVars.length > 0 && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 8 }]}>
                    Detected Variables
                  </Text>
                  <View style={styles.varChips}>
                    {detectedFormVars.map((v) => (
                      <View key={v} style={[styles.varChip, { backgroundColor: '#556ee618', borderColor: '#556ee640' }]}>
                        <Text style={{ fontSize: 11, color: '#556ee6', fontWeight: '700' }}>{`{{${v}}}`}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Variables tip */}
              <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
                💡 Common: {'{{name}}'}, {'{{parent_name}}'}, {'{{class_name}}'}, {'{{amount}}'}, {'{{due_date}}'}
              </Text>

              {/* Channel selector — disabled when editing */}
              <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 8 }]}>Channel</Text>
              <View style={styles.chipRow}>
                {(['sms', 'whatsapp', 'email'] as const).map((c) => {
                  const col = CHANNEL_COLORS[c];
                  const active = form.channel === c;
                  const isDisabled = !!editing;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.chip,
                        { borderColor: active ? col : borderCol },
                        active && { backgroundColor: col + '18' },
                        isDisabled && { opacity: 0.5 },
                      ]}
                      onPress={() => !isDisabled && setForm((f) => ({ ...f, channel: c }))}
                      disabled={isDisabled}
                    >
                      <Text style={{ color: active ? col : colors['muted-foreground'], fontSize: 13, fontWeight: '600' }}>
                        {c === 'whatsapp' ? 'WhatsApp' : c.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {editing && (
                <Text style={[styles.hint, { color: colors['muted-foreground'] }]}>
                  ⚠ Channel cannot be changed on existing templates.
                </Text>
              )}
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

      {/* ════════════════════════════════════
          CONFIRMATION MODAL
      ════════════════════════════════════ */}
      <Modal
        visible={showConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirm Send</Text>
              <TouchableOpacity onPress={() => setShowConfirm(false)}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Summary table */}
              <View style={[styles.summaryTable, { borderColor: borderCol }]}>
                {[
                  {
                    label: 'Channel',
                    value: channel.charAt(0).toUpperCase() + channel.slice(1),
                  },
                  {
                    label: 'Target',
                    value: getTargetLabel(
                      targetType, classId, sectionId,
                      (classes ?? []) as { id: string; name: string }[],
                      (sections ?? []) as { id: string; name: string }[],
                      parentId, studentId, staffId, selectedRole,
                    ),
                  },
                  {
                    label: 'Recipients',
                    value: previewData ? `~${previewData.estimated_count}` : '—',
                  },
                  {
                    label: 'Template',
                    value: selectedTemplate?.name ?? '—',
                  },
                ].map(({ label, value }) => (
                  <View key={label} style={[styles.summaryRow, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.summaryLabel, { color: colors['muted-foreground'] }]}>{label}</Text>
                    <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* Message preview */}
              {selectedTemplate && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 12 }]}>
                    Message Preview
                  </Text>
                  <View style={[styles.previewBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
                    <Text style={[styles.previewText, { color: colors.foreground }]}>
                      {buildPreviewText(selectedTemplate.body ?? '', extraVars)}
                    </Text>
                  </View>
                </>
              )}

              {/* Warning */}
              <View style={[styles.warningBox, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
                <Ionicons name="warning-outline" size={16} color="#F59E0B" />
                <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                  This will queue {previewData?.estimated_count ?? '?'} message
                  {(previewData?.estimated_count ?? 0) !== 1 ? 's' : ''} and cannot be undone.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConfirm(false)}
                disabled={sendMutation.isPending}
              >
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: '#556ee6', opacity: sendMutation.isPending ? 0.7 : 1 },
                ]}
                onPress={handleConfirmSend}
                disabled={sendMutation.isPending}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {sendMutation.isPending ? 'Queuing...' : 'Confirm & Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════
          LOG DETAIL MODAL
      ════════════════════════════════════ */}
      <Modal
        visible={!!selectedLogId}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedLogId(null)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log Detail</Text>
              <TouchableOpacity onPress={() => setSelectedLogId(null)}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {logDetailLoading ? (
              <View style={[styles.centered, { paddingVertical: 32 }]}>
                <ActivityIndicator size="large" color="#556ee6" />
              </View>
            ) : logDetail ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.summaryTable, { borderColor: borderCol }]}>
                  {[
                    { label: 'Recipient', value: logDetail.recipient_name },
                    { label: 'Channel', value: logDetail.channel.toUpperCase() },
                    { label: 'Phone', value: logDetail.recipient_phone ?? '—' },
                    { label: 'Email', value: logDetail.recipient_email ?? '—' },
                    { label: 'Status', value: logDetail.status.charAt(0).toUpperCase() + logDetail.status.slice(1), statusColor: STATUS_COLORS[logDetail.status] },
                    { label: 'Target Group', value: logDetail.target_type.replace(/_/g, ' ') },
                    { label: 'Triggered By', value: logDetail.triggered_by },
                    { label: 'Provider ID', value: logDetail.provider_message_id ?? '—' },
                    { label: 'Sent At', value: formatDate(logDetail.created_at) },
                  ].map(({ label, value, statusColor }) => (
                    <View key={label} style={[styles.summaryRow, { borderBottomColor: borderCol }]}>
                      <Text style={[styles.summaryLabel, { color: colors['muted-foreground'] }]}>{label}</Text>
                      <Text style={[styles.summaryValue, { color: statusColor ?? colors.foreground }]}>{value}</Text>
                    </View>
                  ))}
                </View>

                {/* Error box */}
                {logDetail.error_message && (
                  <View style={[styles.errorBox, { backgroundColor: '#EF444418', borderColor: '#EF444440' }]}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={[styles.errorText, { color: '#EF4444' }]}>{logDetail.error_message}</Text>
                  </View>
                )}

                {/* Message body */}
                <Text style={[styles.fieldLabel, { color: colors.foreground, marginTop: 12 }]}>Message</Text>
                <View style={[styles.previewBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
                  <Text style={[styles.previewText, { color: colors.foreground, fontFamily: 'monospace' }]}>
                    {logDetail.message}
                  </Text>
                </View>
              </ScrollView>
            ) : null}

            <View style={[styles.modalFooter, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#556ee6' }]}
                onPress={() => setSelectedLogId(null)}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </AppLayout>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Access restricted
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  restrictedTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  restrictedSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Tab bar
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, position: 'relative',
  },
  tabLabel: { fontSize: 13 },
  tabIndicator: {
    position: 'absolute', bottom: 0, left: '10%', right: '10%',
    height: 2, backgroundColor: '#556ee6', borderRadius: 2,
  },

  // Compose
  container: { padding: 16 },
  sectionHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 20, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 4 },
  textarea: { height: 130, textAlignVertical: 'top' },

  channelRow: { flexDirection: 'row', gap: 10 },
  channelCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 18, borderRadius: 14, borderWidth: 1,
  },
  channelLabel: { fontSize: 13, fontWeight: '600' },

  classRow: { flexDirection: 'row', gap: 10 },

  previewCount: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10,
    borderRadius: 10, borderWidth: 1, marginTop: 8, marginBottom: 4,
  },
  previewCountText: { fontSize: 13, fontWeight: '600' },

  previewBox: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8,
  },
  previewLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4, letterSpacing: 0.5 },
  previewText: { fontSize: 13, lineHeight: 20 },
  smsHint: { fontSize: 11, marginTop: 6 },

  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 14, marginTop: 24,
  },
  sendBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  // Templates toolbar
  toolbar: { borderBottomWidth: 1, paddingBottom: 10 },
  filterRow: { paddingHorizontal: 12, paddingTop: 10 },
  filterChip: {
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12,
    paddingVertical: 6, marginRight: 6,
  },
  toolbarBottom: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
  },
  searchInput: {
    flex: 1, height: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 13,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10,
  },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },

  // Shared card
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  listCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' },
  cardName: { fontSize: 14, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  cardMeta: { fontSize: 12, lineHeight: 17, marginBottom: 2 },
  cardDate: { fontSize: 11, marginTop: 2 },
  rowActions: { flexDirection: 'column', gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Logs
  logList: { padding: 12, gap: 8, paddingBottom: 32 },
  logFilterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10 },
  logDateRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12,
    paddingTop: 6, paddingBottom: 10, alignItems: 'center',
  },
  logDateField: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  logDateLabel: { fontSize: 13, fontWeight: '600' },
  logDateInput: { flex: 1, height: 38, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 13 },

  // Modal shared
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },

  // Template form
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  bodyMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  varChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  varChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  hint: { fontSize: 11, lineHeight: 16, marginBottom: 4 },

  // Confirmation modal
  summaryTable: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1,
  },
  summaryLabel: { fontSize: 13, fontWeight: '600', flex: 0.45 },
  summaryValue: { fontSize: 13, flex: 0.55, textAlign: 'right' },
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12,
  },
  warningText: { fontSize: 13, flex: 1, lineHeight: 18 },

  // Log detail modal
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12,
  },
  errorText: { fontSize: 13, flex: 1, lineHeight: 18 },

  // Logs pagination
  pagination: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
  },
  pageBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center',
    justifyContent: 'center', backgroundColor: '#556ee618',
  },
  pageInfo: { fontSize: 13, fontWeight: '600' },

  // Template modal — insert variable
  insertVarLabel: { fontSize: 11, fontWeight: '600', marginTop: 6, marginBottom: 4 },
  insertVarScroll: { marginBottom: 8 },
  insertVarChip: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8,
    paddingVertical: 5, marginRight: 6,
  },
});
