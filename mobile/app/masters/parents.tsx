import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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
import { parentsApi, type Parent } from '@/src/api/masters';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const COLOR = '#f59e0b';

type ParentFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  occupation: string;
  is_active: boolean;
};

const emptyForm: ParentFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  occupation: '',
  is_active: true,
};

function ParentsScreenContent() {
  const { colors, theme } = useTheme();
  const { showError } = useToastContext();
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

  const { data: parents = [], isLoading, refetch } = useQuery({
    queryKey: ['parents'],
    queryFn: () => parentsApi.getParents(),
  });

  const filteredParents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return parents as Parent[];
    return (parents as Parent[]).filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.phone || '').includes(q)
    );
  }, [parents, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: ParentFormData) => parentsApi.createParent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      closeModal();
    },
    onError: () => showError('Error', 'Failed to create parent'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ParentFormData> }) =>
      parentsApi.updateParent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      closeModal();
    },
    onError: () => showError('Error', 'Failed to update parent'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => parentsApi.deleteParent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['parents'] }),
    onError: () => showError('Error', 'Failed to delete parent'),
  });

  const openCreate = () => {
    setEditingParent(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (parent: Parent) => {
    setEditingParent(parent);
    setForm({
      first_name: parent.first_name,
      last_name: parent.last_name,
      email: parent.email,
      phone: parent.phone || '',
      address: parent.address || '',
      occupation: parent.occupation || '',
      is_active: parent.is_active !== false,
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingParent(null);
    setForm(emptyForm);
  };

  const handleSubmit = () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      showError('Validation', 'First and last name are required');
      return;
    }
    if (!form.email.trim()) {
      showError('Validation', 'Email is required');
      return;
    }
    if (editingParent) {
      updateMutation.mutate({ id: editingParent.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (parent: Parent) => {
    confirm({
      title: 'Delete Parent',
      message: `Delete "${parent.first_name} ${parent.last_name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(parent.id),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputStyle = { backgroundColor: inputBg, borderColor: borderCol, color: colors.foreground };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}
              accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <View style={styles.bannerIcon}>
          <Ionicons name="home" size={22} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Parents</Text>
          <Text style={styles.bannerSub}>{(parents as Parent[]).length} registered parents</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}
              accessibilityLabel="Add">
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <Ionicons name="search" size={16} color={colors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search by name, email or phone..."
          placeholderTextColor={colors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
            <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredParents}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLOR} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={44} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {searchQuery ? 'No parents match your search' : 'No parents registered yet'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: COLOR }]} onPress={openCreate}>
                <Text style={styles.emptyAddBtnText}>Add Parent</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const p = item as Parent;
          const isActive = p.is_active !== false;
          return (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.avatar, { backgroundColor: COLOR + '20' }]}>
                <Text style={[styles.avatarText, { color: COLOR }]}>
                  {p.first_name[0]}{p.last_name[0]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
                <Text style={[styles.cardName, { color: colors.foreground }]}>
                  {p.first_name} {p.last_name}
                </Text>
                <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>{p.email}</Text>
                {p.phone ? (
                  <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>{p.phone}</Text>
                ) : null}
                {p.occupation ? (
                  <Text style={[styles.cardOcc, { color: colors['muted-foreground'] }]}>{p.occupation}</Text>
                ) : null}
                <View style={styles.studentRow}>
                  <Ionicons name="school-outline" size={11} color={colors['muted-foreground']} />
                  <Text style={[styles.studentCount, { color: colors['muted-foreground'] }]}>
                    {p.students?.length ?? 0} student{(p.students?.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                  <View style={[styles.statusDot, { backgroundColor: isActive ? '#10b981' : '#d1d5db' }]} />
                  <Text style={[styles.statusText, { color: isActive ? '#10b981' : colors['muted-foreground'] }]}>
                    {isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#dbeafe' }]}
                  onPress={() => openEdit(p)}
              accessibilityLabel="Edit"
                >
                  <Ionicons name="create-outline" size={15} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#fee2e2', marginTop: 6 }]}
                  onPress={() => handleDelete(p)}
                  disabled={deleteMutation.isPending}
              accessibilityLabel="Delete"
                >
                  <Ionicons name="trash-outline" size={15} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingParent ? 'Edit Parent' : 'Add Parent'}
              </Text>
              <TouchableOpacity onPress={closeModal}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors['muted-foreground'] }]}>First Name *</Text>
                  <TextInput
                    style={[styles.input, inputStyle]}
                    value={form.first_name}
                    onChangeText={v => setForm(f => ({ ...f, first_name: v }))}
                    placeholder="First name"
                    placeholderTextColor={colors['muted-foreground']}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Last Name *</Text>
                  <TextInput
                    style={[styles.input, inputStyle]}
                    value={form.last_name}
                    onChangeText={v => setForm(f => ({ ...f, last_name: v }))}
                    placeholder="Last name"
                    placeholderTextColor={colors['muted-foreground']}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Email *</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.email}
                  onChangeText={v => setForm(f => ({ ...f, email: v }))}
                  placeholder="email@example.com"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Phone</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.phone}
                  onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                  placeholder="Phone number"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Occupation</Text>
                <TextInput
                  style={[styles.input, inputStyle]}
                  value={form.occupation}
                  onChangeText={v => setForm(f => ({ ...f, occupation: v }))}
                  placeholder="e.g. Engineer"
                  placeholderTextColor={colors['muted-foreground']}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Address</Text>
                <TextInput
                  style={[styles.input, inputStyle, { height: 72, textAlignVertical: 'top' }]}
                  value={form.address}
                  onChangeText={v => setForm(f => ({ ...f, address: v }))}
                  placeholder="Home address"
                  placeholderTextColor={colors['muted-foreground']}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.toggleRow}>
                <Text style={[styles.label, { color: colors['muted-foreground'], marginBottom: 0 }]}>Active</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={v => setForm(f => ({ ...f, is_active: v }))}
                  trackColor={{ false: '#d1d5db', true: COLOR + '88' }}
                  thumbColor={form.is_active ? COLOR : '#9ca3af'}
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
  cardOcc: { fontSize: 11, fontStyle: 'italic', marginBottom: 3 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  studentCount: { fontSize: 11 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  actions: { alignItems: 'center' },
  actionBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 60 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyAddBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  emptyAddBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  formRow: { flexDirection: 'row', gap: 10 },
  formGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ParentsScreen() {
  return (
    <ScreenAccessGate
      title="Parents"
      resources={['parents']}
    >
      <ParentsScreenContent />
    </ScreenAccessGate>
  );
}
