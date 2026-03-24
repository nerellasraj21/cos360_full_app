# Phase 2 — Missing Student / Parent Screens

**Prepared for:** App Developer
**Scope:** 2 new screen files + 1 API addition + 1 navigation update
**Status: ✅ COMPLETE**

> Phase 1 applied and tested. Phase 2 screens built and committed.

---

## What Gets Built

| # | File | Type | Description |
|---|---|---|---|
| 1 | `src/api/exam.ts` | Update | Add `getMyMarks` and `getChildMarks` functions (check if already there) |
| 2 | `app/fees/collection.tsx` | New file | Role-aware fee summary — Student/Parent/Admin views |
| 2b | `app/fees/collection.tsx` | Update | Admin view: extend with Fee Payment, Concessions, Old Fees tabs (⚠️ GAP added Mar 2026) |
| 3 | `app/exam/my-marks/[examId].tsx` | New file | Per-subject marks breakdown for Student and Parent |
| 4 | `app/exam/results.tsx` | Update | Redirect Student/Parent to My Marks instead of showing results grid |
| 5 | `app/transport/student-transport.tsx` | Update | Add Student/Parent read-only role views (⚠️ GAP added Mar 2026) |

---

## Step 1 — Check and update `src/api/exam.ts`

Open `src/api/exam.ts` and find `examResultsApi`. Check if these two functions already exist:

```ts
getMyMarks: async (examId: string) => ...      // GET /exams/{examId}/my-marks
getChildMarks: async (examId: string, studentId: string) => ...  // GET /exams/{examId}/child-marks/{studentId}
```

**If they are missing, add them inside `examResultsApi`:**

```ts
// Add the response types near the top of the file (if not already present):
export interface MarksComponentView {
  component_id: string;
  component_name: string;
  max_marks: number;
  marks_obtained: number | null;
  is_absent: boolean;
}

export interface MarksSubjectView {
  subject_id: string;
  subject_name: string;
  total_max_marks: number;
  total_obtained: number | null;
  is_absent: boolean;
  components: MarksComponentView[];
}

export interface StudentMarksView {
  student_id: string;
  student_name: string;
  exam_id: string;
  exam_name: string;
  subjects: MarksSubjectView[];
}

// Add to examResultsApi object:
getMyMarks: async (examId: string): Promise<StudentMarksView> => {
  const response = await apiClient.get(`/exams/${examId}/my-marks`);
  return response.data;
},

getChildMarks: async (examId: string, studentId: string): Promise<StudentMarksView> => {
  const response = await apiClient.get(`/exams/${examId}/child-marks/${studentId}`);
  return response.data;
},
```

---

## Step 2 — Create `app/fees/collection.tsx`

Create this as a **new file**. It is completely role-aware:

- **Student** → calls `getMySummary()` → read-only summary
- **Parent** → uses `selectedStudent` from auth → calls `getChildSummary()` → read-only summary
- **Admin/Staff/Teacher** → search bar → select student → calls `getSummary()` → summary view

```tsx
import { Ionicons } from '@expo/vector-icons';
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

export default function FeeCollectionScreen() {
  const { role, selectedStudent } = useAuth();
  const { colors, theme } = useTheme();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

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
            color: Number(data.grand_total_due) > 0 ? '#EF4444' : '#10B981'
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
                  color: Number(item.due_amount) > 0 ? '#EF4444' : '#10B981'
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
            }}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSelectedStudentId('');
              }}
            >
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
                <Text style={{ color: colors['muted-foreground'], fontSize: 13 }}>
                  No students found
                </Text>
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
                  <Text style={[styles.dropdownName, { color: colors.foreground }]}>
                    {s.student_name}
                  </Text>
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

        {/* Summary or empty state */}
        {adminLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : adminFeeSummary ? (
          <SummaryView data={adminFeeSummary} />
        ) : !selectedStudentId ? (
          <EmptyState
            icon="search-outline"
            message={'Search and select a student\nto view their fee details'}
          />
        ) : null}
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
});
```

---

## Step 3 — Create `app/exam/my-marks/[examId].tsx`

First create the folder `app/exam/my-marks/`, then create `[examId].tsx` inside it.

This screen shows per-subject marks with component breakdown. No write access — read-only for Student and Parent.

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { examResultsApi, MarksSubjectView } from '@/src/api/exam';

