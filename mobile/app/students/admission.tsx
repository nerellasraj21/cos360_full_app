import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { studentAdmissionsApi, classSectionsApi, academicYearsApi, castesApi, StudentAdmissionCreate, StudentAdmissionUpdate } from '@/src/api';
import { useCreateAdmission, useUpdateAdmission, useDeleteAdmission, useAdmissionByStudentId, useAdmissions, useStudentsSearch, useStudentsDropdown, useStudentsDropdownSimple } from '@/src/api/hooks/students/admissions';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
// Utility validation functions
const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
};

const isFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidAadhar = (aadhar: string): boolean => {
  return /^\d{12}$/.test(aadhar);
};

const formatToDisplay = (iso: string): string => {
  if (!iso || !iso.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

const parseDdMmYyyy = (display: string): string | null => {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  if (!isValidDate(iso)) return null;
  return iso;
};

const autoFormatDateInput = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};


interface FormData {
  // Academic Details
  admission_date: string;
  admission_type: string;
  academic_year_id: string;
  admitted_academic_year_id: string;
  admitted_class_id: string;
  admitted_section_id: string;
  current_class_id: string;
  current_section_id: string;

  // Address Information
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;

  // Previous School
  is_previous_school?: boolean;
  previous_school_name?: string;
  previous_class?: string;
  previous_school_remark?: string;

  // Student Information
  student: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    is_primary?: string;  // "primary" | "non_primary" | "not_primary"
    aadhar_number?: string;
    apaar_number?: string;
    caste_id?: string;
    sub_caste_id?: string;
    community?: string;
    nationality?: string;
    mother_tongue?: string;
    identification_marks?: string;
  };

  // Parent Information
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
  'Student Information',
  'Parent Information',
  'Address Information',
  'Previous School',
  'Summary'
];

