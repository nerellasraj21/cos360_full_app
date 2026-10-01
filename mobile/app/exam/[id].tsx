import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { DatePickerModal } from '@/components/ui';
import { QuickSendButton } from '@/components/communication/QuickSendButton';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useAuth, useTheme, useAcademicYear } from '@/contexts';
import { classSectionsApi, subjectsApi } from '@/src/api/masters';
import {
  examAuditApi, examDatesApi,
  examsApi, ExamStatus, ExamUpdateRequest, markPermissionsApi,
} from '@/src/api/exam';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { isAdminRole } from '../../src/lib/roles';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();
  // Web parity (ExamDetail.tsx): management actions are gated by the admin role.
  const isAdmin = isAdminRole(role?.name);
  // Web's ExamDetail shows no action buttons at all for the student role — just
  // the header + Overview/Dates/Marks tabs. The Quick Actions grid below is a
  // mobile-only convenience for staff; keep it out of the student's screen.
  const isStudent = (role?.name ?? '').toLowerCase() === 'student';
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const { confirm, modalProps } = useConfirmModal();
  // Web parity (ExamDetail.tsx): Overview / Dates / Marks tab switcher.
  const [activeTab, setActiveTab] = useState<'overview' | 'dates' | 'marks'>('overview');
  const [showAudit, setShowAudit] = useState(false);
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [cloneName, setCloneName] = useState('');
  // Edit modal — mirrors the web Edit dialog (only the fields editable after creation)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    exam_name: '',
    mark_entry_deadline: '',
    hall_ticket_min_attendance: '',
    attendance_from_date: '',
    attendance_to_date: '',
    publish_rank: false,
  });
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [activeEditDateField, setActiveEditDateField] = useState<'deadline' | 'from' | 'to'>('deadline');
  // Fix #8: unlock requires reason (required field in backend UnlockExamRequest)
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const { data: exam, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examsApi.getById(id),
    enabled: !!id,
  });

  const { data: classSections, isError: sectionsError } = useQuery({
    queryKey: ['exam-class-sections', id],
    queryFn: () => examsApi.getClassSections(id),
    enabled: !!id,
  });

  // Not gated by hasPermission(...) — let the backend 403 if unauthorized
  // rather than silently blocking the fetch on a resource-name mismatch.
  const { data: dates } = useQuery({
    queryKey: ['exam-dates', id],
    queryFn: () => examDatesApi.list(id),
    enabled: !!id,
  });

  const { data: subjectConfigs, isError: configsError } = useQuery({
    queryKey: ['exam-subject-configs', id],
    queryFn: () => examsApi.getSubjectConfigs(id),
    enabled: !!id,
  });

  // Name lookups — the exam endpoints often return only IDs (no *_name fields),
  // so resolve class/section/subject/year names locally like the web app does.
  const { academicYears } = useAcademicYear();
  // Scope masters to the EXAM's academic year (not the app's active year) so the
  // name maps contain this exam's class/section/subject IDs even for past years.
  const { data: classList = [] } = useQuery({
    queryKey: ['class-sections-all', exam?.academic_year_id],
    queryFn: () => classSectionsApi.getClassSections({ active_only: false, academic_year_id: exam?.academic_year_id }),
    enabled: !!exam?.academic_year_id,
  });
  const { data: subjectList = [] } = useQuery({
    queryKey: ['subjects-all', exam?.academic_year_id],
    queryFn: () => subjectsApi.getSubjects({ active_only: false, academic_year_id: exam?.academic_year_id }),
    enabled: !!exam?.academic_year_id,
  });

  const classNameMap = Object.fromEntries(classList.map(c => [c.id, c.name]));
  const sectionNameMap = Object.fromEntries(
    classList.flatMap(c => (c.sections ?? []).map(s => [s.id, s.name])),
  );
  const subjectNameMap = Object.fromEntries(subjectList.map(s => [s.id, s.name]));

  // Admin-only management areas (web parity: gated by role, not raw permission).
  const canManagePermissions = isAdmin;
  const canSendNotification = isAdmin;
  const canViewAudit = isAdmin;

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
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to clone exam.')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ExamUpdateRequest) => examsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      qc.invalidateQueries({ queryKey: ['exams'] });
      setEditModalVisible(false);
      showSuccess('Exam Updated', 'Exam updated successfully.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to update exam.')),
  });

  // Web parity (ExamDetail.tsx): Activate (draft → active) / Deactivate (active → draft).
  const activateMutation = useMutation({
    mutationFn: () => examsApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Exam Activated', 'Mark entry and hall ticket processing are now enabled.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to activate exam.')),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => examsApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Exam Deactivated', 'Exam moved back to draft.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to deactivate exam.')),
  });

  const openEdit = () => {
    if (!exam) return;
    setEditForm({
      exam_name: exam.exam_name ?? '',
      mark_entry_deadline: exam.mark_entry_deadline ?? '',
      hall_ticket_min_attendance: exam.hall_ticket_min_attendance != null ? String(exam.hall_ticket_min_attendance) : '',
      attendance_from_date: exam.attendance_from_date ?? '',
      attendance_to_date: exam.attendance_to_date ?? '',
      publish_rank: !!exam.publish_rank,
    });
    setEditModalVisible(true);
  };

  const confirmEditDate = (date: string) => {
    if (activeEditDateField === 'deadline') setEditForm(p => ({ ...p, mark_entry_deadline: date }));
    if (activeEditDateField === 'from') setEditForm(p => ({ ...p, attendance_from_date: date }));
    if (activeEditDateField === 'to') setEditForm(p => ({ ...p, attendance_to_date: date }));
    setShowEditDatePicker(false);
  };

  const handleEditSave = () => {
    if (!editForm.exam_name.trim()) { showError('Validation', 'Exam name is required.'); return; }
    updateMutation.mutate({
      exam_name: editForm.exam_name.trim(),
      mark_entry_deadline: editForm.mark_entry_deadline || undefined,
      hall_ticket_min_attendance: editForm.hall_ticket_min_attendance !== '' ? Number(editForm.hall_ticket_min_attendance) : undefined,
      attendance_from_date: editForm.attendance_from_date || undefined,
      attendance_to_date: editForm.attendance_to_date || undefined,
      publish_rank: editForm.publish_rank,
    });
  };

  const revokePermissionMutation = useMutation({
    mutationFn: (permissionId: string) => markPermissionsApi.revoke(id, permissionId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mark-permissions', id] }); showSuccess('Revoked', 'Mark permission revoked.'); },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to revoke permission.')),
  });

  const unlockMutation = useMutation({
    // Fix #8: pass reason — backend requires it (reason: str, non-optional)
    mutationFn: (reason: string) => examsApi.unlock(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      showSuccess('Exam Unlocked', 'Exam unlocked for corrections.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to unlock exam.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => examsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      router.back();
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to delete exam.')),
  });

  if (isLoading) {
    return (
      <AppLayout title="Exam Detail">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
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

  // Management actions — admin role only (web parity with ExamDetail.tsx).
  // Edit/Activate/Deactivate/Delete are status-gated exactly like the web Edit dialog & header actions.
  const canEdit          = isAdmin && (exam.status === 'draft' || exam.status === 'active');
  const canActivate      = isAdmin && exam.status === 'draft';
  const canDeactivate    = isAdmin && exam.status === 'active';
  const canDelete        = isAdmin && exam.status === 'draft';
  const canClone         = isAdmin;
  const canUnlock        = isAdmin && exam.status === 'published';
  const canManageDates   = isAdmin;
  // Mark entry & result viewing stay permission-based so teachers retain access.
  // "exam_marks" is a real, distinct backend resource (mark_entry_endpoints.py);
  // hall tickets/results are authorized under "exams" like the rest of the module.
  const canEnterMarks    = hasPermission?.('exam_marks', 'create') && exam.status === 'active';
  const canViewResults   = hasPermission?.('exams', 'read') && (exam.status === 'published' || exam.status === 'finalized');
  const canViewHallTickets = hasPermission?.('exams', 'read');

  const sc = STATUS_COLORS[exam.status] ?? STATUS_COLORS.draft;

  return (
    <AppLayout title={exam.exam_name}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >

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
                {exam.board} · {exam.level.replace(/_/g, ' ')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors['muted-foreground']} />
              <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                {exam.academic_year_title
                  ?? academicYears.find(y => y.id === exam.academic_year_id)?.title
                  ?? ''}
              </Text>
            </View>
            {!!exam.mark_entry_deadline && (
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
        {!isStudent && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actions</Text>
          <View style={styles.actionsGrid}>
            {canEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#556ee6' }]}
                onPress={openEdit}
              >
                <Ionicons name="pencil" size={18} color="white" />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
            {canActivate && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                onPress={() => confirm({
                  title: 'Activate Exam',
                  message: `Activating "${exam.exam_name}" will allow mark entry and hall ticket processing. You can still edit the exam after activation.`,
                  confirmLabel: 'Activate',
                  onConfirm: () => activateMutation.mutate(),
                })}
              >
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={styles.actionBtnText}>Activate</Text>
              </TouchableOpacity>
            )}
            {canDeactivate && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => confirm({
                  title: 'Deactivate Exam',
                  message: `This will move "${exam.exam_name}" back to Draft. Mark entry and hall ticket processing will be paused.`,
                  confirmLabel: 'Deactivate',
                  destructive: true,
                  onConfirm: () => deactivateMutation.mutate(),
                })}
              >
                <Ionicons name="lock-closed" size={18} color="white" />
                <Text style={styles.actionBtnText}>Deactivate</Text>
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
                onPress={() => router.push(`/exam/hall-tickets/${id}` as any)}
              >
                <Ionicons name="document-text" size={18} color="white" />
                <Text style={styles.actionBtnText}>Hall Tickets</Text>
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
        )}

        {/* Tab Bar — web parity (ExamDetail.tsx): Overview / Dates / Marks */}
        <View style={[styles.tabBar, { borderColor: borderCol }]}>
          {([
            { key: 'overview' as const, label: 'Overview', icon: 'clipboard-outline' as const },
            { key: 'dates' as const, label: 'Dates', icon: 'calendar-outline' as const },
            { key: 'marks' as const, label: 'Marks', icon: 'bar-chart-outline' as const },
          ]).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, activeTab === t.key && { borderBottomColor: '#556ee6' }]}
              onPress={() => setActiveTab(t.key)}
            >
              <Ionicons name={t.icon} size={16} color={activeTab === t.key ? '#556ee6' : colors['muted-foreground']} />
              <Text style={[styles.tabBtnText, { color: activeTab === t.key ? '#556ee6' : colors['muted-foreground'] }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Academic Year</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {exam.academic_year_title
                    ?? academicYears.find(y => y.id === exam.academic_year_id)?.title
                    ?? ''}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Mark Entry Deadline</Text>
                <View style={styles.statRow}>
                  <Ionicons name="time-outline" size={14} color={colors['muted-foreground']} />
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{exam.mark_entry_deadline ?? 'Not set'}</Text>
                </View>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Hall Ticket Attendance</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {exam.hall_ticket_min_attendance != null ? `${exam.hall_ticket_min_attendance}% minimum` : 'Not set'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Attendance Period</Text>
                <Text style={[styles.statValue, { color: colors.foreground, fontSize: 13 }]}>
                  {exam.attendance_from_date && exam.attendance_to_date
                    ? `${exam.attendance_from_date} → ${exam.attendance_to_date}`
                    : 'Not set'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Hall Ticket Status</Text>
                <View style={styles.statRow}>
                  <Ionicons
                    name={exam.hall_ticket_published ? 'checkmark-circle' : 'lock-closed-outline'}
                    size={14}
                    color={exam.hall_ticket_published ? '#10B981' : colors['muted-foreground']}
                  />
                  <Text style={[styles.statValue, { color: exam.hall_ticket_published ? '#10B981' : colors['muted-foreground'] }]}>
                    {exam.hall_ticket_published ? 'Published' : 'Not Published'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Configured Subjects — grouped by class-section, with Send action (web parity) */}
            <View style={[styles.groupSection, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.groupHeader, { borderBottomColor: borderCol }]}>
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Configured Subjects</Text>
                {!configsError && (
                  <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                    {(subjectConfigs ?? []).length} subject{(subjectConfigs ?? []).length !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>

              {configsError || sectionsError ? (
                <Text style={[styles.emptyHint, { color: colors['muted-foreground'], padding: 12 }]}>
                  Subject list is unavailable right now.
                </Text>
              ) : !subjectConfigs || subjectConfigs.length === 0 ? (
                <Text style={[styles.emptyHint, { color: colors['muted-foreground'], padding: 12 }]}>
                  No subjects configured for this exam.
                </Text>
              ) : classSections && classSections.length > 0 ? (
                classSections.map(cs => {
                  const configs = subjectConfigs.filter(cfg => cfg.class_id === cs.class_id && cfg.section_id === cs.section_id);
                  if (configs.length === 0) return null;
                  const sectionLabel = cs.section_name ?? (cs.section_id ? sectionNameMap[cs.section_id] : null);
                  const csLabel = [cs.class_name ?? classNameMap[cs.class_id], sectionLabel].filter(Boolean).join(' – ') || 'Class';
                  return (
                    <View key={cs.id} style={[styles.groupRow, { borderBottomColor: borderCol }]}>
                      <View style={styles.rowBetween}>
                        <Text style={[styles.groupRowLabel, { color: colors['muted-foreground'] }]}>{csLabel}</Text>
                        <QuickSendButton
                          templateName="Exam Schedule"
                          targetType="class_section_parents"
                          targetRef={{ class_id: cs.class_id, section_id: cs.section_id ?? '' }}
                          recipientLabel={`Parents of ${csLabel}`}
                          variables={{
                            exam_name: exam.exam_name,
                            class_name: cs.class_name ?? classNameMap[cs.class_id],
                            section_name: sectionLabel ?? '',
                          }}
                          title="Send Exam Schedule Message"
                        />
                      </View>
                      <View style={styles.badgeRow}>
                        {configs.map(cfg => (
                          <View key={cfg.id} style={[styles.badge, { backgroundColor: borderCol }]}>
                            <Text style={[styles.badgeText, { color: colors.foreground }]}>
                              {cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? 'Subject'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={[styles.badgeRow, { padding: 12 }]}>
                  {subjectConfigs.map(cfg => (
                    <View key={cfg.id} style={[styles.badge, { backgroundColor: borderCol }]}>
                      <Text style={[styles.badgeText, { color: colors.foreground }]}>
                        {cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? 'Subject'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Dates Tab */}
        {activeTab === 'dates' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exam Dates</Text>
              <TouchableOpacity
                style={[styles.manageDatesBtn, { backgroundColor: '#556ee6' }]}
                onPress={() => router.push({ pathname: '/exam/dates', params: { examId: id } } as any)}
              >
                <Ionicons name={canManageDates ? 'pencil' : 'calendar'} size={15} color="white" />
                <Text style={styles.actionBtnText}>{canManageDates ? 'Manage Dates' : 'View All Dates'}</Text>
              </TouchableOpacity>
            </View>

            {!dates || dates.length === 0 ? (
              <View style={[styles.emptyBox, { borderColor: borderCol }]}>
                <Ionicons name="calendar-outline" size={32} color={colors['muted-foreground']} />
                <Text style={[styles.emptyHint, { color: colors['muted-foreground'], textAlign: 'center' }]}>
                  No exam dates scheduled yet.
                </Text>
                {canManageDates && (
                  <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor: '#556ee6', marginTop: 8 }]}
                    onPress={() => router.push({ pathname: '/exam/dates', params: { examId: id } } as any)}
                  >
                    <Ionicons name="add" size={16} color="#556ee6" />
                    <Text style={[styles.outlineBtnText, { color: '#556ee6' }]}>Add Dates</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              dates.map((d, idx) => {
                const sectionLabel = d.section_id ? sectionNameMap[d.section_id] : null;
                const classLabel = [classNameMap[d.class_id] ?? 'Class', sectionLabel].filter(Boolean).join(' – ');
                return (
                  <View key={d.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{idx + 1}</Text>
                    <View style={[styles.rowCardIcon, { backgroundColor: '#3B82F618' }]}>
                      <Ionicons name="calendar" size={18} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>
                        {d.subject_name ?? subjectNameMap[d.subject_id] ?? 'Subject'}
                      </Text>
                      <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>{classLabel}</Text>
                      <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                        {new Date(d.exam_date).toLocaleDateString()}
                        {d.start_time ? ` · ${d.start_time}${d.end_time ? ` – ${d.end_time}` : ''}` : ''}
                        {d.venue ? ` · ${d.venue}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Marks Tab — web parity (ExamDetail.tsx "marks" tab): title, blurb,
            and a "View Summary" button that opens the mark-entry completion
            summary (class-section + student list + subject/component table). */}
        {activeTab === 'marks' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Mark Entry</Text>
              <TouchableOpacity
                style={[styles.manageDatesBtn, { backgroundColor: '#556ee6' }]}
                onPress={() => router.push({ pathname: '/exam/marks-summary', params: { examId: id } } as any)}
              >
                <Ionicons name="bar-chart" size={15} color="white" />
                <Text style={styles.actionBtnText}>View Summary</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.emptyHint, { color: colors['muted-foreground'], marginTop: 10 }]}>
              Tap &quot;View Summary&quot; to see mark entry completion status across all classes and subjects.
            </Text>
            {canEnterMarks && (
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: '#8B5CF6', marginTop: 4 }]}
                onPress={() => router.push({ pathname: '/exam/marks', params: { examId: id } } as any)}
              >
                <Ionicons name="create" size={18} color="#8B5CF6" />
                <Text style={[styles.outlineBtnText, { color: '#8B5CF6' }]}>Enter Marks</Text>
              </TouchableOpacity>
            )}
            {canViewResults && (
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: '#10B981', marginTop: canEnterMarks ? 8 : 0 }]}
                onPress={() => router.push({ pathname: '/exam/results', params: { examId: id } } as any)}
              >
                <Ionicons name="bar-chart" size={18} color="#10B981" />
                <Text style={[styles.outlineBtnText, { color: '#10B981' }]}>View Results</Text>
              </TouchableOpacity>
            )}
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
                onPress={() => router.push({ pathname: '/exam/permissions', params: { examId: id } } as any)}
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
                      {perm.user_display_name ?? 'Teacher'}
                    </Text>
                    <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                      {perm.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      confirm({
                        title: 'Revoke Permission',
                        message: "Remove this teacher's mark entry permission?",
                        confirmLabel: 'Revoke',
                        destructive: true,
                        onConfirm: () => revokePermissionMutation.mutate(perm.id),
                      });
                    }}
                    style={{ padding: 12 }}
              accessibilityLabel="Revoke permission"
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
              onPress={() => router.push({ pathname: '/exam/notify', params: { examId: id } } as any)}
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
                      <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>{entry.action.replace(/_/g, ' ')}</Text>
                      <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                        {entry.actor_name ?? 'User'} · {new Date(entry.performed_at).toLocaleString()}
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
                // Fix #8: open reason modal instead of Alert (reason is required by backend)
                onPress={() => { setUnlockReason(''); setUnlockModalVisible(true); }}
              >
                <Ionicons name="lock-open-outline" size={18} color="#F59E0B" />
                <Text style={[styles.dangerBtnText, { color: '#F59E0B' }]}>Unlock for Corrections</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: '#EF4444' }]}
                onPress={() => {
                  confirm({
                    title: 'Delete Exam',
                    message: `Delete "${exam.exam_name}"? This cannot be undone.`,
                    confirmLabel: 'Delete',
                    destructive: true,
                    onConfirm: () => deleteMutation.mutate(),
                  });
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.dangerBtnText, { color: '#EF4444' }]}>Delete Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Unlock Reason Modal — Fix #8 */}
      <Modal visible={unlockModalVisible} animationType="slide" transparent onRequestClose={() => setUnlockModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Unlock for Corrections</Text>
              <TouchableOpacity onPress={() => setUnlockModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Reason for unlocking *</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 72 }]}
              value={unlockReason}
              onChangeText={setUnlockReason}
              placeholder="e.g. Marks entry error for Section A"
              placeholderTextColor={colors['muted-foreground']}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveBtn2, { backgroundColor: '#F59E0B', opacity: (!unlockReason.trim() || unlockMutation.isPending) ? 0.5 : 1 }]}
              onPress={() => {
                if (!unlockReason.trim()) { showError('Validation', 'Reason is required.'); return; }
                unlockMutation.mutate(unlockReason.trim());
                setUnlockModalVisible(false);
              }}
              disabled={!unlockReason.trim() || unlockMutation.isPending}
            >
              <Ionicons name="lock-open-outline" size={16} color="white" />
              <Text style={styles.saveBtnText}>Unlock Exam</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Modal — mirrors web Edit Exam dialog */}
      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={{ maxHeight: '85%' }}
            contentContainerStyle={[styles.modalSheet, { backgroundColor: cardBg }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Exam</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.emptyHint, { color: colors['muted-foreground'], marginTop: 4 }]}>
              Board, level, nature, and academic year cannot be changed after creation.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Exam Name *</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 48 }]}
              value={editForm.exam_name}
              onChangeText={v => setEditForm(p => ({ ...p, exam_name: v }))}
              placeholder="Exam name"
              placeholderTextColor={colors['muted-foreground']}
            />

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Mark Entry Deadline</Text>
            <TouchableOpacity
              style={[styles.dateField, { backgroundColor: inputBg, borderColor: borderCol }]}
              onPress={() => { setActiveEditDateField('deadline'); setShowEditDatePicker(true); }}
            >
              <Ionicons name="calendar-outline" size={15} color={colors['muted-foreground']} />
              <Text style={{ flex: 1, fontSize: 14, color: editForm.mark_entry_deadline ? colors.foreground : colors['muted-foreground'] }}>
                {editForm.mark_entry_deadline || 'Tap to select date'}
              </Text>
              {!!editForm.mark_entry_deadline && (
                <TouchableOpacity onPress={() => setEditForm(p => ({ ...p, mark_entry_deadline: '' }))}
              accessibilityLabel="Close">
                  <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Min Attendance %</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 48 }]}
              value={editForm.hall_ticket_min_attendance}
              onChangeText={v => setEditForm(p => ({ ...p, hall_ticket_min_attendance: v.replace(/[^0-9.]/g, '') }))}
              keyboardType="numeric"
              placeholder="e.g. 75"
              placeholderTextColor={colors['muted-foreground']}
            />

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Attendance From</Text>
            <TouchableOpacity
              style={[styles.dateField, { backgroundColor: inputBg, borderColor: borderCol }]}
              onPress={() => { setActiveEditDateField('from'); setShowEditDatePicker(true); }}
            >
              <Ionicons name="calendar-outline" size={15} color={colors['muted-foreground']} />
              <Text style={{ flex: 1, fontSize: 14, color: editForm.attendance_from_date ? colors.foreground : colors['muted-foreground'] }}>
                {editForm.attendance_from_date || 'Tap to select date'}
              </Text>
              {!!editForm.attendance_from_date && (
                <TouchableOpacity onPress={() => setEditForm(p => ({ ...p, attendance_from_date: '' }))}
              accessibilityLabel="Close">
                  <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Attendance To</Text>
            <TouchableOpacity
              style={[styles.dateField, { backgroundColor: inputBg, borderColor: borderCol }]}
              onPress={() => { setActiveEditDateField('to'); setShowEditDatePicker(true); }}
            >
              <Ionicons name="calendar-outline" size={15} color={colors['muted-foreground']} />
              <Text style={{ flex: 1, fontSize: 14, color: editForm.attendance_to_date ? colors.foreground : colors['muted-foreground'] }}>
                {editForm.attendance_to_date || 'Tap to select date'}
              </Text>
              {!!editForm.attendance_to_date && (
                <TouchableOpacity onPress={() => setEditForm(p => ({ ...p, attendance_to_date: '' }))}
              accessibilityLabel="Close">
                  <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelChip, { backgroundColor: editForm.publish_rank ? '#556ee620' : borderCol, marginTop: 14, alignSelf: 'flex-start', paddingHorizontal: 14 }]}
              onPress={() => setEditForm(p => ({ ...p, publish_rank: !p.publish_rank }))}
            >
              <Ionicons
                name={editForm.publish_rank ? 'checkbox' : 'square-outline'}
                size={16}
                color={editForm.publish_rank ? '#556ee6' : colors['muted-foreground']}
              />
              <Text style={{ color: editForm.publish_rank ? '#556ee6' : colors['muted-foreground'], fontSize: 13, fontWeight: '600' }}>
                Publish Rank
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn2, { opacity: (updateMutation.isPending || !editForm.exam_name.trim()) ? 0.5 : 1 }]}
              onPress={handleEditSave}
              disabled={updateMutation.isPending || !editForm.exam_name.trim()}
            >
              <Ionicons name="save-outline" size={16} color="white" />
              <Text style={styles.saveBtnText}>{updateMutation.isPending ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
        <DatePickerModal
          visible={showEditDatePicker}
          initialDate={
            activeEditDateField === 'deadline' ? editForm.mark_entry_deadline
              : activeEditDateField === 'from' ? editForm.attendance_from_date
              : editForm.attendance_to_date
          }
          onConfirm={confirmEditDate}
          onCancel={() => setShowEditDatePicker(false)}
        />
      </Modal>

      {/* Clone Modal */}
      <Modal visible={cloneModalVisible} animationType="slide" transparent onRequestClose={() => setCloneModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Clone Exam</Text>
              <TouchableOpacity onPress={() => setCloneModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.emptyHint, { color: colors['muted-foreground'], marginTop: 4 }]}>
              A copy of <Text style={{ fontWeight: '700', color: colors.foreground }}>{exam.exam_name}</Text> will be created without marks.
            </Text>
            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>New Exam Name</Text>
            <TextInput
              style={[styles.notifInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol, minHeight: 48 }]}
              value={cloneName}
              onChangeText={setCloneName}
              placeholder="Enter name for cloned exam"
              placeholderTextColor={colors['muted-foreground']}
            />
            <TouchableOpacity
              style={[styles.saveBtn2, { opacity: cloneMutation.isPending ? 0.5 : 1 }]}
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
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal {...modalProps} />
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
  // Tab bar (Overview / Dates / Marks) — web parity
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, marginRight: 4,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnText: { fontSize: 13, fontWeight: '600' },
  // Overview stat cards
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '47%', borderRadius: 12, borderWidth: 1, padding: 12 },
  statLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // Configured Subjects group card
  groupSection: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  groupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  groupRow: { padding: 12, borderBottomWidth: 1, gap: 8 },
  groupRowLabel: { fontSize: 12, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  // Dates tab
  manageDatesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  emptyBox: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', padding: 24,
  },
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
  serialNo: { width: 20, textAlign: 'center', fontSize: 13, fontWeight: '600' },
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
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minHeight: 48,
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
