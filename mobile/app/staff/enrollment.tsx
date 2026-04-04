import { Ionicons } from '@expo/vector-icons';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
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
import type { Staff, StaffInput, QualificationEntry } from '@/src/types/masters/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const STAFF_COLOR  = '#8B5CF6';
const STAFF_LIGHT  = '#EDE9FE';

const GENDERS       = ['Male', 'Female', 'Other'] as const;
const ACCOUNT_TYPES = ['Savings', 'Current'] as const;

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
const EMPTY_QUAL: QualificationEntry = { degree_name: '', institution: '', year_of_passing: undefined, result: '' };

const apiErrMsg = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((e: any) => e.msg || String(e)).join(', ');
  return fallback;
};
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

// ─── Reusable form field sub-components ──────────────────────────────────────
function FL({ label }: { label: string }) {
  return <ThemedText style={ss.fl}>{label}</ThemedText>;
}
function FInput({ label, placeholder, value, onChangeText, keyboardType, autoCapitalize, multiline, colors, half }: {
  label: string; placeholder: string; value: string; onChangeText: (v: string) => void;
  keyboardType?: any; autoCapitalize?: any; multiline?: boolean; colors: any; half?: boolean;
}) {
  return (
    <View style={half ? ss.halfField : ss.fullField}>
      <FL label={label} />
      <TextInput
        style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }, multiline && { minHeight: 70, textAlignVertical: 'top' }]}
        placeholder={placeholder} placeholderTextColor={colors['muted-foreground']}
        value={value} onChangeText={onChangeText} keyboardType={keyboardType}
        autoCapitalize={autoCapitalize} multiline={multiline}
      />
    </View>
  );
}
function PickerField({ label, display, placeholder, onPress, colors, half }: {
  label: string; display: string; placeholder: string; onPress: () => void; colors: any; half?: boolean;
}) {
  return (
    <View style={half ? ss.halfField : ss.fullField}>
      <FL label={label} />
      <TouchableOpacity style={[ss.pickerTrig, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={onPress}>
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
        <TouchableOpacity onPress={onCalPress}><Ionicons name="calendar-outline" size={20} color={colors['muted-foreground']} /></TouchableOpacity>
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
function DetailRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={ss.detailRow}>
      <Ionicons name={icon as any} size={15} color={STAFF_COLOR} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <ThemedText style={ss.detailLabel}>{label}</ThemedText>
        <ThemedText style={ss.detailValue}>{value}</ThemedText>
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
function StaffEnrollmentScreenContent() {
  const { colors, theme } = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();

  const [search, setSearch] = useState('');
  const [viewStaff, setViewStaff] = useState<Staff | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Pickers
  const [isDesigPicker,   setIsDesigPicker]   = useState(false);
  const [isGenderPicker,  setIsGenderPicker]  = useState(false);
  const [isAccTypePicker, setIsAccTypePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState<string | null>(null);

  // Form state
  const [formData, setFormData]       = useState<StaffInput>(BLANK_FORM);
  const [workFlat, setWorkFlat]       = useState(BLANK_WORK);
  const [quals, setQuals]             = useState<QualificationEntry[]>([]);
  const [extraFields, setExtraFields] = useState(BLANK_EXTRA);
  const [isActiveStaff, setIsActiveStaff] = useState(true);
  const [dateDisplay, setDateDisplay] = useState({
    date_of_birth: '', joining_date: toDisplay(new Date().toISOString().split('T')[0]),
    work_from_date: '', work_to_date: '',
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: staffData, isLoading, error, refetch } = useStaffEnrollments({ skip: 0, limit: 200 });
  const { data: designations } = useDesignationsDropdown();

  const createMutation = useCreateStaffEnrollment({
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] }); setIsFormVisible(false); resetForm(); showSuccess('Staff Added', 'New staff member enrolled successfully.'); },
    onError: (err: any) => showError('Failed', apiErrMsg(err, 'Could not add staff member.')),
  });
  const updateMutation = useUpdateStaffEnrollment({
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] }); setIsFormVisible(false); resetForm(); showSuccess('Updated', 'Staff member updated successfully.'); },
    onError: (err: any) => showError('Failed', apiErrMsg(err, 'Could not update staff member.')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.deleteStaffEnrollment(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-enrollments'] }); showSuccess('Deleted', 'Staff member removed.'); },
    onError: (err: any) => showError('Failed', apiErrMsg(err, 'Could not delete staff member.')),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData(BLANK_FORM); setWorkFlat(BLANK_WORK); setQuals([]);
    setExtraFields(BLANK_EXTRA); setIsActiveStaff(true); setEditingStaff(null);
    setActiveDateField(null);
    setDateDisplay({ date_of_birth: '', joining_date: toDisplay(new Date().toISOString().split('T')[0]), work_from_date: '', work_to_date: '' });
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

  const openEdit = (staff: Staff) => {
    setEditingStaff(staff);
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
    setQuals([]);  // qualifications managed via separate API
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
    if (!formData.first_name.trim()) { showError('Validation', 'First name is required.'); return; }
    if (!formData.joining_date) { showError('Validation', 'Joining date is required.'); return; }

    const payload: Record<string, any> = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name?.trim() || undefined,
      phone: formData.phone?.trim() || undefined,
      gender: formData.gender || undefined,
      joining_date: formData.joining_date,
      qualification: formData.qualification?.trim() || undefined,
      experience_years: formData.experience_years || undefined,
      address: formData.address?.trim() || undefined,
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
    if (formData.designation_id?.trim()) payload.designation_id = formData.designation_id.trim();
    if (formData.email?.trim()) payload.email = formData.email.trim();
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
            {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={17} color={colors['muted-foreground']} /></TouchableOpacity> : null}
          </View>

          {/* Cards */}
          <ScrollView refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={STAFF_COLOR} />} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredStaff.length === 0 && !isLoading ? (
              <View style={ss.emptyBox}>
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                <ThemedText style={[ss.emptyText, { color: colors['muted-foreground'] }]}>{search ? 'No results found' : 'No staff members yet'}</ThemedText>
              </View>
            ) : null}
            {filteredStaff.map((item) => {
              const title = desigTitle(item);
              return (
                <View key={item.id} style={[ss.card, { backgroundColor: colors.card, borderColor: borderCol }]}>
                  <View style={[ss.cardAccent, { backgroundColor: STAFF_COLOR }]} />
                  <View style={{ flex: 1, padding: 12 }}>
                    {/* Top row: avatar + name/desig + status */}
                    <View style={ss.cardTop}>
                      <View style={[ss.avatar, { backgroundColor: STAFF_LIGHT }]}>
                        <ThemedText style={[ss.avatarText, { color: STAFF_COLOR }]}>{initials(item.first_name, item.last_name)}</ThemedText>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <ThemedText style={[ss.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.first_name} {item.last_name ?? ''}</ThemedText>
                        <ThemedText style={[ss.cardSub, { color: colors['muted-foreground'] }]} numberOfLines={1}>{title || 'No Designation'}{item.department ? ` · ${item.department}` : ''}</ThemedText>
                      </View>
                      <View style={[ss.statusBadge, item.is_active ? ss.activeBadge : ss.inactiveBadge]}>
                        <ThemedText style={[ss.statusText, { color: item.is_active ? '#16a34a' : '#dc2626' }]}>{item.is_active ? 'Active' : 'Inactive'}</ThemedText>
                      </View>
                    </View>
                    {/* Info rows */}
                    <View style={ss.cardInfoRow}>
                      {item.email ? (
                        <View style={ss.cardInfoItem}>
                          <Ionicons name="mail-outline" size={13} color={colors['muted-foreground']} />
                          <ThemedText style={[ss.cardInfoText, { color: colors['muted-foreground'] }]} numberOfLines={1}>{item.email}</ThemedText>
                        </View>
                      ) : null}
                      {item.phone ? (
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
                      <TouchableOpacity style={ss.cardAction} onPress={() => setViewStaff(item)}>
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

      {/* ── View Detail Sheet ─────────────────────────────────────────────── */}
      <Modal visible={!!viewStaff} animationType="slide" transparent onRequestClose={() => setViewStaff(null)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.sheetContent, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            {viewStaff && (
              <>
                <View style={ss.sheetHeader}>
                  <View style={[ss.avatarLg, { backgroundColor: STAFF_LIGHT }]}>
                    <ThemedText style={[ss.avatarLgText, { color: STAFF_COLOR }]}>{initials(viewStaff.first_name, viewStaff.last_name)}</ThemedText>
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <ThemedText style={ss.sheetName}>{viewStaff.first_name} {viewStaff.last_name ?? ''}</ThemedText>
                    <ThemedText style={[ss.sheetDesig, { color: colors['muted-foreground'] }]}>{desigTitle(viewStaff) || 'No Designation'}</ThemedText>
                  </View>
                  <View style={[ss.statusBadge, viewStaff.is_active ? ss.activeBadge : ss.inactiveBadge]}>
                    <ThemedText style={[ss.statusText, { color: viewStaff.is_active ? '#16a34a' : '#dc2626' }]}>{viewStaff.is_active ? 'Active' : 'Inactive'}</ThemedText>
                  </View>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                  <SheetSection title="Personal Information" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="person-outline" label="Gender" value={viewStaff.gender} />
                    <DetailRow icon="calendar-outline" label="Date of Birth" value={toDisplay(viewStaff.date_of_birth ?? '')} />
                    <DetailRow icon="call-outline" label="Phone" value={viewStaff.phone} />
                    <DetailRow icon="mail-outline" label="Email" value={viewStaff.email} />
                    <DetailRow icon="location-outline" label="Address" value={viewStaff.address} />
                  </View>
                  <SheetSection title="Employment Details" />
                  <View style={ss.detailGroup}>
                    <DetailRow icon="id-card-outline" label="Employee ID" value={viewStaff.employee_id} />
                    <DetailRow icon="business-outline" label="Department" value={viewStaff.department} />
                    <DetailRow icon="calendar-outline" label="Joining Date" value={toDisplay(viewStaff.joining_date)} />
                    <DetailRow icon="school-outline" label="Qualification" value={viewStaff.qualification} />
                    <DetailRow icon="time-outline" label="Experience" value={viewStaff.experience_years ? `${viewStaff.experience_years} year(s)` : undefined} />
                  </View>
                  {viewStaff.work_org ? (
                    <>
                      <SheetSection title="Work Experience" />
                      <View style={ss.detailGroup}>
                        <View style={[ss.expCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                          <ThemedText style={ss.expTitle}>{viewStaff.work_org}</ThemedText>
                          {viewStaff.subjects_dealt ? <ThemedText style={[ss.expRole, { color: STAFF_COLOR }]}>{viewStaff.subjects_dealt}</ThemedText> : null}
                          {(viewStaff.work_from_date || viewStaff.work_to_date) ? (
                            <ThemedText style={[ss.expDates, { color: colors['muted-foreground'] }]}>
                              {viewStaff.work_from_date || ''}
                              {viewStaff.work_to_date ? ` → ${viewStaff.work_to_date}` : ''}
                            </ThemedText>
                          ) : null}
                          {viewStaff.work_remarks ? <ThemedText style={[ss.expDates, { color: colors['muted-foreground'] }]}>{viewStaff.work_remarks}</ThemedText> : null}
                        </View>
                      </View>
                    </>
                  ) : null}
                  {viewStaff.qualifications?.length ? (
                    <>
                      <SheetSection title="Qualifications" />
                      <View style={ss.detailGroup}>
                        {viewStaff.qualifications.map((q: any, i: number) => (
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
                  {(viewStaff.bank_name || viewStaff.account_number || viewStaff.ifsc_code) ? (
                    <>
                      <SheetSection title="Bank Details" />
                      <View style={ss.detailGroup}>
                        <DetailRow icon="business-outline" label="Bank Name" value={viewStaff.bank_name} />
                        <DetailRow icon="card-outline" label="Account Number" value={viewStaff.account_number} />
                        <DetailRow icon="barcode-outline" label="IFSC Code" value={viewStaff.ifsc_code ?? viewStaff.bank_ifsc_code} />
                      </View>
                    </>
                  ) : null}
                  {(viewStaff.current_salary || viewStaff.pf_account_number) ? (
                    <>
                      <SheetSection title="Salary & PF" />
                      <View style={ss.detailGroup}>
                        <DetailRow icon="cash-outline" label="Current Salary" value={viewStaff.current_salary ? `₹${viewStaff.current_salary}` : undefined} />
                        <DetailRow icon="cash-outline" label="Last Drawn Salary" value={viewStaff.last_drawn_salary ? `₹${viewStaff.last_drawn_salary}` : undefined} />
                        <DetailRow icon="document-text-outline" label="PF Account" value={viewStaff.pf_account_number} />
                        <DetailRow icon="document-text-outline" label="UAN Number" value={viewStaff.uan_number} />
                      </View>
                    </>
                  ) : null}
                  <View style={{ height: 32 }} />
                </ScrollView>
                <View style={[ss.sheetFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity style={[ss.sheetCloseBtn, { backgroundColor: STAFF_COLOR }]} onPress={() => setViewStaff(null)}>
                    <ThemedText style={ss.sheetCloseBtnText}>Close</ThemedText>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
              <TouchableOpacity onPress={() => setIsFormVisible(false)}>
                <Ionicons name="close" size={24} color={colors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={ss.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── Basic Information ─────────────────────────────────────── */}
              <FormSec title="Basic Information" />
              <View style={ss.row}>
                <FInput label="First Name *" placeholder="Enter first name" value={formData.first_name} onChangeText={(v) => setField('first_name', v)} colors={colors} half />
                <FInput label="Last Name" placeholder="Enter last name" value={formData.last_name ?? ''} onChangeText={(v) => setField('last_name', v)} colors={colors} half />
              </View>
              <View style={ss.row}>
                <FInput label="Email" placeholder="Enter email address" value={formData.email ?? ''} onChangeText={(v) => setField('email', v)} keyboardType="email-address" autoCapitalize="none" colors={colors} half />
                <FInput label="Phone" placeholder="Enter phone number" value={formData.phone ?? ''} onChangeText={(v) => setField('phone', v)} keyboardType="phone-pad" colors={colors} half />
              </View>
              <View style={ss.row}>
                <PickerField label="Gender" display={formData.gender ?? ''} placeholder="Select gender" onPress={() => setIsGenderPicker(true)} colors={colors} half />
                <DateField label="Date of Birth" displayValue={dateDisplay.date_of_birth} onCalPress={() => setActiveDateField('date_of_birth')}
                  onTextChange={(t) => { const fmt = autoDate(t); setDateDisplay((p) => ({ ...p, date_of_birth: fmt })); const parsed = parseDMY(fmt); if (parsed) setField('date_of_birth', parsed); }}
                  colors={colors} half />
              </View>
              <View style={ss.row}>
                <DateField label="Joining Date *" displayValue={dateDisplay.joining_date} onCalPress={() => setActiveDateField('joining_date')}
                  onTextChange={(t) => { const fmt = autoDate(t); setDateDisplay((p) => ({ ...p, joining_date: fmt })); const parsed = parseDMY(fmt); if (parsed) setField('joining_date', parsed); }}
                  colors={colors} half />
                <FInput label="Qualification" placeholder="e.g. B.Ed, M.Sc" value={formData.qualification ?? ''} onChangeText={(v) => setField('qualification', v)} colors={colors} half />
              </View>
              <FInput label="Experience (Years)" placeholder="0" value={formData.experience_years !== undefined ? String(formData.experience_years) : ''} onChangeText={(v) => setField('experience_years', v ? Number(v) : 0)} keyboardType="numeric" colors={colors} />
              <FInput label="Address" placeholder="Enter residential address" value={formData.address ?? ''} onChangeText={(v) => setField('address', v)} multiline colors={colors} />

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
                    <TouchableOpacity onPress={() => setQuals((p) => p.filter((_, j) => j !== i))}><Ionicons name="trash-outline" size={16} color="#EF4444" /></TouchableOpacity>
                  </View>
                  <View style={ss.row}>
                    <View style={ss.halfField}>
                      <FL label="Degree *" />
                      <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="Degree / Certificate" placeholderTextColor={colors['muted-foreground']} value={q.degree_name} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, degree_name: v } : e))} />
                    </View>
                    <View style={ss.halfField}>
                      <FL label="Institution" />
                      <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="University / College" placeholderTextColor={colors['muted-foreground']} value={q.institution} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, institution: v } : e))} />
                    </View>
                  </View>
                  <View style={ss.row}>
                    <View style={ss.halfField}>
                      <FL label="Year of Passing" />
                      <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="e.g. 2015" placeholderTextColor={colors['muted-foreground']} keyboardType="numeric" value={q.year_of_passing ? String(q.year_of_passing) : ''} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, year_of_passing: v ? Number(v) : undefined } : e))} />
                    </View>
                    <View style={ss.halfField}>
                      <FL label="Grade / Result" />
                      <TextInput style={[ss.fi, { color: colors['card-foreground'], borderColor: colors.border, backgroundColor: colors.background }]} placeholder="e.g. First Class" placeholderTextColor={colors['muted-foreground']} value={q.result ?? ''} onChangeText={(v) => setQuals((p) => p.map((e, j) => j === i ? { ...e, result: v } : e))} />
                    </View>
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
              <FormSec title="Work Experience" icon="briefcase-outline" />
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

              {/* ── Bank Details ───────────────────────────────────────────── */}
              <FormSec title="Bank Details" icon="business-outline" />
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

              {/* ── Salary & PF ────────────────────────────────────────────── */}
              <FormSec title="Salary & PF" icon="card-outline" />
              <View style={ss.row}>
                <FInput label="Last Drawn Salary (₹)" placeholder="e.g. 45000.00" value={formData.last_drawn_salary !== undefined ? String(formData.last_drawn_salary) : ''} onChangeText={(v) => setField('last_drawn_salary', v ? Number(v) : undefined)} keyboardType="numeric" colors={colors} half />
                <FInput label="Current Salary (₹)" placeholder="e.g. 50000.00" value={formData.current_salary !== undefined ? String(formData.current_salary) : ''} onChangeText={(v) => setField('current_salary', v ? Number(v) : undefined)} keyboardType="numeric" colors={colors} half />
              </View>
              <View style={ss.row}>
                <FInput label="PF Account Number" placeholder="e.g. AP/HYD/12345" value={formData.pf_account_number ?? ''} onChangeText={(v) => setField('pf_account_number', v)} colors={colors} half />
                <FInput label="UAN Number" placeholder="12-digit UAN" value={formData.uan_number ?? ''} onChangeText={(v) => setField('uan_number', v)} keyboardType="numeric" colors={colors} half />
              </View>

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
              <TouchableOpacity onPress={() => setIsGenderPicker(false)}><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
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

      {/* ── Account Type Picker ────────────────────────────────────────────── */}
      <Modal visible={isAccTypePicker} animationType="slide" transparent onRequestClose={() => setIsAccTypePicker(false)}>
        <View style={ss.sheetOverlay}>
          <View style={[ss.pickerSheet, { backgroundColor: colors.background }]}>
            <View style={ss.sheetHandle} />
            <View style={[ss.formHeader, { borderBottomColor: colors.border }]}>
              <ThemedText style={ss.formTitle}>Account Type</ThemedText>
              <TouchableOpacity onPress={() => setIsAccTypePicker(false)}><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
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
              <TouchableOpacity onPress={() => setIsDesigPicker(false)}><Ionicons name="close" size={24} color={colors['card-foreground']} /></TouchableOpacity>
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

  // Cards
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginHorizontal: 12, marginBottom: 10, overflow: 'hidden' },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
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
  sheetFooter: { borderTopWidth: 1, padding: 16 },
  sheetCloseBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  sheetCloseBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

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