export default function StudentAdmissionScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const { id: studentId } = useLocalSearchParams<{ id?: string }>();

  const [currentStep, setCurrentStep] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'form' | 'list'>('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sameAsAdmission, setSameAsAdmission] = useState(false);
  const [activeDateField, setActiveDateField] = useState<string | null>(null);
  const [dateDisplayValues, setDateDisplayValues] = useState<Record<string, string>>(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    return {
      admission_date: formatToDisplay(todayIso),
      'student.date_of_birth': '',
    };
  });

  const [formData, setFormData] = useState<FormData>({
    // Academic Details
    admission_date: new Date().toISOString().split('T')[0],
    admission_type: 'Non-Primary Admission',
    academic_year_id: '',
    admitted_academic_year_id: '',
    admitted_class_id: '',
    admitted_section_id: '',
    current_class_id: '',
    current_section_id: '',

    // Address Information
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',

    // Previous School
    is_previous_school: false,
    previous_school_name: '',
    previous_class: '',
    previous_school_remark: '',

    // Student Information
    student: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      is_primary: 'not_primary',
      aadhar_number: '',
      apaar_number: '',
      caste_id: '',
      sub_caste_id: '',
      community: '',
      nationality: '',
      mother_tongue: '',
      identification_marks: '',
    },

    // Parent Information
    father: {
      name: '',
      email: '',
      phone: '',
      occupation: '',
      aadhar_number: '',
      gender: '',
      relation_to_student: 'Father',
    },

    mother: {
      name: '',
      email: '',
      phone: '',
      occupation: '',
      aadhar_number: '',
      gender: '',
      relation_to_student: 'Mother',
    },
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Fetch dropdown data
  const { data: classesData, isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: async () => {
      const data = await classSectionsApi.getClassList();
      console.log(data, "data")
      return data.map(item => ({ label: item.name, value: item.id }));
    },
  });

  const { data: sectionsData, isLoading: sectionsLoading, error: sectionsError } = useQuery({
    queryKey: ['sections-dropdown', formData.admitted_class_id],
    queryFn: async () => {
      if (!formData.admitted_class_id) return [];
      const data = await classSectionsApi.getSectionsByClass(formData.admitted_class_id);
      return data.map(item => ({ label: item.name, value: item.id }));
    },
    enabled: !!formData.admitted_class_id,
  });

  const { data: currentSectionsData, isLoading: currentSectionsLoading, error: currentSectionsError } = useQuery({
    queryKey: ['current-sections-dropdown', formData.current_class_id],
    queryFn: async () => {
      if (!formData.current_class_id) return [];
      const data = await classSectionsApi.getSectionsByClass(formData.current_class_id);
      return data.map(item => ({ label: item.name, value: item.id }));
    },
    enabled: !!formData.current_class_id,
  });

  const { data: academicYearsData, isLoading: academicYearsLoading, error: academicYearsError } = useQuery({
    queryKey: ['academic-years-dropdown'],
    queryFn: async () => {
      const data = await academicYearsApi.getAcademicYearsDropdown();
      return data.map(item => ({ label: item.title, value: item.id }));
    },
  });

  const { data: castesDropdownData, isLoading: castesDropdownLoading } = useQuery({
    queryKey: ['castes-dropdown'],
    queryFn: async () => {
      const data = await castesApi.getCastesDropdown();
      return data.map(item => ({ label: item.name, value: item.id }));
    },
  });

  const { data: subCastesDropdownData, isLoading: subCastesDropdownLoading } = useQuery({
    queryKey: ['sub-castes-dropdown', formData.student.caste_id],
    queryFn: async () => {
      if (!formData.student.caste_id) return [];
      const data = await castesApi.getSubCastesDropdown(formData.student.caste_id);
      return data.map(item => ({ label: item.name, value: item.id }));
    },
    enabled: !!formData.student.caste_id,
  });

  // Fetch existing admission data if in edit mode
  const { data: existingAdmission, isLoading: admissionLoading } = useAdmissionByStudentId(studentId || '');

  // Hooks for list and search functionality
  const { data: admissionsData, isLoading: admissionsLoading, error: admissionsError } = useAdmissions({
    skip: (currentPage - 1) * pageSize,
    limit: pageSize,
  });

  const { data: searchResults, isLoading: searchLoading, error: searchError } = useStudentsSearch(searchQuery);

  const { data: studentsDropdown, isLoading: studentsDropdownLoading } = useStudentsDropdown();
  const { data: studentsDropdownSimple, isLoading: studentsDropdownSimpleLoading } = useStudentsDropdownSimple();

  // Hooks for CRUD operations
  const createAdmissionMutation = useCreateAdmission();
  const updateAdmissionMutation = useUpdateAdmission();
  const deleteAdmissionMutation = useDeleteAdmission();

  // Clear section values when class changes
  React.useEffect(() => {
    if (!formData.admitted_class_id) {
      setFormData(prev => ({ ...prev, admitted_section_id: '' }));
    }
  }, [formData.admitted_class_id]);

  React.useEffect(() => {
    if (!formData.current_class_id) {
      setFormData(prev => ({ ...prev, current_section_id: '' }));
    }
  }, [formData.current_class_id]);

  // Clear sub-caste when caste changes
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, student: { ...prev.student, sub_caste_id: '' } }));
  }, [formData.student.caste_id]);

  // Sync current class/section with admission class/section when checkbox is checked
  React.useEffect(() => {
    if (sameAsAdmission) {
      setFormData(prev => ({
        ...prev,
        current_class_id: prev.admitted_class_id,
        current_section_id: prev.admitted_section_id,
      }));
    }
  }, [sameAsAdmission, formData.admitted_class_id, formData.admitted_section_id]);

  // Populate form data when editing
  useEffect(() => {
    if (existingAdmission && studentId) {
      setIsEditMode(true);
      // Populate form with existing data
      // Note: This would need to be adjusted based on the actual structure of existingAdmission
      // For now, keeping it minimal as the exact structure isn't fully defined
    }
  }, [existingAdmission, studentId]);

  const validateStep = (step: number): { errors: any; isValid: boolean } => {
    const newErrors: any = {};

    switch (step) {
      case 0: // Academic Details
        if (!formData.admission_date.trim()) {
          newErrors.admission_date = 'Admission date is required';
        } else if (!isValidDate(formData.admission_date)) {
          newErrors.admission_date = 'Admission date must be a valid date in YYYY-MM-DD format';
        } else if (isFutureDate(formData.admission_date)) {
          newErrors.admission_date = 'Admission date cannot be in the future';
        }
        if (!formData.admitted_class_id) newErrors.admitted_class_id = 'Class is required';
        if (!formData.admitted_section_id) newErrors.admitted_section_id = 'Section is required';
        if (!formData.current_class_id) newErrors.current_class_id = 'Current class is required';
        if (!formData.current_section_id) newErrors.current_section_id = 'Current section is required';
        break;
      case 1: // Student Information
        if (!formData.student.first_name.trim()) newErrors.student = { ...newErrors.student, first_name: 'First name is required' };
        if (!formData.student.last_name.trim()) newErrors.student = { ...newErrors.student, last_name: 'Last name is required' };
        if (!formData.student.date_of_birth.trim()) {
          newErrors.student = { ...newErrors.student, date_of_birth: 'Date of birth is required' };
        } else if (!isValidDate(formData.student.date_of_birth)) {
          newErrors.student = { ...newErrors.student, date_of_birth: 'Date of birth must be a valid date in YYYY-MM-DD format' };
        } else if (isFutureDate(formData.student.date_of_birth)) {
          newErrors.student = { ...newErrors.student, date_of_birth: 'Date of birth cannot be in the future' };
        }
        if (!formData.student.gender) newErrors.student = { ...newErrors.student, gender: 'Gender is required' };
        if (formData.student.aadhar_number && !isValidAadhar(formData.student.aadhar_number)) {
          newErrors.student = { ...newErrors.student, aadhar_number: 'Aadhar number must be 12 digits' };
        }
        break;
      case 2: // Parent Information
        if (!formData.father.name.trim()) newErrors.father = { ...newErrors.father, name: 'Father name is required' };
        if (!formData.father.relation_to_student.trim()) newErrors.father = { ...newErrors.father, relation_to_student: 'Father relation to student is required' };
        if (formData.father.email && !isValidEmail(formData.father.email)) {
          newErrors.father = { ...newErrors.father, email: 'Father email must be a valid email address' };
        }
        if (formData.father.aadhar_number && !isValidAadhar(formData.father.aadhar_number)) {
          newErrors.father = { ...newErrors.father, aadhar_number: 'Father Aadhar number must be 12 digits' };
        }
        if (!formData.mother.name.trim()) newErrors.mother = { ...newErrors.mother, name: 'Mother name is required' };
        if (!formData.mother.relation_to_student.trim()) newErrors.mother = { ...newErrors.mother, relation_to_student: 'Mother relation to student is required' };
        if (formData.mother.email && !isValidEmail(formData.mother.email)) {
          newErrors.mother = { ...newErrors.mother, email: 'Mother email must be a valid email address' };
        }
        if (formData.mother.aadhar_number && !isValidAadhar(formData.mother.aadhar_number)) {
          newErrors.mother = { ...newErrors.mother, aadhar_number: 'Mother Aadhar number must be 12 digits' };
        }
        break;
      case 3: // Address Information
        if (!formData.address_line1.trim()) newErrors.address_line1 = 'Address line 1 is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state.trim()) newErrors.state = 'State is required';
        break;
      case 4: // Previous School
        if (formData.is_previous_school && !formData.previous_school_name?.trim()) {
          newErrors.previous_school_name = 'Previous school name is required when previous school is selected';
        }
        break;
      case 5: // Summary
        // All validation should be done in previous steps
        break;
    }

    return { errors: newErrors, isValid: Object.keys(newErrors).length === 0 };
  };

  const validateCurrentStep = (): boolean => {
    const { errors, isValid } = validateStep(currentStep);
    setErrors(errors);
    return isValid;
  };

  const validateAllSteps = (): boolean => {
    let allErrors: any = {};
    let allValid = true;

    for (let step = 0; step < STEPS.length; step++) {
      const { errors, isValid } = validateStep(step);
      if (!isValid) {
        allValid = false;
        allErrors = { ...allErrors, ...errors };
      }
    }

    setErrors(allErrors);
    return allValid;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateAllSteps()) {
      if (isEditMode && studentId) {
        // Update operation
        const updateData: StudentAdmissionUpdate = {
          first_name: formData.student.first_name,
          last_name: formData.student.last_name,
          current_class_id: formData.current_class_id,
          current_section_id: formData.current_section_id,
          academic_year_id: formData.academic_year_id,
          date_of_birth: formData.student.date_of_birth,
          admission_date: formData.admission_date,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          father_phone: formData.father.phone,
          mother_phone: formData.mother.phone,
        };
        updateAdmissionMutation.mutate({ studentId, data: updateData });
      } else {
        // Create operation
        const apiData: StudentAdmissionCreate = {
          admission_date: formData.admission_date,
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
    }
  };

  // New handlers for list functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEditAdmission = (studentId: string) => {
    setIsEditMode(true);
    setViewMode('form');
    router.setParams({ id: studentId });
  };

  const handleCreateNew = () => {
    setIsEditMode(false);
    setViewMode('form');
    router.setParams({ id: undefined });
    setSameAsAdmission(false);
    setActiveDateField(null);
    setDateDisplayValues({
      admission_date: formatToDisplay(new Date().toISOString().split('T')[0]),
      'student.date_of_birth': '',
    });
    // Reset form data
    setFormData({
      admission_date: new Date().toISOString().split('T')[0],
      admission_type: 'Non-Primary Admission',
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
      is_previous_school: false,
      previous_school_name: '',
      previous_class: '',
      previous_school_remark: '',
      student: {
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        is_primary: 'not_primary',
        aadhar_number: '',
        apaar_number: '',
        caste_id: '',
        sub_caste_id: '',
        community: '',
        nationality: '',
        mother_tongue: '',
        identification_marks: '',
      },
      father: {
        name: '',
        email: '',
        phone: '',
        occupation: '',
        aadhar_number: '',
        gender: '',
        relation_to_student: 'Father',
      },
      mother: {
        name: '',
        email: '',
        phone: '',
        occupation: '',
        aadhar_number: '',
        gender: '',
        relation_to_student: 'Mother',
      },
    });
    setCurrentStep(0);
  };

  const handleDelete = () => {
    if (!studentId) return;

    Alert.alert(
      'Delete Admission',
      'Are you sure you want to delete this student admission? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteAdmissionMutation.mutate(studentId)
        }
      ]
    );
  };

  const updateFormData = (field: string, value: string | boolean) => {
    const fieldParts = field.split('.');
    setFormData(prev => {
      if (fieldParts.length === 1) {
        return { ...prev, [field]: value };
      } else {
        const [parent, child] = fieldParts;
        return {
          ...prev,
          [parent]: {
            ...prev[parent as keyof FormData] as any,
            [child]: value
          }
        };
      }
    });
    // Clear errors for the field
    setErrors(prev => {
      if (fieldParts.length === 1) {
        return { ...prev, [field]: undefined };
      } else {
        const [parent, child] = fieldParts;
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof typeof prev] as any),
            [child]: undefined
          }
        };
      }
    });
  };

  const renderInput = (
    label: string,
    field: string,
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default',
    multiline: boolean = false
  ) => {
    const fieldParts = field.split('.');
    let value: string = '';
    let error: string = '';

    if (fieldParts.length === 1) {
      value = formData[field as keyof FormData] as string || '';
      error = (errors as any)[field] || '';
    } else {
      const [parent, child] = fieldParts;
      value = (formData[parent as keyof FormData] as any)?.[child] || '';
      error = (errors as any)[parent]?.[child] || '';
    }

    return (
      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <View style={[styles.inputWrapper, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
          <TextInput
            style={[styles.input, { color: themeColors['card-foreground'] }]}
            placeholder={placeholder}
            placeholderTextColor={themeColors['muted-foreground']}
            value={value}
            onChangeText={(value: string) => updateFormData(field, value)}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={multiline ? 3 : 1}
          />
        </View>
        {error && (
          <ThemedText style={[styles.errorText, { color: themeColors.destructive }]}>
            {error}
          </ThemedText>
        )}
      </View>
    );
  };

  const renderDropdown = (
    label: string,
    field: string,
    data: any[],
    placeholder: string,
    disabled: boolean = false,
    loading: boolean = false,
    error: string | null = null
  ) => {
    const fieldParts = field.split('.');
    let value: string = '';
    let fieldError: string = '';

    if (fieldParts.length === 1) {
      value = formData[field as keyof FormData] as string || '';
      fieldError = (errors as any)[field] || '';
    } else {
      const [parent, child] = fieldParts;
      value = (formData[parent as keyof FormData] as any)?.[child] || '';
      fieldError = (errors as any)[parent]?.[child] || '';
    }

    // Combine field error with API error
    const combinedError = fieldError || error || '';

    return (
      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <CustomDropdown
          data={data || []}
          placeholder={loading ? 'Loading...' : placeholder}
          value={value}
          onChange={(value) => updateFormData(field, value as string)}
          error={combinedError}
          disabled={disabled || loading}
          style={{ backgroundColor: themeColors.card }}
        />
      </View>
    );
  };

  const renderDateField = (label: string, field: string) => {
    const fieldParts = field.split('.');
    let error: string = '';
    if (fieldParts.length === 1) {
      error = (errors as any)[field] || '';
    } else {
      const [parent, child] = fieldParts;
      error = (errors as any)[parent]?.[child] || '';
    }

    const displayValue = dateDisplayValues[field] ?? '';

    const handleTextChange = (text: string) => {
      const formatted = autoFormatDateInput(text);
      setDateDisplayValues(prev => ({ ...prev, [field]: formatted }));
      const parsed = parseDdMmYyyy(formatted);
      if (parsed) {
        updateFormData(field, parsed);
      }
    };

    return (
      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <View style={[
          styles.inputWrapper,
          {
            backgroundColor: themeColors.background,
            borderColor: error ? themeColors.destructive : themeColors.border,
            flexDirection: 'row',
            alignItems: 'center',
          }
        ]}>
          <TextInput
            style={[styles.input, { color: themeColors['card-foreground'], flex: 1 }]}
            placeholder="DD/MM/YYYY"
            placeholderTextColor={themeColors['muted-foreground']}
            value={displayValue}
            onChangeText={handleTextChange}
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity
            onPress={() => setActiveDateField(field)}
            style={{ paddingHorizontal: 12, paddingVertical: 4 }}
          >
            <Ionicons name="calendar-outline" size={20} color={themeColors['muted-foreground']} />
          </TouchableOpacity>
        </View>
        {error ? (
          <ThemedText style={[styles.errorText, { color: themeColors.destructive }]}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Academic Details
        return (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Academic Details
            </ThemedText>

            {/* Row 1: Admission Date | Admission Type */}
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                {renderDateField('Admission Date *', 'admission_date')}
              </View>
              <View style={styles.halfColumn}>
                {renderDropdown('Admission Type', 'admission_type', [
                  { label: 'Primary Admission', value: 'Primary Admission' },
                  { label: 'Non-Primary Admission', value: 'Non-Primary Admission' },
                ], 'Select type')}
              </View>
            </View>

            {/* Row 2: Class | Section */}
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                {renderDropdown('Class *', 'admitted_class_id', classesData || [], 'Select Class', false, classesLoading, classesError?.message)}
              </View>
              <View style={styles.halfColumn}>
                {renderDropdown('Section *', 'admitted_section_id', sectionsData || [], 'Select Section', !formData.admitted_class_id, sectionsLoading, sectionsError?.message)}
              </View>
            </View>

            {/* Checkbox: Same as Admission */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setSameAsAdmission(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                { borderColor: sameAsAdmission ? themeColors.primary : themeColors.border },
                sameAsAdmission && { backgroundColor: themeColors.primary },
              ]}>
                {sameAsAdmission && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <ThemedText style={[styles.checkboxLabel, { color: themeColors.foreground }]}>
                Current Class/Section same as Admission Class/Section
              </ThemedText>
            </TouchableOpacity>

            {/* Row 3: Current Class | Current Section */}
            <View style={styles.row}>
              <View style={styles.halfColumn}>
                {renderDropdown('Current Class', 'current_class_id', classesData || [], 'Select Current Class', sameAsAdmission, classesLoading, classesError?.message)}
              </View>
              <View style={styles.halfColumn}>
                {renderDropdown('Current Section', 'current_section_id', currentSectionsData || [], 'Select Current Section', sameAsAdmission || !formData.current_class_id, currentSectionsLoading, currentSectionsError?.message)}
              </View>
            </View>
          </View>
        );

      case 1: // Student Information
        return (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Student Information
            </ThemedText>
            {renderInput('First Name *', 'student.first_name', 'Enter first name')}
            {renderInput('Last Name *', 'student.last_name', 'Enter last name')}
            {renderDateField('Date of Birth *', 'student.date_of_birth')}
            {renderDropdown('Gender *', 'student.gender', [
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' }
            ], 'Select Gender')}
            {renderDropdown('Primary Status', 'student.is_primary', [
              { label: 'Not Primary', value: 'not_primary' },
              { label: 'Primary', value: 'primary' },
            ], 'Select Status')}
            {renderInput('Nationality', 'student.nationality', 'Enter nationality')}
            {renderDropdown('Mother Tongue', 'student.mother_tongue', [
              { label: 'Telugu', value: 'Telugu' },
              { label: 'Hindi', value: 'Hindi' },
              { label: 'English', value: 'English' },
              { label: 'Tamil', value: 'Tamil' },
              { label: 'Malayalam', value: 'Malayalam' },
              { label: 'Kannada', value: 'Kannada' },
              { label: 'Marathi', value: 'Marathi' },
              { label: 'Bengali', value: 'Bengali' },
              { label: 'Gujarati', value: 'Gujarati' },
              { label: 'Urdu', value: 'Urdu' },
              { label: 'Others', value: 'Others' },
            ], 'Select Mother Tongue')}
            {renderInput('Aadhar Number (Optional)', 'student.aadhar_number', 'Enter Aadhar number', 'numeric')}
            {renderInput('APAAR Number (Optional)', 'student.apaar_number', 'Enter APAAR number')}
            {renderDropdown('Caste (Optional)', 'student.caste_id', castesDropdownData || [], '-- Select Caste --', false, castesDropdownLoading)}
            {renderDropdown('Sub-Caste (Optional)', 'student.sub_caste_id', subCastesDropdownData || [], '-- Select Sub-Caste --', !formData.student.caste_id, subCastesDropdownLoading)}
            {!formData.student.caste_id && (
              <ThemedText style={[styles.hintText, { color: themeColors['muted-foreground'] }]}>
                Please select a caste first
              </ThemedText>
            )}
            {renderInput('Community (Optional)', 'student.community', 'Enter community')}
            {renderInput('Identification Marks (Optional)', 'student.identification_marks', 'Enter identification marks', 'default', true)}
          </View>
        );

      case 2: // Parent Information
        return (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Father Information
            </ThemedText>
            {renderInput('Name *', 'father.name', 'Enter father name')}
            {renderInput('Email', 'father.email', 'Enter father email', 'email-address')}
            {renderInput('Phone', 'father.phone', 'Enter father phone', 'phone-pad')}
            {renderInput('Occupation', 'father.occupation', 'Enter father occupation')}
            {renderInput('Aadhar Number', 'father.aadhar_number', 'Enter father Aadhar')}
            {renderDropdown('Gender', 'father.gender', [
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' }
            ], 'Select gender')}

            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 24 }]}>
              Mother Information
            </ThemedText>
            {renderInput('Name *', 'mother.name', 'Enter mother name')}
            {renderInput('Email', 'mother.email', 'Enter mother email', 'email-address')}
            {renderInput('Phone', 'mother.phone', 'Enter mother phone', 'phone-pad')}
            {renderInput('Occupation', 'mother.occupation', 'Enter mother occupation')}
            {renderInput('Aadhar Number', 'mother.aadhar_number', 'Enter mother Aadhar')}
            {renderDropdown('Gender', 'mother.gender', [
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' }
            ], 'Select gender')}
          </View>
        );

      case 3: // Address Information
        return (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Address Information
            </ThemedText>
            {renderInput('Address Line 1 *', 'address_line1', 'Enter address line 1')}
            {renderInput('Address Line 2', 'address_line2', 'Enter address line 2')}
            {renderInput('City *', 'city', 'Enter city')}
            {renderInput('State *', 'state', 'Enter state')}
          </View>
        );

      case 4: // Previous School
        return (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Previous School Information
            </ThemedText>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[styles.checkbox, { borderColor: themeColors.border }]}
                onPress={() => updateFormData('is_previous_school', !formData.is_previous_school)}
              >
                <View style={[styles.checkboxInner, formData.is_previous_school && { backgroundColor: themeColors.primary }]} />
              </TouchableOpacity>
              <ThemedText style={styles.checkboxLabel}>Has attended previous school</ThemedText>
            </View>
            {formData.is_previous_school && (
              <>
                {renderInput('Previous School Name', 'previous_school_name', 'Enter previous school name')}
                {renderInput('Previous Class', 'previous_class', 'Enter previous class')}
                {renderInput('Previous School Remark', 'previous_school_remark', 'Enter remarks', 'default', true)}
              </>
            )}
          </View>
        );

      case 5: // Summary
        return (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Summary
            </ThemedText>

            <View style={styles.summarySection}>
              <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>Academic Details</ThemedText>
              <ThemedText>Admission Date: {formData.admission_date}</ThemedText>
              <ThemedText>Academic Year: {academicYearsData?.find(y => y.value === formData.academic_year_id)?.label}</ThemedText>
              <ThemedText>Admitted Academic Year: {academicYearsData?.find(y => y.value === formData.admitted_academic_year_id)?.label || academicYearsData?.find(y => y.value === formData.academic_year_id)?.label}</ThemedText>
              <ThemedText>Admitted Class: {classesData?.find(c => c.value === formData.admitted_class_id)?.label || 'N/A'}</ThemedText>
              <ThemedText>Admitted Section: {sectionsData?.find(s => s.value === formData.admitted_section_id)?.label}</ThemedText>
              <ThemedText>Current Class: {classesData?.find(c => c.value === formData.current_class_id)?.label}</ThemedText>
              <ThemedText>Current Section: {currentSectionsData?.find(s => s.value === formData.current_section_id)?.label}</ThemedText>
            </View>

            <View style={styles.summarySection}>
              <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>Student Information</ThemedText>
              <ThemedText>Name: {formData.student.first_name} {formData.student.last_name}</ThemedText>
              <ThemedText>Date of Birth: {formData.student.date_of_birth}</ThemedText>
              <ThemedText>Gender: {formData.student.gender}</ThemedText>
            </View>

            <View style={styles.summarySection}>
              <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>Parent Information</ThemedText>
              <ThemedText>Father: {formData.father.name} ({formData.father.email})</ThemedText>
              <ThemedText>Mother: {formData.mother.name} ({formData.mother.email})</ThemedText>
            </View>

            <View style={styles.summarySection}>
              <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>Address</ThemedText>
              <ThemedText>{formData.address_line1}{formData.address_line2 ? `, ${formData.address_line2}` : ''}</ThemedText>
              <ThemedText>{formData.city}, {formData.state}</ThemedText>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderListView = () => (
    <View style={styles.container}>
      {/* Header with search and create button */}
      <View style={[styles.header, { backgroundColor: themeColors.card }]}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { backgroundColor: themeColors.background, color: themeColors.foreground, borderColor: themeColors.border }]}
            placeholder="Search by name or admission number..."
            placeholderTextColor={themeColors['muted-foreground']}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <Ionicons name="search" size={20} color={themeColors['muted-foreground']} style={styles.searchIcon} />
        </View>
        <CreatePermissionGuard
          resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: themeColors.primary }]}
            onPress={handleCreateNew}
          >
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.createButtonText}>New Admission</ThemedText>
          </TouchableOpacity>
        </CreatePermissionGuard>
      </View>

      {/* List Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {admissionsLoading || searchLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText>Loading...</ThemedText>
          </View>
        ) : admissionsError || searchError ? (
          <View style={styles.errorContainer}>
            <ThemedText style={{ color: themeColors.destructive }}>
              Error loading admissions: {admissionsError?.message || searchError?.message}
            </ThemedText>
          </View>
        ) : (
          <View>
            {(searchQuery ? (searchResults ?? []) : admissionsData?.items ?? []).filter(Boolean).map((admission) => {
              const isStudentAdmission = 'student' in admission;
              const studentId = isStudentAdmission ? admission.student.id : admission.id;
              const firstName = isStudentAdmission ? admission.student.first_name : admission.first_name;
              const lastName = isStudentAdmission ? admission.student.last_name : admission.last_name;
              const admissionNumber = isStudentAdmission ? admission.admission_number : admission.admission_number;
              const admissionDate = isStudentAdmission ? admission.admission_date : '';

              return (
                <TouchableOpacity
                  key={admission.id}
                  style={[styles.admissionItem, { backgroundColor: themeColors.card }]}
                  onPress={() => handleEditAdmission(studentId)}
                >
                  <View style={styles.admissionInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.studentName}>
                      {firstName} {lastName}
                    </ThemedText>
                    <ThemedText style={styles.admissionNumber}>
                      Admission #: {admissionNumber}
                    </ThemedText>
                    {admissionDate && (
                      <ThemedText style={styles.admissionDate}>
                        Date: {new Date(admissionDate).toLocaleDateString()}
                      </ThemedText>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={themeColors['muted-foreground']} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Pagination */}
        {!searchQuery && admissionsData && admissionsData.total_count > pageSize && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.pageButton, { backgroundColor: currentPage > 1 ? themeColors.primary : themeColors.muted }]}
              onPress={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <Ionicons name="chevron-back" size={16} color="white" />
            </TouchableOpacity>

            <ThemedText style={styles.pageInfo}>
              Page {currentPage} of {Math.ceil(admissionsData.total_count / pageSize)}
            </ThemedText>

            <TouchableOpacity
              style={[styles.pageButton, { backgroundColor: currentPage < Math.ceil(admissionsData.total_count / pageSize) ? themeColors.primary : themeColors.muted }]}
              onPress={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= Math.ceil(admissionsData.total_count / pageSize)}
            >
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}
      fallback={
        <AppLayout title="Student Admission">
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access student admissions
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Student Admission">
        {/* View Mode Toggle */}
        <View style={[styles.modeToggle, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'list' && { backgroundColor: themeColors.primary }]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={20} color={viewMode === 'list' ? 'white' : themeColors.foreground} />
            <ThemedText style={[styles.modeButtonText, viewMode === 'list' && { color: 'white' }]}>List</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, viewMode === 'form' && { backgroundColor: themeColors.primary }]}
            onPress={() => setViewMode('form')}
          >
            <Ionicons name="document-text" size={20} color={viewMode === 'form' ? 'white' : themeColors.foreground} />
            <ThemedText style={[styles.modeButtonText, viewMode === 'form' && { color: 'white' }]}>Form</ThemedText>
          </TouchableOpacity>
        </View>

        {viewMode === 'list' ? (
          renderListView()
        ) : (
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {/* Step Indicator */}
            <View style={styles.stepIndicator}>
              <View style={styles.stepsRow}>
                {STEPS.map((step, index) => (
                  <React.Fragment key={step}>
                    <View style={[
                      styles.stepCircle,
                      index < currentStep
                        ? { backgroundColor: themeColors.primary }
                        : index === currentStep
                        ? { backgroundColor: themeColors.primary }
                        : { backgroundColor: themeColors.muted },
                    ]}>
                      {index < currentStep ? (
                        <Ionicons name="checkmark" size={14} color="white" />
                      ) : (
                        <ThemedText style={[
                          styles.stepNumber,
                          index <= currentStep ? { color: 'white' } : { color: themeColors['muted-foreground'] },
                        ]}>
                          {index + 1}
                        </ThemedText>
                      )}
                    </View>
                    {index < STEPS.length - 1 && (
                      <View style={[
                        styles.stepConnector,
                        { backgroundColor: index < currentStep ? themeColors.primary : themeColors.muted },
                      ]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
              <ThemedText style={[styles.currentStepName, { color: themeColors.primary }]}>
                Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
              </ThemedText>
            </View>

            {/* Date picker rendered at root level so Android dialog is unobstructed */}
            {activeDateField ? (
              <DateTimePicker
                value={(() => {
                  const parts = activeDateField.split('.');
                  let iso = '';
                  if (parts.length === 1) {
                    iso = (formData as any)[activeDateField] || '';
                  } else {
                    const [parent, child] = parts;
                    iso = (formData as any)[parent]?.[child] || '';
                  }
                  return iso ? new Date(iso + 'T00:00:00') : new Date();
                })()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  const field = activeDateField;
                  setActiveDateField(null);
                  if (event.type === 'set' && selectedDate) {
                    const iso = selectedDate.toISOString().split('T')[0];
                    updateFormData(field, iso);
                    setDateDisplayValues(prev => ({ ...prev, [field]: formatToDisplay(iso) }));
                  }
                }}
              />
            ) : null}

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderStepContent()}

              {/* Navigation Buttons */}
              <View style={styles.navigationContainer}>
                {currentStep > 0 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.prevButton, { borderColor: themeColors.primary }]}
                    onPress={handlePrevious}
                  >
                    <ThemedText style={[styles.navButtonText, { color: themeColors.primary }]}>
                      Previous
                    </ThemedText>
                  </TouchableOpacity>
                )}

                {currentStep < STEPS.length - 1 ? (
                  <TouchableOpacity
                    style={[styles.navButton, styles.nextButton, { backgroundColor: themeColors.primary }]}
                    onPress={handleNext}
                  >
                    <ThemedText style={[styles.nextButtonText]}>
                      Next
                    </ThemedText>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.submitContainer}>
                    {isEditMode && (
                      <DeletePermissionGuard
                        resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
                        <TouchableOpacity
                          style={[styles.navButton, styles.deleteButton, { borderColor: themeColors.destructive }]}
                          onPress={handleDelete}
                          disabled={deleteAdmissionMutation.isPending}
                        >
                          <ThemedText style={[styles.navButtonText, { color: themeColors.destructive }]}>
                            {deleteAdmissionMutation.isPending ? 'Deleting...' : 'Delete'}
                          </ThemedText>
                        </TouchableOpacity>
                      </DeletePermissionGuard>
                    )}
                    {isEditMode ? (
                      <UpdatePermissionGuard
                        resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
                        <TouchableOpacity
                          style={[
                            styles.navButton,
                            styles.submitButton,
                            {
                              backgroundColor: updateAdmissionMutation.isPending ? themeColors['muted'] : themeColors.primary
                            }
                          ]}
                          onPress={handleSubmit}
                          disabled={updateAdmissionMutation.isPending}
                        >
                          <ThemedText style={styles.submitButtonText}>
                            {updateAdmissionMutation.isPending ? 'Updating...' : 'Update Student Admission'}
                          </ThemedText>
                        </TouchableOpacity>
                      </UpdatePermissionGuard>
                    ) : (
                      <CreatePermissionGuard
                        resource={PERMISSION_RESOURCES.STUDENT_ADMISSIONS}>
                        <TouchableOpacity
                          style={[
                            styles.navButton,
                            styles.submitButton,
                            {
                              backgroundColor: createAdmissionMutation.isPending ? themeColors['muted'] : themeColors.primary
                            }
                          ]}
                          onPress={handleSubmit}
                          disabled={createAdmissionMutation.isPending}
                        >
                          <ThemedText style={styles.submitButtonText}>
                            {createAdmissionMutation.isPending ? 'Creating...' : 'Create Student Admission'}
                          </ThemedText>
                        </TouchableOpacity>
                      </CreatePermissionGuard>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    padding: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  stepIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepConnector: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 3,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  currentStepName: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryTitle: {
    marginBottom: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  navButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  prevButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  nextButton: {
    backgroundColor: '#3B82F6',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    flex: 1,
    borderWidth: 2,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for list view
  modeToggle: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  modeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchInput: {
    padding: 12,
    paddingRight: 40,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  searchIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  createButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  admissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  admissionInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    marginBottom: 4,
  },
  admissionNumber: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  admissionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 16,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  pageInfo: {
    fontSize: 14,
    marginHorizontal: 16,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfColumn: {
    flex: 1,
  },
  dateInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});