import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import apiClient from '@/src/api/client';
import {
  feeCollectionApi,
  feeConcessionsApi,
  FeeCollectionSummary,
  FeeConcessionCreate,
} from '@/src/api/fees';
import { useToastContext } from '@/components/ToastProvider';

export default function FeeCollectionScreen() {
  const { role, selectedStudent } = useAuth();
  const { colors, theme } = useTheme();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  type AdminTab = 'summary' | 'payment' | 'concessions' | 'old-fees';
  const [adminTab, setAdminTab] = useState<AdminTab>('summary');
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash' as 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'dd' | 'card',
    remarks: '',
  });
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
    queryFn: () => apiClient.get('/fee/old-fees', { params: { student_id: selectedStudentId } }).then(r => r.data.items || r.data),
    enabled: !isStudent && !isParent && !!selectedStudentId && adminTab === 'old-fees',
  });

  const payMutation = useMutation({
    mutationFn: () => feeCollectionApi.pay({
      student_id: selectedStudentId,
      academic_year_id: '',
      amount_to_pay: parseFloat(paymentForm.amount) || 0,
      payment_method: paymentForm.payment_method,
      remarks: paymentForm.remarks || null,
    } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-summary', selectedStudentId] });
      setAdminTab('summary');
      setPaymentForm({ amount: '', payment_method: 'cash', remarks: '' });
      showSuccess('Payment Recorded', 'Payment recorded successfully');
    },
    onError: () => showError('Error', 'Failed to record payment'),
  });

  const concessionMutation = useMutation({
    mutationFn: () => feeConcessionsApi.bulkCreate([{
      student_id: selectedStudentId,
      fee_type_id: concessionForm.fee_type_id,
      academic_year_id: '',
      amount: parseFloat(concessionForm.amount) || 0,
      approver_role: concessionForm.approver_role,
      remarks: concessionForm.remarks || undefined,
    } as FeeConcessionCreate]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-summary', selectedStudentId] });
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
      <View style={styles.summaryHeader}>
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
            ₹{Number(data.grand_total_fee).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={[styles.totalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.totalLabel, { color: colors['muted-foreground'] }]}>Paid</Text>
          <Text style={[styles.totalAmount, { color: '#10B981' }]}>
            ₹{Number(data.grand_total_paid).toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={[styles.totalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Text style={[styles.totalLabel, { color: colors['muted-foreground'] }]}>Due</Text>
          <Text style={[styles.totalAmount, {
            color: Number(data.grand_total_due) > 0 ? '#EF4444' : '#10B981',
          }]}>
            ₹{Number(data.grand_total_due).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Old fee alert */}
      {Number(data.old_fee_pending_amount) > 0 && (
        <View style={styles.oldFeeAlert}>
          <Ionicons name="warning" size={14} color="#D97706" />
          <Text style={styles.oldFeeText}>
            Previous year pending: ₹{Number(data.old_fee_pending_amount).toLocaleString('en-IN')}
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
            <View style={styles.feeIndex}>
              <Text style={styles.feeIndexText}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feeTypeName, { color: colors.foreground }]}>
                {item.fee_type_name}
              </Text>
              <View style={styles.feeAmounts}>
                <Text style={[styles.feeAmountChip, { color: colors['muted-foreground'] }]}>
                  Assigned: ₹{Number(item.assigned_fee).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.feeAmountChip, { color: '#10B981' }]}>
                  Paid: ₹{Number(item.paid_amount).toLocaleString('en-IN')}
                </Text>
                <Text style={[styles.feeAmountChip, {
                  color: Number(item.due_amount) > 0 ? '#EF4444' : '#10B981',
                }]}>
                  Due: ₹{Number(item.due_amount).toLocaleString('en-IN')}
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
            <ActivityIndicator size="large" color="#556ee6" />
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
            <ActivityIndicator size="large" color="#556ee6" />
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
        onChangeText={(t) => setPaymentForm(p => ({ ...p, amount: t }))}
        keyboardType="numeric"
      />

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Payment Method</Text>
      <View style={styles.chipRow}>
        {(['cash', 'cheque', 'bank_transfer', 'upi', 'dd'] as const).map(method => (
          <TouchableOpacity
            key={method}
            style={[styles.methodChip, paymentForm.payment_method === method && { backgroundColor: '#556ee6' }]}
            onPress={() => setPaymentForm(p => ({ ...p, payment_method: method }))}
          >
            <Text style={{ color: paymentForm.payment_method === method ? 'white' : colors['muted-foreground'], fontSize: 12, fontWeight: '600' }}>
              {method.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
        onPress={() => payMutation.mutate()}
        disabled={payMutation.isPending || !paymentForm.amount}
      >
        <Text style={styles.submitBtnText}>{payMutation.isPending ? 'Processing...' : 'Record Payment'}</Text>
      </TouchableOpacity>
      <View style={{ height: 48 }} />
    </ScrollView>
  );

  const ConcessionTabContent = () => (
    <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Apply Concession</Text>

      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Fee Type *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {(adminFeeSummary?.items ?? []).map(item => (
          <TouchableOpacity
            key={item.fee_type_id}
            style={[styles.methodChip, concessionForm.fee_type_id === item.fee_type_id && { backgroundColor: '#556ee6' }]}
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
            style={[styles.methodChip, concessionForm.approver_role === role && { backgroundColor: '#556ee6' }]}
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
        onPress={() => concessionMutation.mutate()}
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
            Total carry-forward pending: ₹{Number(adminFeeSummary.old_fee_pending_amount).toLocaleString('en-IN')}
          </Text>
        </View>
      )}
      {oldFeesLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#556ee6" /></View>
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
                    Total: ₹{Number(item.original_amount).toLocaleString('en-IN')}
                  </Text>
                )}
                {item.paid_amount != null && (
                  <Text style={[styles.feeAmountChip, { color: '#10B981' }]}>
                    Paid: ₹{Number(item.paid_amount).toLocaleString('en-IN')}
                  </Text>
                )}
                {item.balance != null && (
                  <Text style={[styles.feeAmountChip, { color: '#EF4444' }]}>
                    Due: ₹{Number(item.balance).toLocaleString('en-IN')}
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
      <View style={styles.adminContainer}>
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
              setAdminTab('summary');
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedStudentId(''); setAdminTab('summary'); }}>
              <Ionicons name="close" size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search dropdown */}
        {searchQuery.length >= 2 && !selectedStudentId && (
          <View style={[styles.searchDropdown, { backgroundColor: cardBg, borderColor: borderCol }]}>
            {searchLoading ? (
              <View style={styles.dropdownItem}>
                <ActivityIndicator size="small" color="#556ee6" />
              </View>
            ) : (searchResults ?? []).length === 0 ? (
              <View style={styles.dropdownItem}>
                <Text style={{ color: colors['muted-foreground'], fontSize: 13 }}>No students found</Text>
              </View>
            ) : (
              (searchResults ?? []).map((s) => (
                <TouchableOpacity
                  key={s.student_id}
                  style={[styles.dropdownItem, { borderBottomColor: borderCol }]}
                  onPress={() => {
                    setSelectedStudentId(s.student_id);
                    setSearchQuery(s.student_name);
                  }}
                >
                  <Text style={[styles.dropdownName, { color: colors.foreground }]}>{s.student_name}</Text>
                  <Text style={[styles.dropdownSub, { color: colors['muted-foreground'] }]}>
                    {s.admission_number} • {s.class_name}
                    {Number(s.outstanding_amount) > 0
                      ? ` • Due: ₹${Number(s.outstanding_amount).toLocaleString('en-IN')}`
                      : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Tab bar — visible once a student is selected */}
        {selectedStudentId && adminFeeSummary && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminTabBar}>
            {ADMIN_TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.adminTab, adminTab === tab.key && { backgroundColor: '#556ee6', borderRadius: 8 }]}
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
          <ActivityIndicator size="large" color="#556ee6" />
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
    flex: 1,
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
});
