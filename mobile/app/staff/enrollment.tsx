import { Ionicons } from '@expo/vector-icons';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

// Android needs this opt-in for LayoutAnimation (no-op on the New Architecture / iOS).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import DateTimePicker from '@react-native-community/datetimepicker';
import { IOSDatePickerModal } from '@/components/ui';
import { ThemedText } from '@/components/themed-text';
import ScreenLayout from '@/components/ScreenLayout';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard,
  DeletePermissionGuard,
} from '@/components/PermissionGuards';
import { useStaffEnrollments, useCreateStaffEnrollment, useUpdateStaffEnrollment, useDesignationsDropdown } from '@/hooks/use-staff-api';
import { staffApi } from '@/src/api/staff';
import type { Staff, StaffInput, QualificationEntry, QualificationLevel } from '@/src/types/masters/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { escapeCsv } from '@/src/utils/exportCsv';

// ─── Constants ────────────────────────────────────────────────────────────────
const STAFF_COLOR  = '#8B5CF6';
const STAFF_LIGHT  = '#EDE9FE';

const GENDERS       = ['Male', 'Female', 'Other'] as const;
const ACCOUNT_TYPES = ['Savings', 'Current'] as const;
const QUALIFICATION_LEVELS: { value: QualificationLevel; label: string }[] = [
  { value: 'Below Graduation', label: 'Below Graduation (Inter / Diploma)' },
  { value: 'Graduation', label: 'Graduation (B.Tech / B.Sc / B.Com)' },
  { value: 'Post Graduation', label: 'Post Graduation (M.Tech / MBA)' },
  { value: 'PhD', label: 'PhD (Doctorate)' },
];

// Card info fields toggleable via the "Columns" picker (mirrors the web app's
// Columns dropdown on Staff Enrollment).
const ALL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'contact', label: 'Contact' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
] as const;

const BLANK_FORM: StaffInput = {
  first_name: '', last_name: '', email: '', phone: '', gender: undefined,
  date_of_birth: '', joining_date: new Date().toISOString().split('T')[0],
  qualification: '', experience_years: 0, address: '', designation_id: '',
  department: '', employee_id: '', bank_name: '', account_number: '',
  bank_ifsc_code: '', pf_account_number: '', uan_number: '', esi_number: '',
  current_salary: undefined, last_drawn_salary: undefined,
};
const BLANK_WORK  = { work_org: '', work_from_date: '', work_to_date: '', subjects_dealt: '', work_remarks: '' };
const BLANK_EXTRA = { branch: '', account_holder_name: '', account_type: '' };
const EMPTY_QUAL: QualificationEntry = { level: '', name: '', passed_out_year: '', percentage: '', university: '' };
const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB, matches web's client-side cap

const apiErrMsg = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e: any) => e.msg || String(e)).join(', ');
  return fallback;
};

// Phone is required; when present it must be exactly 10 digits.
const validatePhoneMessage = (value: string): string => {
  if (!value) return 'Phone is required';
  if (!/^\d+$/.test(value)) return 'Phone number must contain digits only';
  if (value.length < 10) return `Number is less than 10 digits — you entered ${value.length}. Please enter exactly 10 digits`;
  if (value.length > 10) return `Number exceeds 10 digits — you entered ${value.length}. Please enter exactly 10 digits`;
  return '';
};
const isValidPhone = (value: string): boolean => /^\d{10}$/.test(value);
const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validatePfMessage = (value: string): string =>
  value && !/^[A-Za-z0-9]+\/[A-Za-z0-9/]+$/.test(value) ? 'Invalid PF Account Number format (e.g. AP/HYD/12345)' : '';
const validateUanMessage = (value: string): string =>
  value && !/^\d{12}$/.test(value) ? 'UAN Number must be exactly 12 digits' : '';
const validateExperienceMessage = (value: string): string =>
  value && Number(value) > 50 ? 'Experience cannot exceed 50 years' : '';
const validateSalaryMessage = (value: string): string =>
  value && Number(value) > 10000000 ? 'Salary cannot exceed ₹1,00,00,000' : '';
