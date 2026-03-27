import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import { locationsApi } from '@/src/api';
import type { LocationOut, LocationIn, LocationUpdate } from '@/src/api';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const ACCENT = '#0891B2';

export default function LocationsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<LocationOut | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });

  const router = useRouter();
  const { theme, colors } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#e5e7eb';

  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: LocationIn) => locationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Location Created', 'Location created successfully.');
    },
    onError: (error: any) => showError('Create Failed', error.message || 'Failed to create location'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationUpdate }) => locationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Location Updated', 'Location updated successfully.');
    },
    onError: (error: any) => showError('Update Failed', error.message || 'Failed to update location'),
  });

  const deleteMutation = useMutation({
    mutationFn: locationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      showSuccess('Location Deleted', 'Location deleted successfully.');
    },
    onError: (error: any) => showError('Delete Failed', error.message || 'Failed to delete location'),
  });

  const filteredLocations = useMemo(
    () => (locations as LocationOut[]).filter(l =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [locations, searchQuery]
  );

  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true });
    setEditingItem(null);
  };

  const handleEdit = (item: LocationOut) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description ?? '', is_active: item.is_active });
    setIsModalVisible(true);
  };

  const handleDelete = (item: LocationOut) => {
    Alert.alert('Delete Location', `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation', 'Location name is required');
      return;
    }
    const payload: LocationIn = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      is_active: formData.is_active,
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderItem = ({ item, index }: { item: LocationOut; index: number }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={styles.cardLeft}>
        <ThemedText style={[styles.sno, { color: colors['muted-foreground'] }]}>{index + 1}.</ThemedText>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.name} numberOfLines={1}>{item.name}</ThemedText>
          {item.description ? (
            <ThemedText style={[styles.desc, { color: colors['muted-foreground'] }]} numberOfLines={2}>
              {item.description}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={styles.cardRight}>
        <View style={[styles.badge, { backgroundColor: item.is_active ? '#10B98120' : '#EF444420' }]}>
          <ThemedText style={[styles.badgeText, { color: item.is_active ? '#10B981' : '#EF4444' }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </ThemedText>
        </View>
        <View style={styles.actions}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.LOCATIONS} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: ACCENT + '20' }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={15} color={ACCENT} />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.LOCATIONS} actionConstant="delete">
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={15} color="#EF4444" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>
    </View>
  );

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.LOCATIONS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.centered}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>You don't have permission to view locations</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Locations</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
              {filteredLocations.length} location{filteredLocations.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.LOCATIONS} actionConstant="create">
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: ACCENT }]}
              onPress={() => { resetForm(); setIsModalVisible(true); }}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={18} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search locations..."
            placeholderTextColor={colors['muted-foreground']}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close" size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List */}
        <FlatList
          data={filteredLocations}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={ACCENT} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="location-outline" size={56} color={colors['muted-foreground']} />
              <ThemedText style={styles.emptyTitle}>No Locations Found</ThemedText>
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                {searchQuery ? 'Try adjusting your search' : 'Add your first location to get started'}
              </ThemedText>
            </View>
          }
        />

        {/* Create/Edit Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title" style={styles.modalTitle}>
                  {editingItem ? 'Edit Location' : 'Add Location'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter location name"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.name}
                    onChangeText={text => setFormData(p => ({ ...p, name: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Description</ThemedText>
                  <TextInput
                    style={[styles.textarea, { color: colors.foreground, borderColor: colors.border }]}
                    placeholder="Enter description (optional)"
                    placeholderTextColor={colors['muted-foreground']}
                    value={formData.description}
                    onChangeText={text => setFormData(p => ({ ...p, description: text }))}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}
                >
                  <Ionicons
                    name={formData.is_active ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={ACCENT}
                  />
                  <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors['muted-foreground'] + '30' }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: ACCENT }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <ThemedText style={styles.btnText}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { marginRight: 12 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  list: { paddingBottom: 24 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  sno: { fontSize: 13, fontWeight: '600', width: 22 },
  name: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 12, lineHeight: 17 },
  cardRight: { alignItems: 'flex-end', gap: 8, marginLeft: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48, gap: 8 },
  accessDeniedText: { fontSize: 15, textAlign: 'center', marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 20 },
  modalBody: { padding: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 15, fontWeight: '500', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  textarea: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkboxLabel: { fontSize: 15 },
  modalFooter: {
    flexDirection: 'row', gap: 12, padding: 20,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '600', fontSize: 15 },
});
