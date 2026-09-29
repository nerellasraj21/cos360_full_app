import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { AppLayout } from '@/components';
import { useAcademicYear, useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { apiClient } from '@/src/api';
import { getClientSchema, getValidAccessToken } from '../../../services/authUtils';
import {
  feeCollectionApi,
  feeConcessionsApi,
  feeOldFeesApi,
  BulkConcessionRequest,
  ConcessionItemCreate,
  ConcessionHistoryItem,
  ConcessionUpdatePayload,
  TermsDueItem,
} from '@/src/api/fees';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

// INR currency formatter
const formatINR = (amount: number | string | null | undefined) =>
  '₹' + Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type DetailTab = 'summary' | 'payment' | 'concessions' | 'old-fees' | 'history';

type ApproverRole = ConcessionItemCreate['approved_by'];
type ConcessionEdit = { amount: string; reason: string; approver: ApproverRole | '' };

const APPROVERS: { label: string; value: ApproverRole }[] = [
  { label: 'Owner', value: 'owner' },
  { label: 'Principal', value: 'principal' },
  { label: 'Management', value: 'management' },
  { label: 'Correspondent', value: 'correspondent' },
];

// Editing a single existing Concession History record: its due_amount already
// has that record's amount applied. So the most that one record can be set to
// — without pushing due amount negative, i.e. "refunding" money already
// collected — is the current due plus what's already applied for that fee
// type (matches the web app's ConcessionTab).
function maxConcessionFor(dueAmount: number, alreadyAppliedAmount: number): number {
  return dueAmount + alreadyAppliedAmount;
}

type PaymentMethod = 'cash' | 'upi' | 'cheque' | 'bank_transfer' | 'dd';

const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Cheque', value: 'cheque' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Demand Draft', value: 'dd' },
];

// Matches web's FeePaymentTab receipt-number default (RCP-YYMMDD-HHMM)
function generateReceiptNumber(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
  return `RCP-${yy}${mm}${dd}-${seq}`;
}

