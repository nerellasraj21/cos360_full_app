import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { feeReceiptsApi, FeeReceiptResponse } from '@/src/api/fees';

const INDIGO = '#556ee6';

export default function FeeReceiptsScreen() {
  const { colors, theme } = useTheme();
  const queryClient = useQueryClient();
  const [detailReceipt, setDetailReceipt] = useState<FeeReceiptResponse | null>(null);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: receipts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['feeReceipts'],
    queryFn: feeReceiptsApi.getFeeReceipts,
  });

  const reprintMutation = useMutation({
    mutationFn: feeReceiptsApi.reprintFeeReceipt,
    onSuccess: () => {
      Alert.alert('Success', 'Receipt reprint requested successfully');
      queryClient.invalidateQueries({ queryKey: ['feeReceipts'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to reprint receipt');
    },
  });

  const statusColor = (notes?: string) => {
    if (!notes) return colors['muted-foreground'];
    return INDIGO;
  };

  const renderReceipt = ({ item }: { item: FeeReceiptResponse }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
      onPress={() => setDetailReceipt(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: INDIGO + '18' }]}>
        <Ionicons name="receipt" size={22} color={INDIGO} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.receiptNum, { color: colors.foreground }]} numberOfLines={1}>
          {item.receipt_number}
        </Text>
        <Text style={[styles.receiptSub, { color: colors['muted-foreground'] }]}>
          Issued: {new Date(item.issued_date).toLocaleDateString()}
        </Text>
        <Text style={[styles.receiptSub, { color: colors['muted-foreground'] }]} numberOfLines={1}>
          By: {item.issued_by}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <AppLayout title="Fee Receipts">
        <View style={styles.center}>
          <ActivityIndicator color={INDIGO} size="large" />
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Receipts">
        <View style={styles.center}>
          <Ionicons name="warning-outline" size={40} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to load receipts</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: INDIGO }]} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Fee Receipts">
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: INDIGO }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIconBox}>
          <Ionicons name="receipt" size={26} color="white" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Fee Receipts</Text>
          <Text style={styles.bannerSub}>View and manage fee payment receipts</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.countText}>{receipts.length}</Text>
        </View>
      </View>

      {receipts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={56} color={colors['muted-foreground']} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No receipts found</Text>
          <Text style={[styles.emptySub, { color: colors['muted-foreground'] }]}>
            Receipts appear here after fee payments are processed
          </Text>
        </View>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={item => item.id}
          renderItem={renderReceipt}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail modal */}
      <Modal
        visible={!!detailReceipt}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailReceipt(null)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Receipt Details</Text>
              <TouchableOpacity onPress={() => setDetailReceipt(null)}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            {detailReceipt && (
              <>
                <View style={[styles.detailBadge, { backgroundColor: INDIGO + '15' }]}>
                  <Ionicons name="receipt" size={32} color={INDIGO} />
                  <Text style={[styles.detailReceiptNum, { color: INDIGO }]}>
                    {detailReceipt.receipt_number}
                  </Text>
                </View>

                <View style={styles.detailRows}>
                  <DetailRow label="Transaction ID" value={detailReceipt.transaction_id} colors={colors} />
                  <DetailRow label="Issued Date" value={new Date(detailReceipt.issued_date).toLocaleDateString()} colors={colors} />
                  <DetailRow label="Issued By" value={detailReceipt.issued_by} colors={colors} />
                  <DetailRow label="Created" value={new Date(detailReceipt.created_at).toLocaleString()} colors={colors} />
                  {detailReceipt.notes && (
                    <DetailRow label="Notes" value={detailReceipt.notes} colors={colors} />
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: INDIGO + '15', borderColor: INDIGO + '40', borderWidth: 1 }]}
                    onPress={() => {
                      setDetailReceipt(null);
                      reprintMutation.mutate(detailReceipt.id);
                    }}
                    disabled={reprintMutation.isPending}
                  >
                    <Ionicons name="print-outline" size={18} color={INDIGO} />
                    <Text style={[styles.actionBtnText, { color: INDIGO }]}>
                      {reprintMutation.isPending ? 'Printing...' : 'Reprint'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: cardBg, borderColor: borderCol, borderWidth: 1 }]}
                    onPress={() => setDetailReceipt(null)}
                  >
                    <Text style={{ color: colors.foreground }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors['muted-foreground'] }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
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
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  countText: { color: 'white', fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  receiptNum: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  receiptSub: { fontSize: 12, marginBottom: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 12, marginTop: 6, textAlign: 'center' },
  errorText: { fontSize: 14, marginTop: 10 },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8,
  },
  retryText: { color: 'white', fontWeight: '600' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  detailBadge: {
    alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  detailReceiptNum: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  detailRows: { marginBottom: 20 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 6,
    borderRadius: 10, paddingVertical: 13,
  },
  actionBtnText: { fontWeight: '600', fontSize: 14 },
});
