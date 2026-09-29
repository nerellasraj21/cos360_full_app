import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { castesApi } from '@/src/api';
import { locationCascadeApi } from '@/src/api/masters';
import { useAcademicYears } from '@/src/api/hooks/masters/academicYears';
import { useClassSections } from '@/src/api/hooks/masters/classesAndSections';
import { useMyAdmission, useAdmissionByStudentId } from '@/src/api/hooks/students/admissions';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const mediaBase = API_BASE.replace(/\/api\/v\d+$/, '');

/** Build a full URI for a student photo_url from the backend */
const buildPhotoUri = (photoUrl: string | null | undefined): string | null => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${mediaBase}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`;
};

const NA = 'N/A';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v?: string | null): boolean => !!v && UUID_RE.test(v);

const formatDate = (d?: string | null): string =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString() : NA;

// Same mapping as the web view modal (AdmissionTable.tsx formatGender).
const formatGender = (g?: string | null): string => {
  if (!g) return NA;
  const map: Record<string, string> = {
    M: 'Male', F: 'Female', O: 'Other',
    male: 'Male', female: 'Female', other: 'Other',
  };
  return map[g] ?? g.charAt(0).toUpperCase() + g.slice(1);
};

type DetailRow = { label: string; value: string };
type DetailSection = { title: string; rows: DetailRow[] };

// Renders one student's full admission record — mirrors the web app's
// "Admission Details" view modal (AdmissionTable.tsx getAdmissionDetails):
// same fields, same order, same N/A fallbacks, grouped under headings so the
// list stays readable on a phone. Shared by the student's own view
// (StudentAdmissionView, below) and the parent's single-child view
// (ParentAdmissionView, below) — the only difference between them is which
// query supplies `admission`.
function AdmissionRecordDetail({ admission, isLoading }: { admission: any; isLoading: boolean }) {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const a = (admission ?? {}) as any;
  const s = (a.student ?? {}) as any;

  // Sections collapse to keep the scroll short, same accordion idiom as the
  // admission form (admission.tsx). The first section starts open.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Admission Details']));
  const toggleSection = (key: string) => setOpenSections((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // Name lookups for the ids the admission stores. Classes and academic years
  // are always needed; the location/caste dropdowns only fire when the record
  // actually carries that id, so an admission without them costs no requests.
  const { data: classes } = useClassSections();
  const { data: academicYears } = useAcademicYears();

  const stateId = a.state_id || (isUuid(a.state) ? a.state : '');
  const districtId = a.district_id || '';
  const mandalId = a.mandal_id || '';
  const casteId = s.caste_id || (isUuid(s.caste) ? s.caste : '');
  const subCasteId = s.sub_caste_id || (isUuid(s.sub_caste) ? s.sub_caste : '');

  const { data: states } = useQuery({
    queryKey: ['states-dropdown'],
    queryFn: () => locationCascadeApi.getStatesDropdown(),
    enabled: !!stateId,
  });

  const { data: districts } = useQuery({
    queryKey: ['view-districts-dropdown', stateId],
    queryFn: () => locationCascadeApi.getDistrictsByState(stateId),
    enabled: !!stateId && !!districtId,
  });

  const { data: mandals } = useQuery({
    queryKey: ['view-mandals-dropdown', districtId],
    queryFn: () => locationCascadeApi.getMandalsByDistrict(districtId),
    enabled: !!districtId && !!mandalId,
  });

  // active_only false so an inactive caste still resolves to its name, same as web.
  const { data: castes } = useQuery({
    queryKey: ['castes-dropdown-all'],
    queryFn: () => castesApi.getCastesDropdown(false),
    enabled: !!casteId,
  });

  const { data: subCastes } = useQuery({
    queryKey: ['sub-castes-dropdown-all', casteId],
    queryFn: () => castesApi.getSubCastesDropdown(casteId, false),
    enabled: !!casteId && !!subCasteId,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#556ee6" />
      </View>
    );
  }

  if (!admission) {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
        <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
          No admission record found.
        </Text>
      </View>
    );
  }

  const getClassName = (classId?: string | null): string => {
    if (!classId) return NA;
    return (classes as any[] | undefined)?.find((c) => c.id === classId)?.name ?? NA;
  };

  const getSectionName = (classId?: string | null, sectionId?: string | null): string => {
    if (!sectionId) return NA;
    const cls = (classes as any[] | undefined)?.find((c) => c.id === classId);
    return cls?.sections?.find((sec: any) => sec.id === sectionId)?.name ?? NA;
  };

  const getYearName = (yearId?: string | null): string => {
    if (!yearId) return NA;
    return (academicYears as any[] | undefined)?.find((y) => String(y.id) === String(yearId))?.title ?? NA;
  };

  // Resolve an id against a dropdown list; fall back to the raw value when it is
  // already a plain name rather than a UUID.
  const lookupName = (
    raw: string | null | undefined,
    id: string,
    list: any[] | undefined,
  ): string => {
    if (!raw && !id) return NA;
    const found = list?.find((o) => o.id === id)?.name;
    if (found) return found;
    return raw && !isUuid(raw) ? raw : NA;
  };

  const sections: DetailSection[] = [
    {
      title: 'Admission Details',
      rows: [
        { label: 'Admission Number', value: a.admission_number ?? NA },
        { label: 'Admission Date', value: formatDate(a.admission_date) },
        { label: 'Academic Year', value: getYearName(a.admitted_academic_year_id ?? a.academic_year_id) },
        { label: 'Admitted Class', value: getClassName(a.admitted_class_id) },
        { label: 'Admitted Section', value: getSectionName(a.admitted_class_id, a.admitted_section_id) },
        { label: 'Current Class', value: getClassName(a.current_class_id) },
        { label: 'Current Section', value: getSectionName(a.current_class_id, a.current_section_id) },
      ],
    },
    {
      title: 'Address',
      rows: [
        { label: 'Address Line 1', value: a.address_line1 || NA },
        { label: 'Address Line 2', value: a.address_line2 || NA },
        { label: 'City', value: a.city || NA },
        { label: 'State', value: lookupName(a.state, stateId, states as any[]) },
        { label: 'District', value: lookupName(null, districtId, districts as any[]) },
        { label: 'Mandal', value: lookupName(null, mandalId, mandals as any[]) },
      ],
    },
    {
      title: 'Student Details',
      rows: [
        { label: 'Student Name', value: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || NA },
        { label: 'Date of Birth', value: formatDate(s.date_of_birth) },
        { label: 'Gender', value: formatGender(s.gender) },
        { label: 'Aadhar Number', value: s.aadhar_number || NA },
        { label: 'APAAR Number', value: s.apaar_number || NA },
        { label: 'Primary Phone', value: s.primary_phone || NA },
        { label: 'Caste', value: lookupName(s.caste, casteId, castes as any[]) },
        { label: 'Sub Caste', value: lookupName(s.sub_caste, subCasteId, subCastes as any[]) },
        { label: 'Community', value: s.community || NA },
        { label: 'Nationality', value: s.nationality || NA },
        { label: 'Mother Tongue', value: s.mother_tongue || NA },
        { label: 'Identification Marks', value: s.identification_marks || NA },
      ],
    },
    {
      title: 'Parent & Guardian Details',
      rows: [
        { label: 'Father Name', value: s.father?.name ?? a.father?.name ?? NA },
        { label: 'Father Email', value: s.father?.email ?? a.father?.email ?? NA },
        { label: 'Father Phone', value: s.father?.phone ?? a.father?.phone ?? NA },
        { label: 'Father Occupation', value: s.father?.occupation ?? a.father?.occupation ?? NA },
        { label: 'Father Aadhar', value: s.father?.aadhar_number ?? a.father?.aadhar_number ?? NA },
        { label: 'Father Gender', value: formatGender(s.father?.gender ?? a.father?.gender) },
        { label: 'Mother Name', value: s.mother?.name ?? a.mother?.name ?? NA },
        { label: 'Mother Email', value: s.mother?.email ?? a.mother?.email ?? NA },
        { label: 'Mother Phone', value: s.mother?.phone ?? a.mother?.phone ?? NA },
        { label: 'Mother Occupation', value: s.mother?.occupation ?? a.mother?.occupation ?? NA },
        { label: 'Mother Aadhar', value: s.mother?.aadhar_number ?? a.mother?.aadhar_number ?? NA },
        { label: 'Mother Gender', value: formatGender(s.mother?.gender ?? a.mother?.gender) },
        { label: 'Guardian Name', value: s.guardian?.name ?? a.guardian?.name ?? NA },
        { label: 'Guardian Email', value: s.guardian?.email ?? a.guardian?.email ?? NA },
        { label: 'Guardian Phone', value: s.guardian?.phone ?? a.guardian?.phone ?? NA },
        { label: 'Guardian Occupation', value: s.guardian?.occupation ?? a.guardian?.occupation ?? NA },
        { label: 'Guardian Aadhar', value: s.guardian?.aadhar_number ?? a.guardian?.aadhar_number ?? NA },
        { label: 'Guardian Gender', value: formatGender(s.guardian?.gender ?? a.guardian?.gender) },
      ],
    },
    // Web only shows these when the admission records a previous school.
    ...(a.is_previous_school
      ? [{
          title: 'Previous School',
          rows: [
            { label: 'Previous School Name', value: a.previous_school_name || NA },
            { label: 'Previous Class', value: a.previous_class || NA },
            { label: 'Previous School Remark', value: a.previous_school_remark || NA },
          ],
        }]
      : []),
  ];

  const photoUri = buildPhotoUri(s.photo_url);
  const fullName = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();

  return (
    <>
      {/* Photo + name header, same as the web modal */}
      <View style={[styles.card, styles.avatarSection, { backgroundColor: cardBg, borderColor: borderCol }]}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={[styles.avatarImage, { borderColor: borderCol }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.muted, borderColor: borderCol }]}>
            <Ionicons name="person-circle-outline" size={64} color={colors['muted-foreground']} />
          </View>
        )}
        <Text style={[styles.avatarName, { color: colors.foreground }]}>{fullName || NA}</Text>
        {!!a.admission_number && (
          <Text style={[styles.avatarSub, { color: colors['muted-foreground'] }]}>
            Admission Details - {a.admission_number}
          </Text>
        )}
      </View>

      {sections.map((section) => {
        const isOpen = openSections.has(section.title);
        return (
          <View key={section.title} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => toggleSection(section.title)}
              activeOpacity={0.75}
            >
              <Text style={[styles.sectionTitle, { color: colors['muted-foreground'] }]}>
                {section.title}
              </Text>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors['muted-foreground']}
              />
            </TouchableOpacity>
            {isOpen && section.rows.map(({ label, value }, idx) => (
              <View
                key={label}
                style={[
                  styles.row,
                  {
                    borderBottomColor: borderCol,
                    borderBottomWidth: idx === section.rows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text style={[styles.rowLabel, { color: colors['muted-foreground'] }]}>{label}</Text>
                <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

// Student's own admission record — data comes from
// GET /students/admission/my-admission, which the backend scopes to the
// logged-in student.
function StudentAdmissionView() {
  const { data: admission, isLoading } = useMyAdmission();
  return <AdmissionRecordDetail admission={admission} isLoading={isLoading} />;
}

// Parent's view — one child's full admission record, same detail layout as
// the student's own view above. The active child is chosen via the header's
// student switcher / the Select Child screen (useAuth().selectedStudent),
// not a page-local picker, so this stays in sync with every other parent
// screen (Attendance, Documents, Fees).
function ParentAdmissionView() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { selectedStudent, availableStudents } = useAuth();
  const { data: admission, isLoading } = useAdmissionByStudentId(selectedStudent?.id ?? '');

  if (availableStudents.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
        <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
          No children linked to your account.
        </Text>
      </View>
    );
  }

  if (!selectedStudent) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
        <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
          No child selected.
        </Text>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/parents/select-child' as any)}>
          <Text style={{ color: '#556ee6', fontWeight: '600' }}>Select a child</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AdmissionRecordDetail admission={admission} isLoading={isLoading} />;
}

function MyAdmissionScreenContent() {
  const { role, selectedStudent } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
  const title = isParent
    ? `Admission${selectedStudent ? ` — ${selectedStudent.name ?? ''}` : ''}`
    : 'My Admission';

  return (
    <AppLayout title={title}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isParent ? <ParentAdmissionView /> : <StudentAdmissionView />}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  centeredText: { fontSize: 15, textAlign: 'center' },
  linkBtn: { marginTop: 4, padding: 8 },

  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  childName: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, flex: 1,
  },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  rowLabel: { fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 18 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarName: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  avatarSub: { fontSize: 12, textAlign: 'center' },
});

// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function MyAdmissionScreen() {
  return (
    <ScreenAccessGate
      title="Admissions"
      permissions={[
        ['student_admissions', 'read_own'],
        ['student_admissions', 'list_own'],
        ['student_admissions', 'read_related'],
        ['student_admissions', 'list_related'],
      ]}
    >
      <MyAdmissionScreenContent />
    </ScreenAccessGate>
  );
}
