import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useTheme } from '@/contexts';
import { authApi, type AuthMenu, type AuthMenuCreate, type AuthMenuUpdate } from '@/src/api/auth';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const COLOR = '#6366F1';

function AdminMenuScreenContent() {
  const { colors, theme } = useTheme();
  const { showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const queryClient = useQueryClient();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [modalVisible, setModalVisible] = useState(false);
  const [editingMenu, setEditingMenu] = useState<AuthMenu | null>(null);
  const [form, setForm] = useState<AuthMenuCreate>({ name: '', path: '', icon: '', order: 0, is_active: true });

  const { data: menus = [], isLoading } = useQuery({
    queryKey: ['admin-menus'],
    queryFn: () => authApi.getMenus(),
  });

  const createMutation = useMutation({
    mutationFn: (data: AuthMenuCreate) => authApi.createMenu(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
      closeModal();
    },
    onError: () => showError('Error', 'Failed to create menu item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AuthMenuUpdate }) => authApi.updateMenu(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
      closeModal();
    },
    onError: () => showError('Error', 'Failed to update menu item'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteMenu(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
    },
    onError: () => showError('Error', 'Failed to delete menu item'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      authApi.updateMenu(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] });
    },
    onError: () => showError('Error', 'Failed to update status'),
  });

  const openCreate = () => {
    setEditingMenu(null);
    setForm({ name: '', path: '', icon: '', order: 0, is_active: true });
    setModalVisible(true);
  };

  const openEdit = (menu: AuthMenu) => {
    setEditingMenu(menu);
    setForm({ name: menu.name, path: menu.path || '', icon: menu.icon || '', order: menu.order ?? 0, is_active: menu.is_active !== false });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingMenu(null);
    setForm({ name: '', path: '', icon: '', order: 0, is_active: true });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { showError('Validation', 'Menu name is required'); return; }
    if (editingMenu) {
      updateMutation.mutate({ id: editingMenu.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (menu: AuthMenu) => {
    confirm({
      title: 'Delete Menu Item',
      message: `Delete "${menu.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(menu.id),
    });
  };

  const handleToggleActive = (menu: AuthMenu) => {
    toggleMutation.mutate({ id: menu.id, is_active: !(menu.is_active !== false) });
  };

  const inputStyle = {
    backgroundColor: theme === 'dark' ? '#0d1117' : '#f8fafc',
    borderColor: borderCol,
    color: colors.foreground,
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ScreenLayout title="Menu Management">
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="menu" size={24} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Menu Management</Text>
          <Text style={styles.bannerSub}>Configure sidebar navigation items</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}
              accessibilityLabel="Add">
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLOR} size="large" />
          <Text style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading menus...</Text>
        </View>
      ) : (
        <FlatList
          data={menus}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="menu-outline" size={40} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No menu items configured</Text>
              <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: COLOR }]} onPress={openCreate}>
                <Text style={styles.emptyAddBtnText}>Add Menu Item</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const menu = item as AuthMenu;
            const isActive = menu.is_active !== false;
            return (
              <View style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.menuIcon, { backgroundColor: COLOR + '18' }]}>
                  <Ionicons name={(menu.icon || 'grid') as any} size={18} color={COLOR} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{menu.name}</Text>
                  {menu.path ? (
                    <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>{menu.path}</Text>
                  ) : null}
                  {menu.order !== undefined && menu.order !== null ? (
                    <Text style={[styles.rowOrder, { color: colors['muted-foreground'] }]}>Order: {menu.order}</Text>
                  ) : null}
                </View>
                {/* Toggle active */}
                <Switch
                  value={isActive}
                  onValueChange={() => handleToggleActive(menu)}
                  trackColor={{ false: '#d1d5db', true: COLOR + '88' }}
                  thumbColor={isActive ? COLOR : '#9ca3af'}
                  style={{ marginRight: 8 }}
                  disabled={toggleMutation.isPending}
                />
                {/* Edit button */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#dbeafe' }]}
                  onPress={() => openEdit(menu)}
              accessibilityLabel="Edit"
                >
                  <Ionicons name="create-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
                {/* Delete button */}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#fee2e2', marginLeft: 6 }]}
                  onPress={() => handleDelete(menu)}
                  disabled={deleteMutation.isPending}
              accessibilityLabel="Delete"
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingMenu ? 'Edit Menu Item' : 'Add Menu Item'}
              </Text>
              <TouchableOpacity onPress={closeModal}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Name *</Text>
              <TextInput
                style={[styles.input, inputStyle]}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Reports"
                placeholderTextColor={colors['muted-foreground']}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Path</Text>
              <TextInput
                style={[styles.input, inputStyle]}
                value={form.path}
                onChangeText={v => setForm(f => ({ ...f, path: v }))}
                placeholder="e.g. /reports"
                placeholderTextColor={colors['muted-foreground']}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Icon</Text>
              <TextInput
                style={[styles.input, inputStyle]}
                value={form.icon}
                onChangeText={v => setForm(f => ({ ...f, icon: v }))}
                placeholder="e.g. bar-chart"
                placeholderTextColor={colors['muted-foreground']}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors['muted-foreground'] }]}>Order</Text>
              <TextInput
                style={[styles.input, inputStyle]}
                value={String(form.order ?? '')}
                onChangeText={v => setForm(f => ({ ...f, order: parseInt(v) || 0 }))}
                placeholder="e.g. 1"
                placeholderTextColor={colors['muted-foreground']}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={[styles.label, { color: colors['muted-foreground'], marginBottom: 0 }]}>Active</Text>
              <Switch
                value={form.is_active !== false}
                onValueChange={v => setForm(f => ({ ...f, is_active: v }))}
                trackColor={{ false: '#d1d5db', true: COLOR + '88' }}
                thumbColor={form.is_active !== false ? COLOR : '#9ca3af'}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: COLOR, opacity: isPending ? 0.5 : 1 }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>{editingMenu ? 'Save Changes' : 'Create Menu Item'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ConfirmModal {...modalProps} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden' },
  bannerDecor: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  bannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, elevation: 1 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '600' },
  rowSub: { fontSize: 11, marginTop: 1 },
  rowOrder: { fontSize: 10, marginTop: 1 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyText: { fontSize: 14, marginBottom: 4 },
  emptyAddBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyAddBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  formGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function AdminMenuScreen() {
  return (
    <ScreenAccessGate
      title="Menu Management"
      resources={['menu']}
    >
      <AdminMenuScreenContent />
    </ScreenAccessGate>
  );
}
