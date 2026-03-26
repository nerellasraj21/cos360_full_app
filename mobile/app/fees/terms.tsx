import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
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
import { useState } from 'react';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IOSDatePickerModal } from '@/components/ui';
import {
    Alert,
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

// Column widths
const COL_SNO = 48;
const COL_NAME = 130;
const COL_TERMS = 72;
const COL_STATUS = 80;
const COL_DATES = 150;
const COL_ACTIONS = 80;

export default function FeeTermsScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTerm, setEditingTerm] = useState<FeeTermResponse | null>(null);
  const [formData, setFormData] = useState({
    term_name: '',
    academic_year_id: '',
    number_of_terms: 1,
    term_status: 'active',
    fee_term_dates: [] as { fee_term_date: string }[],
  });

  const [selectedDate, setSelectedDate] = useState('');
  const [dateDisplayValue, setDateDisplayValue] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const queryClient = useQueryClient();
  const { activeAcademicYearId } = useAcademicYear();
  const { showSuccess, showError } = useToastContext();

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
    onError: (error) => {
      showError('Error', 'Failed to delete fee term');
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
    setIsModalVisible(true);
  };

  const handleDelete = (term: FeeTermResponse) => {
    Alert.alert(
      'Delete Fee Term',
      `Are you sure you want to delete "${term.term_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(term.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.term_name.trim()) {
      Alert.alert('Error', 'Term name is required');
      return;
    }
    if (!formData.academic_year_id) {
      Alert.alert('Error', 'Academic year is required');
      return;
    }
    if (formData.number_of_terms < 1) {
      Alert.alert('Error', 'Number of terms must be at least 1');
      return;
    }
    for (let i = 0; i < formData.fee_term_dates.length; i++) {
      if (!formData.fee_term_dates[i].fee_term_date) {
        Alert.alert('Error', `Due date for Term ${i + 1} is required`);
        return;
      }
    }
    if (formData.fee_term_dates.length !== formData.number_of_terms) {
      Alert.alert('Error', 'Number of term dates must equal number of terms');
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

  const getDateRange = (term: FeeTermResponse): string => {
    const dates = term.fee_term_dates
      .map(d => new Date(d.fee_term_date))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (dates.length === 0) return '—';
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const earliest = formatToDisplay(toIso(dates[0]));
    const latest = formatToDisplay(toIso(dates[dates.length - 1]));
    return earliest === latest ? earliest : `${earliest} – ${latest}`;
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
          {/* Toolbar */}
          <View style={styles.toolbar}>
            <ThemedText style={[styles.recordCount, { color: colors['muted-foreground'] }]}>
              {terms.length} record{terms.length !== 1 ? 's' : ''}
            </ThemedText>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <ThemedText style={styles.addButtonText}>Add Term</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          {/* Table */}
          <View style={[styles.tableContainer, { borderColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View>
                {/* Header */}
                <View style={[styles.tableRow, styles.tableHeader, { backgroundColor: colors.primary }]}>
                  <ThemedText style={[styles.headerCell, { width: COL_SNO, color: '#fff' }]}>S.No.</ThemedText>
                  <ThemedText style={[styles.headerCell, { width: COL_NAME, color: '#fff' }]}>Term Name</ThemedText>
                  <ThemedText style={[styles.headerCell, { width: COL_TERMS, color: '#fff' }]}># Terms</ThemedText>
                  <ThemedText style={[styles.headerCell, { width: COL_STATUS, color: '#fff' }]}>Status</ThemedText>
                  <ThemedText style={[styles.headerCell, { width: COL_DATES, color: '#fff' }]}>Date Range</ThemedText>
                  <ThemedText style={[styles.headerCell, { width: COL_ACTIONS, color: '#fff', textAlign: 'center' }]}>Actions</ThemedText>
                </View>
                {/* Rows */}
                {terms.length === 0 ? (
                  <View style={[styles.emptyRow, { width: COL_SNO + COL_NAME + COL_TERMS + COL_STATUS + COL_DATES + COL_ACTIONS }]}>
                    <Ionicons name="calendar-outline" size={32} color={colors['muted-foreground']} />
                    <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                      No fee terms found
                    </ThemedText>
                  </View>
                ) : (
                  terms.map((item, index) => (
                    <View
                      key={item.id}
                      style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? colors.card : colors.background }]}
                    >
                      <ThemedText style={[styles.cell, { width: COL_SNO }]}>{index + 1}</ThemedText>
                      <ThemedText style={[styles.cell, { width: COL_NAME }]} numberOfLines={2}>{item.term_name}</ThemedText>
                      <ThemedText style={[styles.cell, { width: COL_TERMS, textAlign: 'center' }]}>{item.number_of_terms}</ThemedText>
                      <View style={{ width: COL_STATUS, justifyContent: 'center', paddingHorizontal: 4 }}>
                        <View style={[styles.statusBadge, { backgroundColor: item.term_status === 'active' ? '#16a34a20' : '#dc262620' }]}>
                          <ThemedText style={[styles.statusText, { color: item.term_status === 'active' ? '#16a34a' : '#dc2626' }]}>
                            {item.term_status === 'active' ? 'Active' : 'Inactive'}
                          </ThemedText>
                        </View>
                      </View>
                      <ThemedText style={[styles.cell, { width: COL_DATES, fontSize: 12 }]}>{getDateRange(item)}</ThemedText>
                      <View style={[styles.actionsCell, { width: COL_ACTIONS }]}>
                        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
                          <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: colors.primary }]}
                            onPress={() => handleEdit(item)}
                          >
                            <Ionicons name="pencil" size={14} color="#fff" />
                          </TouchableOpacity>
                        </UpdatePermissionGuard>
                        <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
                          <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: colors.destructive }]}
                            onPress={() => handleDelete(item)}
                          >
                            <Ionicons name="trash" size={14} color="#fff" />
                          </TouchableOpacity>
                        </DeletePermissionGuard>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
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
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.form}>
                  <ThemedText style={styles.label}>Term Name *</ThemedText>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.border,
                    }]}
                    value={formData.term_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, term_name: text }))}
                    placeholder="Enter term name"
                    placeholderTextColor={colors['muted-foreground']}
                  />

                  <View style={styles.row}>
                    <View style={styles.numberInputContainer}>
                      <ThemedText style={styles.label}>Number of Terms *</ThemedText>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: colors.background,
                          color: colors.foreground,
                          borderColor: colors.border,
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
                    </View>
                    <View style={styles.switchContainer}>
                      <ThemedText style={styles.label}>Active</ThemedText>
                      <Switch
                        value={formData.term_status === 'active'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, term_status: value ? 'active' : 'inactive' }))}
                      />
                    </View>
                  </View>

                  <ThemedText style={styles.label}>Add Term Date</ThemedText>
                  <View style={styles.row}>
                    <View style={[styles.dateInput, {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }]}>
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
                      <TouchableOpacity onPress={() => setShowPicker(true)} style={{ paddingLeft: 8 }}>
                        <Ionicons name="calendar-outline" size={18} color={colors['muted-foreground']} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[styles.addDateButton, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        if (selectedDate && formData.fee_term_dates.length < formData.number_of_terms) {
                          setFormData(prev => ({
                            ...prev,
                            fee_term_dates: [...prev.fee_term_dates, { fee_term_date: selectedDate }]
                          }));
                          setSelectedDate('');
                          setDateDisplayValue('');
                        }
                      }}
                      disabled={!selectedDate || formData.fee_term_dates.length >= formData.number_of_terms}
                    >
                      <ThemedText style={styles.addDateButtonText}>Add</ThemedText>
                    </TouchableOpacity>
                  </View>

                  <ThemedText style={[styles.label, { marginTop: 12 }]}>
                    Term Dates ({formData.fee_term_dates.length}/{formData.number_of_terms})
                  </ThemedText>
                  {formData.fee_term_dates.map((item, index) => (
                    <View key={index} style={[styles.dateItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <ThemedText style={{ color: colors.foreground, flex: 1 }}>
                        Term {index + 1}: {formatToDisplay(item.fee_term_date) || item.fee_term_date}
                      </ThemedText>
                      <TouchableOpacity
                        style={[styles.removeButton, { backgroundColor: colors.destructive }]}
                        onPress={() => {
                          setFormData(prev => ({
                            ...prev,
                            fee_term_dates: prev.fee_term_dates.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <Ionicons name="trash" size={14} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordCount: {
    fontSize: 13,
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
  // ── Table ────────────────────────────────────────────────────────────────
  tableContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  tableHeader: {
    minHeight: 44,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 10,
    letterSpacing: 0.3,
  },
  cell: {
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
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
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 12,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
