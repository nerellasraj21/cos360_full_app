import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FeeTermResponse, FeeTermRequest, feeTermsApi } from '@/src/api/fees';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard,
  DeletePermissionGuard
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IOSDatePickerModal } from '@/components/ui';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const formatToDisplay = (iso: string): string => {
  if (!iso || !iso.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Matches web: "Jul 31" */
const formatMonthDay = (value: string): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${MONTH_LABELS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
};

/** Matches web: "Jul 31, 2026" */
const formatLongDate = (value: string): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${MONTH_LABELS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
};

const parseDdMmYyyy = (display: string): string | null => {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const iso = `${yyyy}-${mm}-${dd}`;
  const date = new Date(iso + 'T00:00:00');
  if (isNaN(date.getTime())) return null;
  return iso;
};

const autoFormatDateInput = (text: string): string => {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};


// Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee module,
// even via a deep link into a specific fee sub-screen.
export default function FeeTermsScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const isFeeBlocked = roleBlocksFees(role?.name);

  useEffect(() => {
    if (isFeeBlocked) router.replace('/(tabs)');
  }, [isFeeBlocked, router]);

  if (isFeeBlocked) return null;

  return <FeeTermsScreenContent />;
}

function FeeTermsScreenContent() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTerm, setEditingTerm] = useState<FeeTermResponse | null>(null);
  const [formData, setFormData] = useState({
    term_name: '',
    academic_year_id: '',
    number_of_terms: 1,
    term_status: 'active',
    fee_term_dates: [] as { fee_term_date: string }[],
  });

  const [viewingDatesTerm, setViewingDatesTerm] = useState<FeeTermResponse | null>(null);

  const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [dateDisplayValue, setDateDisplayValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const queryClient = useQueryClient();
  const { activeAcademicYearId, activeAcademicYear } = useAcademicYear();
  const { showSuccess, showError } = useToastContext();
  const { confirm: confirmModal, modalProps } = useConfirmModal();

  const { data: terms = [], isLoading, error } = useQuery({
    queryKey: ['feeTerms', activeAcademicYearId],
    queryFn: () => feeTermsApi.getFeeTerms(activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined),
  });

  const createMutation = useMutation({
    mutationFn: feeTermsApi.createFeeTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Term Created', 'Fee term created successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to create fee term');
      console.error('Create error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeTermRequest> }) =>
      feeTermsApi.updateFeeTerm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Term Updated', 'Fee term updated successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to update fee term');
      console.error('Update error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: feeTermsApi.deleteFeeTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      showSuccess('Term Deleted', 'Fee term deleted successfully');
    },
    onError: (error: any) => {
      showError('Delete Failed', error?.message || 'Cannot delete this term — it may be linked to active fee types');
      console.error('Delete error:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      term_name: '',
      academic_year_id: activeAcademicYearId || '',
      number_of_terms: 1,
      term_status: 'active',
      fee_term_dates: [],
    });
    setSelectedDate('');
    setDateDisplayValue('');
    setShowPicker(false);
    setEditingDateIndex(null);
    setEditingTerm(null);
  };

  const handleCreate = () => {
    setEditingTerm(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (term: FeeTermResponse) => {
    setEditingTerm(term);
    setFormData({
      term_name: term.term_name,
      academic_year_id: activeAcademicYearId || '',
      number_of_terms: term.number_of_terms,
      term_status: term.term_status,
      fee_term_dates: term.fee_term_dates?.map(td => ({ fee_term_date: td.fee_term_date })) || [],
    });
    setSelectedDate('');
    setDateDisplayValue('');
    setShowPicker(false);
    setEditingDateIndex(null);
    setIsModalVisible(true);
  };

  const handleDelete = (term: FeeTermResponse) => {
    confirmModal({
      title: 'Delete Fee Term',
      message: `Are you sure you want to delete "${term.term_name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(term.id),
    });
  };

  const handleSubmit = () => {
    if (!formData.term_name.trim()) {
      showError('Error', 'Term name is required');
      return;
    }
    if (!formData.academic_year_id) {
      showError('Error', 'Academic year is required');
      return;
    }
    if (formData.number_of_terms < 1) {
      showError('Error', 'Number of terms must be at least 1');
      return;
    }
    for (let i = 0; i < formData.fee_term_dates.length; i++) {
      if (!formData.fee_term_dates[i].fee_term_date) {
        showError('Error', `Due date for Term ${i + 1} is required`);
        return;
      }
    }
    if (formData.fee_term_dates.length !== formData.number_of_terms) {
      showError('Error', 'Number of term dates must equal number of terms');
      return;
    }

    const submitData = {
      term_name: formData.term_name,
      number_of_terms: formData.number_of_terms,
      term_status: formData.term_status,
      academic_year_id: formData.academic_year_id,
      fee_term_dates: formData.fee_term_dates,
    };

    if (editingTerm) {
      updateMutation.mutate({ id: editingTerm.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // ── Payment date editing (mirrors web FeeTermForm) ────────────────────────
  const addTermDate = () => {
    if (!selectedDate) return;
    setFormData(prev => ({
      ...prev,
      fee_term_dates: [...prev.fee_term_dates, { fee_term_date: selectedDate }],
    }));
    setSelectedDate('');
    setDateDisplayValue('');
  };

  const startEditDate = (index: number) => {
    const iso = formData.fee_term_dates[index]?.fee_term_date || '';
    setEditingDateIndex(index);
    setSelectedDate(iso);
    setDateDisplayValue(formatToDisplay(iso));
  };

  const cancelEditDate = () => {
    setEditingDateIndex(null);
    setSelectedDate('');
    setDateDisplayValue('');
  };

  const saveEditDate = () => {
    if (editingDateIndex === null || !selectedDate) return;
    setFormData(prev => ({
      ...prev,
      fee_term_dates: prev.fee_term_dates.map((d, i) =>
        i === editingDateIndex ? { fee_term_date: selectedDate } : d
      ),
    }));
    cancelEditDate();
  };

  const deleteTermDate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fee_term_dates: prev.fee_term_dates.filter((_, i) => i !== index),
    }));
    if (editingDateIndex !== null) cancelEditDate();
  };

  /** Mirrors web getPaymentDatesSummary in FeeTermsList.tsx */
  const getPaymentSummary = (term: FeeTermResponse): { text: string; status: 'success' | 'warning' | 'error' } => {
    const dates = term.fee_term_dates || [];

    if (dates.length === 0) {
      return { text: 'No payment dates', status: 'error' };
    }

    if (dates.length !== term.number_of_terms) {
      return { text: `${dates.length}/${term.number_of_terms} dates configured`, status: 'warning' };
    }

    const sorted = [...dates].sort(
      (a, b) => new Date(a.fee_term_date).getTime() - new Date(b.fee_term_date).getTime()
    );
    const first = formatMonthDay(sorted[0].fee_term_date);
    const last = formatMonthDay(sorted[sorted.length - 1].fee_term_date);

    return { text: `${first} - ${last} (${dates.length} dates)`, status: 'success' };
  };

  if (isLoading) {
    return (
      <AppLayout title="Fee Terms">
        <View style={styles.centerContainer}>
          <ThemedText>Loading fee terms...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Terms">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>Error loading fee terms</ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
      <AppLayout title="Fee Terms">
        <ThemedView style={styles.container}>
          {/* Academic Year Info */}
          {activeAcademicYear && (
            <View style={[styles.yearCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.yearTitle}>Academic Year: {activeAcademicYear.title}</ThemedText>
                <ThemedText style={[styles.yearDates, { color: colors['muted-foreground'] }]}>
                  {new Date(activeAcademicYear.start_date).toLocaleDateString()} - {new Date(activeAcademicYear.end_date).toLocaleDateString()}
                </ThemedText>
              </View>
              {activeAcademicYear.is_active && (
                <View style={[styles.activeBadge, { backgroundColor: colors.accent }]}>
                  <ThemedText style={[styles.activeBadgeText, { color: colors['accent-foreground'] }]}>Active Year</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.listSectionTitle}>Fee Terms & Payment Schedules</ThemedText>
              <ThemedText style={[styles.recordCount, { color: colors['muted-foreground'] }]}>
                {terms.length} record{terms.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <ThemedText style={styles.addButtonText}>Add Fee Term</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* Cards */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
            {terms.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
                <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No fee terms found</ThemedText>
              </View>
            ) : (
              terms.map((item) => (
                <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.cardAccent, { backgroundColor: colors.primary }]} />
                  <View style={{ flex: 1, padding: 12 }}>
                    <View style={styles.cardTop}>
                      <ThemedText style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.term_name}</ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: item.term_status === 'active' ? '#16a34a20' : '#dc262620' }]}>
                        <ThemedText style={[styles.statusText, { color: item.term_status === 'active' ? '#16a34a' : '#dc2626' }]}>
                          {item.term_status === 'active' ? 'Active' : 'Inactive'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.cardMeta}>
                      <Ionicons name="layers-outline" size={13} color={colors['muted-foreground']} />
                      <ThemedText style={[styles.cardMetaText, { color: colors['muted-foreground'] }]}>
                        {item.number_of_terms} term{item.number_of_terms !== 1 ? 's' : ''}
                      </ThemedText>
                      {(() => {
                        const summary = getPaymentSummary(item);
                        const summaryColor =
                          summary.status === 'error' ? colors.destructive
                            : summary.status === 'warning' ? '#D97706'
                              : colors['muted-foreground'];
                        return (
                          <>
                            <Ionicons name="calendar-outline" size={13} color={summaryColor} />
                            <ThemedText style={[styles.cardMetaText, { color: summaryColor }]}>{summary.text}</ThemedText>
                            {summary.status !== 'success' ? (
                              <Ionicons name="warning-outline" size={13} color="#EAB308" />
                            ) : null}
                          </>
                        );
                      })()}
                    </View>
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                      <TouchableOpacity style={styles.cardAction} onPress={() => setViewingDatesTerm(item)}>
                        <Ionicons name="calendar-outline" size={15} color={colors.primary} />
                        <ThemedText style={[styles.cardActionText, { color: colors.primary }]}>Payment Dates</ThemedText>
                      </TouchableOpacity>
                      <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
                        <TouchableOpacity style={styles.cardAction} onPress={() => handleEdit(item)}>
                          <Ionicons name="pencil" size={15} color={colors.primary} />
                          <ThemedText style={[styles.cardActionText, { color: colors.primary }]}>Edit</ThemedText>
                        </TouchableOpacity>
                      </UpdatePermissionGuard>
                      <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
                        <TouchableOpacity style={styles.cardAction} onPress={() => handleDelete(item)}>
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          <ThemedText style={[styles.cardActionText, { color: '#EF4444' }]}>Delete</ThemedText>
                        </TouchableOpacity>
                      </DeletePermissionGuard>
                    </View>
                  </View>
                </View>
              ))
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </ThemedView>

        {/* Create / Edit Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">
                  {editingTerm ? 'Edit Fee Term' : 'Add Fee Term'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                  <ThemedText style={styles.label}>Term Name</ThemedText>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.border,
                    }]}
                    value={formData.term_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, term_name: text }))}
                    placeholder="e.g., Quarterly, Monthly, Annual"
                    placeholderTextColor={colors['muted-foreground']}
                  />

                  <ThemedText style={styles.label}>Number of Terms</ThemedText>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.border,
                      marginBottom: 6,
                    }]}
                    value={formData.number_of_terms.toString()}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 1;
                      setFormData(prev => ({ ...prev, number_of_terms: num }));
                    }}
                    placeholder="Enter number of terms"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="numeric"
                  />
                  <ThemedText style={[styles.helperText, { color: colors['muted-foreground'] }]}>
                    This determines how many payment dates will be required for this term.
                  </ThemedText>

                  <View style={styles.switchRow}>
                    <Switch
                      value={formData.term_status === 'active'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, term_status: value ? 'active' : 'inactive' }))}
                    />
                    <ThemedText style={[styles.label, { marginBottom: 0 }]}>Active</ThemedText>
                  </View>

                  {/* Payment Dates (mirrors web FeeTermForm card) */}
                  <View style={[styles.tableCard, { borderColor: colors.border }]}>
                    <ThemedText style={[styles.tableCardTitle, { color: colors.foreground }]}>
                      Payment Dates
                    </ThemedText>

                    <View style={styles.dateEntryRow}>
                      <View style={[styles.dateInput, {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }]}>
                        {Platform.OS === 'web' ? (
                          // Expo Web: raw HTML date input — opens the browser's native calendar
                          // @ts-ignore
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e: any) => {
                              const val: string = e.target.value; // YYYY-MM-DD
                              setSelectedDate(val);
                              setDateDisplayValue(val ? formatToDisplay(val) : '');
                            }}
                            style={{
                              flex: 1,
                              fontSize: 15,
                              border: 'none',
                              background: 'transparent',
                              color: colors.foreground,
                              outline: 'none',
                              cursor: 'pointer',
                              minHeight: 40,
                              width: '100%',
                            } as any}
                          />
                        ) : (
                          <>
                            <TextInput
                              style={{ color: colors.foreground, flex: 1, fontSize: 16 }}
                              placeholder="DD/MM/YYYY"
                              placeholderTextColor={colors['muted-foreground']}
                              value={dateDisplayValue}
                              onChangeText={(text) => {
                                const formatted = autoFormatDateInput(text);
                                setDateDisplayValue(formatted);
                                const parsed = parseDdMmYyyy(formatted);
                                if (parsed) setSelectedDate(parsed);
                                else if (!text) setSelectedDate('');
                              }}
                              keyboardType="numeric"
                              maxLength={10}
                            />
                            <TouchableOpacity onPress={() => setShowPicker(true)} style={{ paddingLeft: 8 }}
                              accessibilityLabel="Select date">
                              <Ionicons name="calendar-outline" size={18} color={colors['muted-foreground']} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>

                      {editingDateIndex !== null ? (
                        <>
                          <TouchableOpacity
                            style={[styles.addDateButton, { backgroundColor: colors.primary, opacity: !selectedDate ? 0.5 : 1 }]}
                            onPress={saveEditDate}
                            disabled={!selectedDate}
                          >
                            <ThemedText style={styles.addDateButtonText}>Save</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.outlineButton, { borderColor: colors.border }]}
                            onPress={cancelEditDate}
                          >
                            <ThemedText style={[styles.outlineButtonText, { color: colors.foreground }]}>Cancel</ThemedText>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          style={[styles.addDateButton, { backgroundColor: colors.primary, opacity: !selectedDate ? 0.5 : 1 }]}
                          onPress={addTermDate}
                          disabled={!selectedDate}
                        >
                          <Ionicons name="add" size={16} color="#fff" />
                          <ThemedText style={styles.addDateButtonText}>Add Date</ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>

                    {formData.fee_term_dates.length === 0 ? (
                      <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'], paddingVertical: 16 }]}>
                        No payment dates added yet. Add dates above.
                      </ThemedText>
                    ) : (
                      <>
                        <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
                          <ThemedText style={[styles.tableHeaderText, styles.colInstallment, { color: colors['muted-foreground'] }]}>
                            Installment
                          </ThemedText>
                          <ThemedText style={[styles.tableHeaderText, styles.colDueDate, { color: colors['muted-foreground'] }]}>
                            Due Date
                          </ThemedText>
                          <ThemedText style={[styles.tableHeaderText, styles.colActions, { color: colors['muted-foreground'] }]}>
                            Actions
                          </ThemedText>
                        </View>

                        {formData.fee_term_dates.map((item, index) => (
                          <View key={index} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                            <View style={styles.colInstallment}>
                              <View style={[styles.outlineBadge, { borderColor: colors.border }]}>
                                <ThemedText style={[styles.outlineBadgeText, { color: colors.foreground }]}>
                                  Installment {index + 1}
                                </ThemedText>
                              </View>
                            </View>
                            <ThemedText style={[styles.tableCellText, styles.colDueDate, { color: colors.foreground }]}>
                              {formatLongDate(item.fee_term_date) || item.fee_term_date}
                            </ThemedText>
                            <View style={[styles.colActions, styles.rowActions]}>
                              <TouchableOpacity
                                style={[styles.iconButton, {
                                  borderColor: colors.border,
                                  opacity: editingDateIndex !== null ? 0.5 : 1,
                                }]}
                                onPress={() => startEditDate(index)}
                                disabled={editingDateIndex !== null}
                                accessibilityLabel="Edit date"
                              >
                                <Ionicons name="pencil" size={14} color={colors.primary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.iconButton, { borderColor: colors.border }]}
                                onPress={() => deleteTermDate(index)}
                                accessibilityLabel="Delete date"
                              >
                                <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
                     editingTerm ? 'Update Term' : 'Create Term'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>

        {/* Payment Dates viewer (mirrors web PaymentDateManager) */}
        <Modal
          visible={!!viewingDatesTerm}
          animationType="slide"
          transparent
          onRequestClose={() => setViewingDatesTerm(null)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={{ flex: 1, marginRight: 8 }} numberOfLines={2}>
                  Manage Payment Dates - {viewingDatesTerm?.term_name}
                </ThemedText>
                <TouchableOpacity onPress={() => setViewingDatesTerm(null)} accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              {viewingDatesTerm ? (() => {
                const dates = [...(viewingDatesTerm.fee_term_dates || [])].sort(
                  (a, b) => new Date(a.fee_term_date).getTime() - new Date(b.fee_term_date).getTime()
                );
                const isComplete = dates.length === viewingDatesTerm.number_of_terms;

                return (
                  <>
                    <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                      {/* Heading + configured badge */}
                      <View style={styles.scheduleHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <ThemedText style={[styles.sectionTitle, { color: colors.foreground }]}>
                            Payment Schedule Configuration
                          </ThemedText>
                          <ThemedText style={[styles.sectionSubtitle, { color: colors['muted-foreground'] }]}>
                            Payment dates for {'"'}{viewingDatesTerm.term_name}{'"'}
                          </ThemedText>
                        </View>
                        <View style={styles.scheduleBadgeRow}>
                          <View style={[styles.solidBadge, { backgroundColor: isComplete ? colors.primary : colors.border }]}>
                            <ThemedText style={[styles.solidBadgeText, { color: isComplete ? '#fff' : colors.foreground }]}>
                              {dates.length}/{viewingDatesTerm.number_of_terms} configured
                            </ThemedText>
                          </View>
                          {!isComplete ? <Ionicons name="warning-outline" size={14} color="#EAB308" /> : null}
                        </View>
                      </View>

                      {/* Info alert */}
                      <View style={[styles.alertBox, { borderColor: colors.border }]}>
                        <Ionicons name="information-circle-outline" size={16} color={colors['muted-foreground']} />
                        <ThemedText style={[styles.alertText, { color: colors['muted-foreground'] }]}>
                          Payment dates are configured when creating or editing the fee term. Use the {'"Edit"'} button in
                          the fee terms list to modify dates.
                        </ThemedText>
                      </View>

                      {/* Incomplete-schedule alert */}
                      {!isComplete ? (
                        <View style={[styles.alertBox, { borderColor: colors.border }]}>
                          <Ionicons name="warning-outline" size={16} color="#EAB308" />
                          <ThemedText style={[styles.alertText, { color: colors['muted-foreground'] }]}>
                            This term requires {viewingDatesTerm.number_of_terms} payment dates but only has {dates.length} configured.
                          </ThemedText>
                        </View>
                      ) : null}

                      {/* Configured dates table */}
                      <View style={[styles.tableCard, { borderColor: colors.border }]}>
                        <ThemedText style={[styles.tableCardTitle, { color: colors.foreground }]}>
                          Configured Payment Dates
                        </ThemedText>

                        {dates.length === 0 ? (
                          <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'], paddingVertical: 24 }]}>
                            No payment dates configured yet.
                          </ThemedText>
                        ) : (
                          <>
                            <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
                              <ThemedText style={[styles.tableHeaderText, styles.colInstallment, { color: colors['muted-foreground'] }]}>
                                Installment
                              </ThemedText>
                              <ThemedText style={[styles.tableHeaderText, styles.colDueDate, { color: colors['muted-foreground'] }]}>
                                Due Date
                              </ThemedText>
                              <ThemedText style={[styles.tableHeaderText, styles.colStatus, { color: colors['muted-foreground'] }]}>
                                Status
                              </ThemedText>
                            </View>

                            {dates.map((d, index) => (
                              <View
                                key={d.id ?? `${d.fee_term_date}-${index}`}
                                style={[styles.tableRow, { borderBottomColor: colors.border }]}
                              >
                                <View style={styles.colInstallment}>
                                  <View style={[styles.outlineBadge, { borderColor: colors.border }]}>
                                    <ThemedText style={[styles.outlineBadgeText, { color: colors.foreground }]}>
                                      Installment {index + 1}
                                    </ThemedText>
                                  </View>
                                </View>
                                <ThemedText style={[styles.tableCellText, styles.colDueDate, { color: colors.foreground }]}>
                                  {formatLongDate(d.fee_term_date)}
                                </ThemedText>
                                <View style={styles.colStatus}>
                                  <View style={[styles.solidBadge, { backgroundColor: colors.primary }]}>
                                    <ThemedText style={[styles.solidBadgeText, { color: '#fff' }]}>Configured</ThemedText>
                                  </View>
                                </View>
                              </View>
                            ))}
                          </>
                        )}
                      </View>
                    </ScrollView>

                    <View style={styles.scheduleFooter}>
                      <TouchableOpacity
                        style={[styles.closeButton, { backgroundColor: colors.primary }]}
                        onPress={() => setViewingDatesTerm(null)}
                      >
                        <ThemedText style={styles.submitButtonText}>Close</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                );
              })() : null}
            </ThemedView>
          </View>
        </Modal>

        {showPicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowPicker(false);
              if (event.type === 'set' && date) {
                const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                setSelectedDate(iso);
                setDateDisplayValue(formatToDisplay(iso));
              }
            }}
          />
        )}
        <IOSDatePickerModal
          visible={showPicker && Platform.OS === 'ios'}
          value={selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()}
          mode="date"
          onChange={(date) => {
            const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            setSelectedDate(iso);
            setDateDisplayValue(formatToDisplay(iso));
          }}
          onDismiss={() => setShowPicker(false)}
        />
        <ConfirmModal {...modalProps} />
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  yearTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  yearDates: {
    fontSize: 12,
    marginTop: 2,
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  recordCount: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // ── Cards ────────────────────────────────────────────────────────────────
  listContent: { padding: 12 },
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  cardMetaText: { fontSize: 12 },
  cardFooter: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, marginTop: 4, flexWrap: 'wrap' },
  helperText: { fontSize: 11, lineHeight: 16, marginBottom: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dateEntryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  outlineButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  outlineButtonText: { fontSize: 14, fontWeight: '600' },
  rowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  iconButton: { borderWidth: 1, borderRadius: 6, padding: 6 },
  colActions: { flex: 0.9, alignItems: 'flex-end' },
  // -- Payment dates viewer -------------------------------------------------
  scheduleHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  scheduleBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  alertBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  alertText: { flex: 1, fontSize: 12, lineHeight: 17 },
  tableCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  tableCardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  tableHeaderRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingBottom: 8 },
  tableHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 10 },
  tableCellText: { fontSize: 13 },
  colInstallment: { flex: 1.2 },
  colDueDate: { flex: 1.1 },
  colStatus: { flex: 0.9, alignItems: 'flex-start' },
  outlineBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  outlineBadgeText: { fontSize: 11, fontWeight: '600' },
  solidBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  solidBadgeText: { fontSize: 11, fontWeight: '700' },
  scheduleFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12 },
  closeButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  // ── Modal form ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    maxWidth: 420,
    borderRadius: 14,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formScroll: {
    maxHeight: 420,
    marginBottom: 8,
  },
  form: {
    marginBottom: 4,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberInputContainer: {
    flex: 1,
  },
  switchContainer: {
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  addDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addDateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  removeButton: {
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
