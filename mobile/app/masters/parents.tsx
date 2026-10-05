import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useTheme } from '@/contexts';
import {
  parentsApi,
  type Parent,
  type ParentCreate,
  type ParentGender,
  type ParentRelation,
  type ParentSalaryRange,
} from '@/src/api/masters';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';
import {
  CreatePermissionGuard,
  DeletePermissionGuard,
  UpdatePermissionGuard,
} from '@/components/PermissionGuards';
import { CustomDropdown } from '@/components/ui/dropdown';

const COLOR = '#f59e0b';

const RELATION_OPTIONS: { label: string; value: ParentRelation }[] = [
  { label: 'Father', value: 'Father' },
  { label: 'Mother', value: 'Mother' },
  { label: 'Guardian', value: 'Guardian' },
];

const GENDER_OPTIONS: { label: string; value: ParentGender }[] = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
];

const SALARY_OPTIONS: { label: string; value: ParentSalaryRange }[] = [
  { label: 'Below 1 lakh', value: 'below_1l' },
  { label: '1 to 3 lakhs', value: '1l_3l' },
  { label: '3 to 5 lakhs', value: '3l_5l' },
  { label: '5 to 10 lakhs', value: '5l_10l' },
  { label: 'Above 10 lakhs', value: 'above_10l' },
];

const RELATION_COLORS: Record<string, string> = {
  Father: '#3b82f6',
  Mother: '#ec4899',
  Guardian: '#8b5cf6',
};

type ParentFormData = {
  name: string;
  email: string;
  phone: string;
  occupation: string;
  aadhar_number: string;
  gender: ParentGender | null;
  relation_to_student: ParentRelation;
  salary_range: ParentSalaryRange | null;
};