const toDisplay = (iso: string): string => {
  if (!iso?.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const parseDMY = (s: string): string | null => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return isNaN(new Date(iso + 'T00:00:00').getTime()) ? null : iso;
};
const autoDate = (t: string): string => {
  const d = t.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};
const initials = (first: string, last?: string) =>
  ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || '?';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const mediaBase = API_BASE.replace(/\/api\/v\d+$/, '');

const buildPhotoUri = (photoUrl: string | null | undefined): string | null => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  return `${mediaBase}${photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`}`;
};

// ─── Reusable form field sub-components ──────────────────────────────────────
function FL({ label }: { label: string }) {
  return <ThemedText style={ss.fl}>{label}</ThemedText>;
}
function FInput({ label, placeholder, value, onChangeText, keyboardType, autoCapitalize, multiline, colors, half, error, hint }: {
  label: string; placeholder: string; value: string; onChangeText: (v: string) => void;
  keyboardType?: any; autoCapitalize?: any; multiline?: boolean; colors: any; half?: boolean; error?: string; hint?: string;
}) {
  return (
    <View style={half ? ss.halfField : ss.fullField}>
      <FL label={label} />
      <TextInput
        style={[ss.fi, { color: colors['card-foreground'], borderColor: error ? '#EF4444' : colors.border, backgroundColor: colors.background }, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        placeholder={placeholder} placeholderTextColor={colors['muted-foreground']}
        value={value} onChangeText={onChangeText} keyboardType={keyboardType}
        autoCapitalize={autoCapitalize} multiline={multiline}
      />
      {error ? <ThemedText style={ss.fieldError}>{error}</ThemedText> : hint ? <ThemedText style={ss.fieldHint}>{hint}</ThemedText> : null}
    </View>
  );
}
function PickerField({ label, display, placeholder, onPress, colors, half }: {
  label: string; display: string; placeholder: string; onPress: () => void; colors: any; half?: boolean;
}) {
  return (
    <View style={half ? ss.halfField : ss.fullField}>
      <FL label={label} />
      <TouchableOpacity style={[ss.pickerTrig, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={onPress} accessibilityLabel={`Select ${label}`}>
        <ThemedText style={{ color: display ? colors['card-foreground'] : colors['muted-foreground'], fontSize: 15, flex: 1 }} numberOfLines={1}>{display || placeholder}</ThemedText>
        <Ionicons name="chevron-down" size={16} color={colors['muted-foreground']} />
      </TouchableOpacity>
    </View>
  );
}
function DateField({ label, displayValue, onCalPress, onTextChange, colors, half }: {
  label: string; displayValue: string; onCalPress: () => void; onTextChange: (v: string) => void; colors: any; half?: boolean;
}) {
  return (
    <View style={half ? ss.halfField : ss.fullField}>
      <FL label={label} />
      <View style={[ss.dateRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput style={[{ flex: 1, fontSize: 15, color: colors['card-foreground'] }]} placeholder="DD/MM/YYYY" placeholderTextColor={colors['muted-foreground']} value={displayValue} onChangeText={onTextChange} keyboardType="numeric" maxLength={10} />
        <TouchableOpacity onPress={onCalPress}
              accessibilityLabel="Select date"><Ionicons name="calendar-outline" size={20} color={colors['muted-foreground']} /></TouchableOpacity>
      </View>
    </View>
  );
}

// ─── View-sheet helpers ───────────────────────────────────────────────────────
function SheetSection({ title }: { title: string }) {
  return (
    <View style={ss.sheetSectionHeader}>
      <View style={[ss.sheetSectionBar, { backgroundColor: STAFF_COLOR }]} />
      <ThemedText style={ss.sheetSectionTitle}>{title}</ThemedText>
    </View>
  );
}
// Always renders (matches the web app's View Staff Details dialog, which shows a
// placeholder like "Not specified" / "Not provided" / "—" for empty fields instead
// of hiding the row).
function DetailRow({ icon, label, value, placeholder = 'Not specified' }: { icon: string; label: string; value?: string | null; placeholder?: string }) {
  return (
    <View style={ss.detailRow}>
      <Ionicons name={icon as any} size={15} color={STAFF_COLOR} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <ThemedText style={ss.detailLabel}>{label}</ThemedText>
        <ThemedText style={[ss.detailValue, !value && { opacity: 0.5, fontStyle: 'italic' }]}>{value || placeholder}</ThemedText>
      </View>
    </View>
  );
}

// ─── Form section title (matches web app style) ───────────────────────────────
function FormSec({ title, icon, right }: { title: string; icon?: string; right?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[ss.formSec, { borderTopColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon ? <Ionicons name={icon as any} size={16} color={colors['muted-foreground']} /> : null}
        <ThemedText style={[ss.formSecTitle, { color: colors.foreground }]}>{title}</ThemedText>
      </View>
      {right}
    </View>
  );
}

// ─── Collapsible form section (accordion, matches web app's Work Experience /
// Bank Details / Salary & PF sections) ─────────────────────────────────────────
function AccordionSection({ title, icon, open, onToggle, children }: {
  title: string; icon?: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };
  return (
    <View>
      <TouchableOpacity
        style={[ss.formSec, { borderTopColor: colors.border }]}
        onPress={toggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${title}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon ? <Ionicons name={icon as any} size={16} color={colors['muted-foreground']} /> : null}
          <ThemedText style={[ss.formSecTitle, { color: colors.foreground }]}>{title}</ThemedText>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors['muted-foreground']} />
      </TouchableOpacity>
      {open ? <View>{children}</View> : null}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
function StaffEnrollmentScreenContent() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();

  const [search, setSearch] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map((c) => c.key))
  );
  const [showColumnsPicker, setShowColumnsPicker] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [viewStaff, setViewStaff] = useState<Staff | null>(null);
  const [viewStaffDetail, setViewStaffDetail] = useState<Staff | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Pickers
  const [isDesigPicker,   setIsDesigPicker]   = useState(false);
  const [isGenderPicker,  setIsGenderPicker]  = useState(false);
  const [isAccTypePicker, setIsAccTypePicker] = useState(false);
  const [qualLevelPickerIdx, setQualLevelPickerIdx] = useState<number | null>(null);
  const [activeDateField, setActiveDateField] = useState<string | null>(null);

  // Inline validation messages (mirrors web's Staff Enrollment validators)
  const [firstNameError, setFirstNameError] = useState('');
  const [phoneError, setPhoneError]         = useState('');
  const [emailError, setEmailError]         = useState('');
  const [addressError, setAddressError]     = useState('');
  const [experienceError, setExperienceError] = useState('');
  const [lastSalaryError, setLastSalaryError] = useState('');
  const [currentSalaryError, setCurrentSalaryError] = useState('');
  const [pfError, setPfError] = useState('');
  const [uanError, setUanError] = useState('');

  // Accordion open/closed state for Work Experience / Bank Details / Salary & PF
  // (all start expanded, matching the web app's default).
  const [isWorkOpen, setIsWorkOpen] = useState(true);
  const [isBankOpen, setIsBankOpen] = useState(true);
  const [isSalaryOpen, setIsSalaryOpen] = useState(true);

  // Photo state
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; mimeType: string } | null>(null);

  const pickPhoto = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: false });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.size != null && asset.size > MAX_PHOTO_BYTES) {
        showError('Photo Too Large', 'Photo must be under 2 MB.');
        return;
      }
      setPendingPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  };

  const uploadPhotoForStaff = async (staffId: string) => {
    if (!pendingPhoto) return;
    try {
      const updated = await staffApi.uploadStaffPhoto(staffId, pendingPhoto.uri, pendingPhoto.mimeType);
      // Update list cache so photo shows immediately in cards and view sheet
      queryClient.setQueryData<{ items: Staff[]; total: number } | undefined>(
        ['staff-enrollments'],
        (old) => old
          ? { ...old, items: old.items.map((s) => s.id === staffId ? { ...s, photo_url: updated.photo_url } : s) }
          : old
      );
      setPendingPhoto(null);
    } catch {
      showError('Photo Upload', 'Staff saved but photo upload failed. Try again from edit.');
    }
  };

  // Form state
  const [formData, setFormData]       = useState<StaffInput>(BLANK_FORM);
  const [workFlat, setWorkFlat]       = useState(BLANK_WORK);
  const [quals, setQuals]             = useState<QualificationEntry[]>([]);
  const [removedQualIds, setRemovedQualIds] = useState<string[]>([]);
  const [extraFields, setExtraFields] = useState(BLANK_EXTRA);
  const [isActiveStaff, setIsActiveStaff] = useState(true);
  const [dateDisplay, setDateDisplay] = useState({
    date_of_birth: '', joining_date: toDisplay(new Date().toISOString().split('T')[0]),
    work_from_date: '', work_to_date: '',
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: staffData, isLoading, error, refetch } = useStaffEnrollments({ skip: 0, limit: 100 });
  const { data: designations } = useDesignationsDropdown();

  // Persist qualification rows against the real API — previously this data
  // was collected in the form but never sent anywhere.
  const syncQualifications = async (staffId: string) => {
    try {
      for (const qid of removedQualIds) {
        await staffApi.deleteQualification(staffId, qid);
      }
      for (const q of quals) {
        if (!q.level || !q.name.trim()) continue; // skip blank rows
        const payload = {
          level: q.level as QualificationLevel,
          name: q.name.trim(),
          passed_out_year: q.passed_out_year ? parseInt(q.passed_out_year, 10) : undefined,
          percentage: q.percentage ? parseFloat(q.percentage) : undefined,
          university: q.university.trim() || undefined,
        };
        if (q.id) await staffApi.updateQualification(staffId, q.id, payload);
        else await staffApi.addQualification(staffId, payload);
      }
    } catch {
      showError('Qualifications', 'Staff saved but some qualifications failed to save. Try again from edit.');
    }
  };

  const createMutation = useCreateStaffEnrollment({
    onSuccess: async (newStaff: any) => {
      await syncQualifications(newStaff.id);
      await uploadPhotoForStaff(newStaff.id);
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      setIsFormVisible(false); resetForm();
      showSuccess('Staff Added', 'New staff member enrolled successfully.');
    },
    onError: (err: any) => showError('Failed', apiErrMsg(err, 'Could not add staff member.')),
  });
  const updateMutation = useUpdateStaffEnrollment({
    onSuccess: async (updatedStaff: any) => {
      await syncQualifications(updatedStaff.id);
      await uploadPhotoForStaff(updatedStaff.id);
      queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] });
      setIsFormVisible(false); resetForm();
      showSuccess('Updated', 'Staff member updated successfully.');
    },
    onError: (err: any) => showError('Failed', apiErrMsg(err, 'Could not update staff member.')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.deleteStaffEnrollment(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] }); showSuccess('Deleted', 'Staff member removed.'); },
    onError: (err: any) => showError('Failed', apiErrMsg(err, 'Could not delete staff member.')),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData(BLANK_FORM); setWorkFlat(BLANK_WORK); setQuals([]); setRemovedQualIds([]);
    setExtraFields(BLANK_EXTRA); setIsActiveStaff(true); setEditingStaff(null);
    setActiveDateField(null); setPendingPhoto(null);
    setDateDisplay({ date_of_birth: '', joining_date: toDisplay(new Date().toISOString().split('T')[0]), work_from_date: '', work_to_date: '' });
    setFirstNameError(''); setPhoneError(''); setEmailError(''); setAddressError('');
    setExperienceError(''); setLastSalaryError(''); setCurrentSalaryError(''); setPfError(''); setUanError('');
  };

  const desigTitle = (staff: Staff | string | undefined): string => {
    if (!staff) return '';
    if (typeof staff === 'string') return designations?.find((d) => d.id === staff)?.title ?? '';
    return staff.designation_obj?.title ?? designations?.find((d) => d.id === staff.designation_id)?.title ?? '';
  };

  const filteredStaff = useMemo(() => {
    const items: Staff[] = staffData?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((s) => {
      const name = `${s.first_name} ${s.last_name ?? ''}`.toLowerCase();
      return name.includes(q) || s.email?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q) || s.employee_id?.toLowerCase().includes(q);
    });
  }, [staffData, search]);

  // ── Columns (mirrors web's Columns dropdown) ────────────────────────────────
  const handleColumnToggle = (key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least one column
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const handleSelectAllColumns = () => setVisibleColumns(new Set(ALL_COLUMNS.map((c) => c.key)));
  const handleDeselectAllColumns = () => setVisibleColumns(new Set([ALL_COLUMNS[0].key]));

  // ── Export (mirrors web's Export menu: CSV / Excel) ─────────────────────────
  const getExportColumns = () => [
    { key: 'name', label: 'Name' },
    ...(visibleColumns.has('contact') ? [{ key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }] : []),
    ...(visibleColumns.has('designation') ? [{ key: 'designation', label: 'Designation' }] : []),
    ...(visibleColumns.has('department') ? [{ key: 'department', label: 'Department' }] : []),
    ...(visibleColumns.has('status') ? [{ key: 'status', label: 'Status' }] : []),
  ];
  const buildExportRow = (s: Staff, cols: { key: string; label: string }[]) => cols.map((c) => {
    switch (c.key) {
      case 'name': return `${s.first_name} ${s.last_name ?? ''}`.trim();
      case 'email': return s.email ?? '';
      case 'phone': return s.phone ?? '';
      case 'designation': return desigTitle(s) || 'Not Assigned';
      case 'department': return s.department ?? '';
      case 'status': return s.is_active ? 'Active' : 'Inactive';
      default: return '';
    }
  });

  // Web: real blob download. Native: write the file locally and hand it to the OS share sheet.
  const shareOrDownload = async (filename: string, content: string, mimeType: string) => {
    if (Platform.OS === 'web') {
      const w = globalThis as any;
      const blob = new w.Blob([content], { type: `${mimeType};charset=utf-8;` });
      const url = w.URL.createObjectURL(blob);
      const link = w.document.createElement('a');
      link.href = url;
      link.download = filename;
      w.document.body.appendChild(link);
      link.click();
      link.remove();
      w.URL.revokeObjectURL(url);
      return;
    }
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, content);
    await Sharing.shareAsync(fileUri, { mimeType });
  };

  const handleExportCSV = async () => {
    try {
      const cols = getExportColumns();
      const lines = [cols.map((c) => c.label), ...filteredStaff.map((s) => buildExportRow(s, cols))]
        .map((row) => row.map(escapeCsv).join(','));
      await shareOrDownload('staff_enrollments_data.csv', lines.join('\n'), 'text/csv');
    } catch {
      showError('Error', 'Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const cols = getExportColumns();
      const rows = [cols.map((c) => c.label), ...filteredStaff.map((s) => buildExportRow(s, cols))];
      const html = `<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
      await shareOrDownload('staff_enrollments_data.xls', html, 'application/vnd.ms-excel');
    } catch {
      showError('Error', 'Failed to export Excel');
    }
  };

  const openEdit = async (staff: Staff) => {
    setEditingStaff(staff);
    // Fetch full detail to get photo_url (list endpoint may omit it)
    staffApi.getStaffEnrollmentById(staff.id)
      .then((detail) => setEditingStaff((prev) => prev?.id === staff.id ? { ...prev, photo_url: detail.photo_url } : prev))
      .catch(() => {});
    setFormData({
      first_name: staff.first_name, last_name: staff.last_name ?? '', email: staff.email ?? '',
      phone: staff.phone ?? '', gender: staff.gender, date_of_birth: staff.date_of_birth ?? '',
      joining_date: staff.joining_date, qualification: staff.qualification ?? '',
      experience_years: staff.experience_years ?? 0, address: staff.address ?? '',
      designation_id: staff.designation_obj?.id ?? staff.designation_id ?? '', department: staff.department ?? '',
      employee_id: staff.employee_id ?? '', bank_name: staff.bank_name ?? '',
      account_number: staff.account_number ?? '', bank_ifsc_code: staff.ifsc_code ?? staff.bank_ifsc_code ?? '',
      pf_account_number: staff.pf_account_number ?? '', uan_number: staff.uan_number ?? '',
      esi_number: staff.esi_number ?? '',
      current_salary: staff.current_salary ? Number(staff.current_salary) : undefined,
      last_drawn_salary: staff.last_drawn_salary ? Number(staff.last_drawn_salary) : undefined,
    });
    // Backend returns flat work experience fields (work_org, work_from_date, etc.)
    setWorkFlat({
      work_org: staff.work_org ?? '',
      work_from_date: staff.work_from_date ?? '',
      work_to_date: staff.work_to_date ?? '',
      subjects_dealt: staff.subjects_dealt ?? '',
      work_remarks: staff.work_remarks ?? '',
    });
    setQuals([]);
    setRemovedQualIds([]);
    // Fetch existing qualifications so they can be edited/removed (previously
    // this was left empty, silently dropping any qualifications on save).
    staffApi.getQualifications(staff.id)
      .then((list) => setQuals(list.map((q) => ({
        id: q.id,
        level: q.level,
        name: q.name,
        passed_out_year: q.passed_out_year != null ? String(q.passed_out_year) : '',
        percentage: q.percentage != null ? String(q.percentage) : '',
        university: q.university ?? '',
      }))))
      .catch(() => {});
    setIsActiveStaff(staff.is_active);
    setExtraFields({
      branch: staff.bank_branch ?? '',
      account_holder_name: staff.account_holder_name ?? '',
      account_type: staff.account_type ?? '',
    });
    setActiveDateField(null);
    setDateDisplay({
      date_of_birth: toDisplay(staff.date_of_birth ?? ''),
      joining_date: toDisplay(staff.joining_date),
      work_from_date: toDisplay(staff.work_from_date ?? ''),
      work_to_date: toDisplay(staff.work_to_date ?? ''),
    });
    setFirstNameError(''); setPhoneError(''); setEmailError(''); setAddressError('');
    setExperienceError(''); setLastSalaryError(''); setCurrentSalaryError(''); setPfError(''); setUanError('');
    setIsFormVisible(true);
  };

  const confirmDelete = (staff: Staff) => {
    confirm({
      title: 'Delete Staff Member',
      message: `Remove "${staff.first_name} ${staff.last_name ?? ''}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(staff.id),
    });
  };

  const handleSubmit = () => {
    const phoneValue = (formData.phone ?? '').trim();
    const emailValue = (formData.email ?? '').trim();
    const addressValue = (formData.address ?? '').trim();

    const nextFirstNameError = formData.first_name.trim() ? '' : 'First name is required';
    const nextPhoneError = validatePhoneMessage(phoneValue);
    const nextEmailError = emailValue && !isValidEmail(emailValue) ? 'Please enter a valid email address' : '';
    const nextAddressError = addressValue ? '' : 'Address is required';
    setFirstNameError(nextFirstNameError);
    setPhoneError(nextPhoneError);
    setEmailError(nextEmailError);
    setAddressError(nextAddressError);

    if (nextFirstNameError || nextPhoneError || nextEmailError || nextAddressError) {
      showError('Validation', 'Please fill in the required fields.');
      return;
    }

    const hasUnpairedQual = quals.some((q) => Boolean(q.level) !== Boolean(q.name.trim()));
    if (hasUnpairedQual) {
      showError('Validation', 'Qualification Level and Degree / Course must both be filled in, or both left empty.');
      return;
    }
    const uanMsg = validateUanMessage((formData.uan_number ?? '').trim());
    if (uanMsg) { setUanError(uanMsg); showError('Validation', uanMsg); return; }
    const pfMsg = validatePfMessage((formData.pf_account_number ?? '').trim());
    if (pfMsg) { setPfError(pfMsg); showError('Validation', pfMsg); return; }

    const payload: Record<string, any> = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name?.trim() || undefined,
      phone: phoneValue,
      gender: formData.gender || undefined,
      qualification: formData.qualification?.trim() || undefined,
      experience_years: formData.experience_years || undefined,
      address: addressValue,
      department: formData.department?.trim() || undefined,
      bank_name: formData.bank_name?.trim() || undefined,
      account_number: formData.account_number?.trim() || undefined,
      ifsc_code: formData.bank_ifsc_code?.trim() || undefined,
      pf_account_number: formData.pf_account_number?.trim() || undefined,
      uan_number: formData.uan_number?.trim() || undefined,
      esi_number: formData.esi_number?.trim() || undefined,
      current_salary: formData.current_salary || undefined,
      last_drawn_salary: formData.last_drawn_salary || undefined,
      bank_branch: extraFields.branch?.trim() || undefined,
      account_holder_name: extraFields.account_holder_name?.trim() || undefined,
      account_type: extraFields.account_type?.trim() || undefined,
      is_active: isActiveStaff,
    };
    if (formData.joining_date) payload.joining_date = formData.joining_date; // now optional
    if (formData.designation_id?.trim()) payload.designation_id = formData.designation_id.trim();
    if (emailValue) payload.email = emailValue;
    if (formData.date_of_birth?.trim()) payload.date_of_birth = formData.date_of_birth;
    if (workFlat.work_org.trim()) {
      payload.work_org = workFlat.work_org.trim();
      if (workFlat.work_from_date) payload.work_from_date = workFlat.work_from_date;
      if (workFlat.work_to_date) payload.work_to_date = workFlat.work_to_date;
      if (workFlat.subjects_dealt.trim()) payload.subjects_dealt = workFlat.subjects_dealt.trim();
      if (workFlat.work_remarks.trim()) payload.work_remarks = workFlat.work_remarks.trim();
    }
    if (editingStaff) { updateMutation.mutate({ id: editingStaff.id, data: payload }); }
    else { createMutation.mutate(payload as StaffInput); }
  };

  const handleDateChange = (field: string, iso: string) => {
    if (field === 'work_from_date' || field === 'work_to_date') {
      setWorkFlat((p) => ({ ...p, [field]: iso }));
    } else {
      setFormData((p) => ({ ...p, [field]: iso }));
    }
    setDateDisplay((p) => ({ ...p, [field]: toDisplay(iso) }));
  };

  const datePickerValue = () => {
    const map: Record<string, string> = {
      date_of_birth: formData.date_of_birth ?? '',
      joining_date: formData.joining_date,
      work_from_date: workFlat.work_from_date,
      work_to_date: workFlat.work_to_date,
    };
    const iso = map[activeDateField ?? ''] ?? '';
    return iso ? new Date(iso + 'T00:00:00') : new Date();
  };
  const datePickerMax = (activeDateField === 'date_of_birth' || activeDateField === 'joining_date') ? new Date() : undefined;

  const setField = (key: keyof StaffInput, val: any) => setFormData((p) => ({ ...p, [key]: val }));

  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb';

  const addButton = (
    <CreatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
      <TouchableOpacity style={[ss.addBtn, { backgroundColor: STAFF_COLOR }]} onPress={() => { resetForm(); setIsFormVisible(true); }}>
        <Ionicons name="add" size={18} color="#fff" />
        <ThemedText style={ss.addBtnText}>Add Staff</ThemedText>
      </TouchableOpacity>
    </CreatePermissionGuard>
  );

  if (error) {
    return (
      <ScreenLayout title="Staff Enrollment">
        <View style={ss.centeredBox}>
          <Ionicons name="cloud-offline-outline" size={56} color="#9CA3AF" />
          <ThemedText type="subtitle" style={{ marginTop: 16 }}>Failed to load</ThemedText>
          <TouchableOpacity style={[ss.retryBtn, { backgroundColor: STAFF_COLOR }]} onPress={() => refetch()}>
            <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <>
      <ScreenLayout title="Staff Enrollment" headerRight={addButton}>
        <View style={ss.container}>
          {/* Search */}
          <View style={[ss.searchBar, { backgroundColor: colors.card, borderColor: borderCol }]}>
            <Ionicons name="search-outline" size={17} color={colors['muted-foreground']} />
            <TextInput style={[ss.searchInput, { color: colors['card-foreground'] }]} placeholder="Search staff..." placeholderTextColor={colors['muted-foreground']} value={search} onChangeText={setSearch} />
            {search ? <TouchableOpacity onPress={() => setSearch('')}
              accessibilityLabel="Close"><Ionicons name="close-circle" size={17} color={colors['muted-foreground']} /></TouchableOpacity> : null}
          </View>

          {/* Toolbar: Columns + Export (mirrors web app's Columns / Export buttons) */}
          <View style={ss.toolbarRow}>
            <TouchableOpacity
              style={[ss.toolbarBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowColumnsPicker(true)}
            >
              <Ionicons name="options-outline" size={15} color={colors.foreground} />
              <ThemedText style={[ss.toolbarBtnText, { color: colors.foreground }]}>Columns</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[ss.toolbarBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowExportOptions(true)}
            >
              <Ionicons name="download-outline" size={15} color={colors.foreground} />
              <ThemedText style={[ss.toolbarBtnText, { color: colors.foreground }]}>Export</ThemedText>
            </TouchableOpacity>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
              <TouchableOpacity
                style={[ss.toolbarBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => router.push('/staff/bulk-upload')}
              >
                <Ionicons name="cloud-upload-outline" size={15} color={colors.foreground} />
                <ThemedText style={[ss.toolbarBtnText, { color: colors.foreground }]}>Bulk Upload</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* Cards */}
          <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={STAFF_COLOR} />} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredStaff.length === 0 && !isLoading ? (
              <View style={ss.emptyBox}>
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                <ThemedText style={[ss.emptyText, { color: colors['muted-foreground'] }]}>{search ? 'No results found' : 'No staff members yet'}</ThemedText>
              </View>
            ) : null}
            {filteredStaff.map((item, idx) => {
              const title = desigTitle(item);
              const subParts: string[] = [];
              if (visibleColumns.has('designation')) subParts.push(title || 'No Designation');
              if (visibleColumns.has('department') && item.department) subParts.push(item.department);
              return (
                <View key={item.id} style={[ss.card, { backgroundColor: colors.card, borderColor: borderCol }]}>
                  <View style={[ss.cardAccent, { backgroundColor: STAFF_COLOR }]} />
                  <View style={{ flex: 1, padding: 12 }}>
                    <ThemedText style={[ss.serialNo, { color: colors['muted-foreground'] }]}>{idx + 1}</ThemedText>
                    {/* Top row: avatar + name/desig + status */}
                    <View style={ss.cardTop}>
                      {buildPhotoUri(item.photo_url) ? (
                        <Image
                          source={{ uri: buildPhotoUri(item.photo_url)! }}
                          style={[ss.avatar, { overflow: 'hidden' }]}
                          onError={() => {}}
                        />
                      ) : (
                        <View style={[ss.avatar, { backgroundColor: STAFF_LIGHT }]}>
                          <ThemedText style={[ss.avatarText, { color: STAFF_COLOR }]}>{initials(item.first_name, item.last_name)}</ThemedText>
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        {visibleColumns.has('name') && (
                          <ThemedText style={[ss.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.first_name} {item.last_name ?? ''}</ThemedText>
                        )}
                        {subParts.length > 0 ? (
                          <ThemedText style={[ss.cardSub, { color: colors['muted-foreground'] }]} numberOfLines={1}>{subParts.join(' · ')}</ThemedText>
                        ) : null}
                      </View>
                      {visibleColumns.has('status') && (
                        <View style={[ss.statusBadge, item.is_active ? ss.activeBadge : ss.inactiveBadge]}>
                          <ThemedText style={[ss.statusText, { color: item.is_active ? '#16a34a' : '#dc2626' }]}>{item.is_active ? 'Active' : 'Inactive'}</ThemedText>
                        </View>
                      )}
                    </View>
                    {/* Info rows */}
                    <View style={ss.cardInfoRow}>
                      {visibleColumns.has('contact') && item.email ? (
                        <View style={ss.cardInfoItem}>
                          <Ionicons name="mail-outline" size={13} color={colors['muted-foreground']} />
                          <ThemedText style={[ss.cardInfoText, { color: colors['muted-foreground'] }]} numberOfLines={1}>{item.email}</ThemedText>
                        </View>
                      ) : null}
                      {visibleColumns.has('contact') && item.phone ? (
                        <View style={ss.cardInfoItem}>
                          <Ionicons name="call-outline" size={13} color={colors['muted-foreground']} />
                          <ThemedText style={[ss.cardInfoText, { color: colors['muted-foreground'] }]}>{item.phone}</ThemedText>
                        </View>
                      ) : null}
                      {item.gender ? (
                        <View style={ss.genderBadge}>
                          <ThemedText style={ss.genderText}>{item.gender}</ThemedText>
                        </View>
                      ) : null}
                    </View>
                    {/* Actions */}
                    <View style={[ss.cardFooter, { borderTopColor: borderCol }]}>
                      <TouchableOpacity style={ss.cardAction} onPress={async () => {
                        setViewStaff(item);
                        try {
                          const detail = await staffApi.getStaffEnrollmentById(item.id);
                          setViewStaffDetail(detail);
                        } catch {
                          setViewStaffDetail(null);
                        }
                      }}>
                        <Ionicons name="eye-outline" size={16} color="#0EA5E9" />
                        <ThemedText style={[ss.cardActionText, { color: '#0EA5E9' }]}>View</ThemedText>
                      </TouchableOpacity>
                      <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
                        <TouchableOpacity style={ss.cardAction} onPress={() => openEdit(item)}>
                          <Ionicons name="create-outline" size={16} color={STAFF_COLOR} />
                          <ThemedText style={[ss.cardActionText, { color: STAFF_COLOR }]}>Edit</ThemedText>
                        </TouchableOpacity>
                      </UpdatePermissionGuard>
                      <DeletePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
                        <TouchableOpacity style={ss.cardAction} onPress={() => confirmDelete(item)}>
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          <ThemedText style={[ss.cardActionText, { color: '#EF4444' }]}>Delete</ThemedText>
                        </TouchableOpacity>
                      </DeletePermissionGuard>
                    </View>
                  </View>
                </View>
              );
            })}
            {filteredStaff.length > 0 ? (
              <ThemedText style={[ss.countFooter, { color: colors['muted-foreground'], borderTopColor: borderCol }]}>{filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''}</ThemedText>
            ) : null}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </ScreenLayout>

      {/* ── Columns Picker ────────────────────────────────────────────────── */}
      <Modal visible={showColumnsPicker} animationType="slide" transparent onRequestClose={() => setShowColumnsPicker(false)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.pickerSheet, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            <View style={[ss.formHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={ss.formTitle}>Columns</ThemedText>
              <TouchableOpacity onPress={() => setShowColumnsPicker(false)}
                accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity
                style={[ss.pickerItem, { borderBottomColor: colors.border, justifyContent: 'flex-start', gap: 10 }]}
                onPress={() => (visibleColumns.size === ALL_COLUMNS.length ? handleDeselectAllColumns() : handleSelectAllColumns())}
              >
                <Ionicons name={visibleColumns.size === ALL_COLUMNS.length ? 'checkbox' : 'square-outline'} size={20} color={visibleColumns.size === ALL_COLUMNS.length ? STAFF_COLOR : colors['muted-foreground']} />
                <ThemedText style={[ss.pickerItemText, { fontWeight: '700' }]}>Select All</ThemedText>
              </TouchableOpacity>
              {ALL_COLUMNS.map((col) => (
                <TouchableOpacity
                  key={col.key}
                  style={[ss.pickerItem, { borderBottomColor: colors.border, justifyContent: 'flex-start', gap: 10 }]}
                  onPress={() => handleColumnToggle(col.key)}
                >
                  <Ionicons name={visibleColumns.has(col.key) ? 'checkbox' : 'square-outline'} size={20} color={visibleColumns.has(col.key) ? STAFF_COLOR : colors['muted-foreground']} />
                  <ThemedText style={ss.pickerItemText}>{col.label}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Export Options ────────────────────────────────────────────────── */}
      <Modal visible={showExportOptions} transparent animationType="fade" onRequestClose={() => setShowExportOptions(false)}>
        <TouchableOpacity style={ss.exportOverlay} activeOpacity={1} onPress={() => setShowExportOptions(false)}>
          <TouchableOpacity activeOpacity={1} style={[ss.exportOptions, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText style={[ss.exportOptionTitle, { color: colors['muted-foreground'] }]}>Export As</ThemedText>
            <TouchableOpacity style={ss.exportOption} onPress={() => { setShowExportOptions(false); handleExportCSV(); }}>
              <Ionicons name="document-text" size={18} color={colors.foreground} />
              <ThemedText style={[ss.exportOptionText, { color: colors.foreground }]}>Export to CSV</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={ss.exportOption} onPress={() => { setShowExportOptions(false); handleExportExcel(); }}>
              <Ionicons name="grid" size={18} color={colors.foreground} />
              <ThemedText style={[ss.exportOptionText, { color: colors.foreground }]}>Export to Excel</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── View Detail Sheet ─────────────────────────────────────────────── */}
      <Modal visible={!!viewStaff} animationType="slide" transparent onRequestClose={() => { setViewStaff(null); setViewStaffDetail(null); }}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.sheetContent, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            {viewStaff && (() => {
              // Prefer the full detail fetch (has qualifications, created_at, etc.);
              // fall back to the list row while it's loading.
              const detail = viewStaffDetail ?? viewStaff;
              return (
              <>
                <View style={ss.sheetHeader}>
                  {buildPhotoUri(detail.photo_url) ? (
                    <Image source={{ uri: buildPhotoUri(detail.photo_url)! }} style={[ss.avatarLg, { overflow: 'hidden' }]} onError={() => {}} />
                  ) : (
                    <View style={[ss.avatarLg, { backgroundColor: STAFF_LIGHT }]}>
                      <ThemedText style={[ss.avatarLgText, { color: STAFF_COLOR }]}>{initials(detail.first_name, detail.last_name)}</ThemedText>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <ThemedText style={ss.sheetName}>{detail.first_name} {detail.last_name ?? ''}</ThemedText>
                    <ThemedText style={[ss.sheetDesig, { color: colors['muted-foreground'] }]}>{desigTitle(detail) || 'Not Assigned'}</ThemedText>
                  </View>
                  <View style={[ss.statusBadge, detail.is_active ? ss.activeBadge : ss.inactiveBadge]}>
                    <ThemedText style={[ss.statusText, { color: detail.is_active ? '#16a34a' : '#dc2626' }]}>{detail.is_active ? 'Active' : 'Inactive'}</ThemedText>
                  </View>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  {/* Sections below mirror the web app's Staff Details dialog:
                      Basic Information / Contact Information / Professional Information /
                      Account & Status / Qualifications / Work Experience / Bank Details / Salary & PF */}
                  <SheetSection title="Basic Information" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="person-outline" label="Full Name" value={`${detail.first_name} ${detail.last_name ?? ''}`.trim()} />
                    <DetailRow icon="person-outline" label="Gender" value={detail.gender} />
                    <DetailRow icon="calendar-outline" label="Date of Birth" value={toDisplay(detail.date_of_birth ?? '')} />
                    <DetailRow icon="calendar-outline" label="Joining Date" value={toDisplay(detail.joining_date)} />
                  </View>
                  <SheetSection title="Contact Information" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="mail-outline" label="Email" value={detail.email} placeholder="Not provided" />
                    <DetailRow icon="call-outline" label="Phone" value={detail.phone} placeholder="Not provided" />
                    <DetailRow icon="location-outline" label="Address" value={detail.address} placeholder="Not provided" />
                  </View>
                  <SheetSection title="Professional Information" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="briefcase-outline" label="Designation" value={desigTitle(detail) || undefined} placeholder="Not Assigned" />
                    <DetailRow icon="business-outline" label="Department" value={detail.department} placeholder="Not assigned" />
                    <DetailRow icon="school-outline" label="Qualification" value={detail.qualification} />
                    <DetailRow icon="time-outline" label="Experience" value={detail.experience_years ? `${detail.experience_years} year(s)` : undefined} />
                  </View>
                  <SheetSection title="Account & Status" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="finger-print-outline" label="User ID" value={detail.user_id} placeholder="—" />
                    <View style={ss.detailRow}>
                      <Ionicons name="shield-checkmark-outline" size={15} color={STAFF_COLOR} style={{ marginTop: 1 }} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <ThemedText style={ss.detailLabel}>Status</ThemedText>
                        <View style={[ss.statusBadge, detail.is_active ? ss.activeBadge : ss.inactiveBadge, { alignSelf: 'flex-start', marginTop: 3 }]}>
                          <ThemedText style={[ss.statusText, { color: detail.is_active ? '#16a34a' : '#dc2626' }]}>{detail.is_active ? 'Active' : 'Inactive'}</ThemedText>
                        </View>
                      </View>
                    </View>
                    <DetailRow icon="time-outline" label="Created" value={detail.created_at ? new Date(detail.created_at).toLocaleString() : undefined} placeholder="—" />
                    <DetailRow icon="refresh-outline" label="Last Updated" value={detail.updated_at ? new Date(detail.updated_at).toLocaleString() : undefined} placeholder="—" />
                  </View>
                  {detail.qualifications?.length ? (
                    <>
                      <SheetSection title="Qualifications" />
                      <View style={ss.detailGroup}>
                        {detail.qualifications.map((q: any, i: number) => (
                          <View key={i} style={[ss.expCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                            <ThemedText style={ss.expTitle}>{q.name || q.degree_name}</ThemedText>
                            <ThemedText style={[ss.expRole, { color: STAFF_COLOR }]}>{q.level || q.institution}</ThemedText>
                            {(q.university || q.institution) ? <ThemedText style={[ss.expDates, { color: colors['muted-foreground'] }]}>{q.university || q.institution}</ThemedText> : null}
                            {q.passed_out_year ? <ThemedText style={[ss.expDates, { color: colors['muted-foreground'] }]}>{q.passed_out_year}{q.percentage ? ` · ${q.percentage}%` : ''}</ThemedText> : null}
                          </View>
                        ))}
                      </View>
                    </>
                  ) : null}
                  <SheetSection title="Work Experience" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="business-outline" label="Organization" value={detail.work_org} placeholder="—" />
                    <DetailRow icon="calendar-outline" label="Period" value={(detail.work_from_date || detail.work_to_date) ? `${detail.work_from_date ? toDisplay(detail.work_from_date) : '—'} → ${detail.work_to_date ? toDisplay(detail.work_to_date) : 'Present'}` : undefined} placeholder="—" />
                    <DetailRow icon="book-outline" label="Subjects" value={detail.subjects_dealt} placeholder="—" />
                    <DetailRow icon="document-text-outline" label="Remarks" value={detail.work_remarks} placeholder="—" />
                  </View>
                  <SheetSection title="Bank Details" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="business-outline" label="Bank" value={detail.bank_name} placeholder="—" />
                    <DetailRow icon="business-outline" label="Branch" value={detail.bank_branch} placeholder="—" />
                    <DetailRow icon="person-outline" label="Account Holder" value={detail.account_holder_name} placeholder="—" />
                    <DetailRow icon="card-outline" label="Account Type" value={detail.account_type} placeholder="—" />
                    <DetailRow icon="card-outline" label="Account No." value={detail.account_number} placeholder="—" />
                    <DetailRow icon="barcode-outline" label="IFSC Code" value={detail.ifsc_code ?? detail.bank_ifsc_code} placeholder="—" />
                  </View>
                  <SheetSection title="Salary & PF" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="cash-outline" label="Last Drawn Salary" value={detail.last_drawn_salary ? `₹${Number(detail.last_drawn_salary).toLocaleString('en-IN')}` : undefined} placeholder="—" />
                    <DetailRow icon="cash-outline" label="Current Salary" value={detail.current_salary ? `₹${Number(detail.current_salary).toLocaleString('en-IN')}` : undefined} placeholder="—" />
                    <DetailRow icon="document-text-outline" label="PF Account No." value={detail.pf_account_number} placeholder="—" />
                    <DetailRow icon="document-text-outline" label="UAN" value={detail.uan_number} placeholder="—" />
                  </View>
                  <View style={{ height: 32 }} />
                </ScrollView>
                <View style={[ss.formFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={[ss.footerBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => { setViewStaff(null); setViewStaffDetail(null); }}>
                    <ThemedText style={[ss.footerBtnText, { color: colors['card-foreground'] }]}>Close</ThemedText>
                  </TouchableOpacity>
                  <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF}>
                    <TouchableOpacity style={[ss.footerBtn, { backgroundColor: STAFF_COLOR }]} onPress={() => { setViewStaff(null); setViewStaffDetail(null); openEdit(detail); }}>
                      <ThemedText style={[ss.footerBtnText, { color: '#fff' }]}>Edit Staff</ThemedText>
                    </TouchableOpacity>
                  </UpdatePermissionGuard>
                </View>
              </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit Form Sheet ──────────────────────────────────────────── */}
      <Modal visible={isFormVisible} animationType="slide" transparent onRequestClose={() => setIsFormVisible(false)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.sheetContent, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            <View style={[ss.formHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={ss.formTitle}>{editingStaff ? 'Edit Staff Enrollment' : 'Create Staff Enrollment'}</ThemedText>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={ss.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Photo ────────────────────────────────────────────────── */}
              <View style={[ss.photoSection, { borderBottomColor: colors.border }]}>
                <View style={ss.photoPreviewWrap}>
                  {pendingPhoto ? (
                    <Image source={{ uri: pendingPhoto.uri }} style={ss.photoPreview} />
                  ) : editingStaff?.photo_url ? (
                    <Image source={{ uri: buildPhotoUri(editingStaff.photo_url)! }} style={ss.photoPreview} onError={() => {}} />
                  ) : (
                    <View style={[ss.photoPlaceholder, { backgroundColor: STAFF_LIGHT }]}>
                      <Ionicons name="person-outline" size={32} color={STAFF_COLOR} />
                    </View>
                  )}
                </View>
                <View style={ss.photoActions}>
                  <TouchableOpacity style={[ss.photoBtn, { borderColor: STAFF_COLOR }]} onPress={pickPhoto}>
                    <Ionicons name="camera-outline" size={16} color={STAFF_COLOR} />
                    <ThemedText style={[ss.photoBtnText, { color: STAFF_COLOR }]}>
                      {pendingPhoto || editingStaff?.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </ThemedText>
                  </TouchableOpacity>
                  {(pendingPhoto || editingStaff?.photo_url) && (
                    <TouchableOpacity
                      style={[ss.photoBtn, { borderColor: '#EF4444' }]}
                      onPress={async () => {
                        if (pendingPhoto) { setPendingPhoto(null); return; }
                        if (editingStaff) {
                          try { await staffApi.deleteStaffPhoto(editingStaff.id); queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] }); setEditingStaff({ ...editingStaff, photo_url: null }); }
                          catch { showError('Error', 'Failed to remove photo.'); }
                        }
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <ThemedText style={[ss.photoBtnText, { color: '#EF4444' }]}>Remove</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* ── Basic Information ─────────────────────────────────────── */}
              <FormSec title="Basic Information" />
              <View style={ss.row}>
                <FInput label="First Name *" placeholder="Enter first name" value={formData.first_name}
                  onChangeText={(v) => { setField('first_name', v); setFirstNameError(v.trim() ? '' : 'First name is required'); }}
                  error={firstNameError} colors={colors} half />
                <FInput label="Last Name" placeholder="Enter last name" value={formData.last_name ?? ''} onChangeText={(v) => setField('last_name', v)} colors={colors} half />
              </View>
              <View style={ss.row}>
                <FInput label="Email" placeholder="Enter email address" value={formData.email ?? ''}
                  onChangeText={(v) => { setField('email', v); setEmailError(v.trim() && !isValidEmail(v.trim()) ? 'Please enter a valid email address' : ''); }}
                  keyboardType="email-address" autoCapitalize="none" error={emailError} colors={colors} half />
                <FInput label="Phone *" placeholder="Enter phone number" value={formData.phone ?? ''}
                  onChangeText={(v) => { setField('phone', v); setPhoneError(validatePhoneMessage(v.trim())); }}
                  keyboardType="phone-pad" error={phoneError} hint={!phoneError && isValidPhone((formData.phone ?? '').trim()) ? 'Mobile number is valid' : undefined} colors={colors} half />
              </View>
              <View style={ss.row}>
                <PickerField label="Gender" display={formData.gender ?? ''} placeholder="Select gender" onPress={() => setIsGenderPicker(true)} colors={colors} half />
                <DateField label="Date of Birth" displayValue={dateDisplay.date_of_birth} onCalPress={() => setActiveDateField('date_of_birth')}
                  onTextChange={(t) => { const fmt = autoDate(t); setDateDisplay((p) => ({ ...p, date_of_birth: fmt })); const parsed = parseDMY(fmt); if (parsed) setField('date_of_birth', parsed); }}
                  colors={colors} half />
              </View>
              <View style={ss.row}>
                <DateField label="Joining Date" displayValue={dateDisplay.joining_date} onCalPress={() => setActiveDateField('joining_date')}
                  onTextChange={(t) => { const fmt = autoDate(t); setDateDisplay((p) => ({ ...p, joining_date: fmt })); const parsed = parseDMY(fmt); if (parsed) setField('joining_date', parsed); }}
                  colors={colors} half />
                <FInput label="Qualification" placeholder="e.g. B.Ed, M.Sc" value={formData.qualification ?? ''} onChangeText={(v) => setField('qualification', v)} colors={colors} half />
              </View>
              <FInput label="Experience (Years)" placeholder="0" value={formData.experience_years !== undefined ? String(formData.experience_years) : ''}
                onChangeText={(v) => { setField('experience_years', v ? Number(v) : 0); setExperienceError(validateExperienceMessage(v)); }}
                keyboardType="numeric" error={experienceError} colors={colors} />
              <FInput label="Address *" placeholder="Enter residential address" value={formData.address ?? ''}
                onChangeText={(v) => { setField('address', v); setAddressError(v.trim() ? '' : 'Address is required'); }}
                error={addressError} multiline colors={colors} />

              {/* ── Qualifications ─────────────────────────────────────────── */}
              <FormSec title="Qualifications" icon="school-outline"
                right={
                  <TouchableOpacity style={[ss.secAddBtn, { backgroundColor: colors['card-foreground'] }]} onPress={() => setQuals((p) => [...p, { ...EMPTY_QUAL }])}>
                    <Ionicons name="add" size={14} color={colors.background} />
                    <ThemedText style={[ss.secAddBtnText, { color: colors.background }]}>Add Qualification</ThemedText>
                  </TouchableOpacity>
                }
              />
              {quals.length === 0 ? <ThemedText style={[ss.emptyHint, { color: colors['muted-foreground'] }]}>No qualifications added yet.</ThemedText> : null}
              {quals.map((q, i) => (
                <View key={i} style={[ss.dynRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <View style={ss.dynRowHead}>
                    <ThemedText style={[ss.dynRowNum, { color: colors['muted-foreground'] }]}>Qualification {i + 1}</ThemedText>
                    <TouchableOpacity onPress={() => {
                      const removed = quals[i];
                      if (removed.id) setRemovedQualIds((p) => [...p, removed.id!]);
                      setQuals((p) => p.filter((_, j) => j !== i));
                    }} accessibilityLabel="Delete"><Ionicons name="trash-outline" size={16} color="#EF4444" /></TouchableOpacity>
                  </View>
                  <View style={ss.row}>
                    <View style={ss.halfField}>
                      <FL label="Level" />
                      <TouchableOpacity style={[ss.pickerTrig, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setQualLevelPickerIdx(i)} accessibilityLabel="Select Level">
                        <ThemedText style={{ color: q.level ? colors['card-foreground'] : colors['muted-foreground'], fontSize: 15, flex: 1 }} numberOfLines={1}>
                          {QUALIFICATION_LEVELS.find((l) => l.value === q.level)?.label || 'Select level'}
                        </ThemedText>
                        <Ionicons name="chevron-down" size={16} color={colors['muted-foreground']} />
                      </TouchableOpacity>
                    </View>
                    <View style={ss.halfField}>
                      <FL label="Degree / Course" />
                      <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="e.g. B.Tech, MBA" placeholderTextColor={colors['muted-foreground']} value={q.name} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, name: v } : e))} />
                    </View>
                  </View>
                  <View style={ss.row}>
                    <View style={ss.halfField}>
                      <FL label="Pass-out Year" />
                      <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="e.g. 2018" placeholderTextColor={colors['muted-foreground']} keyboardType="numeric" value={q.passed_out_year} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, passed_out_year: v } : e))} />
                    </View>
                    <View style={ss.halfField}>
                      <FL label="Percentage / CGPA" />
                      <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="e.g. 78.50" placeholderTextColor={colors['muted-foreground']} keyboardType="numeric" value={q.percentage} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, percentage: v } : e))} />
                    </View>
                  </View>
                  <View style={ss.fullField}>
                    <FL label="University / Board" />
                    <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="e.g. Osmania University" placeholderTextColor={colors['muted-foreground']} value={q.university} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, university: v } : e))} />
                  </View>
                </View>
              ))}

              {/* ── Professional Information ───────────────────────────────── */}
              <FormSec title="Professional Information" />
              <View style={ss.row}>
                <PickerField label="Designation" display={desigTitle(formData.designation_id)} placeholder="Select designation" onPress={() => setIsDesigPicker(true)} colors={colors} half />
                <FInput label="Department" placeholder="Enter department" value={formData.department ?? ''} onChangeText={(v) => setField('department', v)} colors={colors} half />
              </View>

              {/* ── Account Information ────────────────────────────────────── */}
              <FormSec title="Account Information" />
              <View style={[ss.switchRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[ss.switchLabel, { color: colors.foreground }]}>Active Staff Member</ThemedText>
                  <ThemedText style={[ss.switchDesc, { color: colors['muted-foreground'] }]}>Staff member is currently active</ThemedText>
                </View>
                <Switch value={isActiveStaff} onValueChange={setIsActiveStaff} trackColor={{ false: '#D1D5DB', true: STAFF_COLOR + '66' }} thumbColor={isActiveStaff ? STAFF_COLOR : '#9CA3AF'} />
              </View>

              {/* ── Work Experience ────────────────────────────────────────── */}
              <AccordionSection title="Work Experience" icon="briefcase-outline" open={isWorkOpen} onToggle={() => setIsWorkOpen((o) => !o)}>
                <View style={ss.row}>
                  <FInput label="Previous Organization" placeholder="e.g. ABC School" value={workFlat.work_org} onChangeText={(v) => setWorkFlat((p) => ({ ...p, work_org: v }))} colors={colors} half />
                  <FInput label="Subjects Dealt" placeholder="e.g. Maths, Physics" value={workFlat.subjects_dealt} onChangeText={(v) => setWorkFlat((p) => ({ ...p, subjects_dealt: v }))} colors={colors} half />
                </View>
                <View style={ss.row}>
                  <DateField label="From Date" displayValue={dateDisplay.work_from_date} onCalPress={() => setActiveDateField('work_from_date')}
                    onTextChange={(t) => { const fmt = autoDate(t); setDateDisplay((p) => ({ ...p, work_from_date: fmt })); const parsed = parseDMY(fmt); if (parsed) setWorkFlat((p) => ({ ...p, work_from_date: parsed! })); }}
                    colors={colors} half />
                  <DateField label="To Date" displayValue={dateDisplay.work_to_date} onCalPress={() => setActiveDateField('work_to_date')}
                    onTextChange={(t) => { const fmt = autoDate(t); setDateDisplay((p) => ({ ...p, work_to_date: fmt })); const parsed = parseDMY(fmt); if (parsed) setWorkFlat((p) => ({ ...p, work_to_date: parsed! })); }}
                    colors={colors} half />
                </View>
                <FInput label="Remarks" placeholder="Additional remarks about work experience" value={workFlat.work_remarks} onChangeText={(v) => setWorkFlat((p) => ({ ...p, work_remarks: v }))} multiline colors={colors} />
              </AccordionSection>

              {/* ── Bank Details ───────────────────────────────────────────── */}
              <AccordionSection title="Bank Details" icon="business-outline" open={isBankOpen} onToggle={() => setIsBankOpen((o) => !o)}>
                <View style={ss.row}>
                  <FInput label="Bank Name" placeholder="e.g. State Bank of India" value={formData.bank_name ?? ''} onChangeText={(v) => setField('bank_name', v)} colors={colors} half />
                  <FInput label="Branch" placeholder="e.g. Hyderabad Main" value={extraFields.branch} onChangeText={(v) => setExtraFields((p) => ({ ...p, branch: v }))} colors={colors} half />
                </View>
                <View style={ss.row}>
                  <FInput label="Account Number" placeholder="Enter account number" value={formData.account_number ?? ''} onChangeText={(v) => setField('account_number', v)} keyboardType="numeric" colors={colors} half />
                  <FInput label="IFSC Code" placeholder="e.g. SBIN0001234" value={formData.bank_ifsc_code ?? ''} onChangeText={(v) => setField('bank_ifsc_code', v.toUpperCase())} autoCapitalize="characters" colors={colors} half />
                </View>
                <View style={ss.row}>
                  <FInput label="Account Holder Name" placeholder="Name as per bank records" value={extraFields.account_holder_name} onChangeText={(v) => setExtraFields((p) => ({ ...p, account_holder_name: v }))} colors={colors} half />
                  <PickerField label="Account Type" display={extraFields.account_type} placeholder="Select account type" onPress={() => setIsAccTypePicker(true)} colors={colors} half />
                </View>
              </AccordionSection>

              {/* ── Salary & PF ────────────────────────────────────────────── */}
              <AccordionSection title="Salary & PF" icon="card-outline" open={isSalaryOpen} onToggle={() => setIsSalaryOpen((o) => !o)}>
                <View style={ss.row}>
                  <FInput label="Last Drawn Salary (₹)" placeholder="e.g. 45000.00" value={formData.last_drawn_salary !== undefined ? String(formData.last_drawn_salary) : ''}
                    onChangeText={(v) => { setField('last_drawn_salary', v ? Number(v) : undefined); setLastSalaryError(validateSalaryMessage(v)); }}
                    keyboardType="numeric" error={lastSalaryError} colors={colors} half />
                  <FInput label="Current Salary (₹)" placeholder="e.g. 50000.00" value={formData.current_salary !== undefined ? String(formData.current_salary) : ''}
                    onChangeText={(v) => { setField('current_salary', v ? Number(v) : undefined); setCurrentSalaryError(validateSalaryMessage(v)); }}
                    keyboardType="numeric" error={currentSalaryError} colors={colors} half />
                </View>
                <View style={ss.row}>
                  <FInput label="PF Account Number" placeholder="e.g. AP/HYD/12345" value={formData.pf_account_number ?? ''}
                    onChangeText={(v) => { setField('pf_account_number', v); setPfError(validatePfMessage(v)); }}
                    error={pfError} colors={colors} half />
                  <FInput label="UAN Number" placeholder="12-digit UAN" value={formData.uan_number ?? ''}
                    onChangeText={(v) => { setField('uan_number', v); setUanError(validateUanMessage(v)); }}
                    keyboardType="numeric" error={uanError} colors={colors} half />
                </View>
              </AccordionSection>

              <View style={{ height: 12 }} />
            </ScrollView>

            <View style={[ss.formFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity style={[ss.footerBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setIsFormVisible(false)}>
                <ThemedText style={[ss.footerBtnText, { color: colors['card-foreground'] }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[ss.footerBtn, { backgroundColor: STAFF_COLOR }]} onPress={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                <ThemedText style={[ss.footerBtnText, { color: '#fff' }]}>{createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date pickers — outside Modal */}
      {activeDateField && Platform.OS === 'android' && (
        <DateTimePicker value={datePickerValue()} mode="date" display="default" maximumDate={datePickerMax}
          onChange={(event, date) => { const field = activeDateField; setActiveDateField(null); if (event.type === 'set' && date) handleDateChange(field, `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }} />
      )}
      {Platform.OS === 'ios' && (
        <IOSDatePickerModal visible={!!activeDateField} value={datePickerValue()} mode="date" maximumDate={datePickerMax}
          onChange={(date) => { if (activeDateField) handleDateChange(activeDateField, `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`); }}
          onDismiss={() => setActiveDateField(null)} />
      )}

      {/* ── Gender Picker ─────────────────────────────────────────────────── */}
      <Modal visible={isGenderPicker} animationType="slide" transparent onRequestClose={() => setIsGenderPicker(false)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.pickerSheet, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            <View style={[ss.formHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={ss.formTitle}>Select Gender</ThemedText>
              <TouchableOpacity onPress={() => setIsGenderPicker(false)}
              accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
            </View>
            {GENDERS.map((g) => (
              <TouchableOpacity key={g} style={[ss.pickerItem, { borderBottomColor: colors.border }, formData.gender === g && { backgroundColor: STAFF_LIGHT }]}
                onPress={() => { setField('gender', g); setIsGenderPicker(false); }}>
                <ThemedText style={[ss.pickerItemText, formData.gender === g && { color: STAFF_COLOR, fontWeight: '600' }]}>{g}</ThemedText>
                {formData.gender === g && <Ionicons name="checkmark" size={18} color={STAFF_COLOR} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Qualification Level Picker ────────────────────────────────────── */}
      <Modal visible={qualLevelPickerIdx !== null} animationType="slide" transparent onRequestClose={() => setQualLevelPickerIdx(null)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.pickerSheet, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            <View style={[ss.formHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={ss.formTitle}>Select Level</ThemedText>
              <TouchableOpacity onPress={() => setQualLevelPickerIdx(null)}
              accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
            </View>
            {QUALIFICATION_LEVELS.map((l) => {
              const active = qualLevelPickerIdx !== null && quals[qualLevelPickerIdx]?.level === l.value;
              return (
                <TouchableOpacity key={l.value} style={[ss.pickerItem, { borderBottomColor: colors.border }, active && { backgroundColor: STAFF_LIGHT }]}
                  onPress={() => {
                    const idx = qualLevelPickerIdx;
                    if (idx !== null) setQuals((p) => p.map((e, j) => j === idx ? { ...e, level: l.value } : e));
                    setQualLevelPickerIdx(null);
                  }}>
                  <ThemedText style={[ss.pickerItemText, active && { color: STAFF_COLOR, fontWeight: '600' }]}>{l.label}</ThemedText>
                  {active && <Ionicons name="checkmark" size={18} color={STAFF_COLOR} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* ── Account Type Picker ────────────────────────────────────────────── */}
      <Modal visible={isAccTypePicker} animationType="slide" transparent onRequestClose={() => setIsAccTypePicker(false)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.pickerSheet, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            <View style={[ss.formHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={ss.formTitle}>Account Type</ThemedText>
              <TouchableOpacity onPress={() => setIsAccTypePicker(false)}
              accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
            </View>
            {ACCOUNT_TYPES.map((t) => (
              <TouchableOpacity key={t} style={[ss.pickerItem, { borderBottomColor: colors.border }, extraFields.account_type === t && { backgroundColor: STAFF_LIGHT }]}
                onPress={() => { setExtraFields((p) => ({ ...p, account_type: t })); setIsAccTypePicker(false); }}>
                <ThemedText style={[ss.pickerItemText, extraFields.account_type === t && { color: STAFF_COLOR, fontWeight: '600' }]}>{t}</ThemedText>
                {extraFields.account_type === t && <Ionicons name="checkmark" size={18} color={STAFF_COLOR} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── Designation Picker ────────────────────────────────────────────── */}
      <Modal visible={isDesigPicker} animationType="slide" transparent onRequestClose={() => setIsDesigPicker(false)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.pickerSheet, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            <View style={[ss.formHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={ss.formTitle}>Select Designation</ThemedText>
              <TouchableOpacity onPress={() => setIsDesigPicker(false)}
              accessibilityLabel="Close"><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
            </View>
            <ScrollView>
              {(designations ?? []).map((item) => (
                <TouchableOpacity key={item.id} style={[ss.pickerItem, { borderBottomColor: colors.border }, formData.designation_id === item.id && { backgroundColor: STAFF_LIGHT }]}
                  onPress={() => { setField('designation_id', item.id); setIsDesigPicker(false); }}>
                  <ThemedText style={[ss.pickerItemText, formData.designation_id === item.id && { color: STAFF_COLOR, fontWeight: '600' }]}>{item.title}</ThemedText>
                  {formData.designation_id === item.id && <Ionicons name="checkmark" size={18} color={STAFF_COLOR} />}
                </TouchableOpacity>
              ))}
              {(designations ?? []).length === 0 && <View style={ss.centeredBox}><ThemedText style={{ color: colors['muted-foreground'] }}>No designations found</ThemedText></View>}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal {...modalProps} />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  container: { flex: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9, marginHorizontal: 12, marginTop: 10, marginBottom: 8, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },

  // Toolbar (Columns / Export)
  toolbarRow: { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginBottom: 10 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  toolbarBtnText: { fontSize: 13, fontWeight: '600' },
  exportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', alignItems: 'flex-start', padding: 16 },
  exportOptions: { borderRadius: 12, borderWidth: 1, padding: 8, minWidth: 200, marginTop: 116, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  exportOptionTitle: { fontSize: 12, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  exportOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 10, borderRadius: 8 },
  exportOptionText: { fontSize: 15, fontWeight: '500' },

  // Cards
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginHorizontal: 12, marginBottom: 10, overflow: 'hidden' },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 1 },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cardInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardInfoText: { fontSize: 12 },
  genderBadge: { alignSelf: 'flex-start', backgroundColor: STAFF_LIGHT, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  genderText: { fontSize: 11, fontWeight: '600', color: STAFF_COLOR },
  cardFooter: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, marginTop: 2 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  activeBadge: { backgroundColor: '#DCFCE7' },
  inactiveBadge: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 12 },
  emptyText: { fontSize: 14 },
  countFooter: { fontSize: 12, textAlign: 'center', paddingVertical: 10, borderTopWidth: 1, marginHorizontal: 12 },
  centeredBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  retryBtn: { marginTop: 16, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 20 },

  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  avatarLg: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  avatarLgText: { fontSize: 20, fontWeight: '700' },
  sheetName: { fontSize: 18, fontWeight: '700' },
  sheetDesig: { fontSize: 13, marginTop: 2 },
  sheetSectionHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 18, marginBottom: 10 },
  sheetSectionBar: { width: 3, height: 16, borderRadius: 2, marginRight: 8 },
  sheetSectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6 },
  detailGroup: { marginHorizontal: 20, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },
  detailLabel: { fontSize: 11, opacity: 0.55, marginBottom: 1 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  expCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  expTitle: { fontSize: 14, fontWeight: '700' },
  expRole: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  expDates: { fontSize: 11, marginTop: 3 },

  // Form
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  formTitle: { fontSize: 18, fontWeight: '700' },
  formScroll: { paddingHorizontal: 16 },

  // Form section title
  formSec: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 14, paddingTop: 16, borderTopWidth: 1 },
  formSecTitle: { fontSize: 15, fontWeight: '700' },

  // Section add button
  secAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  secAddBtnText: { fontSize: 13, fontWeight: '600' },

  // 2-col row
  row: { flexDirection: 'row', gap: 10 },
  halfField: { flex: 1, marginBottom: 14 },
  fullField: { marginBottom: 14 },

  // Field label + input
  fl: { fontSize: 13, fontWeight: '600', marginBottom: 6, opacity: 0.75 },
  fi: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  fieldError: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  fieldHint: { fontSize: 12, color: '#16a34a', marginTop: 4 },
  pickerTrig: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, gap: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },

  // Active switch
  switchRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, gap: 10 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchDesc: { fontSize: 12, marginTop: 2 },

  // Dynamic qualification rows
  dynRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  dynRowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dynRowNum: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyHint: { fontSize: 13, fontStyle: 'italic', marginBottom: 14 },

  formFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1 },
  footerBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  footerBtnText: { fontWeight: '700', fontSize: 15 },

  // Photo upload
  photoSection: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, marginBottom: 4 },
  photoPreviewWrap: {},
  photoPreview: { width: 72, height: 72, borderRadius: 36 },
  photoPlaceholder: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  photoActions: { flex: 1, gap: 8 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  photoBtnText: { fontSize: 13, fontWeight: '600' },

  // Pickers
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  pickerItemText: { fontSize: 15 },
});

export default function StaffEnrollmentScreen() {
  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STAFF}
      fallback={
        <ScreenLayout title="Staff Enrollment">
          <View style={ss.centeredBox}>
            <Ionicons name="lock-closed-outline" size={56} color="#9CA3AF" />
            <ThemedText type="subtitle" style={{ marginTop: 16 }}>Access Denied</ThemedText>
            <ThemedText style={{ textAlign: 'center', opacity: 0.6, marginTop: 8 }}>You don't have permission to view staff enrollment data</ThemedText>
          </View>
        </ScreenLayout>
      }
    >
      <StaffEnrollmentScreenContent />
    </ReadOrListPermissionGuard>
  );
}