export default function MyMarksScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { role, selectedStudent, studentId } = useAuth();
  const { colors, theme } = useTheme();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // ── Student: own marks ────────────────────────────────────────────────────
  const { data: myMarks, isLoading: myLoading } = useQuery({
    queryKey: ['my-marks', examId],
    queryFn: () => examResultsApi.getMyMarks(examId),
    enabled: !isParent && !!examId,
  });

  // ── Parent: selected child's marks ────────────────────────────────────────
  const childId = selectedStudent?.id ?? '';
  const { data: childMarks, isLoading: childLoading } = useQuery({
    queryKey: ['child-marks', examId, childId],
    queryFn: () => examResultsApi.getChildMarks(examId, childId),
    enabled: isParent && !!examId && !!childId,
  });

  const marks = isParent ? childMarks : myMarks;
  const isLoading = isParent ? childLoading : myLoading;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getMarksColor = (obtained: number | null, max: number) => {
    if (obtained === null) return colors['muted-foreground'];
    const pct = (obtained / max) * 100;
    if (pct >= 75) return '#10B981';
    if (pct >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getOverallPct = () => {
    if (!marks?.subjects) return null;
    let totalMax = 0;
    let totalObtained = 0;
    let hasAny = false;
    for (const s of marks.subjects) {
      if (s.total_max_marks) totalMax += s.total_max_marks;
      if (s.total_obtained !== null) {
        totalObtained += s.total_obtained;
        hasAny = true;
      }
    }
    return hasAny && totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : null;
  };

  // ── Subject card renderer ─────────────────────────────────────────────────
  const SubjectCard = ({ subject }: { subject: MarksSubjectView }) => {
    const pct = subject.total_max_marks && subject.total_obtained !== null
      ? ((subject.total_obtained / subject.total_max_marks) * 100).toFixed(0)
      : null;
    const marksColor = subject.total_obtained !== null
      ? getMarksColor(subject.total_obtained, subject.total_max_marks)
      : colors['muted-foreground'];

    return (
      <View style={[styles.subjectCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        {/* Subject header */}
        <View style={styles.subjectHeader}>
          <Text style={[styles.subjectName, { color: colors.foreground }]}>
            {subject.subject_name}
          </Text>
          <View style={styles.subjectScore}>
            {subject.is_absent ? (
              <View style={[styles.badge, { backgroundColor: '#EF444418' }]}>
                <Text style={[styles.badgeText, { color: '#EF4444' }]}>Absent</Text>
              </View>
            ) : subject.total_obtained !== null ? (
              <>
                <Text style={[styles.subjectTotal, { color: marksColor }]}>
                  {subject.total_obtained}/{subject.total_max_marks}
                </Text>
                {pct && (
                  <Text style={[styles.subjectPct, { color: marksColor }]}>{pct}%</Text>
                )}
              </>
            ) : (
              <View style={[styles.badge, { backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Not entered</Text>
              </View>
            )}
          </View>
        </View>

        {/* Component breakdown */}
        {subject.components.length > 0 && (
          <View style={styles.components}>
            {subject.components.map((comp) => (
              <View key={comp.component_id} style={styles.componentRow}>
                <Text style={[styles.componentName, { color: colors['muted-foreground'] }]}>
                  {comp.component_name}
                </Text>
                <Text style={[
                  styles.componentMarks,
                  { color: comp.is_absent ? '#EF4444' : comp.marks_obtained !== null
                    ? getMarksColor(comp.marks_obtained, comp.max_marks)
                    : colors['muted-foreground'] }
                ]}>
                  {comp.is_absent
                    ? 'Absent'
                    : comp.marks_obtained !== null
                    ? `${comp.marks_obtained}/${comp.max_marks}`
                    : '—'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── No child selected (parent) ────────────────────────────────────────────
  if (isParent && !childId) {
    return (
      <AppLayout title="My Marks">
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            {'No student selected.\nUse the selector in the header.'}
          </Text>
        </View>
      </AppLayout>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <AppLayout title="My Marks">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  // ── No data ───────────────────────────────────────────────────────────────
  if (!marks) {
    return (
      <AppLayout title="My Marks">
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            No marks available yet.{'\n'}Marks will appear after your teacher enters them.
          </Text>
        </View>
      </AppLayout>
    );
  }

  const overallPct = getOverallPct();

  return (
    <AppLayout title="My Marks">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerExamName}>{marks.exam_name}</Text>
          <Text style={styles.headerStudentName}>{marks.student_name}</Text>
          {overallPct && (
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Overall</Text>
              <Text style={styles.overallPct}>{overallPct}%</Text>
            </View>
          )}
        </View>

        {/* Subject cards */}
        <View style={styles.subjectList}>
          {marks.subjects.map((subject) => (
            <SubjectCard key={subject.subject_id} subject={subject} />
          ))}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
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
  headerCard: {
    backgroundColor: '#556ee6',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
  },
  headerExamName: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerStudentName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  overallLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  overallPct: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  subjectList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  subjectCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  subjectScore: {
    alignItems: 'flex-end',
  },
  subjectTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  subjectPct: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  components: {
    marginTop: 10,
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentName: {
    fontSize: 13,
    flex: 1,
  },
  componentMarks: {
    fontSize: 13,
    fontWeight: '600',
  },
});
```

---

## Step 4 — Update `app/exam/results.tsx` to redirect Student/Parent

Open `app/exam/results.tsx` and add a role check near the top. Students and Parents should see "View My Marks" navigation rather than the admin results grid.

**Add these imports at the top:**
```tsx
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts';
```

**Add inside the component function (near the top, before any return):**
```tsx
const router = useRouter();
const { role } = useAuth();
const roleName = role?.name?.toLowerCase() ?? '';
const isStudentOrParent =
  roleName === 'student' ||
  ['parent', 'guardian', 'father', 'mother'].includes(roleName);
```

**For the exam selection area:** When a student/parent selects an exam and taps the action button, navigate to my-marks instead:
```tsx
// When rendering the exam list chips for student/parent, change the onPress:
onPress={() => {
  if (isStudentOrParent) {
    router.push(`/exam/my-marks/${e.id}`);
  } else {
    setSelectedExamId(e.id);
  }
}}
```

Or, if you prefer a cleaner approach — add a role gate at the top of the component:
```tsx
// If student/parent and an examId was passed as param, redirect immediately
if (isStudentOrParent && examId) {
  router.replace(`/exam/my-marks/${examId}`);
  return null;
}
```

---

## Checklist

- [x] Step 1: `examResultsApi.getMyMarks` and `getChildMarks` confirmed/added in `src/api/exam.ts`
- [x] Step 1: `StudentMarksView`, `MarksSubjectView`, `MarksComponentView` types added
- [x] Step 2: `app/fees/collection.tsx` created
- [x] Step 2: Tested — Student login shows own fee summary
- [x] Step 2: Tested — Parent login shows selected child's fee summary
- [x] Step 2: Tested — Admin login: search student → see fee summary
- [ ] Step 2b: Admin view extended with Fee Payment tab (record payment form) ⚠️ GAP — verify
- [ ] Step 2b: Admin view extended with Concessions tab (apply discount/waiver) ⚠️ GAP — verify
- [ ] Step 2b: Admin view extended with Old Fees tab (carry-forward balance) ⚠️ GAP — verify
- [x] Step 3: Folder `app/exam/my-marks/` created
- [x] Step 3: `app/exam/my-marks/[examId].tsx` created
- [x] Step 3: Tested — Student sees per-subject marks with components
- [x] Step 3: Tested — Parent with selected student sees child's marks
- [x] Step 3: Tested — Absent subjects show "Absent" badge
- [x] Step 3: Tested — Unsubmitted marks show "Not entered" badge
- [x] Step 4: `app/exam/results.tsx` updated to redirect student/parent
- [ ] Step 5: Student Transport — Student role shows own assignment (read-only) ⚠️ GAP — verify
- [ ] Step 5: Student Transport — Parent role shows child selector + child's assignment ⚠️ GAP — verify

---

## ⚠️ GAP — Step 2b: Fee Collection Admin — Missing Tabs (added Mar 2026)

> The original Step 2 only built the **Fee Summary** tab for Admin. Three more tabs are required per `FRONTEND_REQUIREMENTS.md §6.4.1`.

Inside the Admin view of `app/fees/collection.tsx`, after the student is selected and `adminFeeSummary` is loaded, replace the single `<SummaryView>` with a **4-tab layout**:

```tsx
type AdminTab = 'summary' | 'payment' | 'concessions' | 'old-fees';
const [adminTab, setAdminTab] = useState<AdminTab>('summary');

const ADMIN_TABS: { key: AdminTab; label: string }[] = [
  { key: 'summary',     label: 'Fee Summary' },
  { key: 'payment',     label: 'Fee Payment' },
  { key: 'concessions', label: 'Concessions' },
  { key: 'old-fees',    label: 'Old Fees' },
];
```

Render a horizontal tab strip above the content when a student is selected:

```tsx
{selectedStudentId && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminTabBar}>
    {ADMIN_TABS.map(tab => (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.adminTab,
          adminTab === tab.key && { backgroundColor: '#556ee6', borderRadius: 8 },
        ]}
        onPress={() => setAdminTab(tab.key)}
      >
        <Text style={{ color: adminTab === tab.key ? 'white' : colors['muted-foreground'], fontWeight: '600', fontSize: 13 }}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}
```

**Tab 2 — Fee Payment form:**

```tsx
// API: POST /fee/transactions
// Payload: { student_id, fee_type_id, amount, payment_date, payment_mode, receipt_number, remarks }
const [paymentForm, setPaymentForm] = useState({
  fee_type_id: '',
  amount: '',
  payment_date: new Date().toISOString().slice(0, 10),
  payment_mode: 'cash',
  receipt_number: '',
  remarks: '',
});
```

Render the payment form with:
- `fee_type_id` — `CustomDropdown` populated from `adminFeeSummary.items` (each item = a fee type)
- `amount` — numeric `TextInput`
- `payment_date` — text input (YYYY-MM-DD) or DateTimePicker
- `payment_mode` — chip selector: `cash | cheque | online | dd`
- `receipt_number` — text input (optional)
- `remarks` — multiline text input (optional)
- Submit button → `POST /fee/transactions` → invalidate fee summary query → switch to summary tab

**Tab 3 — Concessions:**

```tsx
// API: POST /fee/concessions
// Payload: { student_id, fee_type_id, amount, concession_type, reason }
```

Form fields:
- `fee_type_id` — dropdown from summary items
- `amount` — numeric input
- `concession_type` — chip selector: `scholarship | waiver | discount`
- `reason` — multiline text input

**Tab 4 — Old Fees:**

```tsx
// API: GET /fee/old-fees?student_id={id}
// Display: list of carry-forward balances from previous academic years
```

Read-only `FlatList` showing:
- Academic year, fee type, original amount, paid, balance
- If `data.old_fee_pending_amount > 0` in summary → show warning banner at top

**Styles to add:**
```ts
adminTabBar: { paddingHorizontal: 16, paddingVertical: 8 },
adminTab: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 6 },
```

---

## ⚠️ GAP — Step 5: Student Transport Role-Aware Views (added Mar 2026)

> `FRONTEND_REQUIREMENTS.md §6.7.6` requires Student and Parent role views. Phase 1 only fixed the Admin CRUD. This step adds the read-only views.

Open `app/transport/student-transport.tsx`. At the top of the component function, add role detection:

```tsx
const { role, selectedStudent } = useAuth();
const roleName = role?.name?.toLowerCase() ?? '';
const isStudent = roleName === 'student';
const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
```

**Student view** — wrap the existing return in a role check:

```tsx
// API: GET /masters/student-transport?student_id={own student_id from auth}
// The student_id comes from auth context (entityId or studentId)
const { studentId } = useAuth();

const { data: myTransport, isLoading: myLoading } = useQuery({
  queryKey: ['my-transport'],
  queryFn: () => transportApi.getStudentTransport({ student_id: studentId }),
  enabled: isStudent && !!studentId,
});

if (isStudent) {
  const assignment = myTransport?.[0]; // student has one assignment
  return (
    <AppLayout title="My Transport">
      {myLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#556ee6" /></View>
      ) : assignment ? (
        <View style={styles.assignmentCard}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            Route: {assignment.route_name ?? assignment.route_id}
          </Text>
          <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
            Stop: {assignment.stop_name ?? assignment.stop_id}
          </Text>
          {assignment.stop?.pickup_time && (
            <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
              Pickup: {assignment.stop.pickup_time}
            </Text>
          )}
          {assignment.stop?.drop_time && (
            <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
              Drop: {assignment.stop.drop_time}
            </Text>
          )}
          {assignment.pricing && (
            <Text style={[styles.cardSub, { color: '#10B981' }]}>
              Fee: ₹{Number(assignment.pricing.amount).toLocaleString('en-IN')}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.centered}>
          <Ionicons name="bus-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            No transport assigned
          </Text>
        </View>
      )}
    </AppLayout>
  );
}
```

**Parent view** — similar to student but uses `selectedStudent` from auth:

```tsx
const childId = selectedStudent?.id ?? '';

const { data: childTransport, isLoading: childLoading } = useQuery({
  queryKey: ['child-transport', childId],
  queryFn: () => transportApi.getStudentTransport({ student_id: childId }),
  enabled: isParent && !!childId,
});

if (isParent) {
  // Same card render as student view but using childTransport
  // Show "No student selected" if !childId
}
```

**Admin/Staff** — show the existing CRUD table (already built in Phase 1).

---

Last updated: March 2026