const emptyForm: ParentFormData = {
  name: '',
  email: '',
  phone: '',
  occupation: '',
  aadhar_number: '',
  gender: null,
  relation_to_student: 'Father',
  salary_range: null,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parentLabel(p: Parent): string {
  const n = (p.name ?? '').trim();
  return n || p.relation_to_student || 'Parent';
}

function parentInitials(p: Parent): string {
  const n = (p.name ?? '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase() || '?';
  }
  return (p.relation_to_student ?? '?').slice(0, 1).toUpperCase() || '?';
}

function buildPayload(form: ParentFormData): ParentCreate {
  const payload: ParentCreate = { relation_to_student: form.relation_to_student };
  if (form.name.trim()) payload.name = form.name.trim();
  if (form.email.trim()) payload.email = form.email.trim();
  if (form.phone.trim()) payload.phone = form.phone.trim();
  if (form.occupation.trim()) payload.occupation = form.occupation.trim();
  if (form.aadhar_number.trim()) payload.aadhar_number = form.aadhar_number.trim();
  if (form.gender) payload.gender = form.gender;
  if (form.salary_range) payload.salary_range = form.salary_range;
  return payload;
}

function ParentsScreenContent() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingParent, setEditingParent] = useState<Parent | null>(null);
  const [form, setForm] = useState<ParentFormData>(emptyForm);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0d1117' : '#f8fafc';

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['parents'],
    queryFn: () => parentsApi.getParents(),
  });
  const parents: Parent[] = Array.isArray(data) ? data : [];

  const filteredParents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter(
      p =>
        (p.name ?? '').toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.phone ?? '').toLowerCase().includes(q)
    );
  }, [parents, searchQuery]);

  const closeModal = () => {
    setModalVisible(false);
    setEditingParent(null);
    setForm(emptyForm);
  };

  const createMutation = useMutation({
    mutationFn: (payload: ParentCreate) => parentsApi.createParent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      showSuccess('Parent Added', 'The parent profile was created');
      closeModal();
    },
    onError: (e: Error) => showError('Create Failed', e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }: { id: string; data: ParentCreate }) =>
      parentsApi.updateParent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      showSuccess('Parent Updated', 'The parent profile was saved');
      closeModal();
    },
    onError: (e: Error) => showError('Update Failed', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => parentsApi.deleteParent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      showSuccess('Parent Deleted', 'The parent profile was removed');
    },
    onError: (e: Error) => showError('Delete Failed', e.message),
  });

  const openCreate = () => {
    setEditingParent(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (parent: Parent) => {
    const relation = RELATION_OPTIONS.find(o => o.value === parent.relation_to_student)?.value ?? 'Father';
    const gender = GENDER_OPTIONS.find(o => o.value === parent.gender)?.value ?? null;
    const salary = SALARY_OPTIONS.find(o => o.value === parent.salary_range)?.value ?? null;
    setEditingParent(parent);
    setForm({
      name: parent.name ?? '',
      email: parent.email ?? '',
      phone: parent.phone ?? '',
      occupation: parent.occupation ?? '',
      aadhar_number: parent.aadhar_number ?? '',
      gender,
      relation_to_student: relation,
      salary_range: salary,
    });
    setModalVisible(true);
  };

  const handleSubmit = () => {
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      showError('Validation', 'Enter a valid email address');
      return;
    }
    const aadhar = form.aadhar_number.trim();
    if (aadhar && !/^\d{12}$/.test(aadhar)) {
      showError('Validation', 'Aadhar number must be 12 digits');
      return;
    }
    if (!editingParent && !form.email.trim() && !form.phone.trim()) {
      showError('Validation', 'Email or phone is required to create the parent login');
      return;
    }
    const payload = buildPayload(form);
    if (editingParent) {
      updateMutation.mutate({ id: editingParent.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (parent: Parent) => {
    confirm({
      title: 'Delete Parent',
      message: `Delete "${parentLabel(parent)}"? This cannot be undone and removes all student associations.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(parent.id),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputStyle = { backgroundColor: inputBg, borderColor: borderCol, color: colors.foreground };
  const muted = colors['muted-foreground'];

  const renderItem = ({ item: p, index }: { item: Parent; index: number }) => {
    const relation = p.relation_to_student ?? '';
    const relColor = RELATION_COLORS[relation] ?? COLOR;
    const childNames = (p.students ?? [])
      .map(st => `${st.first_name ?? ''} ${st.last_name ?? ''}`.trim())
      .filter(Boolean);
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={[styles.avatar, { backgroundColor: COLOR + '20' }]}>
          <Text style={[styles.avatarText, { color: COLOR }]}>{parentInitials(p)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serialNo, { color: muted }]}>{index + 1}</Text>
          <Text style={[styles.cardName, { color: colors.foreground }]}>{parentLabel(p)}</Text>
          {!!relation && (
            <View style={[styles.badge, { backgroundColor: relColor + '20' }]}>
              <Text style={[styles.badgeText, { color: relColor }]}>{relation}</Text>
            </View>
          )}
          {!!p.phone && (
            <View style={styles.metaRow}>
              <Ionicons name="call-outline" size={12} color={muted} />
              <Text style={[styles.cardSub, { color: muted, marginBottom: 0 }]}>{p.phone}</Text>
            </View>
          )}
          {!!p.email && (
            <View style={styles.metaRow}>
              <Ionicons name="mail-outline" size={12} color={muted} />
              <Text style={[styles.cardSub, { color: muted, marginBottom: 0 }]}>{p.email}</Text>
            </View>
          )}
          {!!p.occupation && (
            <View style={styles.metaRow}>
              <Ionicons name="briefcase-outline" size={12} color={muted} />
              <Text style={[styles.cardSub, { color: muted, marginBottom: 0 }]}>{p.occupation}</Text>
            </View>
          )}
          <View style={styles.studentRow}>
            <Ionicons name="school-outline" size={12} color={muted} />
            <Text style={[styles.studentCount, { color: muted, flex: 1 }]}>
              {childNames.length > 0 ? childNames.join(', ') : 'No linked students'}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.PARENTS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#dbeafe' }]}
              onPress={() => openEdit(p)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="create-outline" size={15} color="#3b82f6" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard resource={PERMISSION_RESOURCES.PARENTS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#fee2e2', marginTop: 6 }]}
              onPress={() => handleDelete(p)}
              disabled={deleteMutation.isPending}
              accessibilityLabel="Delete"
            >
              <Ionicons name="trash-outline" size={15} color="#ef4444" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </View>
    );
  };

  const listEmpty = isLoading ? (
    <View style={styles.emptyState}>
      <ActivityIndicator size="large" color={COLOR} />
      <Text style={[styles.emptyText, { color: muted }]}>Loading parents...</Text>
    </View>
  ) : isError ? (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle-outline" size={44} color={colors.destructive} />
      <Text style={[styles.emptyText, { color: muted }]}>
        {(error as Error | null)?.message || 'Failed to load parents'}
      </Text>
      <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: COLOR }]} onPress={() => refetch()}>
        <Text style={styles.emptyAddBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.emptyState}>
      <Ionicons name="home-outline" size={44} color={muted} />
      <Text style={[styles.emptyText, { color: muted }]}>
        {searchQuery ? 'No parents match your search' : 'No parents registered yet'}
      </Text>
      {!searchQuery && (
        <CreatePermissionGuard resource={PERMISSION_RESOURCES.PARENTS} fallback={null} loadingFallback={null}>
          <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: COLOR }]} onPress={openCreate}>
            <Text style={styles.emptyAddBtnText}>Add Parent</Text>
          </TouchableOpacity>
        </CreatePermissionGuard>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.bannerIcon}>
          <Ionicons name="home" size={22} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Parents</Text>
          <Text style={styles.bannerSub}>{parents.length} registered parents</Text>
        </View>
        <CreatePermissionGuard resource={PERMISSION_RESOURCES.PARENTS} fallback={null} loadingFallback={null}>
          <TouchableOpacity style={styles.addBtn} onPress={openCreate} accessibilityLabel="Add">
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </CreatePermissionGuard>
      </View>

      <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <Ionicons name="search" size={16} color={muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name, email or phone..."
          placeholderTextColor={muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={muted} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={isError ? [] : filteredParents}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching && !isLoading} onRefresh={refetch} tintColor={COLOR} />
        }
        ListEmptyComponent={listEmpty}
        renderItem={renderItem}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingParent ? 'Edit Parent' : 'Add Parent'}
              </Text>
              <TouchableOpacity onPress={closeModal} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={muted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="Parent's full name"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Relationship to Student *</Text>
                <CustomDropdown
                  data={RELATION_OPTIONS.map(o => ({ label: o.label || '', value: o.value }))}
                  value={form.relation_to_student}
                  placeholder="Select relationship"
                  search={false}
                  onChange={v =>
                    setForm(f => ({ ...f, relation_to_student: (v as ParentRelation | null) ?? f.relation_to_student }))
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Gender</Text>
                <CustomDropdown
                  data={GENDER_OPTIONS.map(o => ({ label: o.label || '', value: o.value }))}
                  value={form.gender}
                  placeholder="Select gender"
                  search={false}
                  onChange={v => setForm(f => ({ ...f, gender: (v as ParentGender | null) ?? null }))}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Email</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.email}
                  onChangeText={v => setForm(f => ({ ...f, email: v }))}
                  placeholder="email@example.com"
                  placeholderTextColor={muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Phone</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.phone}
                  onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                  placeholder="Phone number"
                  placeholderTextColor={muted}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Occupation</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.occupation}
                  onChangeText={v => setForm(f => ({ ...f, occupation: v }))}
                  placeholder="e.g. Engineer"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Aadhar Number</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.aadhar_number}
                  onChangeText={v => setForm(f => ({ ...f, aadhar_number: v.replace(/\D/g, '').slice(0, 12) }))}
                  placeholder="12-digit Aadhar number"
                  placeholderTextColor={muted}
                  keyboardType="number-pad"
                  maxLength={12}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: muted }]}>Annual Income</Text>
                <CustomDropdown
                  data={SALARY_OPTIONS.map(o => ({ label: o.label || '', value: o.value }))}
                  value={form.salary_range}
                  placeholder="Select income range"
                  search={false}
                  onChange={v => setForm(f => ({ ...f, salary_range: (v as ParentSalaryRange | null) ?? null }))}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: COLOR, opacity: isPending ? 0.5 : 1, marginTop: 8 }]}
                onPress={handleSubmit}
                disabled={isPending}
              >
                <Text style={styles.submitBtnText}>
                  {isPending ? 'Saving...' : editingParent ? 'Save Changes' : 'Add Parent'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmModal {...modalProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 12, overflow: 'hidden' },
  bannerDecor: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  backBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  bannerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  addBtn: { width: 40, height: 40, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  listContent: { paddingHorizontal: 12, paddingBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, elevation: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  cardName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 12, marginBottom: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  studentCount: { fontSize: 11 },
  actions: { alignItems: 'center' },
  actionBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 60 },
  errorBox: { alignItems: 'center', gap: 10, paddingTop: 60, paddingHorizontal: 24 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyAddBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  emptyAddBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  formGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});

export default function ParentsScreen() {
  return (
    <ScreenAccessGate title="Parents" resources={[PERMISSION_RESOURCES.PARENTS]}>
      <ParentsScreenContent />
    </ScreenAccessGate>
  );
}
