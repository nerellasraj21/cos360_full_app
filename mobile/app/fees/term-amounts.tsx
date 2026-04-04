import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useAcademicYear, useTheme } from '@/contexts';
import {
  feeClassMappingsApi,
  feeClassMappingTermAmountsApi,
  FeeClassMappingResponse,
} from '@/src/api/fees';
import { FeeClassMappingTermAmount } from '@/src/types/fees';
import { useToastContext } from '@/components/ToastProvider';

const CYAN = '#06B6D4';

export default function FeeTermAmountsScreen() {
  const { colors, theme } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const [editingMapping, setEditingMapping] = useState<FeeClassMappingResponse | null>(null);
  const [termAmountDrafts, setTermAmountDrafts] = useState<{ id?: string; fee_term_date_id: string; amount: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const { data: mappings = [], isLoading, error } = useQuery({
    queryKey: ['feeClassMappings', activeAcademicYearId],
    queryFn: () => feeClassMappingsApi.getFeeClassMappings(activeAcademicYearId ?? undefined),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeClassMappingTermAmount> }) =>
      feeClassMappingTermAmountsApi.updateTermAmount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
    },
    onError: () => {
      showError('Error', 'Failed to update term amount');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FeeClassMappingTermAmount) =>
      feeClassMappingTermAmountsApi.createTermAmount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
    },
    onError: () => {
      showError('Error', 'Failed to create term amount');
    },
  });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const mappingsWithTerms = mappings.filter(m => (m.term_amounts_count ?? 0) > 0 || (m.term_amounts && m.term_amounts.length > 0));

  const openEdit = (mapping: FeeClassMappingResponse) => {
    setEditingMapping(mapping);
    const drafts = (mapping.term_amounts || []).map((ta: any) => ({
      id: ta.id,
      fee_term_date_id: ta.fee_term_date_id,
      amount: String(ta.amount ?? ''),
    }));
    setTermAmountDrafts(drafts);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!editingMapping) return;
    let hasError = false;

    for (const draft of termAmountDrafts) {
      const amount = parseFloat(draft.amount);
      if (isNaN(amount) || amount < 0) {
        showError('Error', 'All amounts must be valid numbers');
        return;
      }
      if (draft.id) {
        try {
          await feeClassMappingTermAmountsApi.updateTermAmount(draft.id, { amount });
        } catch {
          hasError = true;
        }
      } else {
        try {
          await feeClassMappingTermAmountsApi.createTermAmount({
            fee_term_date_id: draft.fee_term_date_id,
            amount,
          });
        } catch {
          hasError = true;
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['feeClassMappings'] });
    setModalVisible(false);
    if (hasError) {
      showError('Partial Success', 'Some term amounts could not be updated');
    } else {
      showSuccess('Term Amounts Saved', 'Term amounts updated successfully');
    }
  };

  const renderMapping = ({ item }: { item: FeeClassMappingResponse }) => {
    const termAmounts = item.term_amounts || [];
    const total = termAmounts.reduce((sum: number, ta: any) => sum + parseFloat(ta.amount ?? '0'), 0);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
        onPress={() => openEdit(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.cardIconBox, { backgroundColor: CYAN + '18' }]}>
          <Ionicons name="cash-outline" size={22} color={CYAN} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.class_name ?? 'Class'} — {item.fee_type_name ?? 'Fee Type'}
          </Text>
          <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
            {termAmounts.length} term{termAmounts.length !== 1 ? 's' : ''} · Total ₹{total.toFixed(0)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <AppLayout title="Fee Term Amounts">
        <View style={styles.center}>
          <ActivityIndicator color={CYAN} size="large" />
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Term Amounts">
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to load data</Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Fee Term Amounts">
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: CYAN }]}>
        <View style={styles.bannerDecor} />
        <View style={[styles.bannerIconBox]}>
          <Ionicons name="cash-outline" size={26} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Fee Term Amounts</Text>
          <Text style={styles.bannerSub}>Manage fee term amount configurations per class</Text>
        </View>
      </View>

      {mappingsWithTerms.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cash-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            No fee mappings with term amounts found
          </Text>
          <Text style={[styles.emptyHint, { color: colors['muted-foreground'] }]}>
            Add term amounts via Fee Mappings screen
          </Text>
        </View>
      ) : (
        <FlatList
          data={mappingsWithTerms}
          keyExtractor={item => item.id}
          renderItem={renderMapping}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Edit modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                Edit Term Amounts
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            {editingMapping && (
              <Text style={[styles.modalSub, { color: colors['muted-foreground'] }]}>
                {editingMapping.class_name} — {editingMapping.fee_type_name}
              </Text>
            )}

            <ScrollView style={styles.modalScroll}>
              {termAmountDrafts.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors['muted-foreground'], textAlign: 'center', marginTop: 24 }]}>
                  No term dates configured for this mapping
                </Text>
              ) : (
                termAmountDrafts.map((draft, idx) => (
                  <View key={draft.fee_term_date_id} style={styles.amountRow}>
                    <Text style={[styles.amountLabel, { color: colors.foreground }]}>
                      Term {idx + 1}
                    </Text>
                    <TextInput
                      style={[styles.amountInput, {
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.border,
                      }]}
                      value={draft.amount}
                      onChangeText={text => {
                        setTermAmountDrafts(prev => prev.map((d, i) => i === idx ? { ...d, amount: text } : d));
                      }}
                      placeholder="0.00"
                      placeholderTextColor={colors['muted-foreground']}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: CYAN }]}
                onPress={handleSave}
                disabled={termAmountDrafts.length === 0}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 16, borderRadius: 18, padding: 18, overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -30, right: -30,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardIconBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardSub: { fontSize: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptyHint: { fontSize: 12, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, marginTop: 10 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  modalSub: { fontSize: 13, marginBottom: 16 },
  modalScroll: { maxHeight: 320, marginBottom: 16 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  amountLabel: { width: 70, fontSize: 13, fontWeight: '600' },
  amountInput: {
    flex: 1, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  modalFooter: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtn: {
    flex: 1, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
