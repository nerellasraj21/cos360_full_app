import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { parentsApi } from '@/src/api/masters';
import { staffApi } from '@/src/api/staff';
import { studentAdmissionsApi } from '@/src/api/students';
import { adminUsersApi, UserWithDetails } from '@/src/api/users';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const COLOR = '#6366F1';

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({
  user,
  visible,
  onClose,
  colors,
  theme,
}: {
  user: UserWithDetails | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
  theme: string;
}) {
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0';

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState<'details' | 'password'>('details');

  React.useEffect(() => {
    if (user) {
      setUsername(user.username ?? '');
      setEmail(user.email ?? '');
      setIsActive(user.is_active);
      setNewPw('');
      setTab('details');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () =>
      adminUsersApi.updateUser(user!.id, {
        username: username.trim() || undefined,
        email: email.trim() || undefined,
        is_active: isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-system-users'] });
      showSuccess('User updated successfully');
      onClose();
    },
    onError: () => showError('Failed to update user'),
  });

  const resetPwMutation = useMutation({
    mutationFn: () => adminUsersApi.resetPassword(user!.id, newPw),
    onSuccess: () => {
      showSuccess('Password reset successfully');
      setNewPw('');
      setTab('details');
    },
    onError: () => showError('Failed to reset password'),
  });

  const handleSave = () => {
    if (!username.trim()) { showError('Username is required'); return; }
    updateMutation.mutate();
  };

  const handleResetPw = () => {
    if (newPw.length < 8) { showError('New password must be at least 8 characters'); return; }
    resetPwMutation.mutate();
  };

  if (!user) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {user.entity_name ?? user.username}
              </Text>
              <Text style={[styles.modalSub, { color: colors['muted-foreground'] }]}>
                {user.role_name} · {user.entity_type ?? 'system'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}
              accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Tab selector */}
          <View style={[styles.tabRow, { borderBottomColor: borderCol }]}>
            {(['details', 'password'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && { borderBottomColor: COLOR, borderBottomWidth: 2 }]}
                onPress={() => setTab(t)}
              >
                <Text style={{ color: tab === t ? COLOR : colors['muted-foreground'], fontWeight: '600', fontSize: 13 }}>
                  {t === 'details' ? 'Details' : 'Reset Password'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 340 }}>
            {tab === 'details' ? (
              <View style={styles.modalBody}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Username *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Email</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.switchRow}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 0 }]}>Active</Text>
                  <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: '#10B981' }} />
                </View>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={[styles.fieldLabel, { color: colors.foreground }]}>New Password *</Text>
                <View style={[styles.pwRow, { borderColor: borderCol, backgroundColor: inputBg }]}>
                  <TextInput
                    style={[styles.pwInput, { color: colors.foreground }]}
                    value={newPw}
                    onChangeText={setNewPw}
                    secureTextEntry={!showPw}
                    placeholder="Min 8 characters"
                    placeholderTextColor={colors['muted-foreground']}
                  />
                  <TouchableOpacity onPress={() => setShowPw(v => !v)}>
                    <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.resetPwBtn, { opacity: resetPwMutation.isPending ? 0.5 : 1 }]}
                  onPress={handleResetPw}
                  disabled={resetPwMutation.isPending}
                >
                  <Text style={{ color: 'white', fontWeight: '700' }}>
                    {resetPwMutation.isPending ? 'Resetting...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {tab === 'details' && (
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: inputBg }]} onPress={onClose}>
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { opacity: updateMutation.isPending ? 0.5 : 1 }]}
                onPress={handleSave}
                disabled={updateMutation.isPending}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

