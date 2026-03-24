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
import React, { useState } from 'react';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    Alert,
    FlatList,
    Modal,
    Platform,
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
    queryFn: () => feeTermsApi.getFeeTerms(activeAcademicYearId || undefined),
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
      console.log('Delete mutation success');
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      showSuccess('Term Deleted', 'Fee term deleted successfully');
    },
    onError: (error) => {
      console.log('Delete mutation error:', error);
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
    console.log('handleDelete called with term:', term.id, term.term_name);
    Alert.alert(
      'Delete Fee Term',
      `Are you sure you want to delete "${term.term_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('Delete confirmed, calling mutate with id:', term.id);
            deleteMutation.mutate(term.id);
          },
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

    // Validate fee term dates
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
      updateMutation.mutate({
        id: editingTerm.id,
        data: submitData,
      });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const renderTermItem = ({ item }: { item: FeeTermResponse }) => {
    // Compute date range
    const dates = item.fee_term_dates
      .map(d => new Date(d.fee_term_date))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const earliest = dates.length > 0 ? dates[0].toLocaleDateString() : 'N/A';
    const latest = dates.length > 0 ? dates[dates.length - 1].toLocaleDateString() : 'N/A';
    const dateRange = earliest === latest ? earliest : `${earliest} - ${latest}`;


    return (
      <ThemedView style={[styles.termCard, { backgroundColor: colors.card }]}>
        <View style={styles.termInfo}>
          <ThemedText type="subtitle" style={styles.termName}>
            {item.term_name}
          </ThemedText>
          <ThemedText style={[styles.termDetails, { color: colors['muted-foreground'] }]}>
            Terms: {item.number_of_terms} • Status: {item.term_status === 'active' ? 'Active' : 'Inactive'}
          </ThemedText>
          <ThemedText style={[styles.termDate, { color: colors['muted-foreground'] }]}>
            Dates: {dateRange}
          </ThemedText>
        </View>

        <View style={styles.actionButtons}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>

          <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.destructive }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </ThemedView>
    );
  };


  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Loading fee terms...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={{ color: colors.destructive }}>
          Error loading fee terms
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
      <AppLayout title="Fee Terms">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TERMS}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
            >
              <Ionicons name="add" size={20} color="white" />
              <ThemedText style={styles.addButtonText}>Add Term</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

      <FlatList
        data={terms}
        keyExtractor={(item) => item.id}
        renderItem={renderTermItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <ThemedView style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No fee terms found
            </ThemedText>
          </ThemedView>
        }
      />

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

              <ThemedText style={styles.label}>Term Dates</ThemedText>
              {formData.fee_term_dates.map((item, index) => (
                <View key={index} style={[styles.dateItem, { backgroundColor: colors.background }]}>
                  <ThemedText style={{ color: colors.foreground, flex: 1 }}>
                    {formatToDisplay(item.fee_term_date) || item.fee_term_date}
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
                    <Ionicons name="trash" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {showPicker ? (
              <DateTimePicker
                value={selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  setShowPicker(false);
                  if (event.type === 'set' && date) {
                    const iso = date.toISOString().split('T')[0];
                    setSelectedDate(iso);
                    setDateDisplayValue(formatToDisplay(iso));
                  }
                }}
              />
            ) : null}

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
                  {createMutation.isPending || updateMutation.isPending ? 'Sending...' : 'Send'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
      </ThemedView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  termCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  termInfo: {
    flex: 1,
  },
  termName: {
    marginBottom: 4,
  },
  termDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  termDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
    padding: 8,
    marginBottom: 4,
    borderRadius: 6,
  },
  removeButton: {
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});