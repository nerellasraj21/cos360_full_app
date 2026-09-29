import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';
import { useMyFeeReceipts, useMyChildrenFeeReceipts } from '@/src/api/hooks/fee';
import { apiClient } from '@/src/api';
import { feeCollectionApi, FeeReceiptResponse } from '@/src/api/fees';
import { getClientSchema, getValidAccessToken } from '../../services/authUtils';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const INDIGO = '#556ee6';

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

// Web parity (`MyReceiptsPage`): a plain list of the caller's own receipts
// with a one-tap download — no search/generate/verify tooling, which stays
// on the admin-only `app/fees/receipts.tsx` screen.
function MyReceiptsScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role, selectedStudent, availableStudents } = useAuth();
  const { showError } = useToastContext();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const muted = colors['muted-foreground'] as string;

  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Student's own receipts and parent's "related" scope both resolve
  // server-side — for a parent, /fee/receipts/my-children-receipts returns
  // every linked child's receipts in one list. Filtered down below to
  // whichever child is active in the header switcher, same as My Transactions.
  const mine = useMyFeeReceipts(undefined, !isParent);
  const childrens = useMyChildrenFeeReceipts(undefined, isParent);
  const { data: allReceipts = [], isLoading, error, refetch } = isParent ? childrens : mine;

  const receipts = isParent
    ? allReceipts.filter((r) => r.student_admission_num === selectedStudent?.admission_number)
    : allReceipts;

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadReceipt = async (receiptId: string) => {
    setDownloadingId(receiptId);
    try {
      if (Platform.OS === 'web') {
        const blob = await feeCollectionApi.getReceiptPdf(receiptId);
        const w = globalThis as any;
        const url = w.URL.createObjectURL(blob);
        const a = w.document.createElement('a');
        a.href = url;
        a.download = `receipt_${receiptId}.pdf`;
        w.document.body.appendChild(a);
        a.click();
        a.remove();
        w.URL.revokeObjectURL(url);
        return;
      }
      const token = await getValidAccessToken(false);
      const schema = await getClientSchema();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (schema) headers.cschema = schema;
      const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
      const url = `${baseUrl}/fee/collection/receipts/${receiptId}/pdf`;
      const localUri = FileSystem.documentDirectory + `receipt_${receiptId}.pdf`;
      const result = await FileSystem.downloadAsync(url, localUri, { headers });
      await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' });
    } catch {
      showError('Error', 'Unable to download receipt');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isParent && availableStudents.length > 0 && !selectedStudent) {
    return (
      <AppLayout title="My Receipts">
        <View style={styles.center}>
          <Ionicons name="person-outline" size={40} color={muted} />
          <Text style={[styles.emptySub, { color: muted }]}>No child selected.</Text>
          <TouchableOpacity onPress={() => router.push('/parents/select-child' as any)}>
            <Text style={{ color: INDIGO, fontWeight: '600' }}>Select a child</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="My Receipts">
        <View style={styles.center}><ActivityIndicator color={INDIGO} size="large" /></View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="My Receipts">
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
    <AppLayout title="My Receipts">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>My Receipts</Text>
          <Text style={[styles.pageSub, { color: muted }]}>
            {isParent
              ? selectedStudent
                ? `Fee payment receipts for ${selectedStudent.name ?? ''}`
                : "View and download your children's fee payment receipts"
              : 'View and download your fee payment receipts'}
          </Text>
        </View>

        {receipts.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={muted} />
            <Text style={[styles.emptySub, { color: muted }]}>No receipts yet</Text>
          </View>
        ) : (
          (receipts as FeeReceiptResponse[]).map((r, idx) => (
            <View key={r.id} style={[styles.receiptCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.snoBox, { backgroundColor: INDIGO + '18' }]}>
                <Text style={{ color: INDIGO, fontWeight: '700', fontSize: 12 }}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.receiptNum, { color: colors.foreground }]} numberOfLines={1}>{r.receipt_number}</Text>
                {(r.academic_year || r.class_section) ? (
                  <Text style={[styles.receiptSub, { color: muted }]} numberOfLines={1}>
                    {[r.academic_year, r.class_section].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                <Text style={[styles.receiptSub, { color: muted }]}>
                  Generated: {fmtDate(r.generated_at || r.issued_date || r.created_at)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.downloadBtn, { borderColor: INDIGO, backgroundColor: INDIGO }]}
                onPress={() => downloadReceipt(r.id)}
                disabled={downloadingId === r.id}
                accessibilityLabel="Download"
              >
                {downloadingId === r.id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  errorText: { fontSize: 14, marginTop: 10 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center' },

  headerRow: { marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  pageSub: { fontSize: 12, lineHeight: 17 },

  receiptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  snoBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  receiptNum: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  receiptSub: { fontSize: 12, marginTop: 2 },
  downloadBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});

// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function MyReceiptsScreen() {
  return (
    <ScreenAccessGate
      title="My Receipts"
      permissions={[
        ['fee_receipts', 'read_own'],
        ['fee_receipts', 'list_own'],
        ['fee_receipts', 'read_related'],
        ['fee_receipts', 'list_related'],
      ]}
      blockRoles={['teacher']}
    >
      <MyReceiptsScreenContent />
    </ScreenAccessGate>
  );
}
