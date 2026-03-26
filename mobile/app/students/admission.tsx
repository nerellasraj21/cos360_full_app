import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IOSDatePickerModal } from '@/components/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { studentAdmissionsApi, classSectionsApi, academicYearsApi, castesApi, StudentAdmissionCreate, StudentAdmissionUpdate } from '@/src/api';
import { useCreateAdmission, useUpdateAdmission, useDeleteAdmission, useAdmissionByStudentId, useAdmissions, useStudentsSearch } from '@/src/api/hooks/students/admissions';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidDate = (d: string) => !isNaN(new Date(d).getTime()) && !!d.match(/^\d{4}-\d{2}-\d{2}$/);
const isFutureDate = (d: string) => { const [y, m, day] = d.split('-').map(Number); const dt = new Date(y, m - 1, day); const today = new Date(); today.setHours(0,0,0,0); return dt > today; };
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidAadhar = (a: string) => /^\d{12}$/.test(a);

const INDIAN_STATES = [
  { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
  { label: 'Arunachal Pradesh', value: 'Arunachal Pradesh' },
  { label: 'Assam', value: 'Assam' },
  { label: 'Bihar', value: 'Bihar' },
  { label: 'Chhattisgarh', value: 'Chhattisgarh' },
  { label: 'Goa', value: 'Goa' },
  { label: 'Gujarat', value: 'Gujarat' },
  { label: 'Haryana', value: 'Haryana' },
  { label: 'Himachal Pradesh', value: 'Himachal Pradesh' },
  { label: 'Jharkhand', value: 'Jharkhand' },
  { label: 'Karnataka', value: 'Karnataka' },
  { label: 'Kerala', value: 'Kerala' },
  { label: 'Madhya Pradesh', value: 'Madhya Pradesh' },
  { label: 'Maharashtra', value: 'Maharashtra' },
  { label: 'Manipur', value: 'Manipur' },
  { label: 'Meghalaya', value: 'Meghalaya' },
  { label: 'Mizoram', value: 'Mizoram' },
  { label: 'Nagaland', value: 'Nagaland' },
  { label: 'Odisha', value: 'Odisha' },
  { label: 'Punjab', value: 'Punjab' },
  { label: 'Rajasthan', value: 'Rajasthan' },
  { label: 'Sikkim', value: 'Sikkim' },
  { label: 'Tamil Nadu', value: 'Tamil Nadu' },
  { label: 'Telangana', value: 'Telangana' },
  { label: 'Tripura', value: 'Tripura' },
  { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
  { label: 'Uttarakhand', value: 'Uttarakhand' },
  { label: 'West Bengal', value: 'West Bengal' },
  { label: 'Delhi', value: 'Delhi' },
  { label: 'Jammu & Kashmir', value: 'Jammu & Kashmir' },
  { label: 'Ladakh', value: 'Ladakh' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
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
  state: string;
  district?: string;
  mandal?: string;
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
    aadhar_number?: string;
    gender?: string;
    relation_to_student: string;
  };
  mother: {
    name: string;
    email?: string;
    phone?: string;
    occupation?: string;
    aadhar_number?: string;
    gender?: string;
    relation_to_student: string;
  };
}

const STEPS = [
  'Academic Details',
  'Student Details',
  'Parent Information',
  'Address Details',
  'Previous School',
  'Review & Submit',
];

const INITIAL_FORM: FormData = {
  admission_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
  admission_type: 'non_primary',
  academic_year_id: '',
  admitted_academic_year_id: '',
  admitted_class_id: '',
  admitted_section_id: '',
  current_class_id: '',
  current_section_id: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  district: '',
  mandal: '',
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
  father: { name: '', email: '', phone: '', occupation: '', aadhar_number: '', gender: '', relation_to_student: 'Father' },
  mother: { name: '', email: '', phone: '', occupation: '', aadhar_number: '', gender: '', relation_to_student: 'Mother' },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StudentAdmissionScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const { id: studentId } = useLocalSearchParams<{ id?: string }>();
  const { showSuccess, showError } = useToastContext();
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

  // ── date picker ────────────────────────────────────────────────────────────
  const [activeDateField, setActiveDateField] = useState<string | null>(null);

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
      return data.map((item: any) => ({ label: item.name, value: item.id }));
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
    select: (d) => d.map((s: any) => ({ label: s.name, value: s.id })),
  });

  const { data: currentSectionsData } = useQuery({
    queryKey: ['sections-for-current', formData.current_class_id],
    queryFn: () => classSectionsApi.getSectionsByClass(formData.current_class_id),
    enabled: !!formData.current_class_id,
    select: (d) => d.map((s: any) => ({ label: s.name, value: s.id })),
  });

  const { data: academicYearsData } = useQuery({
    queryKey: ['academic-years-dropdown'],
    queryFn: async () => {
      const data = await academicYearsApi.getAcademicYearsDropdown();
      return data.map((item: any) => ({ label: item.title, value: item.id }));
    },
  });

  const { data: admissionTypesData } = useQuery({
    queryKey: ['admission-types-dropdown'],
    queryFn: () => studentAdmissionsApi.getAdmissionTypesDropdown(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: castesDropdownData } = useQuery({
    queryKey: ['castes-dropdown'],
    queryFn: async () => {
      const data = await castesApi.getCastesDropdown();
      return data.map((item: any) => ({ label: item.name, value: item.id }));
    },
  });

  const { data: subCastesDropdownData } = useQuery({
    queryKey: ['sub-castes-dropdown', formData.student.caste_id],
    queryFn: async () => {
      const data = await castesApi.getSubCastesDropdown(formData.student.caste_id!);
      return data.map((item: any) => ({ label: item.name, value: item.id }));
    },
    enabled: !!formData.student.caste_id,
  });

  // Sub-castes for view modal (keyed on selected admission's caste_id, not form data)
  const viewCasteId = selectedViewAdmission?.student?.caste_id;
  const { data: viewSubCastesData } = useQuery({
    queryKey: ['sub-castes-dropdown', viewCasteId],
    queryFn: async () => {
      const data = await castesApi.getSubCastesDropdown(viewCasteId!);
      return data.map((item: any) => ({ label: item.name, value: item.id }));
    },
    enabled: !!viewCasteId,
  });

  const { data: admissionsData, isLoading: isLoadingAdmissions } = useAdmissions({ skip: (currentPage - 1) * pageSize, limit: pageSize });
  const { data: searchResults } = useStudentsSearch(searchQuery);

  const { data: existingAdmission } = useAdmissionByStudentId(studentId || '');
  const createAdmissionMutation = useCreateAdmission();
  const updateAdmissionMutation = useUpdateAdmission();
  const deleteAdmissionMutation = useDeleteAdmission();

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
      setFormData({
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
        state: a.state ?? '',
        district: a.district ?? '',
        mandal: a.mandal ?? '',
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
          name: a.father?.name ?? '',
          email: a.father?.email ?? '',
          phone: a.father?.phone ?? '',
          occupation: a.father?.occupation ?? '',
          aadhar_number: a.father?.aadhar_number ?? '',
          gender: a.father?.gender ?? '',
          relation_to_student: 'Father',
        },
        mother: {
          name: a.mother?.name ?? '',
          email: a.mother?.email ?? '',
          phone: a.mother?.phone ?? '',
          occupation: a.mother?.occupation ?? '',
          aadhar_number: a.mother?.aadhar_number ?? '',
          gender: a.mother?.gender ?? '',
          relation_to_student: 'Mother',
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
  const validateStep = (step: number) => {
    const e: any = {};
    if (step === 0) {
      if (!formData.admission_date) e.admission_date = 'Required';
      else if (!isValidDate(formData.admission_date)) e.admission_date = 'Invalid date';
      else if (isFutureDate(formData.admission_date)) e.admission_date = 'Cannot be in the future';
      if (!formData.admitted_class_id) e.admitted_class_id = 'Required';
      if (!formData.admitted_section_id) e.admitted_section_id = 'Required';
      if (!formData.current_class_id) e.current_class_id = 'Required';
      if (!formData.current_section_id) e.current_section_id = 'Required';
    }
    if (step === 1) {
      if (!formData.student.first_name.trim()) e.student = { ...e.student, first_name: 'Required' };
      if (!formData.student.last_name.trim()) e.student = { ...e.student, last_name: 'Required' };
      if (!formData.student.date_of_birth) e.student = { ...e.student, date_of_birth: 'Required' };
      else if (isFutureDate(formData.student.date_of_birth)) e.student = { ...e.student, date_of_birth: 'Cannot be in the future' };
      if (!formData.student.gender) e.student = { ...e.student, gender: 'Required' };
    }
    if (step === 2) {
      if (!formData.father.name.trim()) e.father = { ...e.father, name: 'Required' };
      if (!formData.mother.name.trim()) e.mother = { ...e.mother, name: 'Required' };
    }
    if (step === 3) {
      if (!formData.address_line1.trim()) e.address_line1 = 'Required';
      if (!formData.city.trim()) e.city = 'Required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const handlePrevious = () => setCurrentStep(s => Math.max(s - 1, 0));

  const handleSubmit = () => {
    let allErrors: any = {};
    for (let i = 0; i < STEPS.length - 1; i++) {
      const { errors: stepErrors } = (() => {
        const e: any = {};
        if (i === 0) {
          if (!formData.admission_date) e.admission_date = 'Required';
          if (!formData.admitted_class_id) e.admitted_class_id = 'Required';
          if (!formData.admitted_section_id) e.admitted_section_id = 'Required';
          if (!formData.current_class_id) e.current_class_id = 'Required';
          if (!formData.current_section_id) e.current_section_id = 'Required';
        }
        if (i === 1) {
          if (!formData.student.first_name.trim()) e.student = { ...e.student, first_name: 'Required' };
          if (!formData.student.last_name.trim()) e.student = { ...e.student, last_name: 'Required' };
          if (!formData.student.date_of_birth) e.student = { ...e.student, date_of_birth: 'Required' };
          if (!formData.student.gender) e.student = { ...e.student, gender: 'Required' };
        }
        if (i === 2) {
          if (!formData.father.name.trim()) e.father = { ...e.father, name: 'Required' };
          if (!formData.mother.name.trim()) e.mother = { ...e.mother, name: 'Required' };
        }
        if (i === 3) {
          if (!formData.address_line1.trim()) e.address_line1 = 'Required';
          if (!formData.city.trim()) e.city = 'Required';
        }
        return { errors: e };
      })();
      allErrors = { ...allErrors, ...stepErrors };
    }
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      showError('Validation Error', 'Please fill all required fields');
      return;
    }

    if (isEditMode && studentId) {
      const updateData: StudentAdmissionUpdate = {
        // Academic
        admission_date: formData.admission_date,
        admission_type: formData.admission_type as 'primary' | 'non_primary',
        academic_year_id: formData.academic_year_id,
        admitted_academic_year_id: formData.admitted_academic_year_id || formData.academic_year_id,
        admitted_class_id: formData.admitted_class_id,
        admitted_section_id: formData.admitted_section_id,
        current_class_id: formData.current_class_id,
        current_section_id: formData.current_section_id,
        // Address
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
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
        aadhar_number: formData.student.aadhar_number,
        apaar_number: formData.student.apaar_number,
        nationality: formData.student.nationality,
        mother_tongue: formData.student.mother_tongue,
        community: formData.student.community,
        identification_marks: formData.student.identification_marks,
        // Father
        father_name: formData.father.name,
        father_email: formData.father.email,
        father_phone: formData.father.phone,
        father_occupation: formData.father.occupation,
        father_aadhar_number: formData.father.aadhar_number,
        father_gender: formData.father.gender,
        // Mother
        mother_name: formData.mother.name,
        mother_email: formData.mother.email,
        mother_phone: formData.mother.phone,
        mother_occupation: formData.mother.occupation,
        mother_aadhar_number: formData.mother.aadhar_number,
        mother_gender: formData.mother.gender,
      };
      updateAdmissionMutation.mutate({ studentId, data: updateData });
    } else {
      const apiData: StudentAdmissionCreate = {
        admission_date: formData.admission_date,
        admission_type: formData.admission_type as 'primary' | 'non_primary',
        academic_year_id: formData.academic_year_id,
        admitted_academic_year_id: formData.admitted_academic_year_id || formData.academic_year_id,
        admitted_class_id: formData.admitted_class_id,
        admitted_section_id: formData.admitted_section_id,
        current_class_id: formData.current_class_id,
        current_section_id: formData.current_section_id,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        is_previous_school: formData.is_previous_school,
        previous_school_name: formData.previous_school_name,
        previous_class: formData.previous_class,
        previous_school_remark: formData.previous_school_remark,
        student: {
          ...formData.student,
          father: formData.father,
          mother: formData.mother,
        },
      };
      createAdmissionMutation.mutate(apiData);
    }
  };

  const handleCreateNew = () => {
    setIsEditMode(false);
    setFormData(INITIAL_FORM);
    setErrors({});
    setCurrentStep(0);
    setSameAsAdmission(false);
    setViewMode('form');
  };

  const handleEditAdmission = (sId: string) => {
    setIsEditMode(true);
    setViewMode('form');
    router.setParams({ id: sId });
  };

  const handleDelete = () => {
    if (!studentId) return;
    Alert.alert('Delete Admission', 'Are you sure you want to delete this admission? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteAdmissionMutation.mutate(studentId) },
    ]);
  };

  const handleToggleActive = (admission: any) => {
    const isActive = admission.student?.is_active ?? true;
    const name = `${admission.student?.first_name || ''} ${admission.student?.last_name || ''}`.trim();
    Alert.alert(
      `${isActive ? 'Deactivate' : 'Activate'} Student`,
      `Are you sure you want to ${isActive ? 'deactivate' : 'activate'} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Deactivate' : 'Activate',
          style: isActive ? 'destructive' : 'default',
          onPress: () => toggleActiveMutation.mutate(admission.student?.id || admission.id),
        },
      ]
    );
  };

  // ─── Date picker handler ──────────────────────────────────────────────────

  const handleDateChange = (_event: any, date?: Date) => {
    const field = activeDateField;
    setActiveDateField(null);
    if (_event.type === 'set' && date && field) {
      // Use local date methods — toISOString() converts to UTC and gives wrong date in IST
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      updateFormData(field, iso);
    }
  };

  const getDateValue = (field: string): Date => {
    const iso = getFieldValue(field);
    return iso ? new Date(iso + 'T00:00:00') : new Date();
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const renderInput = (
    label: string, field: string, placeholder: string,
    keyboardType: any = 'default', multiline = false
  ) => {
    const val = getFieldValue(field);
    const err = getFieldError(field);
    return (
      <View style={fStyles.inputContainer}>
        <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>{label}</ThemedText>
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
          />
        </View>
        {err ? <ThemedText style={[fStyles.errorText, { color: themeColors.destructive }]}>{err}</ThemedText> : null}
      </View>
    );
  };

  const renderDropdown = (label: string, field: string, data: any[], placeholder: string, disabled = false, loading = false) => {
    const val = getFieldValue(field);
    const err = getFieldError(field);
    return (
      <View style={fStyles.inputContainer}>
        <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>{label}</ThemedText>
        <CustomDropdown
          data={data || []}
          placeholder={loading ? 'Loading...' : placeholder}
          value={val}
          onChange={v => updateFormData(field, v as string)}
          error={err}
          disabled={disabled || loading}
          style={{ backgroundColor: themeColors.card }}
        />
      </View>
    );
  };

  const renderDateButton = (label: string, field: string) => {
    const iso = getFieldValue(field);
    const displayDate = iso ? new Date(iso + 'T00:00:00').toLocaleDateString() : '';
    const err = getFieldError(field);
    return (
      <View style={fStyles.inputContainer}>
        <ThemedText style={[fStyles.label, { color: themeColors.foreground }]}>{label}</ThemedText>
        <TouchableOpacity
          style={[fStyles.dateBtn, { backgroundColor: themeColors.background, borderColor: err ? themeColors.destructive : themeColors.border }]}
          onPress={() => setActiveDateField(field)}
        >
          <ThemedText style={{ color: iso ? themeColors['card-foreground'] : themeColors['muted-foreground'], fontSize: 15 }}>
            {displayDate || 'Select date'}
          </ThemedText>
          <Ionicons name="calendar-outline" size={18} color={themeColors.primary} />
        </TouchableOpacity>
        {err ? <ThemedText style={[fStyles.errorText, { color: themeColors.destructive }]}>{err}</ThemedText> : null}
      </View>
    );
  };

  // ─── Step renderers ───────────────────────────────────────────────────────

  const renderStep0 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Academic Details</ThemedText>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDateButton('Admission Date *', 'admission_date')}</View>
        <View style={fStyles.half}>
          {renderDropdown('Admission Type', 'admission_type', admissionTypesData || [
            { label: 'Non-Primary Admission', value: 'non_primary' },
            { label: 'Primary Admission', value: 'primary' },
          ], 'Select type')}
        </View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Academic Year', 'academic_year_id', academicYearsData || [], 'Select year')}</View>
        <View style={fStyles.half}>{renderDropdown('Admitted Year', 'admitted_academic_year_id', academicYearsData || [], 'Same as above')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Admitted Class *', 'admitted_class_id', classesData || [], 'Select class')}</View>
        <View style={fStyles.half}>{renderDropdown('Admitted Section *', 'admitted_section_id', sectionsData || [], 'Select section', !formData.admitted_class_id)}</View>
      </View>
      <TouchableOpacity style={fStyles.checkboxRow} onPress={() => setSameAsAdmission(v => !v)} activeOpacity={0.7}>
        <View style={[fStyles.checkbox, { borderColor: sameAsAdmission ? themeColors.primary : themeColors.border }, sameAsAdmission && { backgroundColor: themeColors.primary }]}>
          {sameAsAdmission && <Ionicons name="checkmark" size={13} color="white" />}
        </View>
        <ThemedText style={{ color: themeColors.foreground, fontSize: 13 }}>Current class same as admission class</ThemedText>
      </TouchableOpacity>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Current Class *', 'current_class_id', classesData || [], 'Select class', sameAsAdmission)}</View>
        <View style={fStyles.half}>{renderDropdown('Current Section *', 'current_section_id', currentSectionsData || [], 'Select section', sameAsAdmission || !formData.current_class_id)}</View>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Student Details</ThemedText>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('First Name *', 'student.first_name', 'Enter first name')}</View>
        <View style={fStyles.half}>{renderInput('Last Name *', 'student.last_name', 'Enter last name')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDateButton('Date of Birth *', 'student.date_of_birth')}</View>
        <View style={fStyles.half}>{renderDropdown('Gender *', 'student.gender', [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' },
          { label: 'Other', value: 'other' },
        ], 'Select Gender')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Primary Status', 'student.is_primary', [
          { label: 'Not Primary', value: 'not_primary' },
          { label: 'Primary', value: 'primary' },
        ], 'Select status')}</View>
        <View style={fStyles.half}>{renderInput('Nationality', 'student.nationality', 'Indian')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Mother Tongue', 'student.mother_tongue', [
          { label: 'Telugu', value: 'Telugu' }, { label: 'Hindi', value: 'Hindi' },
          { label: 'English', value: 'English' }, { label: 'Tamil', value: 'Tamil' },
          { label: 'Malayalam', value: 'Malayalam' }, { label: 'Kannada', value: 'Kannada' },
          { label: 'Marathi', value: 'Marathi' }, { label: 'Bengali', value: 'Bengali' },
          { label: 'Gujarati', value: 'Gujarati' }, { label: 'Urdu', value: 'Urdu' },
          { label: 'Others', value: 'Others' },
        ], 'Select Mother Tongue')}</View>
        <View style={fStyles.half}>{renderInput('Aadhar Number (Optional)', 'student.aadhar_number', 'Enter Aadhar', 'numeric')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('APAAR Number (Optional)', 'student.apaar_number', 'Enter APAAR')}</View>
        <View style={fStyles.half}>{renderDropdown('Caste (Optional)', 'student.caste_id', castesDropdownData || [], '-- Select Caste --')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderDropdown('Sub-Caste (Optional)', 'student.sub_caste_id', subCastesDropdownData || [], '-- Select Sub-Caste --', !formData.student.caste_id)}</View>
        <View style={fStyles.half}>{renderInput('Community (Optional)', 'student.community', 'Enter community')}</View>
      </View>
      {renderInput('Identification Marks (Optional)', 'student.identification_marks', 'Enter identification marks', 'default', true)}
    </View>
  );

  const renderStep2 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Father Information</ThemedText>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Name *', 'father.name', 'Father name')}</View>
        <View style={fStyles.half}>{renderInput('Email', 'father.email', 'Email', 'email-address')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Phone', 'father.phone', 'Phone', 'phone-pad')}</View>
        <View style={fStyles.half}>{renderInput('Occupation', 'father.occupation', 'Occupation')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Aadhar', 'father.aadhar_number', 'Aadhar')}</View>
        <View style={fStyles.half}>{renderDropdown('Gender', 'father.gender', [
          { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }
        ], 'Select')}</View>
      </View>

      <ThemedText type="subtitle" style={[fStyles.sectionTitle, { marginTop: 20 }]}>Mother Information</ThemedText>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Name *', 'mother.name', 'Mother name')}</View>
        <View style={fStyles.half}>{renderInput('Email', 'mother.email', 'Email', 'email-address')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Phone', 'mother.phone', 'Phone', 'phone-pad')}</View>
        <View style={fStyles.half}>{renderInput('Occupation', 'mother.occupation', 'Occupation')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Aadhar', 'mother.aadhar_number', 'Aadhar')}</View>
        <View style={fStyles.half}>{renderDropdown('Gender', 'mother.gender', [
          { label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }
        ], 'Select')}</View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Address Details</ThemedText>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('Address Line 1 *', 'address_line1', 'Address line 1')}</View>
        <View style={fStyles.half}>{renderInput('Address Line 2 (Optional)', 'address_line2', 'Apartment, suite, etc.')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('City *', 'city', 'City')}</View>
        <View style={fStyles.half}>{renderDropdown('State *', 'state', INDIAN_STATES, '-- Select State --')}</View>
      </View>
      <View style={fStyles.row}>
        <View style={fStyles.half}>{renderInput('District (Optional)', 'district', 'Enter district')}</View>
        <View style={fStyles.half}>{renderInput('Mandal (Optional)', 'mandal', 'Enter mandal')}</View>
      </View>
      {renderInput('Pincode (Optional)', 'pincode', 'Enter pincode', 'numeric')}
    </View>
  );

  const renderStep4 = () => (
    <View style={[fStyles.section, { backgroundColor: cardBg }]}>
      <ThemedText type="subtitle" style={fStyles.sectionTitle}>Previous School Details</ThemedText>
      {renderDropdown('Previous School', 'is_previous_school', [
        { label: 'No', value: false as any },
        { label: 'Yes', value: true as any },
      ], 'Select')}
      {formData.is_previous_school && (
        <>
          {renderInput('Previous School Name', 'previous_school_name', 'School name')}
          {renderInput('Previous Class', 'previous_class', 'Class name')}
          {renderInput('Remark', 'previous_school_remark', 'Any remarks', 'default', true)}
        </>
      )}
    </View>
  );

  const renderStep5 = () => {
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
          <SummaryRow label="Aadhar" value={formData.father.aadhar_number} />
          <SummaryRow label="Gender" value={formData.father.gender ? formData.father.gender.charAt(0).toUpperCase() : ''} />
          <SummaryRow label="Relation" value={formData.father.relation_to_student} />
          <ThemedText style={[fStyles.parentSubTitle, { color: themeColors['muted-foreground'], marginTop: 12 }]}>Mother</ThemedText>
          <SummaryRow label="Name" value={formData.mother.name} />
          <SummaryRow label="Email" value={formData.mother.email} />
          <SummaryRow label="Phone" value={formData.mother.phone} />
          <SummaryRow label="Occupation" value={formData.mother.occupation} />
          <SummaryRow label="Aadhar" value={formData.mother.aadhar_number} />
          <SummaryRow label="Gender" value={formData.mother.gender ? formData.mother.gender.charAt(0).toUpperCase() : ''} />
          <SummaryRow label="Relation" value={formData.mother.relation_to_student} />
        </SummarySection>

        <SummarySection title="Address Details">
          <SummaryRow label="Address Line 1" value={formData.address_line1} />
          <SummaryRow label="Address Line 2" value={formData.address_line2} />
          <SummaryRow label="City" value={formData.city} />
          <SummaryRow label="State" value={formData.state} />
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
      case 5: return renderStep5();
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
              placeholder="Search students by name or admission number..."
              placeholderTextColor={themeColors['muted-foreground']}
              value={searchQuery}
              onChangeText={v => { setSearchQuery(v); setCurrentPage(1); }}
            />
          </View>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
            <TouchableOpacity style={[lStyles.newBtn, { backgroundColor: themeColors.primary }]} onPress={handleCreateNew}>
              <Ionicons name="add" size={16} color="white" />
              <ThemedText style={lStyles.newBtnText}>New Admission</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

        <ScrollView style={{ flex: 1, padding: 12 }} showsVerticalScrollIndicator={false}>
          {isLoadingAdmissions ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <ThemedText style={{ color: themeColors['muted-foreground'] }}>Loading admissions...</ThemedText>
            </View>
          ) : listData.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Ionicons name="people-outline" size={40} color={themeColors['muted-foreground']} />
              <ThemedText style={{ marginTop: 8, color: themeColors['muted-foreground'] }}>No admissions found</ThemedText>
            </View>
          ) : listData.map((admission: any) => {
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
            const studentEntityId = isAdmObj ? admission.student?.id : admission.id;

            return (
              <View key={admission.id} style={[lStyles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                {/* Header row */}
                <View style={lStyles.cardHeader}>
                  <ThemedText style={[lStyles.admNo, { color: themeColors.foreground }]}>{admNum}</ThemedText>
                  <View style={[lStyles.statusBadge, { backgroundColor: isActive ? '#dcfce7' : '#fee2e2' }]}>
                    <ThemedText style={[lStyles.statusText, { color: isActive ? '#16a34a' : '#ef4444' }]}>
                      {isActive ? 'Active' : 'Inactive'}
                    </ThemedText>
                  </View>
                </View>

                {/* Name */}
                <ThemedText style={[lStyles.studentName, { color: themeColors.foreground }]}>{studentName}</ThemedText>

                {/* Class / Section */}
                <View style={lStyles.metaRow}>
                  <View style={lStyles.metaItem}>
                    <ThemedText style={[lStyles.metaLabel, { color: themeColors['muted-foreground'] }]}>CLASS</ThemedText>
                    <ThemedText style={[lStyles.metaValue, { color: themeColors.foreground }]} numberOfLines={1}>{className}</ThemedText>
                  </View>
                  <View style={[lStyles.metaDivider, { backgroundColor: borderCol }]} />
                  <View style={lStyles.metaItem}>
                    <ThemedText style={[lStyles.metaLabel, { color: themeColors['muted-foreground'] }]}>SECTION</ThemedText>
                    <ThemedText style={[lStyles.metaValue, { color: themeColors.foreground }]} numberOfLines={1}>{sectionName}</ThemedText>
                  </View>
                </View>

                {/* Year / Date */}
                <View style={lStyles.metaRow}>
                  <View style={lStyles.metaItem}>
                    <ThemedText style={[lStyles.metaLabel, { color: themeColors['muted-foreground'] }]}>ACADEMIC YEAR</ThemedText>
                    <ThemedText style={[lStyles.metaValue, { color: themeColors.foreground }]}>{yearName}</ThemedText>
                  </View>
                  <View style={[lStyles.metaDivider, { backgroundColor: borderCol }]} />
                  <View style={lStyles.metaItem}>
                    <ThemedText style={[lStyles.metaLabel, { color: themeColors['muted-foreground'] }]}>ADMISSION DATE</ThemedText>
                    <ThemedText style={[lStyles.metaValue, { color: themeColors.foreground }]}>{dateStr}</ThemedText>
                  </View>
                </View>

                {/* Actions */}
                <View style={[lStyles.actionBar, { borderTopColor: borderCol }]}>
                  <TouchableOpacity
                    style={lStyles.actionBtn}
                    onPress={() => { setSelectedViewAdmission(admission); setViewModalVisible(true); }}
                  >
                    <Ionicons name="eye-outline" size={15} color={BLUE} />
                    <ThemedText style={[lStyles.actionLabel, { color: BLUE }]}>View</ThemedText>
                  </TouchableOpacity>
                  <View style={[lStyles.actionDivider, { backgroundColor: borderCol }]} />
                  <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
                    <TouchableOpacity style={lStyles.actionBtn} onPress={() => handleEditAdmission(studentEntityId)}>
                      <Ionicons name="create-outline" size={15} color={themeColors.primary} />
                      <ThemedText style={[lStyles.actionLabel, { color: themeColors.primary }]}>Edit</ThemedText>
                    </TouchableOpacity>
                    <View style={[lStyles.actionDivider, { backgroundColor: borderCol }]} />
                  </UpdatePermissionGuard>
                  <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
                    <TouchableOpacity style={lStyles.actionBtn} onPress={() => handleToggleActive(admission)} disabled={toggleActiveMutation.isPending}>
                      <Ionicons name={isActive ? 'ban-outline' : 'checkmark-circle-outline'} size={15} color={isActive ? '#EF4444' : '#10B981'} />
                      <ThemedText style={[lStyles.actionLabel, { color: isActive ? '#EF4444' : '#10B981' }]}>
                        {isActive ? 'Deactivate' : 'Activate'}
                      </ThemedText>
                    </TouchableOpacity>
                  </UpdatePermissionGuard>
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
              >
                <Ionicons name="chevron-back" size={16} color="white" />
              </TouchableOpacity>
              <ThemedText style={{ marginHorizontal: 16, fontSize: 14 }}>
                Page {currentPage} of {Math.ceil(admissionsData.total_count / pageSize)}
              </ThemedText>
              <TouchableOpacity
                style={[lStyles.pageBtn, { backgroundColor: currentPage < Math.ceil(admissionsData.total_count / pageSize) ? themeColors.primary : themeColors.muted }]}
                onPress={() => setCurrentPage(p => p + 1)} disabled={currentPage >= Math.ceil(admissionsData.total_count / pageSize)}
              >
                <Ionicons name="chevron-forward" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
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
      { label: 'State', value: (() => { const st = a.state; if (!st) return '—'; const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(st); return isUuid ? '—' : st; })() },
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
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Ionicons name="close-circle-outline" size={28} color={themeColors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  newBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  admNo: { fontSize: 13, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  studentName: { fontSize: 15, fontWeight: '600', paddingHorizontal: 14, paddingBottom: 8 },
  metaRow: { flexDirection: 'row', paddingHorizontal: 14, paddingBottom: 8 },
  metaItem: { flex: 1 },
  metaDivider: { width: 1, marginHorizontal: 8, marginVertical: 2 },
  metaLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '500' },
  actionBar: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  actionDivider: { width: 1, marginVertical: 6 },
  pageBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
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
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', minHeight: '60%' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  detailRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  detailLabel: { width: '40%', fontSize: 13, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 13, paddingLeft: 8 },
  footer: { padding: 12, borderTopWidth: 1, alignItems: 'flex-end' },
  closeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
});
