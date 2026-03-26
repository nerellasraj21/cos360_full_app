import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import {
  examAuditApi, examDatesApi, examNotificationsApi,
  examsApi, ExamStatus, markPermissionsApi,
  MarkPermissionCreate, NotificationRequest,
} from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

const EMPTY_NOTIF: NotificationRequest = {
  notification_type: 'exam_schedule',
  message: '',
  target_audience: 'both',
  send_push: true,
  send_sms: false,
  send_email: false,
};

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifForm, setNotifForm] = useState<NotificationRequest>({ ...EMPTY_NOTIF });
  const [showAudit, setShowAudit] = useState(false);
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [grantForm, setGrantForm] = useState<MarkPermissionCreate>({ user_id: '', teacher_id: '', subject_config_id: '', class_id: '' });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examsApi.getById(id),
    enabled: !!id,
  });

  const { data: classSections } = useQuery({
    queryKey: ['exam-class-sections', id],
    queryFn: () => examsApi.getClassSections(id),
    enabled: !!id,
  });

  const { data: dates } = useQuery({
    queryKey: ['exam-dates', id],
    queryFn: () => examDatesApi.list(id),
    enabled: !!id && hasPermission?.('exam_dates', 'list'),
  });

  const { data: subjectConfigs } = useQuery({
    queryKey: ['exam-subject-configs', id],
    queryFn: () => examsApi.getSubjectConfigs(id),
    enabled: !!id,
  });

  const canManagePermissions = hasPermission?.('mark_permissions', 'create');
  const canSendNotification = hasPermission?.('exam_notifications', 'create');
  const canViewAudit = hasPermission?.('exam_audit', 'list');

  const { data: markPermissions = [] } = useQuery({
    queryKey: ['mark-permissions', id],
    queryFn: () => markPermissionsApi.list(id),
    enabled: !!id && !!canManagePermissions,
  });

  const { data: auditLog = [] } = useQuery({
    queryKey: ['exam-audit', id],
    queryFn: () => examAuditApi.getLog(id, { page_size: 20 }),
    enabled: !!id && !!canViewAudit && showAudit,
  });

  const cloneMutation = useMutation({
    mutationFn: () => examsApi.clone(id, { new_name: cloneName.trim() || undefined }),
    onSuccess: (cloned) => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      setCloneModalVisible(false);
      setCloneName('');
      showSuccess('Exam Cloned', 'Exam cloned successfully.');
      router.push({ pathname: '/exam/[id]', params: { id: cloned.id } } as any);
    },
    onError: () => showError('Error', 'Failed to clone exam.'),
  });

  const grantPermissionMutation = useMutation({
    mutationFn: (data: MarkPermissionCreate) => markPermissionsApi.grant(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mark-permissions', id] });
      setGrantModalVisible(false);
      setGrantForm({ user_id: '', teacher_id: '', subject_config_id: '', class_id: '' });
      showSuccess('Permission Granted', 'Mark entry permission granted.');
    },
    onError: () => showError('Error', 'Failed to grant permission.'),
  });

  const revokePermissionMutation = useMutation({
    mutationFn: (permissionId: string) => markPermissionsApi.revoke(id, permissionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mark-permissions', id] }); showSuccess('Revoked', 'Mark permission revoked.'); },
    onError: () => showError('Error', 'Failed to revoke permission.'),
  });

  const sendNotificationMutation = useMutation({
    mutationFn: (data: NotificationRequest) => examNotificationsApi.send(id, data),
    onSuccess: (res) => {
      setNotifModalVisible(false);
      setNotifForm({ ...EMPTY_NOTIF });
      showSuccess('Sent', `${res.notifications_queued} notification(s) queued.`);
    },
    onError: () => showError('Error', 'Failed to send notification.'),
  });

  const unlockMutation = useMutation({
    mutationFn: () => examsApi.unlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      showSuccess('Exam Unlocked', 'Exam unlocked for corrections.');
    },
    onError: () => showError('Error', 'Failed to unlock exam.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => examsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      router.back();
    },
    onError: () => showError('Error', 'Failed to delete exam.'),
  });

  if (isLoading) {
    return (
      <AppLayout title="Exam Detail">
        <View style={styles.centered}>
          <Text style={{ color: colors['muted-foreground'] }}>Loading…</Text>
        </View>
      </AppLayout>
    );
  }

  if (error || !exam) {
    return (
      <AppLayout title="Exam Detail">
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorText]}>Failed to load exam</Text>
        </View>
      </AppLayout>
    );
  }

  const canEdit          = hasPermission?.('exams', 'update');
  const canDelete        = hasPermission?.('exams', 'delete');
  const canClone         = hasPermission?.('exams', 'create');
  const canUnlock        = hasPermission?.('exams', 'update') && exam.status === 'published';
  const canEnterMarks    = hasPermission?.('exam_marks', 'create') && exam.status === 'active';
  const canViewResults   = hasPermission?.('exam_results', 'list') && (exam.status === 'published' || exam.status === 'finalized');
  const canViewHallTickets = hasPermission?.('exam_hall_tickets', 'list');
  const canManageDates   = hasPermission?.('exam_dates', 'list');

  const sc = STATUS_COLORS[exam.status] ?? STATUS_COLORS.draft;

  return (
    <AppLayout title={exam.exam_name}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.examTitle, { color: colors.foreground }]}>{exam.exam_name}</Text>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>{exam.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="layers-outline" size={16} color={colors['muted-foreground']} />
              <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                {exam.exam_type} · {exam.nature}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="school-outline" size={16} color={colors['muted-foreground']} />
              <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                {exam.board} · {exam.level.replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors['muted-foreground']} />
              <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                {exam.academic_year_title ?? exam.academic_year_id}
              </Text>
            </View>
            {exam.mark_entry_deadline && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                <Text style={[styles.metaText, { color: '#F59E0B' }]}>
                  Deadline: {new Date(exam.mark_entry_deadline).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actions</Text>
          <View style={styles.actionsGrid}>
            {canEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#556ee6' }]}
                onPress={() => router.push({ pathname: '/exam/create', params: { examId: id } } as any)}
              >
                <Ionicons name="pencil" size={18} color="white" />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
            {canEnterMarks && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() => router.push({ pathname: '/exam/marks', params: { examId: id } } as any)}
              >
                <Ionicons name="create" size={18} color="white" />
                <Text style={styles.actionBtnText}>Marks</Text>
              </TouchableOpacity>
            )}
            {canViewResults && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => router.push({ pathname: '/exam/results', params: { examId: id } } as any)}
              >
                <Ionicons name="bar-chart" size={18} color="white" />
                <Text style={styles.actionBtnText}>Results</Text>
              </TouchableOpacity>
            )}
            {canViewHallTickets && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => router.push({ pathname: '/exam/hall-tickets', params: { examId: id } } as any)}
              >
                <Ionicons name="document-text" size={18} color="white" />
                <Text style={styles.actionBtnText}>Hall Tickets</Text>
              </TouchableOpacity>
            )}
            {canManageDates && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#14B8A6' }]}
                onPress={() => router.push({ pathname: '/exam/dates', params: { examId: id } } as any)}
              >
                <Ionicons name="calendar" size={18} color="white" />
                <Text style={styles.actionBtnText}>Dates</Text>
              </TouchableOpacity>
            )}
            {canManagePermissions && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
                onPress={() => router.push({ pathname: '/exam/permissions', params: { examId: id } } as any)}
              >
                <Ionicons name="key" size={18} color="white" />
                <Text style={styles.actionBtnText}>Permissions</Text>
              </TouchableOpacity>
            )}
            {canClone && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#64748B' }]}
                onPress={() => { setCloneName(`${exam.exam_name} (Copy)`); setCloneModalVisible(true); }}
              >
                <Ionicons name="copy" size={18} color="white" />
                <Text style={styles.actionBtnText}>Clone</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Class Sections */}
        {classSections && classSections.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Class Sections ({classSections.length})
            </Text>
            {classSections.map(cs => (
              <View key={cs.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.rowCardIcon, { backgroundColor: '#10B98118' }]}>
                  <Ionicons name="people" size={18} color="#10B981" />
                </View>
                <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>
                  {cs.class_name ?? cs.class_id}{cs.section_name ? ` – ${cs.section_name}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Subject Configs */}
        {subjectConfigs && subjectConfigs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Subjects ({subjectConfigs.length})
            </Text>
            {subjectConfigs.map(cfg => (
              <View key={cfg.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.rowCardIcon, { backgroundColor: '#556ee618' }]}>
                  <Ionicons name="book-outline" size={18} color="#556ee6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>
                    {cfg.subject_name ?? cfg.subject_id}
                  </Text>
                  {cfg.components && cfg.components.length > 0 && (
                    <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                      {cfg.components.map(c => `${c.component_name}(${c.max_marks ?? '—'})`).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Exam Dates */}
        {dates && dates.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Exam Schedule ({dates.length})
            </Text>
            {dates.map(d => (
              <View key={d.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.rowCardIcon, { backgroundColor: '#3B82F618' }]}>
                  <Ionicons name="calendar" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>
                    {d.subject_name ?? d.subject_id}
                  </Text>
                  <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                    {new Date(d.exam_date).toLocaleDateString()}
                    {d.start_time ? ` · ${d.start_time} – ${d.end_time}` : ''}
                    {d.venue ? ` · ${d.venue}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Mark Permissions */}
        {canManagePermissions && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Mark Permissions ({markPermissions.length})
              </Text>
              <TouchableOpacity
                style={[styles.grantBtn, { backgroundColor: '#556ee620', borderColor: '#556ee6' }]}
                onPress={() => setGrantModalVisible(true)}
              >
                <Ionicons name="add" size={14} color="#556ee6" />
                <Text style={[styles.grantBtnText, { color: '#556ee6' }]}>Grant</Text>
              </TouchableOpacity>
            </View>
            {markPermissions.length === 0 ? (
              <Text style={[styles.emptyHint, { color: colors['muted-foreground'] }]}>No permissions granted yet.</Text>
            ) : (
              markPermissions.map(perm => (
                <View key={perm.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={[styles.rowCardIcon, { backgroundColor: perm.is_active ? '#3B82F618' : '#6B728018' }]}>
                    <Ionicons name="person" size={18} color={perm.is_active ? '#3B82F6' : '#6B7280'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>
                      Teacher: {perm.teacher_id}
                    </Text>
                    <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                      {perm.is_active ? 'Active' : 'Inactive'} · Class {perm.class_id}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Revoke Permission', 'Remove this teacher\'s mark entry permission?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Revoke', style: 'destructive', onPress: () => revokePermissionMutation.mutate(perm.id) },
                      ])
                    }
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* Send Notification */}
        {canSendNotification && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notifications</Text>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: '#556ee6' }]}
              onPress={() => setNotifModalVisible(true)}
            >
              <Ionicons name="notifications-outline" size={18} color="#556ee6" />
              <Text style={[styles.outlineBtnText, { color: '#556ee6' }]}>Send Exam Notification</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Audit Log */}
        {canViewAudit && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.rowBetween}
              onPress={() => setShowAudit(v => !v)}
            >
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Audit Log</Text>
              <Ionicons name={showAudit ? 'chevron-up' : 'chevron-down'} size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
            {showAudit && (
              auditLog.length === 0 ? (
                <Text style={[styles.emptyHint, { color: colors['muted-foreground'] }]}>No audit entries.</Text>
              ) : (
                auditLog.map(entry => (
                  <View key={entry.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <View style={[styles.rowCardIcon, { backgroundColor: '#F59E0B18' }]}>
                      <Ionicons name="time" size={18} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>{entry.action}</Text>
                      <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                        {entry.performed_by} · {new Date(entry.performed_at).toLocaleString()}
                      </Text>
                      {entry.reason ? (
                        <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                          Reason: {entry.reason}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )
            )}
          </View>
        )}

        {/* Danger Zone */}
        {(canUnlock || canDelete) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Danger Zone</Text>
            {canUnlock && (
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: '#F59E0B' }]}
                onPress={() =>
                  Alert.alert('Unlock Exam', 'This will allow mark corrections. Continue?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Unlock', style: 'destructive', onPress: () => unlockMutation.mutate() },
                  ])
                }
              >
                <Ionicons name="lock-open-outline" size={18} color="#F59E0B" />
                <Text style={[styles.dangerBtnText, { color: '#F59E0B' }]}>Unlock for Corrections</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: '#EF4444' }]}
                onPress={() =>
                  Alert.alert('Delete Exam', `Delete "${exam.exam_name}"? This cannot be undone.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.dangerBtnText, { color: '#EF4444' }]}>Delete Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Clone Modal */}
      <Modal visible={cloneModalVisible} animationType="slide" transparent onRequestClose={() => setCloneModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Clone Exam</Text>
              <TouchableOpacity onPress={() => setCloneModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>New Exam Name</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 48 }]}
              value={cloneName}
              onChangeText={setCloneName}
              placeholder="Enter name for cloned exam"
              placeholderTextColor={colors['muted-foreground']}
            />
            <TouchableOpacity
              style={[styles.saveBtn2, { opacity: cloneMutation.isPending ? 0.6 : 1 }]}
              onPress={() => {
                if (!cloneName.trim()) { showError('Validation', 'Name is required.'); return; }
                cloneMutation.mutate();
              }}
              disabled={cloneMutation.isPending}
            >
              <Ionicons name="copy" size={16} color="white" />
              <Text style={styles.saveBtnText}>{cloneMutation.isPending ? 'Cloning…' : 'Clone Exam'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Grant Permission Modal */}
      <Modal visible={grantModalVisible} animationType="slide" transparent onRequestClose={() => setGrantModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Grant Mark Permission</Text>
              <TouchableOpacity onPress={() => setGrantModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Teacher / User ID *</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 48 }]}
              value={grantForm.user_id}
              onChangeText={v => setGrantForm(f => ({ ...f, user_id: v, teacher_id: v }))}
              placeholder="Paste teacher UUID"
              placeholderTextColor={colors['muted-foreground']}
            />
            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Subject Config ID (optional)</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 48 }]}
              value={grantForm.subject_config_id ?? ''}
              onChangeText={v => setGrantForm(f => ({ ...f, subject_config_id: v }))}
              placeholder="Leave blank for all subjects"
              placeholderTextColor={colors['muted-foreground']}
            />
            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Class ID (optional)</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 48 }]}
              value={grantForm.class_id ?? ''}
              onChangeText={v => setGrantForm(f => ({ ...f, class_id: v }))}
              placeholder="Leave blank for all classes"
              placeholderTextColor={colors['muted-foreground']}
            />
            <TouchableOpacity
              style={[styles.saveBtn2, { opacity: grantPermissionMutation.isPending ? 0.6 : 1 }]}
              onPress={() => {
                if (!grantForm.user_id.trim()) { showError('Validation', 'Teacher ID is required.'); return; }
                grantPermissionMutation.mutate(grantForm);
              }}
              disabled={grantPermissionMutation.isPending}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.saveBtnText}>{grantPermissionMutation.isPending ? 'Granting…' : 'Grant Permission'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal visible={notifModalVisible} animationType="slide" transparent onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Send Notification</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Type</Text>
            <View style={styles.chipRow}>
              {['exam_schedule', 'result_ready', 'hall_ticket', 'reminder', 'other'].map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setNotifForm(f => ({ ...f, notification_type: t }))}
                  style={[styles.chip, { backgroundColor: notifForm.notification_type === t ? '#556ee6' : borderCol }]}
                >
                  <Text style={{ color: notifForm.notification_type === t ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
                    {t.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Audience</Text>
            <View style={styles.chipRow}>
              {(['students', 'parents', 'both'] as const).map(a => (
                <TouchableOpacity
                  key={a}
                  onPress={() => setNotifForm(f => ({ ...f, target_audience: a }))}
                  style={[styles.chip, { backgroundColor: notifForm.target_audience === a ? '#10B981' : borderCol }]}
                >
                  <Text style={{ color: notifForm.target_audience === a ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Message *</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={notifForm.message}
              onChangeText={v => setNotifForm(f => ({ ...f, message: v }))}
              placeholder="Enter notification message…"
              placeholderTextColor={colors['muted-foreground']}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.channelRow}>
              {(['send_push', 'send_sms', 'send_email'] as const).map(ch => (
                <TouchableOpacity
                  key={ch}
                  onPress={() => setNotifForm(f => ({ ...f, [ch]: !f[ch] }))}
                  style={[styles.channelChip, { backgroundColor: notifForm[ch] ? '#556ee620' : borderCol }]}
                >
                  <Ionicons
                    name={ch === 'send_push' ? 'notifications' : ch === 'send_sms' ? 'phone-portrait' : 'mail'}
                    size={14}
                    color={notifForm[ch] ? '#556ee6' : colors['muted-foreground']}
                  />
                  <Text style={{ color: notifForm[ch] ? '#556ee6' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
                    {ch === 'send_push' ? 'Push' : ch === 'send_sms' ? 'SMS' : 'Email'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn2, { opacity: sendNotificationMutation.isPending ? 0.6 : 1 }]}
              onPress={() => {
                if (!notifForm.message.trim()) { showError('Validation', 'Message is required.'); return; }
                sendNotificationMutation.mutate(notifForm);
              }}
              disabled={sendNotificationMutation.isPending}
            >
              <Ionicons name="send" size={16} color="white" />
              <Text style={styles.saveBtnText}>{sendNotificationMutation.isPending ? 'Sending…' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 15, marginTop: 12 },
  headerCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  examTitle: { flex: 1, fontSize: 20, fontWeight: '700', marginRight: 8 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  metaGrid: { marginTop: 12, gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  rowCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    padding: 12, marginBottom: 6, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  rowCardIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowCardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  rowCardMeta: { fontSize: 12 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  dangerBtnText: { fontWeight: '600' },
  emptyHint: { fontSize: 13, marginTop: 4, marginBottom: 8 },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderRadius: 10, padding: 12,
  },
  outlineBtnText: { fontWeight: '600', fontSize: 14 },
  grantBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  grantBtnText: { fontSize: 12, fontWeight: '600' },
  // Notification modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  notifInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 80,
  },
  channelRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  channelChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8, paddingVertical: 9 },
  saveBtn2: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#556ee6', borderRadius: 10, paddingVertical: 13,
    marginTop: 16, marginBottom: 8,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
