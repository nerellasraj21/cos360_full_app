import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IOSDatePickerModal } from '@/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { studentAdmissionsApi, classSectionsApi, academicYearsApi, castesApi, parentsApi, StudentAdmissionCreate, StudentAdmissionUpdate } from '@/src/api';
import { locationCascadeApi } from '@/src/api/masters';
import { useCreateAdmission, useUpdateAdmission, useAdmissionByStudentId, useAdmissions, useStudentsSearch } from '@/src/api/hooks/students/admissions';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const mediaBase = API_BASE.replace(/\/api\/v\d+$/, '');

/** Build a full URI for a student/staff photo_url from the backend */
const buildPhotoUri = (photoUrl: string | null | undefined): string | null => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${mediaBase}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`;
};

const isValidDate = (d: string) => !isNaN(new Date(d).getTime()) && !!d.match(/^\d{4}-\d{2}-\d{2}$/);
const isFutureDate = (d: string) => { const [y, m, day] = d.split('-').map(Number); const dt = new Date(y, m - 1, day); const today = new Date(); today.setHours(0,0,0,0); return dt > today; };
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidAadhar = (a: string) => /^\d{12}$/.test(a);

// Phone is optional unless `required` is true (mirrors web's "Primary" toggle);
// when a value is present it must be exactly 10 digits.
const validatePhone = (value: string | undefined, required: boolean): string | undefined => {
  if (!value || value.trim() === '') return required ? 'Phone number is required' : undefined;
  if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
  if (value.length !== 10) return `Must be exactly 10 digits — you entered ${value.length}`;
  return undefined;
};

// Increments a purely numeric admission number, preserving zero-padding/length.
const incrementAdmissionNumber = (value: string): string => {
  if (!/^\d+$/.test(value)) return value;
  const next = (BigInt(value) + BigInt(1)).toString();
  return next.padStart(value.length, '0');
};


// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  admission_number: string;
  admission_date: string;
  admission_type: string;
  academic_year_id: string;
  admitted_academic_year_id: string;
  admitted_class_id: string;
  admitted_section_id: string;
  current_class_id: string;
  current_section_id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_id: string;     // UUID from states dropdown
  district_id: string;  // UUID from districts dropdown (cascade)
  mandal_id: string;    // UUID from mandals dropdown (cascade)
  pincode?: string;
  is_previous_school?: boolean;
  previous_school_name?: string;
  previous_class?: string;
  previous_school_remark?: string;
  student: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    is_primary?: string;
    aadhar_number?: string;
    apaar_number?: string;
    caste_id?: string;
    sub_caste_id?: string;
    community?: string;
    nationality?: string;
    mother_tongue?: string;
    identification_marks?: string;
  };
  father: {
    name: string;
    email?: string;
    phone?: string;
    occupation?: string;
    salary_range?: string;
    aadhar_number?: string;
    gender?: string;
    relation_to_student: string;
  };
  mother: {
    name: string;
    email?: string;
    phone?: string;
    occupation?: string;
    salary_range?: string;
    aadhar_number?: string;
    gender?: string;
    relation_to_student: string;
  };
  guardian: {
    name: string;
    email?: string;
    phone?: string;
    occupation?: string;
    salary_range?: string;
    aadhar_number?: string;
    gender?: string;
    relation_to_student: string;
  };
}

const SALARY_RANGE_OPTIONS = [
  { label: 'Below 1L', value: 'below_1l' },
  { label: '1L - 3L', value: '1l_3l' },
  { label: '3L - 5L', value: '3l_5l' },
  { label: '5L - 10L', value: '5l_10l' },
  { label: 'Above 10L', value: 'above_10l' },
];

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

// Step order mirrors the web app exactly: Student & Academic Details are one
// combined step, followed by Parent Information, Address, Previous School, Review.
const STEPS = [
  'Student & Academic Details',
  'Parent Information',
  'Address Details',
  'Previous School',
  'Review & Submit',
];

const INITIAL_FORM: FormData = {
  admission_number: '',
  admission_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
  admission_type: 'regular',
  academic_year_id: '',
  admitted_academic_year_id: '',
  admitted_class_id: '',
  admitted_section_id: '',
  current_class_id: '',
  current_section_id: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state_id: '',
  district_id: '',
  mandal_id: '',
  pincode: '',
  is_previous_school: false,
  previous_school_name: '',
  previous_class: '',
  previous_school_remark: '',
  student: {
    first_name: '', last_name: '', date_of_birth: '', gender: '',
    is_primary: 'not_primary', aadhar_number: '', apaar_number: '',
    caste_id: '', sub_caste_id: '', community: '', nationality: '',
    mother_tongue: '', identification_marks: '',
  },
  father: { name: '', email: '', phone: '', occupation: '', salary_range: '', aadhar_number: '', gender: '', relation_to_student: 'Father' },
  mother: { name: '', email: '', phone: '', occupation: '', salary_range: '', aadhar_number: '', gender: '', relation_to_student: 'Mother' },
  guardian: { name: '', email: '', phone: '', occupation: '', salary_range: '', aadhar_number: '', gender: '', relation_to_student: 'Guardian' },
};

// ─── Table column widths ──────────────────────────────────────────────────────
// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StudentAdmissionScreen() {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const router = useRouter();
  const { id: studentId } = useLocalSearchParams<{ id?: string }>();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const queryClient = useQueryClient();

  const cardBg = themeColors.card;
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const BLUE = '#3B82F6';

  // ── view mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [currentStep, setCurrentStep] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<any>({});
  const [sameAsAdmission, setSameAsAdmission] = useState(false);

  // ── Accordion state — Student & Academic Details (step 0) and Father/Mother/
  // Guardian (step 1) collapse into accordion sections to reduce scroll length.
  // Required-field sections (Student, Father) start open; the rest start closed
  // but auto-expand if validation finds an error inside them (see handleNext).
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['student', 'father']));
  const toggleSection = (key: string) => setOpenSections(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  // ── "Primary" phone toggles — mirrors web: father's phone is mandatory by
  // default (Primary contact), mother's/guardian's are optional unless toggled.
  const [fatherPhoneRequired, setFatherPhoneRequired] = useState(true);
  const fatherPhoneRequiredRef = React.useRef(true);
  const [motherPhoneRequired, setMotherPhoneRequired] = useState(false);
  const motherPhoneRequiredRef = React.useRef(false);
  const [guardianPhoneRequired, setGuardianPhoneRequired] = useState(false);
  const guardianPhoneRequiredRef = React.useRef(false);

  // editStudentId: set when Edit is clicked from list (bypasses useAdmissionByStudentId re-fetch)
  const [editStudentId, setEditStudentId] = useState<string>('');
  // Resolved student ID for mutations — list-click takes priority over URL param
  const activeStudentId = editStudentId || studentId || '';

  // ── photo ──────────────────────────────────────────────────────────────────
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; mimeType: string } | null>(null);

  const pickPhoto = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: false });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPendingPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  };

  // ── date picker ────────────────────────────────────────────────────────────
  const [activeDateField, setActiveDateField] = useState<string | null>(null);
  const [dateDisplayValues, setDateDisplayValues] = useState<Record<string, string>>({});

  const toDisplayDMY = (iso: string): string => {
    if (!iso?.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  const autoFormatDate = (t: string): string => {
    const d = t.replace(/\D/g, '').slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  };
  const parseDMY = (s: string): string | null => {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return null;
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    return isNaN(new Date(iso + 'T00:00:00').getTime()) ? null : iso;
  };

  // ── list state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── view modal ─────────────────────────────────────────────────────────────
  const [selectedViewAdmission, setSelectedViewAdmission] = useState<any>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: classesData } = useQuery({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const data = await classSectionsApi.getClassList();
      return data.map((item: any) => ({ label: item.name || '', value: item.id }));
    },
  });

  const { data: allClassSectionsData = [] } = useQuery({
    queryKey: ['all-classes-sections'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: false }),
    staleTime: 5 * 60 * 1000,
  });

  // Flat section list for reliable section-id → name lookup (sections may not be nested in ClassRead)
  const { data: allSectionsFlat = [] } = useQuery({
    queryKey: ['all-sections-flat'],
    queryFn: () => classSectionsApi.getClassSectionList(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections-for-admitted', formData.admitted_class_id],
    queryFn: () => classSectionsApi.getSectionsByClass(formData.admitted_class_id),
    enabled: !!formData.admitted_class_id,
    select: (d) => d.map((s: any) => ({ label: s.name || '', value: s.id })),
  });

  const { data: currentSectionsData } = useQuery({
    queryKey: ['sections-for-current', formData.current_class_id],
    queryFn: () => classSectionsApi.getSectionsByClass(formData.current_class_id),
    enabled: !!formData.current_class_id,
    select: (d) => d.map((s: any) => ({ label: s.name || '', value: s.id })),
  });

  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years-dropdown'],
    queryFn: async () => {
      const data = await academicYearsApi.getAcademicYearsDropdown();
      return data.map((item: any) => ({ label: item.title || '', value: item.id }));
    },
  });

  const { data: admissionTypesData } = useQuery({
    queryKey: ['admission-types-dropdown'],
    queryFn: () => studentAdmissionsApi.getAdmissionTypesDropdown(),
    staleTime: 10 * 60 * 1000,
  });

  // ── Admission Number — next-number hint + duplicate check (mirrors web) ─────
  const apiAdmissionType: 'pre_primary' | 'regular' =
    formData.admission_type === 'pre_primary' ? 'pre_primary' : 'regular';

  const { data: admissionHint } = useQuery({
    queryKey: ['next-admission-number', apiAdmissionType],
    queryFn: () => studentAdmissionsApi.getNextAdmissionNumber(apiAdmissionType),
    staleTime: 60 * 1000,
    enabled: !isEditMode,
  });

  const [isCheckingNum, setIsCheckingNum] = useState(false);
  const [isVerifyingNextNumber, setIsVerifyingNextNumber] = useState(false);
  const [verifiedNextNumber, setVerifiedNextNumber] = useState<string | null>(null);

  const admissionNumberExists = async (value: string): Promise<boolean> => {
    try {
      const results = await studentAdmissionsApi.searchStudents(value);
      return results.some((r: any) => (r.admission_number ?? '').toLowerCase() === value.toLowerCase());
    } catch {
      return false; // network error — assume free; backend will catch on submit
    }
  };

  // On-blur duplicate check against the search endpoint
  const checkAdmissionNumberExists = async (value: string) => {
    if (!value.trim()) return;
    setIsCheckingNum(true);
    try {
      const duplicate = await admissionNumberExists(value.trim());
      setErrors((prev: any) => ({ ...prev, admission_number: duplicate ? 'Admission number already exists. Please use a different number.' : undefined }));
    } finally {
      setIsCheckingNum(false);
    }
  };

  // Verify the backend's suggested number against existing students; if it's
  // already taken, keep incrementing until a free one is found, then auto-fill
  // it when the field is empty (create mode only).
  useEffect(() => {
    if (isEditMode || !admissionHint?.next_number) return;
    let cancelled = false;
    (async () => {
      setIsVerifyingNextNumber(true);
      let candidate = admissionHint.next_number;
      for (let attempts = 0; attempts < 50; attempts++) {
        const exists = await admissionNumberExists(candidate);
        if (!exists) break;
        candidate = incrementAdmissionNumber(candidate);
      }
      if (cancelled) return;
      setVerifiedNextNumber(candidate);
      setFormData(prev => (prev.admission_number.trim() ? prev : { ...prev, admission_number: candidate }));
      setIsVerifyingNextNumber(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionHint?.next_number, isEditMode]);

  const { data: castesDropdownData } = useQuery({
    queryKey: ['castes-dropdown'],
    queryFn: async () => {
      const data = await castesApi.getCastesDropdown();
      return data.map((item: any) => ({ label: item.name || '', value: item.id }));
    },
  });

  const { data: subCastesDropdownData } = useQuery({
    queryKey: ['sub-castes-dropdown', formData.student.caste_id],
    queryFn: async () => {
      const data = await castesApi.getSubCastesDropdown(formData.student.caste_id!);
      return data.map((item: any) => ({ label: item.name || '', value: item.id }));
    },
    enabled: !!formData.student.caste_id,
  });

  const { data: salaryRangesData = SALARY_RANGE_OPTIONS } = useQuery({
    queryKey: ['salary-ranges-dropdown'],
    queryFn: async () => {
      const data = await parentsApi.getSalaryRangesDropdown();
      return data.map((item) => ({ label: item.label || '', value: item.value }));
    },
    staleTime: 30 * 60 * 1000,
  });

  // ── Location cascade: States → Districts → Mandals ─────────────────────────
  const { data: statesData, isLoading: isLoadingStates } = useQuery({
    queryKey: ['states-dropdown'],
    queryFn: () => locationCascadeApi.getStatesDropdown(),
    staleTime: 30 * 60 * 1000,
  });

  const { data: districtsData, isLoading: isLoadingDistricts } = useQuery({
    queryKey: ['districts-dropdown', formData.state_id],
    queryFn: () => locationCascadeApi.getDistrictsByState(formData.state_id),
    enabled: !!formData.state_id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: mandalsData, isLoading: isLoadingMandals } = useQuery({
    queryKey: ['mandals-dropdown', formData.district_id],
    queryFn: () => locationCascadeApi.getMandalsByDistrict(formData.district_id),
    enabled: !!formData.district_id,
    staleTime: 10 * 60 * 1000,
  });

  // Pre-compute dropdown option lists for rendering and summary
  const statesOptions = (statesData ?? []).map(s => ({ label: s.name || '', value: s.id }));
  const districtsOptions = (districtsData ?? []).map(d => ({ label: d.name || '', value: d.id }));
  const mandalsOptions = (mandalsData ?? []).map(m => ({ label: m.name || '', value: m.id }));

  // Sub-castes for view modal (keyed on selected admission's caste_id, not form data)
  const viewCasteId = selectedViewAdmission?.student?.caste_id;
  const { data: viewSubCastesData } = useQuery({
    queryKey: ['sub-castes-dropdown', viewCasteId],
    queryFn: async () => {
      const data = await castesApi.getSubCastesDropdown(viewCasteId!);
      return data.map((item: any) => ({ label: item.name || '', value: item.id }));
    },
    enabled: !!viewCasteId,
  });

  // Location lookups for view modal (keyed on selected admission's state_id / district_id)
  const viewStateId = selectedViewAdmission?.state_id ?? selectedViewAdmission?.state ?? '';
  const viewDistrictId = selectedViewAdmission?.district_id ?? '';
  const { data: viewDistrictsData } = useQuery({
    queryKey: ['view-districts-dropdown', viewStateId],
    queryFn: () => locationCascadeApi.getDistrictsByState(viewStateId),
    enabled: !!viewStateId && /^[0-9a-f]{8}-/i.test(viewStateId),
    staleTime: 10 * 60 * 1000,
  });
  const { data: viewMandalsData } = useQuery({
    queryKey: ['view-mandals-dropdown', viewDistrictId],
    queryFn: () => locationCascadeApi.getMandalsByDistrict(viewDistrictId),
    enabled: !!viewDistrictId,
    staleTime: 10 * 60 * 1000,
  });
  const viewDistrictsOptions = (viewDistrictsData ?? []).map(d => ({ label: d.name || '', value: d.id }));
  const viewMandalsOptions = (viewMandalsData ?? []).map(m => ({ label: m.name || '', value: m.id }));

  const { data: admissionsData, isLoading: isLoadingAdmissions } = useAdmissions({ skip: (currentPage - 1) * pageSize, limit: pageSize });
  const { data: searchResults } = useStudentsSearch(searchQuery);

  const { data: existingAdmission } = useAdmissionByStudentId(studentId || '');
  const createAdmissionMutation = useCreateAdmission();
  const updateAdmissionMutation = useUpdateAdmission();

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => studentAdmissionsApi.toggleActiveStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      showSuccess('Success', 'Student status updated');
    },
    onError: () => showError('Error', 'Failed to update student status'),
  });

  // ── effects ────────────────────────────────────────────────────────────────

  // Auto-enter edit mode when studentId URL param is set and admission data loads
  useEffect(() => {
    if (studentId && existingAdmission) {
      setIsEditMode(true);
      setViewMode('form');
      setCurrentStep(0);
      const a = existingAdmission as any;
      fatherPhoneRequiredRef.current = true; setFatherPhoneRequired(true);
      motherPhoneRequiredRef.current = false; setMotherPhoneRequired(false);
      guardianPhoneRequiredRef.current = false; setGuardianPhoneRequired(false);
      setFormData({
        admission_number: a.admission_number ?? '',
        admission_date: a.admission_date ?? INITIAL_FORM.admission_date,
        admission_type: a.admission_type ?? INITIAL_FORM.admission_type,
        academic_year_id: a.academic_year_id ?? '',
        admitted_academic_year_id: a.admitted_academic_year_id ?? '',
        admitted_class_id: a.admitted_class_id ?? '',
        admitted_section_id: a.admitted_section_id ?? '',
        current_class_id: a.current_class_id ?? '',
        current_section_id: a.current_section_id ?? '',
        address_line1: a.address_line1 ?? '',
        address_line2: a.address_line2 ?? '',
        city: a.city ?? '',
        state_id: a.state_id ?? a.state ?? '',
        district_id: a.district_id ?? '',
        mandal_id: a.mandal_id ?? '',
        pincode: a.pincode ?? '',
        is_previous_school: a.is_previous_school ?? false,
        previous_school_name: a.previous_school_name ?? '',
        previous_class: a.previous_class ?? '',
        previous_school_remark: a.previous_school_remark ?? '',
        student: {
          first_name: a.student?.first_name ?? '',
          last_name: a.student?.last_name ?? '',
          date_of_birth: a.student?.date_of_birth ?? '',
          gender: a.student?.gender ?? '',
          is_primary: a.student?.is_primary ?? 'not_primary',
          aadhar_number: a.student?.aadhar_number ?? '',
          apaar_number: a.student?.apaar_number ?? '',
          caste_id: a.student?.caste_id ?? '',
          sub_caste_id: a.student?.sub_caste_id ?? '',
          community: a.student?.community ?? '',
          nationality: a.student?.nationality ?? '',
          mother_tongue: a.student?.mother_tongue ?? '',
          identification_marks: a.student?.identification_marks ?? '',
        },
        father: {
          name: a.student?.father?.name ?? a.father?.name ?? '',
          email: a.student?.father?.email ?? a.father?.email ?? '',
          phone: a.student?.father?.phone ?? a.father?.phone ?? '',
          occupation: a.student?.father?.occupation ?? a.father?.occupation ?? '',
          salary_range: a.student?.father?.salary_range ?? a.father?.salary_range ?? '',
          aadhar_number: a.student?.father?.aadhar_number ?? a.father?.aadhar_number ?? '',
          gender: a.student?.father?.gender ?? a.father?.gender ?? '',
          relation_to_student: 'Father',
        },
        mother: {
          name: a.student?.mother?.name ?? a.mother?.name ?? '',
          email: a.student?.mother?.email ?? a.mother?.email ?? '',
          phone: a.student?.mother?.phone ?? a.mother?.phone ?? '',
          occupation: a.student?.mother?.occupation ?? a.mother?.occupation ?? '',
          salary_range: a.student?.mother?.salary_range ?? a.mother?.salary_range ?? '',
          aadhar_number: a.student?.mother?.aadhar_number ?? a.mother?.aadhar_number ?? '',
          gender: a.student?.mother?.gender ?? a.mother?.gender ?? '',
          relation_to_student: 'Mother',
        },
        guardian: {
          name: a.student?.guardian?.name ?? a.guardian?.name ?? '',
          email: a.student?.guardian?.email ?? a.guardian?.email ?? '',
          phone: a.student?.guardian?.phone ?? a.guardian?.phone ?? '',
          occupation: a.student?.guardian?.occupation ?? a.guardian?.occupation ?? '',
          salary_range: a.student?.guardian?.salary_range ?? a.guardian?.salary_range ?? '',
          aadhar_number: a.student?.guardian?.aadhar_number ?? a.guardian?.aadhar_number ?? '',
          gender: a.student?.guardian?.gender ?? a.guardian?.gender ?? '',
          relation_to_student: 'Guardian',
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, existingAdmission]);

  // Auto-fill admitted_academic_year_id when academic_year_id is set (avoids user selecting same year twice)
  useEffect(() => {
    if (formData.academic_year_id && !formData.admitted_academic_year_id) {
      setFormData(p => ({ ...p, admitted_academic_year_id: p.academic_year_id }));
    }
  }, [formData.academic_year_id]);

  useEffect(() => {
    if (!formData.admitted_class_id) {
      setFormData(p => ({ ...p, admitted_section_id: '' }));
    }
  }, [formData.admitted_class_id]);

  useEffect(() => {
    if (!formData.current_class_id) {
      setFormData(p => ({ ...p, current_section_id: '' }));
    }
  }, [formData.current_class_id]);

  useEffect(() => {
    setFormData(p => ({ ...p, student: { ...p.student, sub_caste_id: '' } }));
  }, [formData.student.caste_id]);

  useEffect(() => {
    if (sameAsAdmission) {
      setFormData(p => ({ ...p, current_class_id: p.admitted_class_id, current_section_id: p.admitted_section_id }));
    }
  }, [sameAsAdmission, formData.admitted_class_id, formData.admitted_section_id]);

  // ── Location cascade: clear child when parent changes ─────────────────────
  // Using refs so edit-mode bulk population (which sets all three at once) doesn't
  // trigger spurious clears — only user-driven changes to state_id clear district/mandal.
  const prevStateIdRef = React.useRef('');
  const prevDistrictIdRef = React.useRef('');

  useEffect(() => {
    const prev = prevStateIdRef.current;
    prevStateIdRef.current = formData.state_id;
    if (prev && prev !== formData.state_id) {
      setFormData(p => ({ ...p, district_id: '', mandal_id: '' }));
    }
  }, [formData.state_id]);

  useEffect(() => {
    const prev = prevDistrictIdRef.current;
    prevDistrictIdRef.current = formData.district_id;
    if (prev && prev !== formData.district_id) {
      setFormData(p => ({ ...p, mandal_id: '' }));
    }
  }, [formData.district_id]);

  // ── name resolver helpers ──────────────────────────────────────────────────
  const getClassName = (classId?: string | null) => {
    if (!classId) return '—';
    const cls = (allClassSectionsData as any[]).find(c => c.id === classId);
    if (cls) return cls.name;
    const fromDropdown = classesData?.find(c => c.value === classId)?.label;
    if (fromDropdown) return fromDropdown;
    // UUID fallback — data not loaded or class deleted
    return classId.length > 20 ? '—' : classId;
  };

  const getSectionName = (classId?: string | null, sectionId?: string | null) => {
    if (!sectionId) return '—';
    // Primary: nested sections from /read_all (backend confirms sections are always nested)
    const cls = (allClassSectionsData as any[]).find(c => c.id === classId);
    if (cls?.sections?.length) {
      const sec = cls.sections.find((s: any) => s.id === sectionId);
      if (sec) return sec.name;
    }
    // Fallback: flat list from /class-section-list — field is section_id, value is "ClassName - SectionName"
    const secFlat = (allSectionsFlat as any[]).find(s => s.section_id === sectionId);
    if (secFlat?.class_section_name) {
      // Extract section part after last " - " e.g. "Grade 10 - A" → "A"
      const idx = secFlat.class_section_name.lastIndexOf(' - ');
      return idx >= 0 ? secFlat.class_section_name.slice(idx + 3) : secFlat.class_section_name;
    }
    // Still loading or data deleted — show ellipsis rather than raw UUID
    return sectionId.length > 20 ? '…' : sectionId;
  };

  const getYearName = (yearId?: string | null) => {
    if (!yearId) return '—';
    const found = academicYearsData?.find(y => y.value === yearId)?.label;
    if (found) return found;
    return yearId.length > 20 ? '…' : yearId;
  };

  // ── form helpers ───────────────────────────────────────────────────────────
  const updateFormData = (field: string, value: any) => {
    const parts = field.split('.');
    setFormData(prev => {
      if (parts.length === 1) return { ...prev, [field]: value };
      const [parent, child] = parts;
      return { ...prev, [parent]: { ...(prev as any)[parent], [child]: value } };
    });
    setErrors((prev: any) => {
      if (parts.length === 1) return { ...prev, [field]: undefined };
      const [parent, child] = parts;
      return { ...prev, [parent]: { ...prev[parent], [child]: undefined } };
    });
  };

  const getFieldValue = (field: string): string => {
    const parts = field.split('.');
    if (parts.length === 1) return (formData as any)[field] ?? '';
    return (formData as any)[parts[0]]?.[parts[1]] ?? '';
  };

  const getFieldError = (field: string): string => {
    const parts = field.split('.');
    if (parts.length === 1) return errors[field] ?? '';
    return errors[parts[0]]?.[parts[1]] ?? '';
  };

  // ── validation ─────────────────────────────────────────────────────────────
  // Required/optional rules mirror the web app exactly (MultiStepAdmissionForm +
  // StudentStepForm/AcademicStepForm/ParentsStepForm/AddressStepForm):
  //   Step 0 (Student & Academic): admission_number, admission_date, admitted_class_id,
  //     student first name are required. Section/current-class/section, last name, DOB,
  //     gender, aadhar/apaar are optional (format-checked only when filled).
  //   Step 1 (Parents): father's name required; father's phone required by default via
  //     the "Primary" toggle (togglable, like mother's/guardian's). All emails are
  //     optional except guardian's email becomes required once a guardian name is given.
  //   Step 2 (Address): only address line 1 is required.
  const computeStepErrors = (step: number): any => {
    const e: any = {};
    if (step === 0) {
      if (!formData.admission_number.trim()) e.admission_number = 'Admission number is required';
      if (!formData.admission_date) e.admission_date = 'Required';
      else if (!isValidDate(formData.admission_date)) e.admission_date = 'Invalid date';
      else if (isFutureDate(formData.admission_date)) e.admission_date = 'Cannot be in the future';
      if (!formData.admitted_class_id) e.admitted_class_id = 'Required';
      if (!formData.student.first_name.trim()) e.student = { ...e.student, first_name: 'First name is required' };
      if (formData.student.date_of_birth && isFutureDate(formData.student.date_of_birth))
        e.student = { ...e.student, date_of_birth: 'Cannot be in the future' };
      if (formData.student.aadhar_number && !isValidAadhar(formData.student.aadhar_number))
        e.student = { ...e.student, aadhar_number: 'Aadhar number must be 12 digits' };
      if (formData.student.apaar_number && !/^\d{12}$/.test(formData.student.apaar_number))
        e.student = { ...e.student, apaar_number: 'APAAR number must be 12 digits' };
    }
    if (step === 1) {
      // ── Father ──────────────────────────────────────────────────────────────
      if (!formData.father.name.trim()) e.father = { ...e.father, name: "Father's name is required" };
      if (formData.father.email && !isValidEmail(formData.father.email))
        e.father = { ...e.father, email: 'Invalid email address' };
      const fatherPhoneErr = validatePhone(formData.father.phone, fatherPhoneRequiredRef.current);
      if (fatherPhoneErr) e.father = { ...e.father, phone: fatherPhoneErr };
      if (formData.father.aadhar_number && !isValidAadhar(formData.father.aadhar_number))
        e.father = { ...e.father, aadhar_number: 'Aadhar number must be 12 digits' };
      // ── Mother ──────────────────────────────────────────────────────────────
      if (formData.mother.email && !isValidEmail(formData.mother.email)) {
        e.mother = { ...e.mother, email: 'Invalid email address' };
      } else if (formData.mother.email && formData.mother.email.toLowerCase() === formData.father.email?.toLowerCase()) {
        e.mother = { ...e.mother, email: "Mother's email must be different from father's email" };
      }
      const motherPhoneErr = validatePhone(formData.mother.phone, motherPhoneRequiredRef.current);
      if (motherPhoneErr) e.mother = { ...e.mother, phone: motherPhoneErr };
      if (formData.mother.aadhar_number && !isValidAadhar(formData.mother.aadhar_number))
        e.mother = { ...e.mother, aadhar_number: 'Aadhar number must be 12 digits' };
      // ── Guardian (all optional — email required only once a name is given) ──
      if (formData.guardian.email && !isValidEmail(formData.guardian.email)) {
        e.guardian = { ...e.guardian, email: 'Invalid email address' };
      } else if (!formData.guardian.email?.trim() && formData.guardian.name.trim()) {
        e.guardian = { ...e.guardian, email: "Guardian's email is required" };
      }
      const guardianPhoneErr = validatePhone(formData.guardian.phone, guardianPhoneRequiredRef.current);
      if (guardianPhoneErr) e.guardian = { ...e.guardian, phone: guardianPhoneErr };
      if (formData.guardian.aadhar_number && !isValidAadhar(formData.guardian.aadhar_number))
        e.guardian = { ...e.guardian, aadhar_number: 'Aadhar number must be 12 digits' };
    }
    if (step === 2) {
      if (!formData.address_line1.trim()) e.address_line1 = 'Address is required';
      if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) e.pincode = 'Pincode must be 6 digits';
    }
    return e;
  };

  const handleNext = () => {
    const e = computeStepErrors(currentStep);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
      return;
    }
    // Reveal any collapsed accordion section that hides an error, so the user
    // isn't stuck on "Next" without seeing why.
    setOpenSections(prev => {
      const next = new Set(prev);
      if (currentStep === 0) {
        if (e.student || e.admission_number) next.add('student');
        if (e.admission_date || e.admitted_class_id) next.add('academic');
      }
      if (currentStep === 1) {
        if (e.father) next.add('father');
        if (e.mother) next.add('mother');
        if (e.guardian) next.add('guardian');
      }
      return next;
    });
  };
  const handlePrevious = () => setCurrentStep(s => Math.max(s - 1, 0));

  // Strips blank optional fields to `undefined` before hitting the API — mirrors
  // web's `cleanedData` builder (MultiStepAdmissionForm.tsx). Sending '' instead of
  // omitting the field trips backend validation (empty-string UUID/email/enum errors).
  const cleanParent = (p: FormData['father']) => ({
    name: p.name || '',
    email: p.email || undefined,
    phone: p.phone || undefined,
    occupation: p.occupation || undefined,
    salary_range: p.salary_range || undefined,
    aadhar_number: p.aadhar_number || undefined,
    gender: p.gender || undefined,
    relation_to_student: p.relation_to_student,
  });

  const handleSubmit = async () => {
    let allErrors: any = {};
    for (let i = 0; i < STEPS.length - 1; i++) {
      allErrors = { ...allErrors, ...computeStepErrors(i) };
    }
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      showError('Validation Error', 'Please fill all required fields');
      return;
    }

    // Duplicate admission number check (create mode) — mirrors web's on-blur check
    if (!isEditMode) {
      const duplicate = await admissionNumberExists(formData.admission_number.trim());
      if (duplicate) {
        setErrors((prev: any) => ({ ...prev, admission_number: 'Admission number already exists. Please use a different number.' }));
        setCurrentStep(0);
        setOpenSections(prev => new Set(prev).add('student'));
        showError('Validation Error', 'Admission number already exists. Please use a different number.');
        return;
      }
    }

    if (isEditMode && activeStudentId) {
      const updateData: StudentAdmissionUpdate = {
        // Academic
        admission_number: formData.admission_number,
        admission_date: formData.admission_date,
        admission_type: formData.admission_type as 'pre_primary' | 'regular',
        academic_year_id: formData.academic_year_id,
        admitted_academic_year_id: formData.admitted_academic_year_id || formData.academic_year_id,
        admitted_class_id: formData.admitted_class_id || undefined,
        admitted_section_id: formData.admitted_section_id || undefined,
        current_class_id: formData.current_class_id || undefined,
        current_section_id: formData.current_section_id || undefined,
        // Address
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state_id,       // send UUID as 'state' (mirrors web app behaviour)
        state_id: formData.state_id || undefined,
        district_id: formData.district_id || undefined,
        mandal_id: formData.mandal_id || undefined,
        // Previous school
        is_previous_school: formData.is_previous_school,
        previous_school_name: formData.previous_school_name,
        previous_class: formData.previous_class,
        previous_school_remark: formData.previous_school_remark,
        // Student personal
        first_name: formData.student.first_name,
        last_name: formData.student.last_name,
        date_of_birth: formData.student.date_of_birth,
        gender: formData.student.gender,
        is_primary: formData.student.is_primary || 'not_primary',
        aadhar_number: formData.student.aadhar_number || undefined,
        apaar_number: formData.student.apaar_number || undefined,
        caste: formData.student.caste_id || undefined,
        sub_caste: formData.student.sub_caste_id || undefined,
        nationality: formData.student.nationality || undefined,
        mother_tongue: formData.student.mother_tongue || undefined,
        community: formData.student.community || undefined,
        identification_marks: formData.student.identification_marks || undefined,
        // Father
        father_name: formData.father.name,
        father_email: formData.father.email || undefined,
        father_phone: formData.father.phone || undefined,
        father_occupation: formData.father.occupation || undefined,
        father_aadhar_number: formData.father.aadhar_number || undefined,
        father_salary_range: formData.father.salary_range || undefined,
        father_gender: formData.father.gender || undefined,
        // Mother
        mother_name: formData.mother.name,
        mother_email: formData.mother.email || undefined,
        mother_phone: formData.mother.phone || undefined,
        mother_occupation: formData.mother.occupation || undefined,
        mother_salary_range: formData.mother.salary_range || undefined,
        mother_aadhar_number: formData.mother.aadhar_number || undefined,
        mother_gender: formData.mother.gender || undefined,
        // Guardian (only include fields when guardian name is provided)
        ...(formData.guardian.name ? {
          guardian_name: formData.guardian.name,
          guardian_email: formData.guardian.email || undefined,
          guardian_phone: formData.guardian.phone || undefined,
          guardian_occupation: formData.guardian.occupation || undefined,
          guardian_salary_range: formData.guardian.salary_range || undefined,
          guardian_aadhar_number: formData.guardian.aadhar_number || undefined,
          guardian_gender: formData.guardian.gender || undefined,
        } : {}),
      };
      try {
        await updateAdmissionMutation.mutateAsync({ studentId: activeStudentId, data: updateData });
        if (pendingPhoto) {
          try {
            await studentAdmissionsApi.uploadStudentPhoto(activeStudentId, pendingPhoto.uri, pendingPhoto.mimeType);
            setPendingPhoto(null);
          } catch { /* photo upload is non-fatal — admission already saved */ }
        }
      } catch { /* handled by mutation onError */ }
    } else {
      const apiData: StudentAdmissionCreate = {
        admission_number: formData.admission_number,
        admission_date: formData.admission_date,
        admission_type: formData.admission_type as 'pre_primary' | 'regular',
        academic_year_id: formData.academic_year_id,
        admitted_academic_year_id: formData.admitted_academic_year_id || formData.academic_year_id,
        admitted_class_id: formData.admitted_class_id,
        admitted_section_id: formData.admitted_section_id || undefined,
        current_class_id: formData.current_class_id || undefined,
        current_section_id: formData.current_section_id || undefined,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state_id,       // send UUID as 'state' (mirrors web app behaviour)
        state_id: formData.state_id || undefined,
        district_id: formData.district_id || undefined,
        mandal_id: formData.mandal_id || undefined,
        is_previous_school: formData.is_previous_school,
        previous_school_name: formData.previous_school_name,
        previous_class: formData.previous_class,
        previous_school_remark: formData.previous_school_remark,
        student: {
          first_name: formData.student.first_name,
          last_name: formData.student.last_name,
          date_of_birth: formData.student.date_of_birth,
          gender: formData.student.gender,
          is_primary: formData.student.is_primary || 'not_primary',
          aadhar_number: formData.student.aadhar_number || undefined,
          apaar_number: formData.student.apaar_number || undefined,
          caste_id: formData.student.caste_id || undefined,
          sub_caste_id: formData.student.sub_caste_id || undefined,
          community: formData.student.community || undefined,
          nationality: formData.student.nationality || undefined,
          mother_tongue: formData.student.mother_tongue || undefined,
          identification_marks: formData.student.identification_marks || undefined,
          father: cleanParent(formData.father),
          mother: cleanParent(formData.mother),
          // Guardian only sent when name is provided
          ...(formData.guardian.name ? { guardian: cleanParent(formData.guardian) } : {}),
        },
      };
      try {
        const result = await createAdmissionMutation.mutateAsync(apiData);
        const newStudentId = (result as any)?.student?.id;
        if (newStudentId && pendingPhoto) {
          try {
            await studentAdmissionsApi.uploadStudentPhoto(newStudentId, pendingPhoto.uri, pendingPhoto.mimeType);
            setPendingPhoto(null);
          } catch { /* photo upload is non-fatal — admission already created */ }
        }
      } catch { /* handled by mutation onError */ }
    }
  };

  const handleCreateNew = () => {
    setIsEditMode(false);
    setEditStudentId('');
    setFormData(INITIAL_FORM);
    setErrors({});
    setCurrentStep(0);
    setSameAsAdmission(false);
    setVerifiedNextNumber(null);
    fatherPhoneRequiredRef.current = true; setFatherPhoneRequired(true);
    motherPhoneRequiredRef.current = false; setMotherPhoneRequired(false);
    guardianPhoneRequiredRef.current = false; setGuardianPhoneRequired(false);
    setViewMode('form');
  };

  const handleEditAdmission = (admission: any) => {
    // Populate form directly from list data — list items already have student.father/mother
    // Do NOT rely on useAdmissionByStudentId re-fetch which may not return parent data
    const a = admission;
    const sId = a.student?.id || a.id;
    setEditStudentId(sId);
    setIsEditMode(true);
    setViewMode('form');
    setCurrentStep(0);
    setSameAsAdmission(false);
    setErrors({});
    fatherPhoneRequiredRef.current = true; setFatherPhoneRequired(true);
    motherPhoneRequiredRef.current = false; setMotherPhoneRequired(false);
    guardianPhoneRequiredRef.current = false; setGuardianPhoneRequired(false);
    setFormData({
      admission_number: a.admission_number ?? '',
      admission_date: a.admission_date ?? INITIAL_FORM.admission_date,
      admission_type: a.admission_type ?? INITIAL_FORM.admission_type,
      academic_year_id: a.academic_year_id ?? '',
      admitted_academic_year_id: a.admitted_academic_year_id ?? '',
      admitted_class_id: a.admitted_class_id ?? '',
      admitted_section_id: a.admitted_section_id ?? '',
      current_class_id: a.current_class_id ?? '',
      current_section_id: a.current_section_id ?? '',
      address_line1: a.address_line1 ?? '',
      address_line2: a.address_line2 ?? '',
      city: a.city ?? '',
      state_id: a.state_id ?? a.state ?? '',
      district_id: a.district_id ?? '',
      mandal_id: a.mandal_id ?? '',
      pincode: a.pincode ?? '',
      is_previous_school: a.is_previous_school ?? false,
      previous_school_name: a.previous_school_name ?? '',
      previous_class: a.previous_class ?? '',
      previous_school_remark: a.previous_school_remark ?? '',
      student: {
        first_name: a.student?.first_name ?? '',
        last_name: a.student?.last_name ?? '',
        date_of_birth: a.student?.date_of_birth ?? '',
        gender: a.student?.gender ?? '',
        is_primary: a.student?.is_primary ?? 'not_primary',
        aadhar_number: a.student?.aadhar_number ?? '',
        apaar_number: a.student?.apaar_number ?? '',
        caste_id: a.student?.caste ?? '',
        sub_caste_id: a.student?.sub_caste ?? '',
        community: a.student?.community ?? '',
        nationality: a.student?.nationality ?? '',
        mother_tongue: a.student?.mother_tongue ?? '',
        identification_marks: a.student?.identification_marks ?? '',
      },
      father: {
        name: a.student?.father?.name ?? '',
        email: a.student?.father?.email ?? '',
        phone: a.student?.father?.phone ?? '',
        occupation: a.student?.father?.occupation ?? '',
        salary_range: a.student?.father?.salary_range ?? '',
        aadhar_number: a.student?.father?.aadhar_number ?? '',
        gender: a.student?.father?.gender ?? '',
        relation_to_student: 'Father',
      },
      mother: {
        name: a.student?.mother?.name ?? '',
        email: a.student?.mother?.email ?? '',
        phone: a.student?.mother?.phone ?? '',
        occupation: a.student?.mother?.occupation ?? '',
        salary_range: a.student?.mother?.salary_range ?? '',
        aadhar_number: a.student?.mother?.aadhar_number ?? '',
        gender: a.student?.mother?.gender ?? '',
        relation_to_student: 'Mother',
      },
      guardian: {
        name: a.student?.guardian?.name ?? '',
        email: a.student?.guardian?.email ?? '',
        phone: a.student?.guardian?.phone ?? '',
        occupation: a.student?.guardian?.occupation ?? '',
        salary_range: a.student?.guardian?.salary_range ?? '',
        aadhar_number: a.student?.guardian?.aadhar_number ?? '',
        gender: a.student?.guardian?.gender ?? '',
        relation_to_student: 'Guardian',
      },
    });
  };

  const handleToggleActive = (admission: any) => {
    const isActive = admission.student?.is_active ?? true;
    const name = `${admission.student?.first_name || ''} ${admission.student?.last_name || ''}`.trim();
    confirm({
      title: `${isActive ? 'Deactivate' : 'Activate'} Student`,
      message: `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} ${name}?`,
      confirmLabel: isActive ? 'Deactivate' : 'Activate',
      destructive: isActive,
      onConfirm: () => toggleActiveMutation.mutate(admission.student?.id || admission.id),
    });
  };

  // ─── Date picker handler ──────────────────────────────────────────────────

  const handleDateChange = (_event: any, date?: Date) => {
    const field = activeDateField;
    setActiveDateField(null);
    if (_event.type === 'set' && date && field) {
      // Use local date methods — toISOString() converts to UTC and gives wrong date in IST
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      updateFormData(field, iso);
      setDateDisplayValues(p => ({ ...p, [field]: toDisplayDMY(iso) }));
    }
  };

  const getDateValue = (field: string): Date => {
    const iso = getFieldValue(field);
    return iso ? new Date(iso + 'T00:00:00') : new Date();
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  // Renders a field label, shrinking the trailing " *" / " (Optional)" marker
  // to a smaller, lighter run so it doesn't force long labels (e.g. "Mother
  // Tongue (Optional)") to wrap onto a second line in the half-width columns.
  const renderFieldLabel = (label: string) => {
    if (label.endsWith(' (Optional)')) {
      const base = label.slice(0, -' (Optional)'.length);
      return (
        <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>
          {base}
          <ThemedText style={{ fontSize: 11, fontWeight: '400', color: themeColors['muted-foreground'] }}> (Optional)</ThemedText>
        </ThemedText>
      );
    }
    if (label.endsWith(' *')) {
      const base = label.slice(0, -2);
      return (
        <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>
          {base}
          <ThemedText style={{ color: themeColors.destructive }}> *</ThemedText>
        </ThemedText>
      );
    }
    return <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>{label}</ThemedText>;
  };

  const renderInput = (
    label: string, field: string, placeholder: string,
    keyboardType: any = 'default', multiline = false, maxLength?: number
  ) => {
    const val = getFieldValue(field);
    const err = getFieldError(field);
    return (
      <View style={fStyles.inputContainer}>
        {renderFieldLabel(label)}
        <View style={[fStyles.inputWrapper, { backgroundColor: themeColors.background, borderColor: err ? themeColors.destructive : themeColors.border }]}>
          <TextInput
            style={[fStyles.input, { color: themeColors['card-foreground'] }]}
            placeholder={placeholder}
            placeholderTextColor={themeColors['muted-foreground']}
            value={val}
            onChangeText={v => updateFormData(field, v)}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
            maxLength={maxLength}
          />
        </View>
        {err ? <ThemedText style={[fStyles.errorText, { color: themeColors.destructive }]}>{err}</ThemedText> : null}
      </View>
    );
  };

  // Phone input with a "Primary" toggle — mirrors web's mandatory-contact checkbox
  // (father defaults checked/required; mother's & guardian's default unchecked/optional).
  const renderPhoneInput = (field: string, required: boolean, onToggleRequired: (checked: boolean) => void) => {
    const val = getFieldValue(field);
    const err = getFieldError(field);
    return (
      <View style={fStyles.inputContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <ThemedText style={[fStyles.label, { color: themeColors.foreground, marginBottom: 0 }]}>
            Phone{required ? <ThemedText style={{ color: themeColors.destructive }}> *</ThemedText> : ' (Optional)'}
          </ThemedText>
          <TouchableOpacity onPress={() => onToggleRequired(!required)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} activeOpacity={0.75}>
            <View style={[fStyles.checkbox, { width: 16, height: 16, borderColor: required ? themeColors.primary : themeColors.border }, required && { backgroundColor: themeColors.primary }]}>
              {required && <Ionicons name="checkmark" size={11} color="white" />}
            </View>
            <ThemedText style={{ fontSize: 12, color: themeColors['muted-foreground'] }}>Primary</ThemedText>
          </TouchableOpacity>
        </View>
        <View style={[fStyles.inputWrapper, { backgroundColor: themeColors.background, borderColor: err ? themeColors.destructive : themeColors.border }]}>
          <TextInput
            style={[fStyles.input, { color: themeColors['card-foreground'] }]}
            placeholder="10-digit phone number"
            placeholderTextColor={themeColors['muted-foreground']}
            value={val}
            onChangeText={v => updateFormData(field, v)}
            keyboardType="phone-pad"
            maxLength={16}
          />
        </View>
        {err ? <ThemedText style={[fStyles.errorText, { color: themeColors.destructive }]}>{err}</ThemedText> : null}
      </View>
    );
  };

  const renderDropdown = (label: string, field: string, data: any[], placeholder: string, disabled = false, loading = false, search = true, mode: 'default' | 'modal' | 'auto' = 'modal') => {
    const val = getFieldValue(field);
    const err = getFieldError(field);
    return (
      <View style={fStyles.inputContainer}>
        {renderFieldLabel(label)}
        <CustomDropdown
          data={data || []}
          placeholder={loading ? 'Loading...' : placeholder}
          value={val}
          onChange={v => updateFormData(field, v as string)}
          error={err}
          disabled={disabled || loading}
          style={{ backgroundColor: themeColors.card }}
          search={search}
          mode={mode}
        />
      </View>
    );
  };

  const renderDateButton = (label: string, field: string) => {
    const err = getFieldError(field);
    const isoVal = getFieldValue(field);
    const borderColor = err ? themeColors.destructive : themeColors.border;

    if (Platform.OS === 'web') {
      // On web, render a native HTML <input type="date"> — the browser shows its
      // own date picker on click with no JS tricks needed, bypassing RNW event issues.
      return (
        <View style={fStyles.inputContainer}>
          {renderFieldLabel(label)}
          <View style={[fStyles.dateRow, { backgroundColor: themeColors.background, borderColor }]}>
            {/* @ts-ignore — native HTML input, valid in Expo web */}
            <input
              type="date"
              value={isoVal || ''}
              onChange={(e: any) => {
                const iso: string = e.target.value;
                if (iso) {
                  updateFormData(field, iso);
                  setDateDisplayValues(prev => ({ ...prev, [field]: toDisplayDMY(iso) }));
                }
              }}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: themeColors['card-foreground'],
                fontSize: 16,
                outline: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                width: '100%',
              }}
            />
          </View>
          {err ? <ThemedText style={[fStyles.errorText, { color: themeColors.destructive }]}>{err}</ThemedText> : null}
        </View>
      );
    }

    const displayVal = dateDisplayValues[field] ?? toDisplayDMY(isoVal);
    return (
      <View style={fStyles.inputContainer}>
        {renderFieldLabel(label)}
        <View style={[fStyles.dateRow, { backgroundColor: themeColors.background, borderColor }]}>
          <TextInput
            style={[fStyles.dateInput, { color: themeColors['card-foreground'] }]}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={themeColors['muted-foreground']}
            value={displayVal}
            keyboardType="numeric"
            maxLength={10}
            onChangeText={(t) => {
              const fmt = autoFormatDate(t);
              setDateDisplayValues(p => ({ ...p, [field]: fmt }));
              const iso = parseDMY(fmt);
              if (iso) updateFormData(field, iso);
            }}
          />
          <TouchableOpacity onPress={() => setActiveDateField(field)} style={{ padding: 4 }}
              accessibilityLabel="Select date">
            <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
          </TouchableOpacity>
        </View>
        {err ? <ThemedText style={[fStyles.errorText, { color: themeColors.destructive }]}>{err}</ThemedText> : null}
      </View>
    );
  };

  // Collapsible section header — tap to expand/collapse. `badge` renders an
  // "Optional" pill next to the title (used for Guardian).
  const renderAccordionHeader = (key: string, title: string, badge?: string, first = false) => {
    const isOpen = openSections.has(key);
    return (
      <TouchableOpacity
        style={[fStyles.accordionHeader, !first && { borderTopColor: themeColors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
        onPress={() => toggleSection(key)}
        activeOpacity={0.75}
      >
        <ThemedText type="subtitle" style={[fStyles.sectionTitle, { marginBottom: 0, flex: 1 }]}>{title}</ThemedText>
        {!!badge && (
          <View style={[fStyles.optionalBadge, { backgroundColor: themeColors.accent, marginRight: 8 }]}>
            <ThemedText style={[fStyles.optionalBadgeText, { color: themeColors['muted-foreground'] }]}>{badge}</ThemedText>
          </View>
        )}
        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={themeColors['muted-foreground']} />
      </TouchableOpacity>
    );
  };

  // ─── Step renderers ───────────────────────────────────────────────────────

  // Combined "Student & Academic Details" step — mirrors web's AcademicAndStudentStepForm
  // (StudentStepForm rendered first, then AcademicStepForm), split into an
  // accordion so each section can be collapsed to save scroll space.
  const renderStep0 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Student & Academic Details</ThemedText>

      {renderAccordionHeader('student', 'Student Details', undefined, true)}
      {openSections.has('student') && (
      <View style={fStyles.accordionBody}>

      {/* ── Photo upload ─────────────────────────────────────────────── */}
      <View style={[fStyles.photoRow, { borderBottomColor: themeColors.border }]}>
        <View style={[fStyles.photoCircle, { backgroundColor: themeColors.accent }]}>
          {pendingPhoto ? (
            <Image source={{ uri: pendingPhoto.uri }} style={fStyles.photoPreview} />
          ) : (
            <Ionicons name="person-outline" size={32} color={themeColors['muted-foreground']} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>
            Student Photo <ThemedText style={{ color: themeColors['muted-foreground'], fontWeight: '400' }}>(Optional)</ThemedText>
          </ThemedText>
          <TouchableOpacity
            onPress={pickPhoto}
            style={[fStyles.photoBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
          >
            <Ionicons name="add" size={16} color={themeColors.primary} />
            <ThemedText style={{ color: themeColors.primary, fontSize: 14, marginLeft: 4 }}>
              {pendingPhoto ? 'Change photo' : 'Choose photo'}
            </ThemedText>
          </TouchableOpacity>
          <ThemedText style={{ color: themeColors['muted-foreground'], fontSize: 11, marginTop: 4 }}>
            JPG, PNG or WebP · max 2 MB
          </ThemedText>
          {pendingPhoto && (
            <TouchableOpacity onPress={() => setPendingPhoto(null)} style={{ marginTop: 4 }}>
              <ThemedText style={{ color: themeColors.destructive, fontSize: 12 }}>Remove</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Admission Number — auto-suggested + duplicate-checked, like web ── */}
      <View style={fStyles.inputContainer}>
        <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>Admission Number *</ThemedText>
        <View style={[fStyles.inputWrapper, { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.background, borderColor: errors.admission_number ? themeColors.destructive : themeColors.border }]}>
          <TextInput
            style={[fStyles.input, { flex: 1, color: themeColors['card-foreground'] }]}
            placeholder={apiAdmissionType === 'pre_primary' ? 'e.g. 20260001' : 'e.g. 2026001'}
            placeholderTextColor={themeColors['muted-foreground']}
            value={formData.admission_number}
            onChangeText={v => updateFormData('admission_number', v)}
            onBlur={() => checkAdmissionNumberExists(formData.admission_number)}
          />
          {(isCheckingNum || isVerifyingNextNumber) && <ActivityIndicator size="small" color={themeColors.primary} style={{ marginRight: 10 }} />}
        </View>
        {errors.admission_number ? (
          <ThemedText style={[fStyles.errorText, { color: themeColors.destructive }]}>{errors.admission_number}</ThemedText>
        ) : verifiedNextNumber ? (
          <ThemedText style={{ fontSize: 11, color: themeColors['muted-foreground'], marginTop: 4 }}>
            Next available: {verifiedNextNumber}
          </ThemedText>
        ) : null}
      </View>

      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('First Name *', 'student.first_name', 'Enter first name')}</View>
        <View style={fStyles.half}>{renderInput('Last Name (Optional)', 'student.last_name', 'Enter last name')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDateButton('Date of Birth (Optional)', 'student.date_of_birth')}</View>
        <View style={fStyles.half}>{renderDropdown('Gender (Optional)', 'student.gender', [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
          { label: 'Other', value: 'other' },
        ], 'Select Gender')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Student Type (Optional)', 'student.is_primary', [
          { label: 'Day Scholar', value: 'not_primary' },
          { label: 'Hostel', value: 'primary' },
        ], 'Select Student Type')}</View>
        <View style={fStyles.half}>{renderInput('Nationality (Optional)', 'student.nationality', 'Indian')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Mother Tongue (Optional)', 'student.mother_tongue', [
          { label: 'Telugu', value: 'Telugu' }, { label: 'Hindi', value: 'Hindi' },
          { label: 'English', value: 'English' }, { label: 'Tamil', value: 'Tamil' },
          { label: 'Malayalam', value: 'Malayalam' }, { label: 'Kannada', value: 'Kannada' },
          { label: 'Marathi', value: 'Marathi' }, { label: 'Bengali', value: 'Bengali' },
          { label: 'Gujarati', value: 'Gujarati' }, { label: 'Urdu', value: 'Urdu' },
          { label: 'Others', value: 'Others' },
        ], 'Select Mother Tongue')}</View>
        <View style={fStyles.half}>{renderInput('Aadhar Number (Optional)', 'student.aadhar_number', 'Enter 12-digit Aadhar', 'numeric', false, 12)}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('APAAR Number (Optional)', 'student.apaar_number', 'Enter 12-digit APAAR', 'numeric', false, 12)}</View>
        <View style={fStyles.half}>{renderDropdown('Caste (Optional)', 'student.caste_id', castesDropdownData || [], 'Select')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Sub Caste (Optional)', 'student.sub_caste_id', subCastesDropdownData || [], 'Select', !formData.student.caste_id)}</View>
        <View style={fStyles.half}>{renderInput('Community (Optional)', 'student.community', 'Enter community')}</View>
      </View>
      {renderInput('Identification Marks (Optional)', 'student.identification_marks', 'Enter identification marks', 'default', true)}
      </View>
      )}

      {renderAccordionHeader('academic', 'Academic Details')}
      {openSections.has('academic') && (
      <View style={fStyles.accordionBody}>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDateButton('Admission Date *', 'admission_date')}</View>
        <View style={fStyles.half}>
          {renderDropdown('Admission Type (Optional)', 'admission_type', admissionTypesData || [
            { label: 'Pre Primary Admission', value: 'pre_primary' },
            { label: 'Regular Admission', value: 'regular' },
          ], 'Select type', false, false, false, 'default')}
        </View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Academic Year (Optional)', 'academic_year_id', academicYearsData || [], 'Select year')}</View>
        <View style={fStyles.half}>{renderDropdown('Admitted Year (Optional)', 'admitted_academic_year_id', academicYearsData || [], 'Same as above')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Joining Class *', 'admitted_class_id', classesData || [], 'Select class')}</View>
        <View style={fStyles.half}>{renderDropdown('Joining Section (Optional)', 'admitted_section_id', sectionsData || [], 'Select section', !formData.admitted_class_id)}</View>
      </View>
      <TouchableOpacity style={fStyles.checkboxRow} onPress={() => setSameAsAdmission(v => !v)} activeOpacity={0.75}>
        <View style={[fStyles.checkbox, { borderColor: sameAsAdmission ? themeColors.primary : themeColors.border }, sameAsAdmission && { backgroundColor: themeColors.primary }]}>
          {sameAsAdmission && <Ionicons name="checkmark" size={13} color="white" />}
        </View>
        <ThemedText style={{ color: themeColors.foreground, fontSize: 13 }}>Current class same as admission class</ThemedText>
      </TouchableOpacity>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Current Class (Optional)', 'current_class_id', classesData || [], 'Select class', sameAsAdmission)}</View>
        <View style={fStyles.half}>{renderDropdown('Current Section (Optional)', 'current_section_id', currentSectionsData || [], 'Select section', sameAsAdmission || !formData.current_class_id)}</View>
      </View>
      </View>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      {renderAccordionHeader('father', 'Father Information', undefined, true)}
      {openSections.has('father') && (
      <View style={fStyles.accordionBody}>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Name *', 'father.name', 'Father name')}</View>
        <View style={fStyles.half}>{renderInput('Email (Optional)', 'father.email', 'Email', 'email-address')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>
          {renderPhoneInput('father.phone', fatherPhoneRequired, (checked) => {
            fatherPhoneRequiredRef.current = checked;
            setFatherPhoneRequired(checked);
            if (!checked) setErrors((prev: any) => ({ ...prev, father: { ...prev.father, phone: undefined } }));
          })}
        </View>
        <View style={fStyles.half}>{renderInput('Occupation (Optional)', 'father.occupation', 'Occupation')}</View>
      </View>
      {renderDropdown('Salary Range (Optional)', 'father.salary_range', salaryRangesData, '-- Select Salary Range --')}
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Aadhar Number (Optional)', 'father.aadhar_number', '12-digit Aadhar', 'numeric', false, 12)}</View>
        <View style={fStyles.half}>{renderDropdown('Gender (Optional)', 'father.gender', GENDER_OPTIONS, 'Select Gender')}</View>
      </View>
      {renderInput('Relation to Student (Optional)', 'father.relation_to_student', 'Relation')}
      </View>
      )}

      {renderAccordionHeader('mother', 'Mother Information')}
      {openSections.has('mother') && (
      <View style={fStyles.accordionBody}>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Name (Optional)', 'mother.name', 'Mother name')}</View>
        <View style={fStyles.half}>{renderInput('Email (Optional)', 'mother.email', 'Email', 'email-address')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>
          {renderPhoneInput('mother.phone', motherPhoneRequired, (checked) => {
            motherPhoneRequiredRef.current = checked;
            setMotherPhoneRequired(checked);
            if (!checked) setErrors((prev: any) => ({ ...prev, mother: { ...prev.mother, phone: undefined } }));
          })}
        </View>
        <View style={fStyles.half}>{renderInput('Occupation (Optional)', 'mother.occupation', 'Occupation')}</View>
      </View>
      {renderDropdown('Salary Range (Optional)', 'mother.salary_range', salaryRangesData, '-- Select Salary Range --')}
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Aadhar Number (Optional)', 'mother.aadhar_number', '12-digit Aadhar', 'numeric', false, 12)}</View>
        <View style={fStyles.half}>{renderDropdown('Gender (Optional)', 'mother.gender', GENDER_OPTIONS, 'Select Gender')}</View>
      </View>
      {renderInput('Relation to Student (Optional)', 'mother.relation_to_student', 'Relation')}
      </View>
      )}

      {/* ── Guardian (fully optional) ───────────────────────────────────── */}
      {renderAccordionHeader('guardian', "Guardian's Information", 'Optional')}
      {openSections.has('guardian') && (
      <View style={fStyles.accordionBody}>
      <ThemedText style={[fStyles.guardianHint, { color: themeColors['muted-foreground'] }]}>
        Fill in only if a guardian (other than parents) is responsible for the student.
      </ThemedText>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Name (Optional)', 'guardian.name', 'Guardian name')}</View>
        <View style={fStyles.half}>{renderInput(formData.guardian.name.trim() ? 'Email *' : 'Email (Optional)', 'guardian.email', 'Email', 'email-address')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>
          {renderPhoneInput('guardian.phone', guardianPhoneRequired, (checked) => {
            guardianPhoneRequiredRef.current = checked;
            setGuardianPhoneRequired(checked);
            if (!checked) setErrors((prev: any) => ({ ...prev, guardian: { ...prev.guardian, phone: undefined } }));
          })}
        </View>
        <View style={fStyles.half}>{renderInput('Occupation (Optional)', 'guardian.occupation', 'Occupation')}</View>
      </View>
      {renderDropdown('Salary Range (Optional)', 'guardian.salary_range', salaryRangesData, '-- Select Salary Range --')}
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Aadhar Number (Optional)', 'guardian.aadhar_number', '12-digit Aadhar', 'numeric', false, 12)}</View>
        <View style={fStyles.half}>{renderDropdown('Gender (Optional)', 'guardian.gender', GENDER_OPTIONS, 'Select Gender')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Relation to Student (Optional)', 'guardian.relation_to_student', 'e.g. Grandfather, Uncle')}</View>
      </View>
      </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Address Details</ThemedText>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Address Line 1 *', 'address_line1', 'Address line 1')}</View>
        <View style={fStyles.half}>{renderInput('Address Line 2 (Optional)', 'address_line2', 'Apartment, suite, etc.')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('City (Optional)', 'city', 'City')}</View>
        <View style={fStyles.half}>
          {renderDropdown('State (Optional)', 'state_id', statesOptions, '-- Select State --', false, isLoadingStates)}
        </View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>
          {renderDropdown(
            'District (Optional)', 'district_id', districtsOptions,
            formData.state_id ? 'Select district' : 'Select a state first',
            !formData.state_id, isLoadingDistricts,
          )}
        </View>
        <View style={fStyles.half}>
          {renderDropdown(
            'Mandal (Optional)', 'mandal_id', mandalsOptions,
            formData.district_id ? 'Select mandal' : 'Select a district first',
            !formData.district_id, isLoadingMandals,
          )}
        </View>
      </View>
      {renderInput('Pincode (Optional)', 'pincode', 'Enter 6-digit pincode', 'numeric', false, 6)}
    </View>
  );

  const renderStep3 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Previous School Details</ThemedText>
      {renderDropdown('Previous School (Optional)', 'is_previous_school', [
        { label: 'No', value: false as any },
        { label: 'Yes', value: true as any },
      ], 'Select')}
      {formData.is_previous_school && (
        <>
          {renderInput('Previous School Name (Optional)', 'previous_school_name', 'School name')}
          {renderInput('Previous Class (Optional)', 'previous_class', 'Class name')}
          {renderInput('Remark (Optional)', 'previous_school_remark', 'Any remarks', 'default', true)}
        </>
      )}
    </View>
  );

  const renderStep4 = () => {
    const SummarySection = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <View style={[fStyles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <ThemedText style={[fStyles.summaryCardTitle, { color: themeColors.foreground }]}>{title}</ThemedText>
        {children}
      </View>
    );

    const SummaryRow = ({ label, value }: { label: string; value?: string }) => (
      <View style={fStyles.summaryRow}>
        <ThemedText style={[fStyles.summaryLabel, { color: themeColors.foreground }]}>{label}: </ThemedText>
        <ThemedText style={[fStyles.summaryValue, { color: themeColors.foreground }]}>{value || '—'}</ThemedText>
      </View>
    );

    return (
      <View>
        <SummarySection title="Academic Details">
          <SummaryRow label="Admission Number" value={formData.admission_number} />
          <SummaryRow label="Admission Date" value={formData.admission_date} />
          <SummaryRow label="Academic Year" value={getYearName(formData.academic_year_id)} />
          <SummaryRow label="Admitted Academic Year" value={getYearName(formData.admitted_academic_year_id || formData.academic_year_id)} />
          <SummaryRow label="Admitted Class" value={getClassName(formData.admitted_class_id)} />
          <SummaryRow label="Admitted Section" value={getSectionName(formData.admitted_class_id, formData.admitted_section_id)} />
          <SummaryRow label="Current Class" value={getClassName(formData.current_class_id)} />
          <SummaryRow label="Current Section" value={getSectionName(formData.current_class_id, formData.current_section_id)} />
        </SummarySection>

        <SummarySection title="Student Details">
          <SummaryRow label="Name" value={`${formData.student.first_name} ${formData.student.last_name}`} />
          <SummaryRow label="Date of Birth" value={formData.student.date_of_birth} />
          <SummaryRow label="Gender" value={formData.student.gender ? formData.student.gender.charAt(0).toUpperCase() : ''} />
          <SummaryRow label="Aadhar Number" value={formData.student.aadhar_number} />
          <SummaryRow label="APAAR Number" value={formData.student.apaar_number} />
          <SummaryRow label="Caste" value={castesDropdownData?.find(c => c.value === formData.student.caste_id)?.label} />
          <SummaryRow label="Sub Caste" value={subCastesDropdownData?.find(c => c.value === formData.student.sub_caste_id)?.label} />
          <SummaryRow label="Community" value={formData.student.community} />
          <SummaryRow label="Identification Marks" value={formData.student.identification_marks} />
        </SummarySection>

        <SummarySection title="Parent Details">
          <ThemedText style={[fStyles.parentSubTitle, { color: themeColors['muted-foreground'] }]}>Father</ThemedText>
          <SummaryRow label="Name" value={formData.father.name} />
          <SummaryRow label="Email" value={formData.father.email} />
          <SummaryRow label="Phone" value={formData.father.phone} />
          <SummaryRow label="Occupation" value={formData.father.occupation} />
          <SummaryRow label="Salary Range" value={salaryRangesData.find(o => o.value === formData.father.salary_range)?.label} />
          <SummaryRow label="Aadhar" value={formData.father.aadhar_number} />
          <SummaryRow label="Gender" value={formData.father.gender ? formData.father.gender.charAt(0).toUpperCase() : ''} />
          <SummaryRow label="Relation" value={formData.father.relation_to_student} />
          <ThemedText style={[fStyles.parentSubTitle, { color: themeColors['muted-foreground'], marginTop: 12 }]}>Mother</ThemedText>
          <SummaryRow label="Name" value={formData.mother.name} />
          <SummaryRow label="Email" value={formData.mother.email} />
          <SummaryRow label="Phone" value={formData.mother.phone} />
          <SummaryRow label="Occupation" value={formData.mother.occupation} />
          <SummaryRow label="Salary Range" value={salaryRangesData.find(o => o.value === formData.mother.salary_range)?.label} />
          <SummaryRow label="Aadhar" value={formData.mother.aadhar_number} />
          <SummaryRow label="Gender" value={formData.mother.gender ? formData.mother.gender.charAt(0).toUpperCase() : ''} />
          <SummaryRow label="Relation" value={formData.mother.relation_to_student} />
        </SummarySection>

        {formData.guardian.name ? (
          <SummarySection title="Guardian Details">
            <SummaryRow label="Name" value={formData.guardian.name} />
            <SummaryRow label="Email" value={formData.guardian.email} />
            <SummaryRow label="Phone" value={formData.guardian.phone} />
            <SummaryRow label="Occupation" value={formData.guardian.occupation} />
            <SummaryRow label="Salary Range" value={salaryRangesData.find(o => o.value === formData.guardian.salary_range)?.label} />
            <SummaryRow label="Aadhar" value={formData.guardian.aadhar_number} />
            <SummaryRow label="Gender" value={formData.guardian.gender ? formData.guardian.gender.charAt(0).toUpperCase() : ''} />
            <SummaryRow label="Relation" value={formData.guardian.relation_to_student} />
          </SummarySection>
        ) : null}

        <SummarySection title="Address Details">
          <SummaryRow label="Address Line 1" value={formData.address_line1} />
          <SummaryRow label="Address Line 2" value={formData.address_line2} />
          <SummaryRow label="City" value={formData.city} />
          <SummaryRow label="State" value={statesOptions.find(s => s.value === formData.state_id)?.label ?? formData.state_id} />
          <SummaryRow label="District" value={districtsOptions.find(d => d.value === formData.district_id)?.label} />
          <SummaryRow label="Mandal" value={mandalsOptions.find(m => m.value === formData.mandal_id)?.label} />
          <SummaryRow label="Pincode" value={formData.pincode} />
        </SummarySection>

        <SummarySection title="Previous School">
          <SummaryRow label="Has Previous School" value={formData.is_previous_school ? 'Yes' : 'No'} />
          {formData.is_previous_school && (
            <>
              <SummaryRow label="School Name" value={formData.previous_school_name} />
              <SummaryRow label="Previous Class" value={formData.previous_class} />
            </>
          )}
        </SummarySection>
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  // ─── List view ────────────────────────────────────────────────────────────

  const renderListView = () => {
    const listData = (searchQuery ? (searchResults ?? []) : admissionsData?.items ?? []).filter(Boolean);

    return (
      <View style={{ flex: 1 }}>
        {/* Search + New button */}
        <View style={[lStyles.searchRow, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
          <View style={[lStyles.searchWrap, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
            <Ionicons name="search-outline" size={16} color={themeColors['muted-foreground']} style={{ marginLeft: 10 }} />
            <TextInput
              style={[lStyles.searchInput, { color: themeColors.foreground }]}
              placeholder="Search"
              placeholderTextColor={themeColors['muted-foreground']}
              value={searchQuery}
              onChangeText={v => { setSearchQuery(v); setCurrentPage(1); }}
            />
          </View>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
            <TouchableOpacity
              style={[lStyles.newBtn, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: themeColors.primary, marginRight: 8 }]}
              onPress={() => router.push('/students/bulk-upload')}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={themeColors.primary} />
              <ThemedText style={[lStyles.newBtnText, { color: themeColors.primary }]}>Bulk Import</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
            <TouchableOpacity style={[lStyles.newBtn, { backgroundColor: themeColors.primary }]} onPress={handleCreateNew}>
              <Ionicons name="add" size={16} color="white" />
              <ThemedText style={lStyles.newBtnText}>New Admission</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
          {isLoadingAdmissions ? (
            <View style={lStyles.emptyRow}>
              <ThemedText style={{ color: themeColors['muted-foreground'] }}>Loading admissions...</ThemedText>
            </View>
          ) : listData.length === 0 ? (
            <View style={lStyles.emptyRow}>
              <Ionicons name="people-outline" size={28} color={themeColors['muted-foreground']} />
              <ThemedText style={{ marginTop: 6, color: themeColors['muted-foreground'] }}>No admissions found</ThemedText>
            </View>
          ) : listData.map((admission: any, idx: number) => {
            const isAdmObj = 'student' in admission;
            const studentName = isAdmObj
              ? `${admission.student?.first_name || ''} ${admission.student?.last_name || ''}`.trim()
              : `${admission.first_name || ''} ${admission.last_name || ''}`.trim();
            const admNum = admission.admission_number ?? '—';
            const isActive = admission.student?.is_active ?? admission.is_active ?? true;
            const className = getClassName(admission.current_class_id);
            const sectionName = getSectionName(admission.current_class_id, admission.current_section_id);
            const yearName = getYearName(admission.admitted_academic_year_id ?? admission.academic_year_id);
            const dateStr = admission.admission_date
              ? new Date(admission.admission_date + 'T00:00:00').toLocaleDateString() : '—';
            return (
              <View key={admission.id} style={[lStyles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[lStyles.cardAccent, { backgroundColor: themeColors.primary }]} />
                <View style={{ flex: 1, padding: 12 }}>
                  <ThemedText style={[lStyles.serialNo, { color: themeColors['muted-foreground'] }]}>{idx + 1}</ThemedText>
                  <View style={lStyles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[lStyles.admNoText, { color: themeColors.foreground }]}>{admNum}</ThemedText>
                      <ThemedText style={[lStyles.nameText, { color: themeColors.foreground }]} numberOfLines={1}>{studentName || '—'}</ThemedText>
                    </View>
                    <View style={[lStyles.statusBadge, { backgroundColor: isActive ? '#dcfce7' : '#fee2e2' }]}>
                      <ThemedText style={[lStyles.statusText, { color: isActive ? '#16a34a' : '#ef4444' }]}>
                        {isActive ? 'Active' : 'Inactive'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={lStyles.cardMeta}>
                    <Ionicons name="school-outline" size={13} color={themeColors['muted-foreground']} />
                    <ThemedText style={[lStyles.cardMetaText, { color: themeColors['muted-foreground'] }]} numberOfLines={1}>
                      {className || '—'} · {sectionName || '—'} · {yearName || '—'}
                    </ThemedText>
                  </View>
                  <View style={lStyles.cardMeta}>
                    <Ionicons name="calendar-outline" size={13} color={themeColors['muted-foreground']} />
                    <ThemedText style={[lStyles.cardMetaText, { color: themeColors['muted-foreground'] }]}>Admitted: {dateStr}</ThemedText>
                  </View>
                  <View style={[lStyles.cardFooter, { borderTopColor: borderCol }]}>
                    <TouchableOpacity style={lStyles.cardAction} onPress={() => { setSelectedViewAdmission(admission); setViewModalVisible(true); }}>
                      <Ionicons name="eye-outline" size={15} color={BLUE} />
                      <ThemedText style={[lStyles.cardActionText, { color: BLUE }]}>View</ThemedText>
                    </TouchableOpacity>
                    <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
                      <TouchableOpacity style={lStyles.cardAction} onPress={() => handleEditAdmission(admission)}>
                        <Ionicons name="create-outline" size={15} color={themeColors.primary} />
                        <ThemedText style={[lStyles.cardActionText, { color: themeColors.primary }]}>Edit</ThemedText>
                      </TouchableOpacity>
                    </UpdatePermissionGuard>
                    <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
                      <TouchableOpacity style={lStyles.cardAction} onPress={() => handleToggleActive(admission)} disabled={toggleActiveMutation.isPending}>
                        <Ionicons name={isActive ? 'ban-outline' : 'checkmark-circle-outline'} size={15} color={isActive ? '#EF4444' : '#10B981'} />
                        <ThemedText style={[lStyles.cardActionText, { color: isActive ? '#EF4444' : '#10B981' }]}>
                          {isActive ? 'Deactivate' : 'Activate'}
                        </ThemedText>
                      </TouchableOpacity>
                    </UpdatePermissionGuard>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Pagination */}
          {!searchQuery && admissionsData && admissionsData.total_count > pageSize && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
              <TouchableOpacity
                style={[lStyles.pageBtn, { backgroundColor: currentPage > 1 ? themeColors.primary : themeColors.muted }]}
                onPress={() => setCurrentPage(p => p - 1)} disabled={currentPage <= 1}
              accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={16} color="white" />
              </TouchableOpacity>
              <ThemedText style={{ marginHorizontal: 16, fontSize: 14 }}>
                Page {currentPage} of {Math.ceil(admissionsData.total_count / pageSize)}
              </ThemedText>
              <TouchableOpacity
                style={[lStyles.pageBtn, { backgroundColor: currentPage < Math.ceil(admissionsData.total_count / pageSize) ? themeColors.primary : themeColors.muted }]}
                onPress={() => setCurrentPage(p => p + 1)} disabled={currentPage >= Math.ceil(admissionsData.total_count / pageSize)}
              accessibilityLabel="Next"
              >
                <Ionicons name="chevron-forward" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    );
  };

  // ─── View modal ───────────────────────────────────────────────────────────

  const renderViewModal = () => {
    if (!selectedViewAdmission) return null;
    const a = selectedViewAdmission;
    const s = a.student || {};

    const details = [
      { label: 'Admission Number', value: a.admission_number ?? '—' },
      { label: 'Admission Date', value: a.admission_date ? new Date(a.admission_date + 'T00:00:00').toLocaleDateString() : '—' },
      { label: 'Academic Year', value: getYearName(a.admitted_academic_year_id ?? a.academic_year_id) },
      { label: 'Admitted Class', value: getClassName(a.admitted_class_id) },
      { label: 'Admitted Section', value: getSectionName(a.admitted_class_id, a.admitted_section_id) },
      { label: 'Current Class', value: getClassName(a.current_class_id) },
      { label: 'Current Section', value: getSectionName(a.current_class_id, a.current_section_id) },
      { label: 'Address Line 1', value: a.address_line1 ?? '—' },
      { label: 'Address Line 2', value: a.address_line2 ?? '—' },
      { label: 'City', value: a.city ?? '—' },
      { label: 'State', value: (() => {
          const byId = a.state_id ? statesOptions.find((o: any) => o.value === a.state_id)?.label : undefined;
          if (byId) return byId;
          const st = a.state;
          if (!st) return '—';
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(st);
          if (!isUuid) return st;
          // state is a UUID — try statesOptions lookup by value
          return statesOptions.find((o: any) => o.value === st)?.label ?? '—';
        })() },
      { label: 'District', value: (() => {
          if (a.district_id) return viewDistrictsOptions.find((o: any) => o.value === a.district_id)?.label ?? a.district ?? '—';
          return a.district ?? '—';
        })() },
      { label: 'Mandal', value: (() => {
          if (a.mandal_id) return viewMandalsOptions.find((o: any) => o.value === a.mandal_id)?.label ?? a.mandal ?? '—';
          return a.mandal ?? '—';
        })() },
      { label: 'Pincode', value: a.pincode ?? '—' },
      { label: 'Student Name', value: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || '—' },
      { label: 'Date of Birth', value: s.date_of_birth ? new Date(s.date_of_birth + 'T00:00:00').toLocaleDateString() : '—' },
      { label: 'Gender', value: s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1).toLowerCase() : '—' },
      { label: 'Aadhar Number', value: s.aadhar_number ?? 'N/A' },
      { label: 'APAAR Number', value: s.apaar_number ?? 'N/A' },
      { label: 'Caste', value: s.caste ?? (s.caste_id ? (castesDropdownData?.find((c: any) => c.value === s.caste_id)?.label ?? 'N/A') : 'N/A') },
      { label: 'Sub Caste', value: s.sub_caste ?? (s.sub_caste_id ? ((viewSubCastesData ?? subCastesDropdownData)?.find((c: any) => c.value === s.sub_caste_id)?.label ?? 'N/A') : 'N/A') },
      { label: 'Community', value: s.community ?? 'N/A' },
      { label: 'Nationality', value: s.nationality ?? '—' },
      { label: 'Mother Tongue', value: s.mother_tongue ?? '—' },
      { label: 'Identification Marks', value: s.identification_marks ?? 'N/A' },
      { label: 'Father Name', value: s.father?.name ?? a.father?.name ?? 'N/A' },
      { label: 'Father Email', value: s.father?.email ?? a.father?.email ?? 'N/A' },
      { label: 'Father Phone', value: s.father?.phone ?? a.father?.phone ?? 'N/A' },
      { label: 'Father Occupation', value: s.father?.occupation ?? a.father?.occupation ?? 'N/A' },
      { label: 'Father Aadhar', value: s.father?.aadhar_number ?? a.father?.aadhar_number ?? 'N/A' },
      { label: 'Father Gender', value: s.father?.gender ? s.father.gender.charAt(0).toUpperCase() : (a.father?.gender ? a.father.gender.charAt(0).toUpperCase() : 'N/A') },
      { label: 'Mother Name', value: s.mother?.name ?? a.mother?.name ?? 'N/A' },
      { label: 'Mother Email', value: s.mother?.email ?? a.mother?.email ?? 'N/A' },
      { label: 'Mother Phone', value: s.mother?.phone ?? a.mother?.phone ?? 'N/A' },
      { label: 'Mother Occupation', value: s.mother?.occupation ?? a.mother?.occupation ?? 'N/A' },
      { label: 'Mother Aadhar', value: s.mother?.aadhar_number ?? a.mother?.aadhar_number ?? 'N/A' },
      { label: 'Mother Gender', value: s.mother?.gender ? s.mother.gender.charAt(0).toUpperCase() : (a.mother?.gender ? a.mother.gender.charAt(0).toUpperCase() : 'N/A') },
      ...(a.is_previous_school ? [
        { label: 'Previous School', value: a.previous_school_name ?? '—' },
        { label: 'Previous Class', value: a.previous_class ?? '—' },
        { label: 'Remark', value: a.previous_school_remark ?? 'N/A' },
      ] : []),
    ];

    return (
      <Modal visible={viewModalVisible} animationType="slide" transparent onRequestClose={() => setViewModalVisible(false)}>
        <View style={mStyles.overlay}>
          <View style={[mStyles.container, { backgroundColor: cardBg }]}>
            <View style={[mStyles.header, { borderBottomColor: themeColors.border }]}>
              <ThemedText style={[mStyles.title, { color: themeColors.foreground }]}>
                Admission Details - {a.admission_number}
              </ThemedText>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close-circle-outline" size={28} color={themeColors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ── Student photo + name ── */}
              <View style={mStyles.avatarSection}>
                {(() => {
                  const photoUri = buildPhotoUri(s.photo_url);
                  if (photoUri) {
                    return (
                      <Image
                        source={{ uri: photoUri }}
                        style={[mStyles.avatarImage, { borderColor: themeColors.border }]}
                        resizeMode="cover"
                      />
                    );
                  }
                  return (
                    <View style={[mStyles.avatarPlaceholder, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}>
                      <Ionicons name="person-circle-outline" size={64} color={themeColors['muted-foreground']} />
                    </View>
                  );
                })()}
                <ThemedText style={[mStyles.avatarName, { color: themeColors.foreground }]}>
                  {`${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || a.admission_number}
                </ThemedText>
              </View>

              {details.map((item, idx) => (
                <View
                  key={idx}
                  style={[mStyles.detailRow, {
                    borderBottomColor: themeColors.border,
                    backgroundColor: idx % 2 === 0 ? themeColors.background : 'transparent',
                  }]}
                >
                  <ThemedText style={[mStyles.detailLabel, { color: themeColors['muted-foreground'] }]}>{item.label}</ThemedText>
                  <ThemedText style={[mStyles.detailValue, { color: themeColors.foreground }]}>{item.value}</ThemedText>
                </View>
              ))}
            </ScrollView>

            <View style={[mStyles.footer, { borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={[mStyles.closeBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                onPress={() => setViewModalVisible(false)}
              >
                <ThemedText style={{ color: themeColors.foreground, fontWeight: '600' }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── Form view ────────────────────────────────────────────────────────────

  const renderFormView = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Step progress bar */}
      <View style={[fStyles.stepHeader, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <ThemedText style={{ fontSize: 15, fontWeight: '700', color: themeColors.foreground }}>{STEPS[currentStep]}</ThemedText>
          <ThemedText style={{ fontSize: 12, color: themeColors['muted-foreground'] }}>Step {currentStep + 1} of {STEPS.length}</ThemedText>
        </View>
        <View style={[fStyles.progressBg, { backgroundColor: themeColors.muted }]}>
          <View style={[fStyles.progressFill, { backgroundColor: themeColors.primary, width: `${((currentStep + 1) / STEPS.length) * 100}%` as any }]} />
        </View>
      </View>

      {/* Date picker — Android: inline calendar auto-dismisses */}
      {activeDateField && Platform.OS === 'android' && (
        <DateTimePicker
          value={getDateValue(activeDateField)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
      {/* Date picker — iOS: bottom-sheet Modal with Cancel/Done */}
      <IOSDatePickerModal
        visible={!!activeDateField && Platform.OS === 'ios'}
        value={activeDateField ? getDateValue(activeDateField) : new Date()}
        mode="date"
        maximumDate={new Date()}
        onChange={(date) => {
          if (activeDateField) {
            const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            updateFormData(activeDateField, iso);
            setDateDisplayValues(p => ({ ...p, [activeDateField]: toDisplayDMY(iso) }));
          }
        }}
        onDismiss={() => setActiveDateField(null)}
      />

      <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {renderStepContent()}

        {/* Navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 32 }}>
          {currentStep > 0 ? (
            <TouchableOpacity
              style={[fStyles.navBtn, { borderWidth: 1.5, borderColor: themeColors.primary, backgroundColor: 'transparent', flex: 1, marginRight: 8 }]}
              onPress={handlePrevious}
            >
              <ThemedText style={{ color: themeColors.primary, fontWeight: '600', fontSize: 15 }}>Previous</ThemedText>
            </TouchableOpacity>
          ) : null}

          {/* Cancel button always visible */}
          <TouchableOpacity
            style={[fStyles.navBtn, { borderWidth: 1.5, borderColor: themeColors.border, backgroundColor: 'transparent', flex: 1, marginRight: 8 }]}
            onPress={() => setViewMode('list')}
          >
            <ThemedText style={{ color: themeColors['muted-foreground'], fontWeight: '600', fontSize: 15 }}>Cancel</ThemedText>
          </TouchableOpacity>

          {currentStep < STEPS.length - 1 ? (
            <TouchableOpacity
              style={[fStyles.navBtn, { backgroundColor: themeColors.primary, flex: 1 }]}
              onPress={handleNext}
            >
              <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>Next</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[fStyles.navBtn, { backgroundColor: themeColors.primary, flex: 1 }]}
              onPress={handleSubmit}
              disabled={createAdmissionMutation.isPending || updateAdmissionMutation.isPending}
            >
              <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
                {createAdmissionMutation.isPending || updateAdmissionMutation.isPending
                  ? 'Saving...'
                  : isEditMode ? 'Update Admission' : 'Create Admission'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // ─── Root render ──────────────────────────────────────────────────────────

  return (
    <>
      <ReadOrListPermissionGuard
        resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}
        fallback={
          <AppLayout title="Student Admissions">
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
              <ThemedText style={{ marginTop: 16, textAlign: 'center', opacity: 0.7 }}>
                You don&apos;t have permission to access student admissions
              </ThemedText>
            </View>
          </AppLayout>
        }
      >
        <AppLayout title="Student Admissions">
          {viewMode === 'list' ? renderListView() : renderFormView()}
        </AppLayout>
      </ReadOrListPermissionGuard>
      {renderViewModal()}
      <ConfirmModal {...modalProps} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const lStyles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
  },
  searchInput: { flex: 1, paddingHorizontal: 8, fontSize: 13 },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  newBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  // Cards
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  admNoText: { fontSize: 12, fontWeight: '700', opacity: 0.6 },
  nameText: { fontSize: 15, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  cardMetaText: { fontSize: 12, flex: 1 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, marginTop: 6 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cardActionText: { fontSize: 12, fontWeight: '600' },
  emptyRow: { alignItems: 'center', paddingVertical: 48 },
  pageBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

const fStyles = StyleSheet.create({
  stepHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { marginBottom: 14 },
  accordionHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14,
  },
  accordionBody: { paddingBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  inputContainer: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  inputWrapper: { borderRadius: 8, borderWidth: 1 },
  input: { padding: 11, fontSize: 14 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    padding: 11,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  dateInput: { flex: 1, fontSize: 14, paddingVertical: 7 },
  errorText: { fontSize: 11, marginTop: 3 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  navBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  summaryCardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  summaryLabel: { fontSize: 13, fontWeight: '700' },
  summaryValue: { fontSize: 13 },
  parentSubTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  guardianHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, marginBottom: 6,
    paddingTop: 20, borderTopWidth: StyleSheet.hairlineWidth,
  },
  optionalBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  optionalBadgeText: { fontSize: 11, fontWeight: '600' },
  guardianHint: { fontSize: 12, marginBottom: 14, lineHeight: 17 },
  photoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingBottom: 16, marginBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  photoCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoPreview: { width: 72, height: 72, borderRadius: 36 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, alignSelf: 'flex-start', marginTop: 6,
  },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', minHeight: '60%' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  // Photo / avatar area
  avatarSection: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  avatarImage: { width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarName: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  // Detail rows
  detailRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLabel: { width: '40%', fontSize: 13, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 13, paddingLeft: 8 },
  footer: { padding: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  closeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
});
