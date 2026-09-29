import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { AppLayout } from '@/components';
import { useAcademicYear, useAuth, useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { DatePickerModal, formatDate } from '@/components/ui/date-picker-modal';
import { apiClient } from '@/src/api';
import { getClientSchema, getValidAccessToken } from '../../services/authUtils';
import {
  feeCollectionApi,
  feeReceiptsApi,
  feeTransactionsApi,
  FeeReceiptResponse,
} from '@/src/api/fees';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const INDIGO = '#556ee6';

const formatINR = (amount: number | string | null | undefined) =>
  '₹' + Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

function FeeReceiptsScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role, selectedStudent, availableStudents } = useAuth();
  const { activeAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const muted = colors['muted-foreground'] as string;

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
  const isAdmin = !isStudent && !isParent;

  // Search filters (client-side over the loaded list)
  const [fReceiptNo, setFReceiptNo] = useState('');
  const [fStudent, setFStudent] = useState('');
  const [fDateFrom, setFDateFrom] = useState('');
  const [fDateTo, setFDateTo] = useState('');
  const [datePicker, setDatePicker] = useState<null | 'from' | 'to'>(null);

  // Detail / generate modals
  const [detail, setDetail] = useState<FeeReceiptResponse | null>(null);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [content, setContent] = useState<any | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState('');

  // Student's own receipts (fee_receipts:list_own) and parent's "related"
  // scope (fee_receipts:list_related) are two different endpoints — a parent
  // has no list_own grant, so getMyReceipts() 403s for that role. Each
  // resolves server-side to every linked/own record in one list; for a
  // parent that's every child combined, filtered down below to whichever
  // child is active in the header switcher.
  const { data: allReceipts = [], isLoading, error, refetch } = useQuery({
    queryKey: isStudent ? ['feeMyReceipts'] : isParent ? ['feeMyChildrenReceipts'] : ['feeReceipts'],
    queryFn: isStudent
      ? () => feeReceiptsApi.getMyReceipts()
      : isParent
      ? () => feeReceiptsApi.getMyChildrenReceipts()
      : feeReceiptsApi.getFeeReceipts,
  });

  const receipts = isParent
    ? (allReceipts as FeeReceiptResponse[]).filter((r) => r.student_admission_num === selectedStudent?.admission_number)
    : allReceipts;

  // Completed transactions without a receipt (for Generate)
  const { data: transactions = [] } = useQuery({
    queryKey: ['feeTxForReceipt', activeAcademicYearId],
    queryFn: () => feeTransactionsApi.getFeeTransactions(activeAcademicYearId ?? undefined),
    enabled: isAdmin && showGenerate,
  });

  const generateMutation = useMutation({
    mutationFn: (txId: string) => feeReceiptsApi.generateFeeReceipt(txId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['feeTxForReceipt'] });
      setShowGenerate(false);
      setSelectedTxId('');
      showSuccess('Receipt Generated', 'Receipt generated successfully');
    },
    onError: () => showError('Error', 'Failed to generate receipt'),
  });

  const reprintMutation = useMutation({
    mutationFn: (id: string) => feeReceiptsApi.reprintFeeReceipt(id),
    onSuccess: () => {
      showSuccess('Reprint Requested', 'Receipt reprint requested successfully');
      queryClient.invalidateQueries({ queryKey: ['feeReceipts'] });
      queryClient.invalidateQueries({ queryKey: ['feeMyReceipts'] });
    },
    onError: () => showError('Error', 'Failed to reprint receipt'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => feeReceiptsApi.verifyFeeReceipt(id),
    onSuccess: (res) => setVerifyResult(res),
    onError: () => showError('Error', 'Failed to verify receipt'),
  });

  const contentMutation = useMutation({
    mutationFn: (id: string) => feeReceiptsApi.getFeeReceiptContent(id),
    onSuccess: (res) => setContent(res),
    onError: () => showError('Error', 'Failed to load receipt content'),
  });

  const openDetail = (r: FeeReceiptResponse) => {
    setVerifyResult(null);
    setContent(null);
    setDetail(r);
  };

  // ── Receipt PDF download (web: blob; native: FileSystem + Sharing) ───────────
  const [downloadingRowId, setDownloadingRowId] = useState<string | null>(null);

  const downloadReceipt = async (receiptId: string) => {
    setDownloadingRowId(receiptId);
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
      setDownloadingRowId(null);
    }
  };

  // ── Client-side filtering ────────────────────────────────────────────────────
  const filtered = (receipts as FeeReceiptResponse[]).filter((r) => {
    const genAt = r.generated_at || r.issued_date || r.created_at;
    if (fReceiptNo && !r.receipt_number?.toLowerCase().includes(fReceiptNo.toLowerCase())) return false;
    if (fStudent) {
      const hay = `${r.student_name ?? ''} ${r.student_admission_num ?? ''} ${r.transaction_id ?? ''}`.toLowerCase();
      if (!hay.includes(fStudent.toLowerCase())) return false;
    }
    if (fDateFrom && genAt && new Date(genAt) < new Date(fDateFrom + 'T00:00:00')) return false;
    if (fDateTo && genAt && new Date(genAt) > new Date(fDateTo + 'T23:59:59')) return false;
    return true;
  });

  const txOptions = (transactions as any[])
    .filter((t) => (t.status ? String(t.status).toLowerCase() === 'completed' : true) && !t.receipt_generated)
    .map((t) => ({
      label: `${t.transaction_number || t.id} • ${t.student_admission_num || ''} • ${formatINR(t.total_amount)}`,
      value: t.id,
    }));

  const pageTitle = isParent
    ? `My Receipts${selectedStudent ? ` — ${selectedStudent.name ?? ''}` : ''}`
    : isStudent
    ? 'My Receipts'
    : 'Fee Receipt Management';

  if (isParent && availableStudents.length > 0 && !selectedStudent) {
    return (
      <AppLayout title="Fee Receipts">
        <View style={styles.center}>
          <Ionicons name="person-outline" size={40} color={colors['muted-foreground']} />
          <Text style={[styles.emptySub, { color: colors['muted-foreground'] }]}>No child selected.</Text>
          <TouchableOpacity onPress={() => router.push('/parents/select-child' as any)}>
            <Text style={{ color: INDIGO, fontWeight: '600' }}>Select a child</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Fee Receipts">
        <View style={styles.center}><ActivityIndicator color={INDIGO} size="large" /></View>
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>{pageTitle}</Text>
            <Text style={[styles.pageSub, { color: muted }]}>
              Generate, view, and manage fee receipts with integrity verification
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity style={[styles.generateBtn, { backgroundColor: INDIGO }]} onPress={() => setShowGenerate(true)}>
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.generateText}>Generate</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search & Management */}
        {isAdmin && (
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="search" size={16} color={muted} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Search & Management</Text>
            </View>
            <Text style={[styles.label, { color: muted }]}>Receipt Number</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol }]}
              placeholder="Search by receipt number"
              placeholderTextColor={muted}
              value={fReceiptNo}
              onChangeText={setFReceiptNo}
            />
            <Text style={[styles.label, { color: muted }]}>Student (name / admission)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol }]}
              placeholder="Filter by student"
              placeholderTextColor={muted}
              value={fStudent}
              onChangeText={setFStudent}
            />
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: muted }]}>Date From</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput, { backgroundColor: colors.background as string, borderColor: borderCol }]}
                  onPress={() => setDatePicker('from')}
                >
                  <Ionicons name="calendar-outline" size={15} color={muted} />
                  <Text style={{ color: fDateFrom ? colors.foreground : muted, fontSize: 13 }}>{fDateFrom || 'Any'}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: muted }]}>Date To</Text>
                <TouchableOpacity
                  style={[styles.input, styles.dateInput, { backgroundColor: colors.background as string, borderColor: borderCol }]}
                  onPress={() => setDatePicker('to')}
                >
                  <Ionicons name="calendar-outline" size={15} color={muted} />
                  <Text style={{ color: fDateTo ? colors.foreground : muted, fontSize: 13 }}>{fDateTo || 'Any'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {(fReceiptNo || fStudent || fDateFrom || fDateTo) ? (
              <TouchableOpacity
                style={styles.clearFilters}
                onPress={() => { setFReceiptNo(''); setFStudent(''); setFDateFrom(''); setFDateTo(''); }}
              >
                <Ionicons name="close-circle" size={14} color={muted} />
                <Text style={{ color: muted, fontSize: 12, fontWeight: '600' }}>Clear filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Select Receipt + Receipt Details (matches web) */}
        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 8 }]}>Select Receipt</Text>
          <CustomDropdown
            data={(receipts as FeeReceiptResponse[]).map((r) => ({
              label: `${r.receipt_number}${r.student_name ? ` - ${r.student_name}` : ''}`,
              value: r.id,
            }))}
            value={detail?.id ?? ''}
            onChange={(v) => {
              const r = (receipts as FeeReceiptResponse[]).find((x) => x.id === v);
              if (r) openDetail(r);
            }}
            placeholder="Choose a receipt..."
            search
            mode="default"
            maxHeight={260}
          />

          {/* Action buttons under the dropdown (web parity) */}
          {detail && (
            <View style={styles.actionStack}>
              <TouchableOpacity style={[styles.actionBtnFull, { borderColor: borderCol, backgroundColor: colors.background as string }]} onPress={() => contentMutation.mutate(detail.id)} disabled={contentMutation.isPending}>
                <Ionicons name="eye-outline" size={16} color={colors.foreground} />
                <Text style={[styles.actionTxt, { color: colors.foreground }]}>{contentMutation.isPending ? 'Loading...' : 'View Content'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtnFull, { borderColor: borderCol, backgroundColor: colors.background as string }]} onPress={() => verifyMutation.mutate(detail.id)} disabled={verifyMutation.isPending}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.foreground} />
                <Text style={[styles.actionTxt, { color: colors.foreground }]}>{verifyMutation.isPending ? 'Verifying...' : 'Verify Integrity'}</Text>
              </TouchableOpacity>
              {isAdmin && (
                <TouchableOpacity style={[styles.actionBtnFull, { borderColor: borderCol, backgroundColor: colors.background as string }]} onPress={() => reprintMutation.mutate(detail.id)} disabled={reprintMutation.isPending}>
                  <Ionicons name="print-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.actionTxt, { color: colors.foreground }]}>{reprintMutation.isPending ? 'Printing...' : 'Reprint Receipt'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtnFull, { borderColor: INDIGO, backgroundColor: INDIGO }]} onPress={() => downloadReceipt(detail.id)}>
                <Ionicons name="download-outline" size={16} color="white" />
                <Text style={[styles.actionTxt, { color: 'white' }]}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.detailHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Receipt Details</Text>
            {detail ? (
              <TouchableOpacity onPress={() => setDetail(null)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={20} color={muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {detail ? (
            <View>
              <DetailRow label="Receipt Number" value={detail.receipt_number} colors={colors} />
              <DetailRow label="Status" value={detail.is_reprinted ? `Reprinted (${detail.reprint_count ?? 0})` : 'Original'} colors={colors} />
              {detail.student_name ? <DetailRow label="Student" value={`${detail.student_name}${detail.student_admission_num ? ` (${detail.student_admission_num})` : ''}`} colors={colors} /> : null}
              {detail.academic_year ? <DetailRow label="Academic Year" value={detail.academic_year} colors={colors} /> : null}
              {detail.class_section ? <DetailRow label="Class & Section" value={detail.class_section} colors={colors} /> : null}
              <DetailRow label="Generated At" value={fmtDate(detail.generated_at || detail.issued_date || detail.created_at)} colors={colors} />
              {detail.issued_by ? <DetailRow label="Issued By" value={detail.issued_by} colors={colors} /> : null}
              {(detail.remarks || detail.notes) ? <DetailRow label="Remarks" value={(detail.remarks || detail.notes) as string} colors={colors} /> : null}

              {/* Verify result */}
              {verifyResult && (
                <View style={[styles.verifyBox, { backgroundColor: (verifyResult.is_valid ?? verifyResult.verified) ? '#10B98115' : '#EF444415', borderColor: (verifyResult.is_valid ?? verifyResult.verified) ? '#10B981' : '#EF4444' }]}>
                  <Ionicons name={(verifyResult.is_valid ?? verifyResult.verified) ? 'shield-checkmark' : 'shield'} size={20} color={(verifyResult.is_valid ?? verifyResult.verified) ? '#10B981' : '#EF4444'} />
                  <Text style={{ color: (verifyResult.is_valid ?? verifyResult.verified) ? '#10B981' : '#EF4444', fontWeight: '600', fontSize: 13, flex: 1 }}>
                    {(verifyResult.is_valid ?? verifyResult.verified) ? 'Receipt is valid and untampered' : 'Receipt integrity compromised'}
                  </Text>
                </View>
              )}

              {/* Content */}
              {content && (
                <View style={[styles.contentBox, { borderColor: borderCol }]}>
                  <Text style={[styles.contentTitle, { color: colors.foreground }]}>Receipt Content</Text>
                  {content.transaction_number ? <DetailRow label="Transaction" value={content.transaction_number} colors={colors} /> : null}
                  {content.payment_method ? <DetailRow label="Payment Method" value={String(content.payment_method).toUpperCase()} colors={colors} /> : null}
                  {content.payment_reference ? <DetailRow label="Reference" value={content.payment_reference} colors={colors} /> : null}
                  {content.total_amount != null ? <DetailRow label="Total" value={formatINR(content.total_amount)} colors={colors} /> : null}
                  {content.collected_by_user ? <DetailRow label="Collected By" value={`${content.collected_by_user}${content.collected_by_designation ? ` (${content.collected_by_designation})` : ''}`} colors={colors} /> : null}
                  {Array.isArray(content.receipt_items) && content.receipt_items.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <View style={styles.breakdownHead}>
                        <Text style={[styles.breakdownHeadTxt, { color: muted, flex: 1 }]}>Fee Type / Term</Text>
                        <Text style={[styles.breakdownHeadTxt, { color: muted }]}>Amount</Text>
                      </View>
                      {content.receipt_items.map((it: any, i: number) => (
                        <View key={i} style={styles.contentItemRow}>
                          <Text style={{ color: colors.foreground, fontSize: 12, flex: 1 }} numberOfLines={1}>
                            {it.fee_type_name}{it.fee_term_name ? ` · ${it.fee_term_name}` : ''}
                          </Text>
                          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600' }}>{formatINR(it.amount_paid)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Ionicons name="document-text-outline" size={40} color={muted} />
              <Text style={[styles.emptySub, { color: muted, marginTop: 8 }]}>Select a receipt to view details</Text>
            </View>
          )}
        </View>

        {/* Recent Receipts */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8, marginBottom: 8 }]}>
          Recent Receipts ({filtered.length})
        </Text>
        {filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={muted} />
            <Text style={[styles.emptySub, { color: muted }]}>No receipts found</Text>
          </View>
        ) : (
          filtered.map((r, idx) => {
            const reprinted = !!r.is_reprinted;
            const count = Number(r.reprint_count) || 0;
            return (
              <View key={r.id} style={[styles.receiptCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.snoBox, { backgroundColor: INDIGO + '18' }]}>
                  <Text style={{ color: INDIGO, fontWeight: '700', fontSize: 12 }}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.receiptNum, { color: colors.foreground }]} numberOfLines={1}>{r.receipt_number}</Text>
                  {r.student_name ? (
                    <Text style={[styles.receiptSub, { color: colors.foreground }]} numberOfLines={1}>
                      {r.student_name}{r.student_admission_num ? ` · ${r.student_admission_num}` : ''}
                    </Text>
                  ) : null}
                  {/* Web parity (MyReceiptsPage columns: Academic Year, Class/Section) */}
                  {(isStudent || isParent) && (r.academic_year || r.class_section) ? (
                    <Text style={[styles.receiptSub, { color: muted }]} numberOfLines={1}>
                      {[r.academic_year, r.class_section].filter(Boolean).join(' · ')}
                    </Text>
                  ) : null}
                  <Text style={[styles.receiptSub, { color: muted }]}>Generated: {fmtDate(r.generated_at || r.issued_date || r.created_at)}</Text>
                  <View style={styles.statusLine}>
                    <View style={[styles.statusPill, { backgroundColor: reprinted ? '#F59E0B22' : INDIGO + '22' }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: reprinted ? '#D97706' : INDIGO }}>
                        {reprinted ? 'Reprinted' : 'Original'}
                      </Text>
                    </View>
                    {count > 0 ? (
                      <View style={[styles.countPill, { borderColor: borderCol }]}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: muted }}>{count}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={[styles.eyeBtn, { borderColor: borderCol }]} onPress={() => openDetail(r)}
                accessibilityLabel="View">
                    <Ionicons name="eye-outline" size={18} color={INDIGO} />
                  </TouchableOpacity>
                  {/* Web parity (MyReceiptsPage): student/parent get a direct
                      one-tap download instead of having to open the detail
                      panel first. */}
                  {(isStudent || isParent) && (
                    <TouchableOpacity
                      style={[styles.eyeBtn, { borderColor: INDIGO, backgroundColor: INDIGO }]}
                      onPress={() => downloadReceipt(r.id)}
                      disabled={downloadingRowId === r.id}
                      accessibilityLabel="Download"
                    >
                      {downloadingRowId === r.id ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons name="download-outline" size={18} color="white" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Date picker for filters */}
      <DatePickerModal
        visible={datePicker !== null}
        initialDate={(datePicker === 'from' ? fDateFrom : fDateTo) || formatDate(new Date())}
        onConfirm={(d) => {
          if (datePicker === 'from') setFDateFrom(d);
          else if (datePicker === 'to') setFDateTo(d);
          setDatePicker(null);
        }}
        onCancel={() => setDatePicker(null)}
      />

      {/* Generate receipt modal */}
      <Modal visible={showGenerate} animationType="fade" transparent onRequestClose={() => setShowGenerate(false)}>
        <View style={styles.overlayCenter}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Generate New Receipt</Text>
            <Text style={[styles.pageSub, { color: muted, marginBottom: 8 }]}>Select a completed transaction without a receipt.</Text>
            <Text style={[styles.label, { color: muted }]}>Transaction</Text>
            <CustomDropdown
              data={txOptions}
              value={selectedTxId}
              onChange={(v) => setSelectedTxId(v as string)}
              placeholder={txOptions.length ? 'Select transaction' : 'No eligible transactions'}
              search={txOptions.length > 8}
              mode="default"
              maxHeight={260}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.closeBtn, { borderColor: borderCol, flex: 0, paddingHorizontal: 20 }]} onPress={() => setShowGenerate(false)}>
                <Text style={{ color: muted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: INDIGO, opacity: !selectedTxId || generateMutation.isPending ? 0.5 : 1 }]}
                onPress={() => generateMutation.mutate(selectedTxId)}
                disabled={!selectedTxId || generateMutation.isPending}
              >
                <Text style={styles.generateText}>{generateMutation.isPending ? 'Generating...' : 'Generate Receipt'}</Text>
              </TouchableOpacity>
            </View>
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
  center: { justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  errorText: { fontSize: 14, marginTop: 10 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '600' },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  pageSub: { fontSize: 12, lineHeight: 17 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  generateText: { color: 'white', fontWeight: '600', fontSize: 13 },

  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clearFilters: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12 },

  receiptCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  snoBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  receiptNum: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  receiptSub: { fontSize: 12, marginBottom: 1 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  eyeBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  rowActions: { flexDirection: 'row', gap: 8 },
  emptySub: { fontSize: 13, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  overlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalCard: { borderRadius: 20, padding: 22, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },

  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  detailBadge: { alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 12 },
  detailReceiptNum: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)', gap: 12 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  verifyBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 14 },
  contentBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 14 },
  contentTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  breakdownHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.25)' },
  breakdownHeadTxt: { fontSize: 11, fontWeight: '700' },
  contentItemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5 },

  actionStack: { gap: 8, marginTop: 12 },
  actionBtnFull: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1, paddingVertical: 13 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 11, paddingHorizontal: 12, flexGrow: 1, flexBasis: '46%' },
  actionTxt: { fontWeight: '600', fontSize: 13 },
  closeBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function FeeReceiptsScreen() {
  return (
    <ScreenAccessGate
      title="Fee Receipts"
      resources={['fee_receipts', 'fee_transactions']}
      permissions={[
        ['fee_receipts', 'read_own'],
        ['fee_transactions', 'read_own'],
        ['fee_receipts', 'read_related'],
        ['fee_receipts', 'list_related'],
      ]}
      blockRoles={['teacher']}
    >
      <FeeReceiptsScreenContent />
    </ScreenAccessGate>
  );
}
