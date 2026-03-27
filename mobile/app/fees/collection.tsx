import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useAcademicYear, useAuth, useTheme } from '@/contexts';
import {
  feeCollectionApi,
  feeConcessionsApi,
  feeOldFeesApi,
  FeeCollectionSummary,
  FeeConcessionCreate,
  FeeSearchStudentResult,
} from '@/src/api/fees';
import { useToastContext } from '@/components/ToastProvider';

// M-1: INR currency formatter
const formatINR = (amount: number | string | null | undefined) =>
  '₹' + Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export default function FeeCollectionScreen() {
  const { role, selectedStudent } = useAuth();
  const { colors, theme } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null as any);

  type AdminTab = 'summary' | 'payment' | 'concessions' | 'old-fees';
  const [adminTab, setAdminTab] = useState<AdminTab>('summary');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash' as 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'dd' | 'card',
    remarks: '',
    upi_reference: '',
    bank_reference: '',
    cheque_number: '',
    cheque_bank: '',
  });
  // C-6: max-amount guard error state
  const [amountError, setAmountError] = useState(null as any);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    receipt_number?: string;
    receipt_id?: string;
    transaction_number?: string;
    amount_paid: number;
  } | null>(null);
  const [concessionForm, setConcessionForm] = useState({
    fee_type_id: '',
    amount: '',
    approver_role: 'admin' as FeeConcessionCreate['approver_role'],
    remarks: '',
  });

  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // ── Student: own summary ──────────────────────────────────────────────────
  const { data: myFeeSummary, isLoading: myLoading } = useQuery({
    queryKey: ['fee-my-summary'],
    queryFn: () => feeCollectionApi.getMySummary(),
    enabled: isStudent,
  });

  // ── Parent: selected child's summary ─────────────────────────────────────
  const childId = selectedStudent?.id ?? '';
  const { data: childFeeSummary, isLoading: childLoading } = useQuery({
    queryKey: ['fee-child-summary', childId],
    queryFn: () => feeCollectionApi.getChildSummary(childId),
    enabled: isParent && !!childId,
  });

  // ── Admin: search + summary ───────────────────────────────────────────────
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['fee-search-student', searchQuery],
    queryFn: () => feeCollectionApi.searchStudent({ q: searchQuery }),
    enabled: !isStudent && !isParent && searchQuery.length >= 2,
  });

  const { data: adminFeeSummary, isLoading: adminLoading } = useQuery({
    queryKey: ['fee-summary', selectedStudentId],
    queryFn: () => feeCollectionApi.getSummary(selectedStudentId),
    enabled: !isStudent && !isParent && !!selectedStudentId,
  });

  const { data: oldFees, isLoading: oldFeesLoading } = useQuery({
    queryKey: ['old-fees', selectedStudentId],
    queryFn: () => feeOldFeesApi.getOldFeesByStudent(selectedStudentId),
    enabled: !isStudent && !isParent && !!selectedStudentId && adminTab === 'old-fees',
  });

  // C-7: fetch existing concessions for the selected student
  const { data: existingConcessions } = useQuery({
    queryKey: ['fee-concessions', selectedStudentId, activeAcademicYearId],
    queryFn: () =>
      feeConcessionsApi.getByStudent(selectedStudentId, {
        academic_year_id: activeAcademicYearId ?? undefined,
      }),
    enabled: !isStudent && !isParent && !!selectedStudentId && adminTab === 'concessions',
  });

  const payMutation = useMutation({
    mutationFn: (capturedStudentId: string) => feeCollectionApi.pay({
      student_id: capturedStudentId,
      academic_year_id: activeAcademicYearId ?? '',
      amount_to_pay: parseFloat(paymentForm.amount) || 0,
      payment_method: paymentForm.payment_method,
      remarks: paymentForm.remarks || null,
      upi_reference: paymentForm.upi_reference || undefined,
      bank_reference: paymentForm.bank_reference || undefined,
      cheque_number: paymentForm.cheque_number || undefined,
      cheque_bank: paymentForm.cheque_bank || undefined,
    } as any),
    onSuccess: (data: any, capturedStudentId: string) => {
      qc.invalidateQueries({ queryKey: ['fee-summary', capturedStudentId] });
      qc.invalidateQueries({ queryKey: ['fee-my-summary'] });
      qc.invalidateQueries({ queryKey: ['fee-child-summary'] });
      setAdminTab('summary');
      setAmountError(null);
      const paid = parseFloat(paymentForm.amount) || 0;
      setPaymentForm({ amount: '', payment_method: 'cash', remarks: '', upi_reference: '', bank_reference: '', cheque_number: '', cheque_bank: '' });
      setPaymentSuccess({
        receipt_number: data?.receipt_number,
        receipt_id: data?.receipt_id,
        transaction_number: data?.transaction_number,
        amount_paid: data?.amount_paid ?? paid,
      });
    },
    onError: () => showError('Error', 'Failed to record payment'),
  });

  const concessionMutation = useMutation({
    mutationFn: (capturedStudentId: string) => feeConcessionsApi.bulkCreate([{
      student_id: capturedStudentId,
      fee_type_id: concessionForm.fee_type_id,
      academic_year_id: activeAcademicYearId ?? '',
      amount: parseFloat(concessionForm.amount) || 0,
      approver_role: concessionForm.approver_role,
      remarks: concessionForm.remarks || undefined,
    } as FeeConcessionCreate]),
    onSuccess: (_: any, capturedStudentId: string) => {
      qc.invalidateQueries({ queryKey: ['fee-summary', capturedStudentId] });
      qc.invalidateQueries({ queryKey: ['fee-my-summary'] });
      qc.invalidateQueries({ queryKey: ['TEMP_MARKER'] });
      qc.invalidateQueries({ queryKey: ['fee-concessions', capturedStudentId] });
      setAdminTab('summary');
      setConcessionForm({ fee_type_id: '', amount: '', approver_role: 'admin', remarks: '' });
      showSuccess('Concession Applied', 'Concession applied successfully');
    },
    onError: () => showError('Error', 'Failed to apply concession'),
  });

  // ── Shared summary renderer ───────────────────────────────────────────────
  const SummaryView = ({ data }: { data: FeeCollectionSummary }) => (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
      {/* Student header */}
      <View style={[styles.summaryHeader,{backgroundColor:colors.primary}]}>
        <Text style={styles.summaryName}>{data.student_name}</Text>
        <Text style={styles.summarySub}>
          {data.class_name} – {data.section_name} • {data.admission_number}
        </Text>
        <Text style={styles.summarySub}>{data.academic_year}</Text>
      </View>

      {/* Grand totals row */}
      <View style={styles.totalsRow}>
        <View style={[styles.totalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.totalLabel, { color: colors['muted-foreground'] }]}>Total Fee</Text>
          <Text style={[styles.totalAmount, { color: colors.foreground }]}>
            {formatINR(data.grand_total_fee)}
          </Text>
        </View>
        <View style={[styles.totalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.totalLabel, { color: colors['muted-foreground'] }]}>Paid</Text>
          <Text style={[styles.totalAmount, { color: '#10B981' }]}>
            {formatINR(data.grand_total_paid)}
          </Text>
        </View>
        <View style={[styles.totalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.totalLabel, { color: colors['muted-foreground'] }]}>Due</Text>
          <Text style={[styles.totalAmount, {
            color: Number(data.grand_total_due) > 0 ? '#EF4444' : '#10B981',
          }]}>
            {formatINR(data.grand_total_due)}
          </Text>
        </View>
      </View>

      {/* Old fee alert */}
      {Number(data.old_fee_pending_amount) > 0 && (
        <View style={styles.oldFeeAlert}>
          <Ionicons name="warning" size={14} color="#D97706" />
          <Text style={styles.oldFeeText}>
            Previous year pending: {formatINR(data.old_fee_pending_amount)}
          </Text>
        </View>
      )}

      {/* Fee breakdown */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fee Breakdown</Text>
      {data.items.map((item, idx) => (
        <View
          key={item.fee_type_id}
          style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol }]}
        >
          <View style={styles.feeCardRow}>
            <View style={[styles.feeIndex,{backgroundColor:colors.primary+'18'}]}>
              <Text style={[styles.feeIndexText,{color:colors.primary}]}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feeTypeName, { color: colors.foreground }]}>
                {item.fee_type_name}
              </Text>
              <View style={styles.feeAmounts}>
                <Text style={[styles.feeAmountChip, { color: colors['muted-foreground'] }]}>
                  Assigned: {formatINR(item.assigned_fee)}
                </Text>
                <Text style={[styles.feeAmountChip, { color: '#10B981' }]}>
                  Paid: {formatINR(item.paid_amount)}
                </Text>
                <Text style={[styles.feeAmountChip, {
                  color: Number(item.due_amount) > 0 ? '#EF4444' : '#10B981',
                }]}>
                  Due: {formatINR(item.due_amount)}
                </Text>
              </View>
              {item.last_paid_date && (
                <Text style={[styles.feeSub, { color: colors['muted-foreground'] }]}>
                  Last paid: {item.last_paid_date}
                  {item.last_receipt_number ? ` • Receipt: ${item.last_receipt_number}` : ''}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
      <View style={{ height: 48 }} />
    </ScrollView>
  );

  const EmptyState = ({ icon, message }: { icon: string; message: string }) => (
    <View style={styles.centered}>
      <Ionicons name={icon as any} size={48} color={colors['muted-foreground']} />
      <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>{message}</Text>
    </View>
  );

  // ── STUDENT view ──────────────────────────────────────────────────────────
  if (isStudent) {
    return (
      <AppLayout title="My Fees">
        {myLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : myFeeSummary ? (
          <SummaryView data={myFeeSummary} />
        ) : (
          <EmptyState icon="document-text-outline" message="No fee data found" />
        )}
      </AppLayout>
    );
  }

  // ── PARENT view ───────────────────────────────────────────────────────────
  if (isParent) {
    return (
      <AppLayout title="Child Fees">
        {!childId ? (
          <EmptyState
            icon="person-outline"
            message={'No student selected.\nUse the selector in the header.'}
          />
        ) : childLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : childFeeSummary ? (
          <SummaryView data={childFeeSummary} />
        ) : (
          <EmptyState icon="document-text-outline" message="No fee data found for this student" />
        )}
      </AppLayout>
    );
  }

  // ── ADMIN / STAFF / TEACHER view ──────────────────────────────────────────
  const ADMIN_TABS: { key: AdminTab; label: string }[] = [
    { key: 'summary', label: 'Fee Summary' },
    { key: 'payment', label: 'Fee Payment' },
    { key: 'concessions', label: 'Concessions' },
    { key: 'old-fees', label: 'Old Fees' },
  ];

  const PaymentTabContent = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Record Payment</Text>

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Amount (₹) *</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
        placeholder="Enter amount"
        placeholderTextColor={colors['muted-foreground']}
        value={paymentForm.amount}
        onChangeText={(t) => { setPaymentForm(pr => ({ ...pr, amount: t })); const v=parseFloat(t); if(v===v && Number(adminFeeSummary?.grand_total_due??0)>0 && v>Number(adminFeeSummary?.grand_total_due??0)){setAmountError(String.fromCharCode(65,109,111,117,110,116,32,99,97,110,110,111,116,32,101,120,99,101,101,100,32,111,117,116,115,116,97,110,100,105,110,103,32,98,97,108,97,110,99,101));}else{setAmountError(null);} }}
        keyboardType="numeric"
      />
      {amountError ? <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '500' }}>{amountError}</Text> : null}

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Payment Method</Text>
      <View style={styles.chipRow}>
        {(['cash', 'cheque', 'bank_transfer', 'upi', 'dd'] as const).map(method => (
          <TouchableOpacity
            key={method}
            style={[styles.methodChip, paymentForm.payment_method === method && { backgroundColor: colors.primary }]}
            onPress={() => setPaymentForm(p => ({ ...p, payment_method: method }))}
          >
            <Text style={{ color: paymentForm.payment_method === method ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
              {method.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {paymentForm.payment_method === 'upi' && (
        <>
          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>UPI Reference / Transaction ID</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter UPI reference number"
            placeholderTextColor={colors['muted-foreground']}
            value={paymentForm.upi_reference}
            onChangeText={(t) => setPaymentForm(p => ({ ...p, upi_reference: t }))}
          />
        </>
      )}
      {paymentForm.payment_method === 'bank_transfer' && (
        <>
          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Bank Reference / UTR Number</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter bank reference / UTR"
            placeholderTextColor={colors['muted-foreground']}
            value={paymentForm.bank_reference}
            onChangeText={(t) => setPaymentForm(p => ({ ...p, bank_reference: t }))}
          />
        </>
      )}
      {paymentForm.payment_method === 'cheque' && (
        <>
          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Cheque Number</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter cheque number"
            placeholderTextColor={colors['muted-foreground']}
            value={paymentForm.cheque_number}
            onChangeText={(t) => setPaymentForm(p => ({ ...p, cheque_number: t }))}
          />
          <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Bank Name</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
            placeholder="Enter bank name"
            placeholderTextColor={colors['muted-foreground']}
            value={paymentForm.cheque_bank}
            onChangeText={(t) => setPaymentForm(p => ({ ...p, cheque_bank: t }))}
          />
        </>
      )}

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Remarks (optional)</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol, minHeight: 72 }]}
        placeholder="Enter remarks"
        placeholderTextColor={colors['muted-foreground']}
        value={paymentForm.remarks}
        onChangeText={(t) => setPaymentForm(p => ({ ...p, remarks: t }))}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: '#10B981', opacity: payMutation.isPending ? 0.6 : 1 }]}
        onPress={() => payMutation.mutate(selectedStudentId)}
        disabled={payMutation.isPending || !paymentForm.amount || !!amountError}
      >
        <Text style={styles.submitBtnText}>{payMutation.isPending ? 'Processing...' : 'Record Payment'}</Text>
      </TouchableOpacity>
      <View style={{ height: 48 }} />
    </ScrollView>
  );

  const ConcessionTabContent = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
      {/* C-7: Existing concessions */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Applied Concessions</Text>
      {existingConcessions && existingConcessions.length > 0 ? existingConcessions.map((con) => (
        <View key={con.id} style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feeTypeName, { color: colors.foreground }]}>{con.fee_type_id}</Text>
              <Text style={[styles.feeSub, { color: colors['muted-foreground'] }]}>Approved by: {con.approver_role}</Text>
            </View>
            <Text style={[styles.feeTypeName, { color: '#8B5CF6' }]}>{formatINR(con.amount)}</Text>
          </View>
        </View>)) : <Text style={[styles.feeSub, { color: colors['muted-foreground'] }]}>No concessions applied</Text>}
      <View style={styles.divider} />
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Apply Concession</Text>

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Fee Type *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {(adminFeeSummary?.items ?? []).map(item => (
          <TouchableOpacity
            key={item.fee_type_id}
            style={[styles.methodChip, concessionForm.fee_type_id === item.fee_type_id && { backgroundColor: colors.primary }]}
            onPress={() => setConcessionForm(p => ({ ...p, fee_type_id: item.fee_type_id }))}
          >
            <Text style={{ color: concessionForm.fee_type_id === item.fee_type_id ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
              {item.fee_type_name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Amount (₹) *</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol }]}
        placeholder="Enter concession amount"
        placeholderTextColor={colors['muted-foreground']}
        value={concessionForm.amount}
        onChangeText={(t) => setConcessionForm(p => ({ ...p, amount: t }))}
        keyboardType="numeric"
      />

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Approved By</Text>
      <View style={styles.chipRow}>
        {(['principal', 'management', 'accountant', 'admin'] as FeeConcessionCreate['approver_role'][]).map(role => (
          <TouchableOpacity
            key={role}
            style={[styles.methodChip, concessionForm.approver_role === role && { backgroundColor: colors.primary }]}
            onPress={() => setConcessionForm(p => ({ ...p, approver_role: role }))}
          >
            <Text style={{ color: concessionForm.approver_role === role ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Reason (optional)</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.foreground, backgroundColor: cardBg, borderColor: borderCol, minHeight: 72 }]}
        placeholder="Enter reason for concession"
        placeholderTextColor={colors['muted-foreground']}
        value={concessionForm.remarks}
        onChangeText={(t) => setConcessionForm(p => ({ ...p, remarks: t }))}
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: '#8B5CF6', opacity: concessionMutation.isPending ? 0.6 : 1 }]}
        onPress={() => concessionMutation.mutate(selectedStudentId)}
        disabled={concessionMutation.isPending || !concessionForm.fee_type_id || !concessionForm.amount}
      >
        <Text style={styles.submitBtnText}>{concessionMutation.isPending ? 'Applying...' : 'Apply Concession'}</Text>
      </TouchableOpacity>
      <View style={{ height: 48 }} />
    </ScrollView>
  );

  const OldFeesTabContent = () => (
    <View style={{ flex: 1 }}>
      {adminFeeSummary && Number(adminFeeSummary.old_fee_pending_amount) > 0 && (
        <View style={[styles.oldFeeAlert, { margin: 16, marginBottom: 0 }]}>
          <Ionicons name="warning" size={14} color="#D97706" />
          <Text style={styles.oldFeeText}>
            Total carry-forward pending: {formatINR(adminFeeSummary.old_fee_pending_amount)}
          </Text>
        </View>
      )}
      {oldFeesLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={oldFees ?? []}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No pending old fees</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.feeCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.feeTypeName, { color: colors.foreground }]}>
                {item.academic_year ?? item.year ?? 'Previous Year'}
              </Text>
              <View style={styles.feeAmounts}>
                {item.fee_type_name && (
                  <Text style={[styles.feeAmountChip, { color: colors['muted-foreground'] }]}>
                    {item.fee_type_name}
                  </Text>
                )}
                {item.original_amount != null && (
                  <Text style={[styles.feeAmountChip, { color: colors['muted-foreground'] }]}>
                    Total: {formatINR(item.original_amount)}
                  </Text>
                )}
                {item.paid_amount != null && (
                  <Text style={[styles.feeAmountChip, { color: '#10B981' }]}>
                    Paid: {formatINR(item.paid_amount)}
                  </Text>
                )}
                {item.balance != null && (
                  <Text style={[styles.feeAmountChip, { color: '#EF4444' }]}>
                    Due: {formatINR(item.balance)}
                  </Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );

  return (
    <AppLayout title="Fee Collection">
      <View style={{ flex: 1 }}>
      <View style={styles.adminContainer}>
        {/* M-9: Page header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Fee Collection</Text>
          <Text style={[styles.pageSubtitle, { color: colors['muted-foreground'] }]}>
            Search students and manage fee payments
          </Text>
        </View>
        {/* Search bar */}
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={18} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search student by name or admission no..."
            placeholderTextColor={colors['muted-foreground']}
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setSelectedStudentId('');
              setSelectedStudentInfo(null);
              setAdminTab('summary');
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedStudentId(''); setSelectedStudentInfo(null); setAdminTab('summary'); }}>
              <Ionicons name="close" size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search dropdown */}
        {searchQuery.length >= 2 && !selectedStudentId && (
          <View style={[styles.searchDropdown, { backgroundColor: cardBg, borderColor: borderCol }]}>
            {searchLoading ? (
              <View style={styles.dropdownItem}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (searchResults ?? []).length === 0 ? (
              <View style={styles.dropdownItem}>
                <Text style={{ color: colors['muted-foreground'], fontSize: 14 }}>No students found</Text>
              </View>
            ) : (
              (searchResults ?? []).map((s) => (
                <TouchableOpacity
                  key={s.student_id}
                  style={[styles.dropdownItem, { borderBottomColor: borderCol }]}
                  onPress={() => {
                    setSelectedStudentId(s.student_id); setSelectedStudentInfo(s);
                    setSearchQuery(s.student_name);
                  }}
                >
                  <Text style={[styles.dropdownName, { color: colors.foreground }]}>{s.student_name}</Text>
                  <Text style={[styles.dropdownSub, { color: colors['muted-foreground'] }]}>
                    {s.admission_number} • {s.class_name}
                    {Number(s.outstanding_amount) > 0
                      ? (' • Due: ' + formatINR(s.outstanding_amount))
                      : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* C-5: Student info card after selection */}
        {selectedStudentId && selectedStudentInfo && (
          <View style={[styles.studentInfoCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.studentAvatar}>
              <Ionicons name='person' size={28} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.studentInfoName, { color: colors.foreground }]}>
                {selectedStudentInfo.student_name}
              </Text>
              <View style={styles.studentInfoRow}>
                <View style={[styles.admissionBadge, { backgroundColor: colors.primary+'22' }]}>
                  <Text style={[styles.admissionBadgeText, { color: colors.primary }]}>
                    {selectedStudentInfo.admission_number}
                  </Text>
                </View>
                <Text style={[styles.studentInfoSub, { color: colors['muted-foreground'] }]}>
                  {selectedStudentInfo.class_name}{selectedStudentInfo.section_name ? '  ' + selectedStudentInfo.section_name : ''}
                </Text>
              </View>
              {selectedStudentInfo.father_phone ? (
                <Text style={[styles.studentInfoSub, { color: colors['muted-foreground'] }]}>
                  Ph: {selectedStudentInfo.father_phone}
                </Text>
              ) : null}
            </View>
          </View>
        )}
        {/* Tab bar — visible once a student is selected */}
        {selectedStudentId && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminTabBar}>
            {ADMIN_TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.adminTab, adminTab === tab.key && { backgroundColor: colors.primary, borderRadius: 8 }]}
                onPress={() => setAdminTab(tab.key)}
              >
                <Text style={{ color: adminTab === tab.key ? 'white' : colors['muted-foreground'], fontWeight: '600', fontSize: 13 }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Tab content */}
      {adminLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : adminFeeSummary ? (
        <>
          {adminTab === 'summary' && <SummaryView data={adminFeeSummary} />}
          {adminTab === 'payment' && <PaymentTabContent />}
          {adminTab === 'concessions' && <ConcessionTabContent />}
          {adminTab === 'old-fees' && <OldFeesTabContent />}
        </>
      ) : !selectedStudentId ? (
        <EmptyState
          icon="search-outline"
          message={'Search and select a student\nto view their fee details'}
        />
      ) : null}
      </View>

      {/* Payment success modal */}
      <Modal
        visible={!!paymentSuccess}
        animationType="fade"
        transparent
        onRequestClose={() => setPaymentSuccess(null)}
      >
        <View style={styles.successOverlay}>
          <View style={[styles.successModal, { backgroundColor: cardBg }]}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={[styles.successTitle, { color: colors.foreground }]}>Payment Successful!</Text>
            <Text style={[styles.successAmount, { color: '#10B981' }]}>
              {formatINR(paymentSuccess?.amount_paid ?? 0)}
            </Text>
            {paymentSuccess?.receipt_number ? (
              <Text style={[styles.successDetail, { color: colors['muted-foreground'] }]}>
                Receipt: {paymentSuccess.receipt_number}
              </Text>
            ) : null}
            {paymentSuccess?.transaction_number ? (
              <Text style={[styles.successDetail, { color: colors['muted-foreground'] }]}>
                Transaction: {paymentSuccess.transaction_number}
              </Text>
            ) : null}
            {paymentSuccess?.receipt_id ? (
              <TouchableOpacity
                style={[styles.downloadBtn, { borderColor: colors.primary }]}
                onPress={async () => { try { await feeCollectionApi.getReceiptPdf(paymentSuccess.receipt_id!); showSuccess('Receipt', 'Receipt will be emailed to parent'); } catch { showError('Error', 'Unable to download receipt'); } }}
              >
                <Ionicons name='download-outline' size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Download Receipt</Text>
              </TouchableOpacity>
) : null}
            <TouchableOpacity
              style={[styles.successBtn, { backgroundColor: '#10B981' }]}
              onPress={() => setPaymentSuccess(null)}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryHeader: {
    backgroundColor: '#556ee6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 12,
  },
  summaryName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  summarySub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 3,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  totalCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  oldFeeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  oldFeeText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  feeCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  feeCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  feeIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#556ee618',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  feeIndexText: {
    color: '#556ee6',
    fontSize: 12,
    fontWeight: '700',
  },
  feeTypeName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  feeAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  feeAmountChip: {
    fontSize: 12,
    fontWeight: '500',
  },
  feeSub: {
    fontSize: 11,
    marginTop: 4,
  },
  adminContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownSub: {
    fontSize: 12,
    marginTop: 2,
  },
  adminTabBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  adminTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  submitBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  successDetail: {
    fontSize: 14,
    marginBottom: 4,
  },
  successBtn: {
    marginTop: 20,
    paddingVertical: 13,
    paddingHorizontal: 48,
    borderRadius: 12,
  },

  pageHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  pageSubtitle: { fontSize: 14, marginBottom: 12 },
  studentInfoCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row' },
  studentAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  studentInfoName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  studentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentInfoSub: { fontSize: 13 },
  admissionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#556ee618' },
  admissionBadgeText: { fontSize: 12, fontWeight: '600', color: '#556ee6' },
  divider: { height: 1, marginVertical: 12 },
  downloadBtn: { marginTop: 10, paddingVertical: 11, paddingHorizontal: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
});
