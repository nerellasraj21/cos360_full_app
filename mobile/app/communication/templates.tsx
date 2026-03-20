import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
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
import { useTheme } from '@/contexts';
import { communicationApi, CommunicationTemplate } from '@/src/api/communication';

const CHANNEL_COLORS: Record<string, string> = {
  sms: '#10B981',
  email: '#3B82F6',
  push: '#8B5CF6',
};

export default function TemplatesScreen() {
  const { colors, theme } = useTheme();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null);
  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: '',
    channel: 'sms' as 'sms' | 'email' | 'push',
  });

  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';

  const { data: templates } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => communicationApi.getTemplates(),
  });

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
    setForm({ name: t.name, subject: t.subject, body: t.body, channel: t.channel });
    setShowModal(true);
  };

  const handleDelete = (t: CommunicationTemplate) => {
    Alert.alert('Delete Template', `Delete "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(t.id),
      },
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

  return (
    <AppLayout title="Message Templates">
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
              <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>
                No templates yet
              </Text>
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
                    <Text
                      style={[
                        styles.channelBadgeText,
                        { color: CHANNEL_COLORS[item.channel] ?? '#888' },
                      ]}
                    >
                      {item.channel.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.cardBody, { color: colors['muted-foreground'] }]}
                  numberOfLines={2}
                >
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
                      onChangeText={(t) => setForm((f) => ({ ...f, [field]: t }))}
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
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowModal(false)}
                >
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
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 4 },
  textarea: { height: 110, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
});