function StudentFeeDetailScreenContent() {
  const params = useLocalSearchParams<{
    studentId: string;
    name?: string;
    admission?: string;
    className?: string;
    section?: string;
  }>();
  const studentId = params.studentId;
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { activeAcademicYearId, academicYears } = useAcademicYear();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { checkPermission } = useMobilePermission();
  const canCreateConcession = checkPermission('fee_concessions', 'create');
  const canUpdateConcession = checkPermission('fee_concessions', 'update');
  const canDeleteConcession = checkPermission('fee_concessions', 'delete');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [activeTab, setActiveTab] = useState<DetailTab>('summary');

  // "Payment Up To" installment date (Fee Payment tab) — drives the fee-heads query
  const [paymentAsOfDate, setPaymentAsOfDate] = useState('');

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'cash' as PaymentMethod,
    remarks: '',
    upi_reference: '',
    bank_reference: '',
    cheque_number: '',
    cheque_bank: '',
    cheque_date: '',
    send_sms: true,
    print_duplicate: false,
  });
  const [receiptNumber, setReceiptNumber] = useState(generateReceiptNumber());
  // Received amount per fee type on the Fee Payment tab — blank by default, keyed by fee_type_id
  const [receivedAmounts, setReceivedAmounts] = useState<Record<string, string>>({});
  const [paymentSuccess, setPaymentSuccess] = useState<{
    receipt_number?: string;
    receipt_id?: string;
    transaction_number?: string;
    amount_paid: number;
    payment_method?: string;
    sms_status?: string;
  } | null>(null);

  // Concession edits — keyed by fee_type_id
  const [concessionEdits, setConcessionEdits] = useState<Record<string, ConcessionEdit>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  // Editing/revoking a single existing Concession History record
  const [editConcessionItem, setEditConcessionItem] = useState<ConcessionHistoryItem | null>(null);
  const [editConcessionForm, setEditConcessionForm] = useState<{ amount: string; reason: string; approver: ApproverRole | '' }>({
    amount: '',
    reason: '',
    approver: '',
  });
  const [deleteConcessionId, setDeleteConcessionId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(true);

  const setEdit = (feeTypeId: string, patch: Partial<ConcessionEdit>) =>
    setConcessionEdits((prev) => {
      const cur: ConcessionEdit = prev[feeTypeId] ?? { amount: '', reason: '', approver: '' };
      return { ...prev, [feeTypeId]: { ...cur, ...patch } };
    });

  // Never let a new concession entry push the due amount below zero — cap
  // it at what's still actually owed on that fee type (due_amount already
  // nets out any concession(s) already applied).
  const setConcessionAmount = (feeTypeId: string, text: string, dueAmount: number) => {
    const numeric = parseFloat(text);
    if (!isNaN(numeric) && numeric > dueAmount) {
      showError('Amount too high', `Concession cannot exceed the due amount of ${formatINR(dueAmount)}.`);
      setEdit(feeTypeId, { amount: String(dueAmount) });
      return;
    }
    setEdit(feeTypeId, { amount: text });
  };

  // Old fees modals
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualForm, setManualForm] = useState({ amount: '', description: '' });
  const [showCarryForward, setShowCarryForward] = useState(false);
  const [carryForwardSource, setCarryForwardSource] = useState('');

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['fee-summary', studentId, activeAcademicYearId],
    queryFn: () =>
      feeCollectionApi.getSummary(studentId, {
        academic_year_id: activeAcademicYearId ?? undefined,
      }),
    enabled: !!studentId,
  });

  // Per-fee-type concession rows (same endpoint the web uses for its concession table).
  // Also needed on the Summary tab to apply concessions to the term-wise installment schedule.
  const { data: concessionRows = [], isLoading: concessionLoading } = useQuery({
    queryKey: ['fee-concession-summary', studentId, activeAcademicYearId],
    queryFn: () =>
      feeConcessionsApi.getByStudent(studentId, {
        academic_year_id: activeAcademicYearId ?? undefined,
      }),
    enabled: !!studentId && (activeTab === 'concessions' || activeTab === 'summary' || activeTab === 'payment'),
  });

  // All term-wise installment dates for this student (far-future sentinel date), used to build
  // the "Term-wise Installment Schedule" on the Fee Summary tab — mirrors the web app.
  const { data: allTermsDue, isLoading: allTermsLoading } = useQuery({
    queryKey: ['fee-terms-due-all', studentId, activeAcademicYearId],
    queryFn: () =>
      feeCollectionApi.getTermsDue(studentId, {
        academic_year_id: activeAcademicYearId ?? undefined,
        as_of_date: '2099-12-31',
      }),
    enabled: !!studentId && (activeTab === 'summary' || activeTab === 'payment'),
  });

  // Fee heads due as of the selected "Payment Up To" installment date (Fee Payment tab)
  const { data: paymentTermsDue, isFetching: paymentTermsFetching } = useQuery({
    queryKey: ['fee-terms-due', studentId, activeAcademicYearId, paymentAsOfDate],
    queryFn: () =>
      feeCollectionApi.getTermsDue(studentId, {
        academic_year_id: activeAcademicYearId ?? undefined,
        as_of_date: paymentAsOfDate,
      }),
    enabled: !!studentId && activeTab === 'payment' && !!paymentAsOfDate,
  });

  const { data: concessionHistory } = useQuery({
    queryKey: ['fee-concession-history', studentId, activeAcademicYearId],
    queryFn: () =>
      feeConcessionsApi.getHistory(studentId, {
        academic_year_id: activeAcademicYearId ?? undefined,
      }),
    enabled: !!studentId && activeTab === 'concessions' && historyOpen,
  });

  const { data: oldFees, isLoading: oldFeesLoading } = useQuery({
    queryKey: ['old-fees', studentId, activeAcademicYearId],
    queryFn: () =>
      feeOldFeesApi.getOldFeesByStudent(studentId, {
        current_year_id: activeAcademicYearId ?? undefined,
      }),
    enabled: !!studentId && activeTab === 'old-fees',
  });

  const { data: feeHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['fee-history', studentId, activeAcademicYearId],
    queryFn: () =>
      feeCollectionApi.getFeeHistory(studentId, {
        academic_year_id: activeAcademicYearId ?? undefined,
      }),
    enabled: !!studentId && activeTab === 'history',
  });

  // Group term-wise installments by fee type, applying concession FIFO (earliest installment
  // first) — mirrors web's FeeSummaryTab "Term-wise Installment Schedule".
  const feeTypeSchedule = useMemo(() => {
    if (!allTermsDue) return [];
    const all: TermsDueItem[] = [
      ...(allTermsDue.overdue_terms ?? []),
      ...(allTermsDue.current_month_terms ?? []),
    ].sort((a, b) => a.due_date.localeCompare(b.due_date));

    // Build concession map: fee_type_id -> total concession amount
    const concessionMap = new Map<string, number>();
    (concessionRows as any[]).forEach((c) => {
      const amt = Number(c.concession_amount) || 0;
      if (amt > 0) concessionMap.set(c.fee_type_id, amt);
    });

    const map = new Map<
      string,
      { name: string; items: (TermsDueItem & { inst_no: number; adjusted_pending: number })[] }
    >();
    all.forEach((item) => {
      if (!map.has(item.fee_type_id)) {
        map.set(item.fee_type_id, { name: item.fee_type_name, items: [] });
      }
      const group = map.get(item.fee_type_id)!;
      group.items.push({ ...item, inst_no: group.items.length + 1, adjusted_pending: item.pending_amount });
    });

    // Apply concession FIFO: reduce pending from earliest installment first
    map.forEach((group, fee_type_id) => {
      let remaining = concessionMap.get(fee_type_id) ?? 0;
      if (remaining <= 0) return;
      for (const item of group.items) {
        const absorb = Math.min(item.adjusted_pending, remaining);
        item.adjusted_pending -= absorb;
        remaining -= absorb;
        if (remaining <= 0) break;
      }
    });

    return Array.from(map.values());
  }, [allTermsDue, concessionRows]);

  // "Payment Up To" dropdown options — every distinct installment due-date this student has,
  // earliest first (mirrors web's FeePaymentTab installmentOptions).
  const installmentOptions = useMemo(() => {
    if (!allTermsDue) return [];
    const allItems = [
      ...(allTermsDue.overdue_terms ?? []),
      ...(allTermsDue.current_month_terms ?? []),
    ];
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    allItems
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .forEach((item) => {
        if (!seen.has(item.due_date)) {
          seen.add(item.due_date);
          const displayDate = new Date(item.due_date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          options.push({ value: item.due_date, label: `${item.term_name} (${displayDate})` });
        }
      });
    return options;
  }, [allTermsDue]);

  // Fee Heads rows — concession-adjusted pending amount per fee type, up to the selected
  // "Payment Up To" date (mirrors web's FeePaymentTab feeRows).
  const feeRows = useMemo(() => {
    if (!paymentAsOfDate || !paymentTermsDue) return [];
    const all: TermsDueItem[] = [
      ...(paymentTermsDue.overdue_terms ?? []),
      ...(paymentTermsDue.current_month_terms ?? []),
    ];

    const map = new Map<string, { name: string; amount: number }>();
    all.forEach((item) => {
      const ex = map.get(item.fee_type_id);
      if (ex) ex.amount += item.pending_amount;
      else map.set(item.fee_type_id, { name: item.fee_type_name, amount: item.pending_amount });
    });

    (concessionRows as any[]).forEach((c) => {
      const amt = Number(c.concession_amount) || 0;
      const entry = map.get(c.fee_type_id);
      if (entry && amt > 0) entry.amount = Math.max(0, entry.amount - amt);
    });

    const rows: { fee_type_id: string; fee_type_name: string; amount: number }[] = [];
    map.forEach((v, k) => { if (v.amount > 0) rows.push({ fee_type_id: k, fee_type_name: v.name, amount: v.amount }); });
    return rows;
  }, [paymentAsOfDate, paymentTermsDue, concessionRows]);

  // Received amounts reset whenever the fee-heads list changes (new "Payment Up To" date)
  useEffect(() => {
    setReceivedAmounts({});
  }, [feeRows]);

  const totalReceived = feeRows.reduce((s, r) => s + (parseFloat(receivedAmounts[r.fee_type_id] || '0') || 0), 0);

  // ── Mutations ────────────────────────────────────────────────────────────────
  const payMutation = useMutation({
    mutationFn: () => {
      // Carry the per-fee-type amounts the user actually entered through to the API,
      // so payment is applied to the fee types selected — mirrors web's FeePaymentTab.
      const fee_items = feeRows
        .map((row) => ({
          fee_type_id: row.fee_type_id,
          amount: parseFloat(receivedAmounts[row.fee_type_id] || '0') || 0,
        }))
        .filter((item) => item.amount > 0);

      return feeCollectionApi.pay({
        student_id: studentId,
        academic_year_id: activeAcademicYearId ?? '',
        amount_to_pay: totalReceived,
        fee_items,
        payment_method: paymentForm.payment_method,
        receipt_number: receiptNumber,
        remarks: paymentForm.remarks || null,
        upi_reference: paymentForm.upi_reference || undefined,
        bank_reference: paymentForm.bank_reference || undefined,
        cheque_number: paymentForm.cheque_number || undefined,
        cheque_bank: paymentForm.cheque_bank || undefined,
        cheque_date: paymentForm.cheque_date || undefined,
        send_sms: paymentForm.send_sms,
        print_duplicate: paymentForm.print_duplicate,
      });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['fee-summary', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-history', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-terms-due', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-terms-due-all', studentId] });
      const paid = totalReceived;
      setPaymentForm((p) => ({
        ...p,
        remarks: '',
        upi_reference: '',
        bank_reference: '',
        cheque_number: '',
        cheque_bank: '',
        cheque_date: '',
      }));
      setReceivedAmounts({});
      setReceiptNumber(generateReceiptNumber());
      setPaymentSuccess({
        receipt_number: data?.receipt_number,
        receipt_id: data?.receipt_id,
        transaction_number: data?.transaction_number,
        amount_paid: Number(data?.amount_paid) || paid,
        payment_method: data?.payment_method,
        sms_status: data?.sms_status,
      });
    },
    onError: () => showError('Error', 'Failed to record payment'),
  });

  const concessionMutation = useMutation({
    mutationFn: (payload: BulkConcessionRequest) => feeConcessionsApi.bulkCreateConcessions(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-summary', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-concession-summary', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-concession-history', studentId] });
      setConcessionEdits({});
      showSuccess('Concessions Saved', 'Concessions saved successfully');
    },
    onError: () => showError('Error', 'Failed to save concessions'),
  });

  // Concession History doesn't carry the fee type's due amount, so look it up
  // from the current summary (matched by fee type name, same as the web app)
  // to enforce the same "never push due amount negative" cap in the edit dialog.
  const editConcessionSummaryItem = editConcessionItem
    ? (summary?.items ?? []).find((it) => it.fee_type_name === editConcessionItem.fee_type_name)
    : undefined;
  const editConcessionAlreadyApplied = editConcessionSummaryItem
    ? Number((concessionRows as any[]).find((r) => r.fee_type_id === editConcessionSummaryItem.fee_type_id)?.concession_amount) || 0
    : 0;
  const editConcessionMax = editConcessionSummaryItem
    ? maxConcessionFor(Number(editConcessionSummaryItem.due_amount) || 0, editConcessionAlreadyApplied)
    : undefined;

  const updateConcessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConcessionUpdatePayload }) => feeConcessionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-summary', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-concession-summary', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-concession-history', studentId] });
      setEditConcessionItem(null);
      showSuccess('Updated', 'Concession updated successfully');
    },
    onError: () => showError('Error', 'Failed to update concession'),
  });

  const deleteConcessionMutation = useMutation({
    mutationFn: (id: string) => feeConcessionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-summary', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-concession-summary', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-concession-history', studentId] });
      setDeleteConcessionId(null);
      showSuccess('Revoked', 'Concession revoked successfully');
    },
    onError: () => showError('Error', 'Failed to revoke concession'),
  });

  function handleEditConcessionOpen(item: ConcessionHistoryItem) {
    setEditConcessionItem(item);
    setEditConcessionForm({
      amount: String(item.amount ?? ''),
      reason: item.reason ?? '',
      approver: (item.approver as ApproverRole) || '',
    });
  }

  function handleEditConcessionAmountChange(text: string) {
    const numeric = parseFloat(text);
    if (!isNaN(numeric) && editConcessionMax !== undefined && numeric > editConcessionMax) {
      showError('Amount too high', `Concession cannot exceed ${formatINR(editConcessionMax)}.`);
      setEditConcessionForm((p) => ({ ...p, amount: String(editConcessionMax) }));
      return;
    }
    setEditConcessionForm((p) => ({ ...p, amount: text }));
  }

  function handleEditConcessionSave() {
    if (!editConcessionItem) return;
    const numericAmount = parseFloat(editConcessionForm.amount) || 0;
    if (editConcessionMax !== undefined && numericAmount > editConcessionMax) {
      showError('Amount too high', `Concession cannot exceed ${formatINR(editConcessionMax)}.`);
      return;
    }
    if (editConcessionForm.reason.trim().length < 5) {
      showError('Reason too short', 'Reason must be at least 5 characters.');
      return;
    }
    updateConcessionMutation.mutate({
      id: editConcessionItem.id,
      data: {
        concession_amount: numericAmount,
        reason: editConcessionForm.reason.trim(),
        approved_by: editConcessionForm.approver || undefined,
      },
    });
  }

  // Build concession items from edited rows (amount > 0, reason ≥ 5 chars, approver chosen)
  const buildConcessionItems = (): ConcessionItemCreate[] =>
    Object.entries(concessionEdits)
      .map(([feeTypeId, e]) => ({ feeTypeId, e }))
      .filter(({ e }) => (parseFloat(e.amount) || 0) > 0 && e.reason.trim().length >= 5 && !!e.approver)
      .map(({ feeTypeId, e }) => ({
        fee_type_id: feeTypeId,
        concession_amount: parseFloat(e.amount) || 0,
        reason: e.reason.trim(),
        approved_by: e.approver as ApproverRole,
      }));

  const saveConcessions = () => {
    const concessions = buildConcessionItems();
    if (concessions.length === 0) {
      showError('Nothing to save', 'Enter amount, reason (min 5 chars) and approver on at least one fee type.');
      return;
    }
    concessionMutation.mutate({
      student_id: studentId,
      academic_year_id: activeAcademicYearId ?? '',
      concessions,
    });
  };

  const manualEntryMutation = useMutation({
    mutationFn: () =>
      feeOldFeesApi.createOldFee({
        student_id: studentId,
        current_year_id: activeAcademicYearId ?? '',
        amount: parseFloat(manualForm.amount) || 0,
        description: manualForm.description || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['old-fees', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-summary', studentId] });
      setShowManualEntry(false);
      setManualForm({ amount: '', description: '' });
      showSuccess('Added', 'Old fee entry added successfully');
    },
    onError: () => showError('Error', 'Failed to add old fee entry'),
  });

  const carryForwardMutation = useMutation({
    mutationFn: () =>
      feeOldFeesApi.carryForward({
        previous_year_id: carryForwardSource,
        current_year_id: activeAcademicYearId ?? '',
        student_ids: [studentId],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['old-fees', studentId] });
      qc.invalidateQueries({ queryKey: ['fee-summary', studentId] });
      setShowCarryForward(false);
      setCarryForwardSource('');
      showSuccess('Carried Forward', 'Old fees carried forward successfully');
    },
    onError: () => showError('Error', 'Failed to carry forward old fees'),
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => feeOldFeesApi.settleOldFee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['old-fees', studentId] });
      showSuccess('Settled', 'Old fee marked as settled');
    },
    onError: () => showError('Error', 'Failed to settle old fee'),
  });

  const deleteOldFeeMutation = useMutation({
    mutationFn: (id: string) => feeOldFeesApi.deleteOldFee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['old-fees', studentId] });
      showSuccess('Deleted', 'Old fee entry deleted');
    },
    onError: () => showError('Error', 'Failed to delete old fee'),
  });

  // ── Receipt download (web: blob download; native: FileSystem + Sharing) ──────
  const downloadReceipt = async (receiptId: string) => {
    try {
      if (Platform.OS === 'web') {
        // expo-file-system / expo-sharing are native-only — use a browser blob download.
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
    }
  };

  // Header info — prefer fresh summary, fall back to navigation params
  const studentName = summary?.student_name || params.name || 'Student';
  const admissionNumber = summary?.admission_number || params.admission || '';
  const classLine =
    [summary?.class_name || params.className, summary?.section_name || params.section]
      .filter(Boolean)
      .join(' ') || '';

  const muted = colors['muted-foreground'] as string;

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'summary', label: 'Fee Summary' },
    { key: 'payment', label: 'Fee Payment' },
    { key: 'concessions', label: 'Concessions' },
    { key: 'old-fees', label: 'Old Fees' },
    { key: 'history', label: 'Fee History' },
  ];

  // ── Tab: Fee Summary ─────────────────────────────────────────────────────────
  const SummaryTab = () => {
    if (summaryLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (!summary) {
      return (
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={muted} />
          <Text style={[styles.emptyText, { color: muted }]}>No fee data available</Text>
        </View>
      );
    }

    const headRowBg = theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc';
    const totalRowBg = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
    const dueColor = (v: number | string) => (Number(v) > 0 ? '#EF4444' : '#10B981');

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {Number(summary.old_fee_pending_amount) > 0 && (
          <TouchableOpacity style={styles.oldFeeAlert} onPress={() => setActiveTab('old-fees')}>
            <Ionicons name="warning" size={14} color="#D97706" />
            <Text style={styles.oldFeeText}>
              Previous year pending: {formatINR(summary.old_fee_pending_amount)} — View
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.tableCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {/* Card header: title + as-of / AY meta */}
          <View style={styles.summaryHeaderRow}>
            <Text style={[styles.summaryHeaderTitle, { color: colors.foreground }]}>Fee Summary</Text>
            <Text style={[styles.summaryHeaderMeta, { color: muted }]}>
              As of {summary.as_of_date}  •  AY: {summary.academic_year}
            </Text>
          </View>

          {/* Column header — fits the screen via flex */}
          <View style={[styles.tr, { backgroundColor: headRowBg, borderColor: borderCol }]}>
            <Text style={[styles.th, { flex: 2.4, color: muted }]}>Fee Type</Text>
            <Text style={[styles.th, styles.right, { flex: 1, color: muted }]}>Payable</Text>
            <Text style={[styles.th, styles.right, { flex: 1, color: muted }]}>Paid</Text>
            <Text style={[styles.th, styles.right, { flex: 1, color: muted }]}>Due</Text>
          </View>

          {/* Data rows */}
          {summary.items.map((item) => (
            <View key={item.fee_type_id} style={[styles.tr, { borderColor: borderCol }]}>
              <View style={{ flex: 2.4, paddingHorizontal: 8, paddingVertical: 8 }}>
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 12 }}>
                  {item.s_no}. {item.fee_type_name}
                </Text>
                <Text style={{ color: muted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                  Actual {formatINR(item.assigned_fee)}
                  {item.last_paid_date ? ` · ${item.last_paid_date}` : ''}
                  {item.last_receipt_number ? ` · #${item.last_receipt_number}` : ''}
                </Text>
                {item.remarks ? (
                  <Text style={{ color: muted, fontSize: 10, marginTop: 1 }} numberOfLines={1}>
                    {item.remarks}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.td, styles.right, { flex: 1, color: colors.foreground }]}>{formatINR(item.fee_after_concession)}</Text>
              <Text style={[styles.td, styles.right, { flex: 1, color: '#10B981' }]}>{formatINR(item.paid_amount)}</Text>
              <Text style={[styles.td, styles.right, { flex: 1, color: dueColor(item.due_amount) }]}>{formatINR(item.due_amount)}</Text>
            </View>
          ))}

          {/* Grand Total row */}
          <View style={[styles.tr, { backgroundColor: totalRowBg, borderColor: borderCol, borderBottomWidth: 0 }]}>
            <Text style={[styles.td, styles.totalTxt, { flex: 2.4, color: colors.foreground }]}>Grand Total</Text>
            <Text style={[styles.td, styles.right, styles.totalTxt, { flex: 1, color: colors.foreground }]}>{formatINR(summary.grand_total_fee)}</Text>
            <Text style={[styles.td, styles.right, styles.totalTxt, { flex: 1, color: '#10B981' }]}>{formatINR(summary.grand_total_paid)}</Text>
            <Text style={[styles.td, styles.right, styles.totalTxt, { flex: 1, color: dueColor(summary.grand_total_due) }]}>{formatINR(summary.grand_total_due)}</Text>
          </View>
        </View>

        {/* Term-wise Installment Schedule */}
        <View style={[styles.tableCard, { backgroundColor: cardBg, borderColor: borderCol, marginTop: 16 }]}>
          <TouchableOpacity style={styles.summaryHeaderRow} onPress={() => setScheduleOpen((v) => !v)}
              accessibilityLabel={scheduleOpen ? 'Collapse installment schedule' : 'Expand installment schedule'}>
            <Text style={[styles.summaryHeaderTitle, { color: colors.foreground }]}>Term-wise Installment Schedule</Text>
            <Ionicons name={scheduleOpen ? 'chevron-up' : 'chevron-down'} size={18} color={muted} />
          </TouchableOpacity>

          {scheduleOpen && (
            allTermsLoading ? (
              <View style={[styles.centered, { paddingVertical: 20 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : feeTypeSchedule.length === 0 ? (
              <Text style={[styles.feeSub, { color: muted, textAlign: 'center', paddingVertical: 16, paddingHorizontal: 12 }]}>
                No term-wise schedule found for this student.
              </Text>
            ) : (
              <>
                <View style={[styles.tr, { backgroundColor: headRowBg, borderColor: borderCol }]}>
                  <Text style={[styles.th, { flex: 2.6, color: muted }]}>Fee Type / Term</Text>
                  <Text style={[styles.th, styles.right, { flex: 1, color: muted }]}>Inst Amt</Text>
                  <Text style={[styles.th, styles.right, { flex: 1, color: muted }]}>Due</Text>
                </View>

                {feeTypeSchedule.map((group) => (
                  <View key={group.name}>
                    {group.items.map((item) => (
                      <View key={`${item.fee_type_id}-${item.term_date_id}`} style={[styles.tr, { borderColor: borderCol }]}>
                        <View style={{ flex: 2.6, paddingHorizontal: 8, paddingVertical: 8 }}>
                          <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 12 }} numberOfLines={1}>
                            {item.inst_no}. {group.name} · {item.term_name}
                          </Text>
                          <Text style={{ color: muted, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                            Due {new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' · '}Paid {formatINR(item.paid_amount)}
                          </Text>
                        </View>
                        <Text style={[styles.td, styles.right, { flex: 1, color: colors.foreground }]}>{formatINR(item.term_amount)}</Text>
                        <View style={{ flex: 1, alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: dueColor(item.adjusted_pending) }}>
                            {formatINR(item.adjusted_pending)}
                          </Text>
                          <View style={[styles.statusPill, { backgroundColor: item.adjusted_pending === 0 ? '#10B98122' : '#EF444422', marginTop: 3 }]}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: item.adjusted_pending === 0 ? '#10B981' : '#EF4444' }}>
                              {item.adjusted_pending === 0 ? 'Paid' : 'Pending'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                    {/* Sub-total per fee type */}
                    <View style={[styles.tr, { backgroundColor: totalRowBg, borderColor: borderCol }]}>
                      <Text style={[styles.td, { flex: 2.6, color: muted, fontSize: 11 }]} numberOfLines={1}>
                        {group.name} Total
                      </Text>
                      <Text style={[styles.td, styles.right, styles.totalTxt, { flex: 1, fontSize: 12, color: colors.foreground }]}>
                        {formatINR(group.items.reduce((s, i) => s + i.term_amount, 0))}
                      </Text>
                      <Text style={[styles.td, styles.right, styles.totalTxt, { flex: 1, fontSize: 12, color: '#EF4444' }]}>
                        {formatINR(group.items.reduce((s, i) => s + i.adjusted_pending, 0))}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    );
  };

  // ── Tab: Fee Payment ─────────────────────────────────────────────────────────
  const PaymentTab = () => {
    const headRowBg = theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f8fafc';
    const totalRowBg = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

    return (
    <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
      {/* Total Due card */}
      <View style={[styles.dueCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <Text style={[styles.dueLabel, { color: muted }]}>Total Due Amount</Text>
        <Text style={[styles.dueAmount, { color: Number(summary?.grand_total_due) > 0 ? '#EF4444' : '#10B981' }]}>
          {formatINR(summary?.grand_total_due)}
        </Text>
      </View>

      {/* Payment Up To */}
      <Text style={[styles.fieldLabel, { color: muted }]}>Payment Up To</Text>
      <CustomDropdown
        data={installmentOptions}
        value={paymentAsOfDate}
        onChange={(v) => setPaymentAsOfDate((v as string) || '')}
        placeholder={
          allTermsLoading
            ? 'Loading installments...'
            : installmentOptions.length === 0
            ? 'No installments for this student'
            : 'Select installment...'
        }
        search={false}
        mode="default"
        disabled={allTermsLoading}
      />

      {/* Fee Heads — editable received amount per fee head */}
      <View style={[styles.tableCard, { backgroundColor: cardBg, borderColor: borderCol, marginTop: 16 }]}>
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.summaryHeaderTitle, { color: colors.foreground }]}>
            {paymentAsOfDate
              ? `Fees Due Up To ${new Date(paymentAsOfDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : 'Fee Heads'}
          </Text>
        </View>

        {paymentTermsFetching ? (
          <View style={[styles.centered, { paddingVertical: 20 }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : feeRows.length === 0 ? (
          <Text style={[styles.feeSub, { color: muted, textAlign: 'center', paddingVertical: 16, paddingHorizontal: 12 }]}>
            {paymentAsOfDate ? 'No fees due for this term.' : 'Select a "Payment Up To" date above to see fee heads.'}
          </Text>
        ) : (
          <>
            <View style={[styles.tr, { backgroundColor: headRowBg, borderColor: borderCol }]}>
              <Text style={[styles.th, { flex: 2.2, color: muted }]}>Particulars</Text>
              <Text style={[styles.th, styles.right, { flex: 1, color: muted }]}>Actual</Text>
              <Text style={[styles.th, { flex: 1.3, color: muted }]}>Received</Text>
            </View>
            {feeRows.map((row, idx) => (
              <View key={row.fee_type_id} style={[styles.tr, { borderColor: borderCol }]}>
                <View style={{ flex: 2.2, paddingHorizontal: 8, paddingVertical: 8 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 12 }} numberOfLines={1}>
                    {idx + 1}. {row.fee_type_name}
                  </Text>
                </View>
                <Text style={[styles.td, styles.right, { flex: 1, color: '#EF4444' }]}>{formatINR(row.amount)}</Text>
                <View style={{ flex: 1.3, paddingHorizontal: 6, paddingVertical: 6 }}>
                  <TextInput
                    style={[styles.receivedInput, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol }]}
                    placeholder="Amount"
                    placeholderTextColor={muted}
                    value={receivedAmounts[row.fee_type_id] ?? ''}
                    onChangeText={(t) => {
                      const num = parseFloat(t);
                      if (!isNaN(num) && num > row.amount) {
                        showError('Amount too high', `Amount should not exceed ${formatINR(row.amount)} for ${row.fee_type_name}`);
                        setReceivedAmounts((prev) => ({ ...prev, [row.fee_type_id]: String(row.amount) }));
                        return;
                      }
                      setReceivedAmounts((prev) => ({ ...prev, [row.fee_type_id]: t }));
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ))}
            <View style={[styles.tr, { backgroundColor: totalRowBg, borderColor: borderCol, borderBottomWidth: 0 }]}>
              <Text style={[styles.td, styles.totalTxt, { flex: 2.2, color: colors.foreground }]}>Total</Text>
              <Text style={[styles.td, styles.right, styles.totalTxt, { flex: 1, color: '#EF4444' }]}>
                {formatINR(feeRows.reduce((s, r) => s + r.amount, 0))}
              </Text>
              <Text style={[styles.td, styles.totalTxt, { flex: 1.3, color: '#10B981' }]}>
                {totalReceived > 0 ? formatINR(totalReceived) : '—'}
              </Text>
            </View>
          </>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0, marginTop: 16 }]}>
        Collect Payment
      </Text>

      <Text style={[styles.fieldLabel, { color: muted }]}>Receipt Number *</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
        placeholder="e.g. RCP-260616-0930"
        placeholderTextColor={muted}
        value={receiptNumber}
        onChangeText={setReceiptNumber}
      />

      <Text style={[styles.fieldLabel, { color: muted }]}>Payment Method *</Text>
      <CustomDropdown
        data={PAYMENT_METHOD_OPTIONS}
        value={paymentForm.payment_method}
        onChange={(v) => setPaymentForm((p) => ({ ...p, payment_method: v as PaymentMethod }))}
        placeholder="Select method"
        search={false}
        mode="default"
      />

      {paymentForm.payment_method === 'upi' && (
        <>
          <Text style={[styles.fieldLabel, { color: muted }]}>UPI Reference / Transaction ID</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter UPI reference number"
            placeholderTextColor={muted}
            value={paymentForm.upi_reference}
            onChangeText={(t) => setPaymentForm((p) => ({ ...p, upi_reference: t }))}
          />
        </>
      )}
      {paymentForm.payment_method === 'bank_transfer' && (
        <>
          <Text style={[styles.fieldLabel, { color: muted }]}>Bank Reference / UTR Number</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter bank reference / UTR"
            placeholderTextColor={muted}
            value={paymentForm.bank_reference}
            onChangeText={(t) => setPaymentForm((p) => ({ ...p, bank_reference: t }))}
          />
        </>
      )}
      {(['cheque', 'dd'] as const).includes(paymentForm.payment_method as 'cheque' | 'dd') && (
        <>
          <Text style={[styles.fieldLabel, { color: muted }]}>Cheque / DD Number *</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter cheque or DD number"
            placeholderTextColor={muted}
            value={paymentForm.cheque_number}
            onChangeText={(t) => setPaymentForm((p) => ({ ...p, cheque_number: t }))}
          />
          <Text style={[styles.fieldLabel, { color: muted }]}>Bank Name *</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter bank name"
            placeholderTextColor={muted}
            value={paymentForm.cheque_bank}
            onChangeText={(t) => setPaymentForm((p) => ({ ...p, cheque_bank: t }))}
          />
          <Text style={[styles.fieldLabel, { color: muted }]}>Cheque / DD Date * (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="e.g. 2026-03-28"
            placeholderTextColor={muted}
            value={paymentForm.cheque_date}
            onChangeText={(t) => setPaymentForm((p) => ({ ...p, cheque_date: t }))}
            keyboardType="numeric"
          />
        </>
      )}

      <Text style={[styles.fieldLabel, { color: muted }]}>Remarks (optional)</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol, minHeight: 72 }]}
        placeholder="Optional notes"
        placeholderTextColor={muted}
        value={paymentForm.remarks}
        onChangeText={(t) => setPaymentForm((p) => ({ ...p, remarks: t }))}
        multiline
        textAlignVertical="top"
      />

      {/* Toggles */}
      <View style={styles.toggleRow}>
        <Switch
          value={paymentForm.send_sms}
          onValueChange={(v) => setPaymentForm((p) => ({ ...p, send_sms: v }))}
          trackColor={{ true: colors.primary as string }}
        />
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Send SMS</Text>
        <View style={{ width: 24 }} />
        <Switch
          value={paymentForm.print_duplicate}
          onValueChange={(v) => setPaymentForm((p) => ({ ...p, print_duplicate: v }))}
          trackColor={{ true: colors.primary as string }}
        />
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Print Duplicate</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: '#10B981', opacity: payMutation.isPending ? 0.5 : 1 }]}
        onPress={() => payMutation.mutate()}
        disabled={
          payMutation.isPending ||
          totalReceived <= 0 ||
          !receiptNumber.trim() ||
          (paymentForm.payment_method === 'upi' && !paymentForm.upi_reference) ||
          (paymentForm.payment_method === 'bank_transfer' && !paymentForm.bank_reference) ||
          ((['cheque', 'dd'] as const).includes(paymentForm.payment_method as 'cheque' | 'dd') &&
            (!paymentForm.cheque_number || !paymentForm.cheque_bank || !paymentForm.cheque_date))
        }
      >
        <Text style={styles.submitBtnText}>{payMutation.isPending ? 'Processing...' : 'Collect Payment'}</Text>
      </TouchableOpacity>
      <View style={{ height: 48 }} />
    </ScrollView>
    );
  };

  // ── Tab: Concessions ───────────────────────────────────────────────────────
  const ConcessionsTab = () => {
    // Authoritative fee-type list comes from the summary; due_date / settled overlaid
    // from the concession endpoint (same source the web uses) when available.
    const rows = (summary?.items ?? []).map((it) => {
      const c = (concessionRows as any[]).find((r) => r.fee_type_id === it.fee_type_id) || {};
      return {
        fee_type_id: it.fee_type_id,
        fee_type_name: it.fee_type_name,
        assigned: Number(it.assigned_fee) || 0,
        due_amount: Number(it.due_amount) || 0,
        due_date: c.due_date as string | undefined,
        is_settled: Boolean(c.is_settled),
        // Total concession already saved for this fee type (informational —
        // a new entry below is always additive on top of this, not a
        // replacement; due_amount already nets it out).
        already_applied: Number(c.concession_amount) || 0,
      };
    });

    const totalAssigned = Number(summary?.grand_total_assigned) || rows.reduce((s, r) => s + r.assigned, 0);
    const totalConcession = Object.values(concessionEdits).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const afterConcession = totalAssigned - totalConcession;
    const validCount = buildConcessionItems().length;

    return (
      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* Header + Save All */}
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0, marginBottom: 0 }]}>
            Apply Concessions
          </Text>
          {canCreateConcession && (
            <TouchableOpacity
              style={[styles.saveAllBtn, { backgroundColor: colors.primary, opacity: validCount === 0 || concessionMutation.isPending ? 0.5 : 1 }]}
              onPress={saveConcessions}
              disabled={validCount === 0 || concessionMutation.isPending}
            >
              <Text style={styles.saveAllText}>
                {concessionMutation.isPending ? 'Saving...' : `Save All Concessions${validCount ? ` (${validCount})` : ''}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {concessionLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <Text style={[styles.feeSub, { color: muted, paddingVertical: 12 }]}>No assigned fees for this student.</Text>
        ) : (
          rows.map((row, idx) => {
            const edit = concessionEdits[row.fee_type_id] ?? { amount: '', reason: '', approver: '' };
            const reasonInvalid = edit.amount.trim().length > 0 && edit.reason.trim().length > 0 && edit.reason.trim().length < 5;
            return (
              <View key={row.fee_type_id} style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol, marginHorizontal: 0 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.feeTypeName, { color: colors.foreground, marginBottom: 0 }]}>
                    {idx + 1}. {row.fee_type_name}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: row.is_settled ? '#10B98122' : '#F59E0B22' }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: row.is_settled ? '#10B981' : '#D97706' }}>
                      {row.is_settled ? 'Settled' : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.feeSub, { color: muted }]}>
                  Assigned {formatINR(row.assigned)}  ·  Due {formatINR(row.due_amount)}
                  {row.due_date ? `  ·  Due date: ${row.due_date}` : ''}
                </Text>

                <View>
                  <Text style={[styles.fieldLabel, { color: muted, marginTop: 8 }]}>Concession Amt</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol, opacity: canCreateConcession ? 1 : 0.6 }]}
                    placeholder={row.already_applied > 0 ? 'Add more...' : '0.00'}
                    placeholderTextColor={muted}
                    value={edit.amount}
                    onChangeText={(t) => setConcessionAmount(row.fee_type_id, t, row.due_amount)}
                    keyboardType="numeric"
                    editable={canCreateConcession}
                  />
                  {row.already_applied > 0 ? (
                    <Text style={[styles.feeSub, { color: muted, marginTop: 4 }]}>
                      +{formatINR(row.already_applied)} applied
                    </Text>
                  ) : null}
                </View>
                <View>
                  <Text style={[styles.fieldLabel, { color: muted, marginTop: 8 }]}>Approved By</Text>
                  <CustomDropdown
                    data={APPROVERS}
                    value={edit.approver}
                    onChange={(v) => setEdit(row.fee_type_id, { approver: v as ApproverRole })}
                    placeholder="Select"
                    search={false}
                    disabled={!canCreateConcession}
                  />
                </View>
                <Text style={[styles.fieldLabel, { color: muted, marginTop: 8 }]}>Reason (min 5 chars)</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: reasonInvalid ? '#EF4444' : borderCol, opacity: canCreateConcession ? 1 : 0.6 }]}
                  placeholder="Reason..."
                  placeholderTextColor={muted}
                  value={edit.reason}
                  onChangeText={(t) => setEdit(row.fee_type_id, { reason: t })}
                  editable={canCreateConcession}
                />
                {reasonInvalid ? <Text style={styles.errText}>Reason must be at least 5 characters</Text> : null}
              </View>
            );
          })
        )}

        {/* Grand Total */}
        {rows.length > 0 && (
          <View style={[styles.feeCard, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9', borderColor: borderCol, marginHorizontal: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.totalTxt, { color: colors.foreground }]}>Grand Total</Text>
              <Text style={[styles.totalTxt, { color: colors.foreground }]}>Assigned: {formatINR(totalAssigned)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={[styles.totalTxt, { color: '#8B5CF6' }]}>Concession: {formatINR(totalConcession)}</Text>
              <Text style={[styles.totalTxt, { color: colors.foreground }]}>After Concession: {formatINR(afterConcession)}</Text>
            </View>
          </View>
        )}

        {/* Concession History (collapsible) */}
        <TouchableOpacity style={styles.collapseHeader} onPress={() => setHistoryOpen((o) => !o)}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0, marginBottom: 0 }]}>
            Concession History
          </Text>
          <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={20} color={muted} />
        </TouchableOpacity>
        {historyOpen &&
          (concessionHistory && concessionHistory.length > 0 ? (
            concessionHistory.map((con) => (
              <View key={con.id} style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol, marginHorizontal: 0 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feeTypeName, { color: colors.foreground }]}>{con.fee_type_name || con.fee_type_id}</Text>
                    <Text style={[styles.feeSub, { color: muted }]}>Approver: {con.approver}</Text>
                    {con.reason ? <Text style={[styles.feeSub, { color: muted }]}>{con.reason}</Text> : null}
                    {con.recorded_by_staff_name ? (
                      <Text style={[styles.feeSub, { color: muted }]}>Recorded by: {con.recorded_by_staff_name}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={[styles.feeTypeName, { color: '#8B5CF6' }]}>{formatINR(con.amount)}</Text>
                    {(canUpdateConcession || canDeleteConcession) && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {canUpdateConcession && (
                          <TouchableOpacity
                            style={[styles.iconBtn, { width: 28, height: 28, borderColor: colors.primary }]}
                            onPress={() => handleEditConcessionOpen(con)}
                            accessibilityLabel="Edit"
                          >
                            <Ionicons name="create-outline" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                        {canDeleteConcession && (
                          <TouchableOpacity
                            style={[styles.iconBtn, { width: 28, height: 28, borderColor: '#EF4444' }]}
                            onPress={() => setDeleteConcessionId(con.id)}
                            accessibilityLabel="Delete"
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.feeSub, { color: muted, paddingVertical: 12 }]}>No concession history found.</Text>
          ))}
        <View style={{ height: 48 }} />
      </ScrollView>
    );
  };

  // ── Tab: Old Fees ──────────────────────────────────────────────────────────
  const OldFeesTab = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.oldFeeActions}>
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowManualEntry(true)}
        >
          <Ionicons name="add" size={16} color="white" />
          <Text style={styles.searchBtnText}>Add Manual Entry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.clearBtn, { borderColor: borderCol }]} onPress={() => setShowCarryForward(true)}>
          <Text style={[styles.clearBtnText, { color: colors.foreground }]}>Carry Forward</Text>
        </TouchableOpacity>
      </View>

      {oldFeesLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={oldFees ?? []}
          keyExtractor={(item: any, idx) => String(item.id ?? idx)}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          ListHeaderComponent={
            <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0 }]}>Old Fee Records</Text>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
              <Text style={[styles.emptyText, { color: muted }]}>No old fee records found.</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol, marginHorizontal: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.feeTypeName, { color: colors.foreground }]}>
                    {item.description || item.fee_type_name || 'Old Fee'}
                  </Text>
                  <View style={styles.feeAmounts}>
                    <Text style={[styles.feeAmountChip, { color: '#EF4444' }]}>Amount: {formatINR(item.amount)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: item.is_settled ? '#10B98122' : '#F59E0B22' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: item.is_settled ? '#10B981' : '#D97706' }}>
                        {item.is_settled ? 'Settled' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {!item.is_settled && (
                    <TouchableOpacity
                      style={[styles.iconBtn, { borderColor: '#10B981' }]}
                      onPress={() => settleMutation.mutate(item.id)}
                      disabled={settleMutation.isPending}
              accessibilityLabel="Confirm"
                    >
                      <Ionicons name="checkmark" size={16} color="#10B981" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.iconBtn, { borderColor: '#EF4444' }]}
                    onPress={() => deleteOldFeeMutation.mutate(item.id)}
                    disabled={deleteOldFeeMutation.isPending}
              accessibilityLabel="Delete"
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );

  // ── Tab: Fee History ───────────────────────────────────────────────────────
  const HistoryTab = () => {
    if (historyLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    const items = feeHistory?.items ?? [];
    if (items.length === 0) {
      return (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={48} color={muted} />
          <Text style={[styles.emptyText, { color: muted }]}>No payment records found for this academic year.</Text>
        </View>
      );
    }
    return (
      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.historyTotalRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, paddingHorizontal: 0, marginBottom: 0 }]}>
            Fee Payment History
          </Text>
          <Text style={{ color: '#10B981', fontWeight: '700' }}>Total: {formatINR(feeHistory?.total_paid)}</Text>
        </View>
        {items.map((it, idx) => (
          <View key={it.receipt_id || idx} style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol, marginHorizontal: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.feeTypeName, { color: colors.foreground }]}>{formatINR(it.amount_paid)}</Text>
                <Text style={[styles.feeSub, { color: muted }]}>
                  {it.transaction_date} • {String(it.payment_method || '').toUpperCase()}
                </Text>
                {it.receipt_number ? (
                  <Text style={[styles.feeSub, { color: muted }]}>Receipt: {it.receipt_number}</Text>
                ) : null}
                {it.fee_types_paid?.length ? (
                  <Text style={[styles.feeSub, { color: muted }]}>
                    {it.fee_types_paid.map((f) => f.fee_type_name).join(', ')}
                  </Text>
                ) : null}
              </View>
              {it.receipt_id ? (
                <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.primary }]} onPress={() => downloadReceipt(it.receipt_id)}
              accessibilityLabel="Download">
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
        <View style={{ height: 48 }} />
      </ScrollView>
    );
  };

  return (
    <AppLayout title="Fee Collection">
      <View style={{ flex: 1 }}>
        {/* Back + student header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}
              accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={[styles.studentInfoCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.studentAvatar, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="person" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.studentInfoName, { color: colors.foreground }]}>{studentName}</Text>
              <View style={styles.studentInfoRow}>
                {admissionNumber ? (
                  <View style={[styles.admissionBadge, { backgroundColor: colors.primary + '22' }]}>
                    <Text style={[styles.admissionBadgeText, { color: colors.primary }]}>{admissionNumber}</Text>
                  </View>
                ) : null}
                {classLine ? <Text style={[styles.studentInfoSub, { color: muted }]}>{classLine}</Text> : null}
              </View>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ alignItems: 'center' }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.primary, borderRadius: 8 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={{ color: activeTab === tab.key ? 'white' : muted, fontWeight: '600', fontSize: 13 }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab content — invoked as functions (not <Comp/>) so inputs keep focus across re-renders */}
        <View style={{ flex: 1 }}>
          {activeTab === 'summary' && SummaryTab()}
          {activeTab === 'payment' && PaymentTab()}
          {activeTab === 'concessions' && ConcessionsTab()}
          {activeTab === 'old-fees' && OldFeesTab()}
          {activeTab === 'history' && HistoryTab()}
        </View>
      </View>

      {/* Add Manual Entry modal */}
      <Modal visible={showManualEntry} transparent animationType="fade" onRequestClose={() => setShowManualEntry(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Manual Entry</Text>
            <Text style={[styles.fieldLabel, { color: muted }]}>Amount (₹) *</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol }]}
              placeholder="Enter amount"
              placeholderTextColor={muted}
              value={manualForm.amount}
              onChangeText={(t) => setManualForm((p) => ({ ...p, amount: t }))}
              keyboardType="numeric"
            />
            <Text style={[styles.fieldLabel, { color: muted }]}>Description (optional)</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol }]}
              placeholder="e.g. 2024-25 Tuition Fee"
              placeholderTextColor={muted}
              value={manualForm.description}
              onChangeText={(t) => setManualForm((p) => ({ ...p, description: t }))}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.clearBtn, { borderColor: borderCol }]} onPress={() => setShowManualEntry(false)}>
                <Text style={[styles.clearBtnText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: colors.primary, flex: 0, paddingHorizontal: 20, opacity: manualEntryMutation.isPending ? 0.5 : 1 }]}
                onPress={() => manualEntryMutation.mutate()}
                disabled={manualEntryMutation.isPending || !manualForm.amount}
              >
                <Text style={styles.searchBtnText}>{manualEntryMutation.isPending ? 'Adding...' : 'Add Entry'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Carry Forward modal */}
      <Modal visible={showCarryForward} transparent animationType="fade" onRequestClose={() => setShowCarryForward(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Carry Forward Old Fees</Text>
            <Text style={[styles.fieldLabel, { color: muted }]}>Source Academic Year</Text>
            <CustomDropdown
              data={((academicYears as any[]) ?? [])
                .filter((y: any) => y.id !== activeAcademicYearId)
                .map((y: any) => ({ label: y.title || y.name || y.year, value: y.id }))}
              value={carryForwardSource}
              onChange={(v) => setCarryForwardSource(v as string)}
              placeholder="Select previous year"
              search={false}
              mode="default"
              maxHeight={260}
              containerStyle={styles.carryForwardDropdownContainer}
              style={{ ...styles.fieldInput, backgroundColor: colors.background as string, borderColor: borderCol }}
              placeholderStyle={styles.carryForwardDropdownText}
              selectedTextStyle={{ ...styles.carryForwardDropdownText, color: colors.foreground }}
            />
            <Text style={[styles.fieldLabel, { color: muted }]}>Target Academic Year</Text>
            <View style={[styles.fieldInput, { backgroundColor: colors.background as string, borderColor: borderCol, justifyContent: 'center' }]}>
              <Text style={{ color: muted, fontSize: 14 }}>
                {(academicYears as any[]).find((y: any) => y.id === activeAcademicYearId)?.title || 'Current Year'}
              </Text>
            </View>
            <Text style={[styles.feeSub, { color: muted, marginTop: 8 }]}>
              This will copy all unpaid fee items from the source year as old fee records in the current year.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.clearBtn, { borderColor: borderCol }]} onPress={() => setShowCarryForward(false)}>
                <Text style={[styles.clearBtnText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: colors.primary, flex: 0, paddingHorizontal: 20, opacity: carryForwardMutation.isPending ? 0.5 : 1 }]}
                onPress={() => carryForwardMutation.mutate()}
                disabled={carryForwardMutation.isPending || !carryForwardSource}
              >
                <Text style={styles.searchBtnText}>{carryForwardMutation.isPending ? 'Processing...' : 'Carry Forward'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Concession modal */}
      <Modal visible={!!editConcessionItem} transparent animationType="fade" onRequestClose={() => setEditConcessionItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Concession</Text>
            <Text style={[styles.fieldLabel, { color: muted }]}>Concession Amount</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol }]}
              placeholder="0.00"
              placeholderTextColor={muted}
              value={editConcessionForm.amount}
              onChangeText={handleEditConcessionAmountChange}
              keyboardType="numeric"
            />
            <Text style={[styles.fieldLabel, { color: muted }]}>Reason (min 5 characters)</Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.background as string, borderColor: borderCol }]}
              placeholder="Reason..."
              placeholderTextColor={muted}
              value={editConcessionForm.reason}
              onChangeText={(t) => setEditConcessionForm((p) => ({ ...p, reason: t }))}
            />
            <Text style={[styles.fieldLabel, { color: muted }]}>Approved By</Text>
            <CustomDropdown
              data={APPROVERS}
              value={editConcessionForm.approver}
              onChange={(v) => setEditConcessionForm((p) => ({ ...p, approver: v as ApproverRole }))}
              placeholder="Select"
              search={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.clearBtn, { borderColor: borderCol }]} onPress={() => setEditConcessionItem(null)}>
                <Text style={[styles.clearBtnText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: colors.primary, flex: 0, paddingHorizontal: 20, opacity: updateConcessionMutation.isPending ? 0.5 : 1 }]}
                onPress={handleEditConcessionSave}
                disabled={updateConcessionMutation.isPending || editConcessionForm.reason.trim().length < 5}
              >
                <Text style={styles.searchBtnText}>{updateConcessionMutation.isPending ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Revoke Concession confirm modal */}
      <Modal visible={!!deleteConcessionId} transparent animationType="fade" onRequestClose={() => setDeleteConcessionId(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Revoke Concession</Text>
            <Text style={[styles.feeSub, { color: muted, marginBottom: 4 }]}>
              Are you sure you want to revoke this concession? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.clearBtn, { borderColor: borderCol }]} onPress={() => setDeleteConcessionId(null)}>
                <Text style={[styles.clearBtnText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.searchBtn, { backgroundColor: '#EF4444', flex: 0, paddingHorizontal: 20, opacity: deleteConcessionMutation.isPending ? 0.5 : 1 }]}
                onPress={() => deleteConcessionId && deleteConcessionMutation.mutate(deleteConcessionId)}
                disabled={deleteConcessionMutation.isPending}
              >
                <Text style={styles.searchBtnText}>{deleteConcessionMutation.isPending ? 'Revoking...' : 'Revoke'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment success modal */}
      <Modal visible={!!paymentSuccess} animationType="fade" transparent onRequestClose={() => setPaymentSuccess(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.successModal, { backgroundColor: cardBg }]}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Payment Recorded</Text>
            <Text style={[styles.successAmount, { color: '#10B981' }]}>{formatINR(paymentSuccess?.amount_paid ?? 0)}</Text>
            {paymentSuccess?.receipt_number ? (
              <Text style={[styles.successDetail, { color: muted }]}>Receipt: {paymentSuccess.receipt_number}</Text>
            ) : null}
            {paymentSuccess?.transaction_number ? (
              <Text style={[styles.successDetail, { color: muted }]}>Transaction: {paymentSuccess.transaction_number}</Text>
            ) : null}
            {paymentSuccess?.receipt_id ? (
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor: colors.primary, flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 10, width: 'auto' }]}
                onPress={() => downloadReceipt(paymentSuccess.receipt_id!)}
              >
                <Ionicons name="download-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Download Receipt</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.successBtn, { backgroundColor: '#10B981' }]} onPress={() => setPaymentSuccess(null)}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  backBtn: { padding: 6 },
  studentInfoCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center' },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  studentInfoName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  studentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentInfoSub: { fontSize: 13 },
  admissionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  admissionBadgeText: { fontSize: 12, fontWeight: '600' },

  tabBar: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 6 },

  totalsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 12 },
  totalCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center' },
  totalLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  totalAmount: { fontSize: 14, fontWeight: '700' },

  oldFeeAlert: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  oldFeeText: { color: '#92400E', fontSize: 13, fontWeight: '500' },

  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },

  // Fee Summary table
  tableCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  summaryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingHorizontal: 14, paddingVertical: 12 },
  summaryHeaderTitle: { fontSize: 16, fontWeight: '700' },
  summaryHeaderMeta: { fontSize: 11, fontWeight: '500' },
  tr: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, minHeight: 44 },
  th: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 10 },
  td: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 10 },
  right: { textAlign: 'right' },
  totalTxt: { fontWeight: '700' },
  feeCard: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  feeCardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  feeIndex: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  feeIndexText: { fontSize: 12, fontWeight: '700' },
  feeTypeName: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  feeAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4, alignItems: 'center' },
  feeAmountChip: { fontSize: 12, fontWeight: '500' },
  feeSub: { fontSize: 11, marginTop: 4 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  dueCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueLabel: { fontSize: 14, fontWeight: '500' },
  dueAmount: { fontSize: 20, fontWeight: '700' },

  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 4 },
  carryForwardDropdownContainer: { marginBottom: 4 },
  carryForwardDropdownText: { fontSize: 14 },
  dateInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  receivedInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  errText: { color: '#EF4444', fontSize: 12, fontWeight: '500' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  methodChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#f1f5f9', marginRight: 6 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  toggleLabel: { fontSize: 13, fontWeight: '600' },

  submitBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },

  collapseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8 },

  saveAllBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  saveAllText: { color: 'white', fontWeight: '600', fontSize: 12 },

  oldFeeActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  searchBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  searchBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  clearBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { fontWeight: '600', fontSize: 14 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  historyTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { borderRadius: 20, padding: 22, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },

  successModal: { borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' },
  successTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  successAmount: { fontSize: 32, fontWeight: '700', marginBottom: 12 },
  successDetail: { fontSize: 14, marginBottom: 4 },
  successBtn: { marginTop: 20, paddingVertical: 13, paddingHorizontal: 48, borderRadius: 12 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function StudentFeeDetailScreen() {
  return (
    <ScreenAccessGate
      title="Fee Collection"
      resources={['fee_collection', 'fee_transactions']}
      permissions={[
        ['fee_collection', 'read_own'],
        ['fee_transactions', 'read_own'],
        ['fee_collection', 'read_related'],
        ['fee_transactions', 'read_related'],
      ]}
      blockRoles={['teacher']}
    >
      <StudentFeeDetailScreenContent />
    </ScreenAccessGate>
  );
}