function AdminUsersScreenContent() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const { showError } = useToastContext();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [page, setPage] = useState(1);

  // ── Counts for category cards ────────────────────────────────────────────
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['admin-users-staff'],
    queryFn: () => staffApi.getStaffEnrollments({ limit: 1 }),
  });
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-users-students'],
    queryFn: () => studentAdmissionsApi.listAdmissions({ limit: 1 }),
  });
  const { data: parentsData = [], isLoading: parentsLoading } = useQuery({
    queryKey: ['admin-users-parents'],
    queryFn: () => parentsApi.getParents(),
  });

  // ── System user list ─────────────────────────────────────────────────────
  const { data: usersResp, isLoading: usersLoading, refetch: refetchUsers, isRefetching: usersRefetching } = useQuery({
    queryKey: ['admin-system-users', search, roleFilter, page],
    queryFn: () => adminUsersApi.listUsers({
      page,
      limit: 20,
      search: search || undefined,
      role: roleFilter || undefined,
    }),
    staleTime: 30_000,
  });

  const { data: filterOptions } = useQuery({
    queryKey: ['admin-user-filter-options'],
    queryFn: () => adminUsersApi.getFilterOptions(),
  });

  const systemUsers = usersResp?.users ?? [];
  const totalPages = usersResp?.total_pages ?? 1;

  const isLoading = staffLoading || studentsLoading || parentsLoading;
  const staffCount   = (staffData as any)?.total ?? (staffData as any)?.items?.length ?? 0;
  const studentCount = (studentsData as any)?.total_count ?? (studentsData as any)?.total ?? 0;
  const parentsCount = Array.isArray(parentsData) ? parentsData.length : 0;

  const userCategories = [
    { title: 'Staff Members',      count: staffCount,   icon: 'people' as const,          color: '#8b5cf6', bg: theme === 'dark' ? '#2e1f5e' : '#ede9fe', route: '/(tabs)/staff',            description: 'Teachers, admin staff & support' },
    { title: 'Students',           count: studentCount, icon: 'school' as const,           color: '#3b82f6', bg: theme === 'dark' ? '#1e3a5f' : '#dbeafe', route: '/(tabs)/students',          description: 'Enrolled students across all classes' },
    { title: 'Parents',            count: parentsCount, icon: 'home' as const,             color: '#f59e0b', bg: theme === 'dark' ? '#3d2e0a' : '#fef3c7', route: '/masters/parents',          description: 'Parent accounts linked to students' },
    { title: 'Roles & Permissions',count: null,         icon: 'shield-checkmark' as const, color: '#10b981', bg: theme === 'dark' ? '#0a2e20' : '#d1fae5', route: '/masters/rolespermissions', description: 'Manage access control & permissions' },
  ];

  const availableRoles: string[] = filterOptions?.available_roles ?? [];

  const openEdit = (user: UserWithDetails) => {
    setSelectedUser(user);
    setEditVisible(true);
  };

  return (
    <ScreenLayout title="User Management">
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="people" size={24} color="white" />
        </View>
        <Text style={styles.bannerTitle}>User Management</Text>
      </View>

      <FlatList
        data={systemUsers}
        keyExtractor={u => u.id}
        refreshing={usersRefetching}
        onRefresh={refetchUsers}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            {/* Category nav cards */}
            <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>USER CATEGORIES</Text>
            {userCategories.map((cat, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.categoryCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => router.push(cat.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.categoryIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.categoryTitle, { color: colors.foreground }]}>{cat.title}</Text>
                  <Text style={[styles.categoryDesc, { color: colors['muted-foreground'] }]}>{cat.description}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {cat.count !== null && (
                    isLoading
                      ? <ActivityIndicator color={cat.color} size="small" style={{ marginBottom: 2 }} />
                      : <Text style={[styles.categoryCount, { color: cat.color }]}>{cat.count}</Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
                </View>
              </TouchableOpacity>
            ))}

            {/* System Users Section */}
            <Text style={[styles.sectionLabel, { color: colors['muted-foreground'], marginTop: 16 }]}>SYSTEM LOGIN ACCOUNTS</Text>

            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
              <Ionicons name="search" size={16} color={colors['muted-foreground']} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search by username, name..."
                placeholderTextColor={colors['muted-foreground']}
                value={search}
                onChangeText={v => { setSearch(v); setPage(1); }}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}
              accessibilityLabel="Close">
                  <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Role filter chips */}
            {availableRoles.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {['', ...availableRoles].map(r => {
                  const active = roleFilter === r;
                  return (
                    <TouchableOpacity
                      key={r || '__all__'}
                      style={[styles.roleChip, { borderColor: active ? COLOR : borderCol }, active && { backgroundColor: COLOR }]}
                      onPress={() => { setRoleFilter(r); setPage(1); }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '600', color: active ? 'white' : colors['muted-foreground'] }}>
                        {r || 'All Roles'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {usersLoading && (
              <View style={styles.centered}>
                <ActivityIndicator color={COLOR} />
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !usersLoading ? (
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={40} color={colors['muted-foreground']} />
              <Text style={[{ color: colors['muted-foreground'], fontSize: 13, marginTop: 8 }]}>No users found</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, { opacity: page === 1 ? 0.5 : 1 }]}
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={18} color={COLOR} />
              </TouchableOpacity>
              <Text style={[styles.pageInfo, { color: colors['muted-foreground'] }]}>
                {page} / {totalPages}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, { opacity: page >= totalPages ? 0.5 : 1 }]}
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              accessibilityLabel="Next"
              >
                <Ionicons name="chevron-forward" size={18} color={COLOR} />
              </TouchableOpacity>
            </View>
          ) : <View style={{ height: 32 }} />
        }
        renderItem={({ item, index }) => (
          <View style={[styles.userCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.userAvatar, { backgroundColor: item.is_active ? COLOR : '#94a3b8' }]}>
              <Text style={styles.userAvatarText}>{(item.username?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
              <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                {item.entity_name ?? item.username}
              </Text>
              <Text style={[styles.userMeta, { color: colors['muted-foreground'] }]}>
                @{item.username} · {item.role_name}
              </Text>
              {!!item.entity_type && (
                <Text style={[styles.userMeta, { color: colors['muted-foreground'] }]}>
                  {item.entity_type.charAt(0).toUpperCase() + item.entity_type.slice(1)}
                </Text>
              )}
            </View>
            <View style={styles.userActions}>
              <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]} />
              <TouchableOpacity
                style={[styles.editBtn, { backgroundColor: COLOR + '18' }]}
                onPress={() => openEdit(item)}
              accessibilityLabel="Edit"
              >
                <Ionicons name="create-outline" size={16} color={COLOR} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <EditUserModal
        user={selectedUser}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        colors={colors}
        theme={theme}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden' },
  bannerDecor: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  bannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10, elevation: 1 },
  categoryIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  categoryDesc: { fontSize: 12, lineHeight: 17 },
  categoryCount: { fontSize: 18, fontWeight: '700', marginBottom: 2 },

  // System users section
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 40, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 13 },
  chipScroll: { marginBottom: 10 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 6 },
  centered: { alignItems: 'center', paddingVertical: 20 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { color: 'white', fontSize: 14, fontWeight: '700' },
  userName: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  userMeta: { fontSize: 11, lineHeight: 16 },
  userActions: { alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  editBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 10 },
  pageBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLOR + '18' },
  pageInfo: { fontSize: 13, fontWeight: '600' },

  // Edit modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSub: { fontSize: 12, marginTop: 2 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  tabBtn: { flex: 1, alignItems: 'center', paddingBottom: 10 },
  modalBody: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14, marginBottom: 4 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  pwRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  pwInput: { flex: 1, paddingVertical: 11, fontSize: 14 },
  resetPwBtn: { backgroundColor: '#EF4444', borderRadius: 10, padding: 13, alignItems: 'center' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  saveBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLOR },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function AdminUsersScreen() {
  return (
    <ScreenAccessGate
      title="User Management"
      resources={['users']}
    >
      <AdminUsersScreenContent />
    </ScreenAccessGate>
  );
}
