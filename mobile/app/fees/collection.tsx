import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import {
  feeCollectionApi,
  FeeCollectionSummary,
} from '@/src/api/fees';
import { classSectionsApi } from '@/src/api/masters';
import CustomDropdown from '@/components/ui/dropdown';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

// M-1: INR currency formatter
const formatINR = (amount: number | string | null | undefined) =>
  '₹' + Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function FeeCollectionScreenContent() {
  const { role, selectedStudent } = useAuth();
  const { colors, theme } = useTheme();
  const router = useRouter();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [selectedStudentInfo, setSelectedStudentInfo] = useState(null as any);
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
  // Classes for filter dropdown
  const { data: classes = [] } = useQuery({
    queryKey: ['classSections'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: true }),
    enabled: !isStudent && !isParent,
  });

  const selectedClass = (classes as any[]).find((c: any) => c.id === selectedClassId);
  const sectionOptions = selectedClass?.sections || [];

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['fee-search-student', searchQuery, selectedClassId, selectedSectionId],
    queryFn: () => feeCollectionApi.searchStudent({
      q: searchQuery || undefined,
      class_id: selectedClassId || undefined,
      section_id: selectedSectionId || undefined,
    }),
    enabled: !isStudent && !isParent && searchTriggered,
  });

  // ── Shared summary renderer ───────────────────────────────────────────────
  const SummaryView = ({ data }: { data: FeeCollectionSummary }) => (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
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
                {/* Web parity (ParentFeeSummaryPage / FeeSummaryTab): show the
                    post-concession amount, not just the raw assigned fee. */}
                <Text style={[styles.feeAmountChip, { color: '#8B5CF6' }]}>
                  After Concession: {formatINR(item.fee_after_concession)}
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
              {!!item.last_paid_date && (
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
        {/* Filters row — matches web layout */}
        <View style={styles.filtersSection}>
          {/* Search text input */}
          <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Ionicons name="search" size={16} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search by name, admission no, mobile..."
              placeholderTextColor={colors['muted-foreground']}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => setSearchTriggered(true)}
            />
          </View>

          {/* Class + Section dropdowns — styled to match the search bar above */}
          <View style={styles.filterDropdowns}>
            <View style={{ flex: 1 }}>
              <CustomDropdown
                data={[{ label: 'All Classes', value: '' }, ...(classes as any[]).map((c: any) => ({ label: c.name, value: c.id }))]}
                value={selectedClassId}
                onChange={(v) => { setSelectedClassId(v as string); setSelectedSectionId(''); }}
                placeholder="All Classes"
                search={false}
                containerStyle={styles.filterDropdownContainer}
                style={{ ...styles.filterDropdownBox, backgroundColor: cardBg, borderColor: borderCol }}
                placeholderStyle={styles.filterDropdownText}
                selectedTextStyle={styles.filterDropdownText}
              />
            </View>
            <View style={{ flex: 1 }}>
              <CustomDropdown
                data={[{ label: 'All Sections', value: '' }, ...sectionOptions.map((s: any) => ({ label: s.name, value: s.id }))]}
                value={selectedSectionId}
                onChange={(v) => setSelectedSectionId(v as string)}
                placeholder="All Sections"
                search={false}
                disabled={!selectedClassId}
                containerStyle={styles.filterDropdownContainer}
                style={{ ...styles.filterDropdownBox, backgroundColor: cardBg, borderColor: borderCol }}
                placeholderStyle={styles.filterDropdownText}
                selectedTextStyle={styles.filterDropdownText}
              />
            </View>
          </View>

          {/* Search + Clear buttons */}
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={() => { setSelectedStudentId(''); setSelectedStudentInfo(null); setSearchTriggered(true); }}
            >
              <Ionicons name="search" size={15} color="white" />
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: borderCol }]}
              onPress={() => {
                setSearchQuery(''); setSelectedClassId(''); setSelectedSectionId('');
                setSearchTriggered(false); setSelectedStudentId(''); setSelectedStudentInfo(null);
              }}
            >
              <Text style={[styles.clearBtnText, { color: colors['muted-foreground'] }]}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Student results grid */}
        {searchTriggered && !selectedStudentId && (
          <View style={{ flex: 1 }}>
            {searchLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (searchResults ?? []).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No students found</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.studentGrid}>
                {(searchResults ?? []).map((s: any) => {
                  // Backend may use different field names — check all variants
                  const name = s.student_name || s.name || s.full_name || s.studentName || '—';
                  const admNo = s.admission_number || s.admission_num || s.admissionNumber || '';
                  const cls = s.class_name || s.className || '';
                  const sec = s.section_name || s.sectionName || '';
                  const parentNames = s.parent_names || s.parents || s.father_name || s.father_phone || null;
                  const due = Number(s.outstanding_amount || s.balance || 0);
                  const sid = s.student_id || s.id || s.studentId || '';
                  return (
                    <TouchableOpacity
                      key={sid}
                      style={[styles.studentCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                      onPress={() =>
                        router.push({
                          pathname: '/fees/collection/[studentId]',
                          params: { studentId: sid, name, admission: admNo, className: cls, section: sec },
                        } as any)
                      }
                    >
                      <View style={[styles.studentAvatar2, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="person" size={24} color={colors.primary} />
                      </View>
                      <Text style={[styles.studentCardName, { color: colors.foreground }]} numberOfLines={2}>
                        {name}
                      </Text>
                      <View style={styles.studentCardBadges}>
                        <View style={[styles.admBadge, { backgroundColor: colors.primary + '22' }]}>
                          <Text style={[styles.admBadgeText, { color: colors.primary }]}>{admNo}</Text>
                        </View>
                        <Text style={[styles.classBadge, { color: colors['muted-foreground'] }]}>
                          {cls}{sec ? ' ' + sec : ''}
                        </Text>
                      </View>
                      {parentNames ? (
                        <Text style={[styles.studentCardParent, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                          Parent: {parentNames}
                        </Text>
                      ) : null}
                      {due > 0 && (
                        <Text style={styles.studentCardDue}>Due: {formatINR(due)}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Initial empty state — before search */}
        {!searchTriggered && !selectedStudentId && (
          <View style={styles.emptyState}>
            <Ionicons name="search-circle-outline" size={64} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Search and select a student</Text>
            <Text style={[styles.emptySubText, { color: colors['muted-foreground'] }]}>to view their fee details</Text>
          </View>
        )}

      </View>
      </View>
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
  // Filter section
  filtersSection: { marginBottom: 8 },
  filterDropdowns: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterDropdownContainer: { marginBottom: 0 },
  filterDropdownBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterDropdownText: { fontSize: 14 },
  filterActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 8, gap: 6,
  },
  searchBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  clearBtn: {
    paddingHorizontal: 20, paddingVertical: 13, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  clearBtnText: { fontWeight: '600', fontSize: 14 },
  // Student grid
  studentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 2 },
  studentCard: {
    width: '47%', borderRadius: 12, padding: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  studentAvatar2: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  studentCardName: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  studentCardBadges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  admBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  admBadgeText: { fontSize: 10, fontWeight: '600' },
  classBadge: { fontSize: 11 },
  studentCardParent: { fontSize: 11, marginTop: 2 },
  studentCardDue: { fontSize: 11, color: '#EF4444', fontWeight: '600', marginTop: 2 },
  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  emptySubText: { fontSize: 13, textAlign: 'center' },
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


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function FeeCollectionScreen() {
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
      <FeeCollectionScreenContent />
    </ScreenAccessGate>
  );
}
