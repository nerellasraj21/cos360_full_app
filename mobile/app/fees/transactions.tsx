import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear, useAuth } from '@/contexts';
import { FeeTransactionResponse, FeeTransactionCreateRequest, FeeTransactionItemRequest, feeTransactionsApi, feeReceiptsApi, feeTypesApi, feeTermsApi } from '@/src/api/fees';
import { legacyStaffApi } from '@/src/api/staff';
import { studentAdmissionsApi } from '@/src/api/students';
import { 
  ReadOrListPermissionGuard, 
  CreatePermissionGuard, 
  UpdatePermissionGuard 
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { Staff } from '@/src/types/masters/staff';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';

export default function FeeTransactionsScreen() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FeeTransactionResponse | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    student_id: '',
    student_admission_num: '',
    academic_year_id: '',
    total_amount: 0,
    payment_method: 'cash' as 'cash' | 'bank_transfer' | 'cheque' | 'online',
    transaction_date: new Date().toISOString().split('T')[0],
    remarks: '',
    collected_by: '',
    upi_reference: '',
    cheque_number: '',
    bank_reference: '',
    transaction_items: [] as FeeTransactionItemRequest[],
  });

  const [filters, setFilters] = useState({
    student_id: '',
  });

  const [outstandingFeesModal, setOutstandingFeesModal] = useState({
    visible: false,
    studentId: '',
    studentName: '',
  });

  const { colors } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Queries
  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['feeTransactions', activeAcademicYearId],
    queryFn: () => feeTransactionsApi.getFeeTransactions(activeAcademicYearId || undefined),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['studentsDropdown'],
    queryFn: () => studentAdmissionsApi.studentsDropdown({ active_only: true }),
  });

  // const { data: academicYears = [] } = useQuery({
  //   queryKey: ['academicYearsDropdown'],
  //   queryFn: academicYearsApi.getAcademicYearsDropdown,
  // });

  const { data: feeTerms = [] } = useQuery({
    queryKey: ['feeTerms', activeAcademicYearId],
    queryFn: () => feeTermsApi.getFeeTerms(activeAcademicYearId || undefined),
  });


  const { data: feeTypes = [] } = useQuery({
    queryKey: ['feeTypes', activeAcademicYearId],
    queryFn: () => feeTypesApi.getFeeTypes(),
  });


  const { data: staff = [] } = useQuery({
    queryKey: ['staffDropdown'],
    queryFn: () => legacyStaffApi.getStaff(),
  });

  // Outstanding fees query
  const { data: outstandingFees = [] } = useQuery({
    queryKey: ['outstandingFees', outstandingFeesModal.studentId],
    queryFn: () => outstandingFeesModal.studentId ? feeTransactionsApi.getStudentOutstandingFees(outstandingFeesModal.studentId) : Promise.resolve([]),
    enabled: outstandingFeesModal.visible && !!outstandingFeesModal.studentId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: feeTransactionsApi.createFeeTransaction,
    onMutate: () => {
      console.log('createMutation onMutate: starting mutation');
    },
    onSuccess: () => {
      console.log('createMutation onSuccess: transaction created');
      queryClient.invalidateQueries({ queryKey: ['feeTransactions'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Fee transaction created successfully');
    },
    onError: (error) => {
      console.log('createMutation onError:', error);
      showError('Failed to create fee transaction', error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeTransactionCreateRequest> }) =>
      feeTransactionsApi.updateFeeTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTransactions'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Fee transaction updated successfully');
    },
    onError: (error) => {
      showError('Failed to update fee transaction', error.message);
    },
  });

  const generateReceiptMutation = useMutation({
    mutationFn: feeReceiptsApi.generateFeeReceipt,
    onSuccess: () => {
      showSuccess('Receipt generated successfully');
    },
    onError: (error) => {
      showError('Failed to generate receipt', error.message);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = () => {
    setFormData({
      student_id: '',
      student_admission_num: '',
      academic_year_id: '',
      total_amount: 0,
      payment_method: 'cash',
      transaction_date: new Date().toISOString().split('T')[0],
      remarks: '',
      collected_by: '',
      upi_reference: '',
      cheque_number: '',
      bank_reference: '',
      transaction_items: [],
    });
    setEditingTransaction(null);
    setCurrentStep(1);
  };

  const handleCreate = () => {
    setEditingTransaction(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (transaction: FeeTransactionResponse) => {
    setEditingTransaction(transaction);
    setFormData({
      student_id: transaction.student_id,
      student_admission_num: transaction.student_admission_num,
      academic_year_id: transaction.academic_year_id,
      total_amount: transaction.total_amount,
      payment_method: transaction.payment_method as any,
      transaction_date: transaction.transaction_date || new Date().toISOString().split('T')[0],
      remarks: transaction.remarks || '',
      collected_by: transaction.collected_by || '',
      upi_reference: transaction.upi_reference || '',
      cheque_number: transaction.cheque_number || '',
      bank_reference: transaction.bank_reference || '',
      transaction_items: (transaction.transaction_items || []).map(item => ({
        ...item,
        amount_due: item.amount_due || 0,
        amount_paid: item.amount_paid || 0,
      })),
    });
    setIsModalVisible(true);
  };

  // const handleDelete = (transaction: FeeTransactionResponse) => {
  //   Alert.alert(
  //     'Delete Fee Transaction',
  //     `Are you sure you want to delete transaction ${transaction.id}?`,
  //     [
  //       { text: 'Cancel', style: 'cancel' },
  //       {
  //         text: 'Delete',
  //         style: 'destructive',
  //         onPress: () => {
  //           // Note: API doesn't have delete, but keeping for consistency
  //           showError('Delete not implemented in API');
  //         },
  //       },
  //     ]
  //   );
  // };

  const handleSubmit = () => {
    console.log('handleSubmit called with formData:', formData);

    // Validation
    if (!formData.student_id) {
      console.log('Validation failed: student_id is empty');
      Alert.alert('Error', 'Please select a student');
      return;
    }

    if (formData.transaction_items.length === 0) {
      console.log('Validation failed: no transaction items');
      Alert.alert('Error', 'Please add at least one transaction item');
      return;
    }

    // Validate each transaction item
    for (let i = 0; i < formData.transaction_items.length; i++) {
      const item = formData.transaction_items[i];
      if (!item.fee_type_id || !item.fee_term_id || item.amount_paid <= 0) {
        console.log(`Validation failed for item ${i + 1}:`, item);
        Alert.alert('Error', `Please fill all required fields for item ${i + 1}`);
        return;
      }
      if (item.amount_paid > (item.amount_due || 0)) {
        console.log(`Validation failed for item ${i + 1}: amount paid > due`);
        Alert.alert('Error', `Amount paid cannot exceed amount due for item ${i + 1}`);
        return;
      }
    }

    console.log('Validation passed, preparing data');

    const data: FeeTransactionCreateRequest = {
      student_id: formData.student_id,
      student_admission_num: formData.student_admission_num,
      academic_year_id: formData.academic_year_id,
      total_amount: formData.total_amount,
      payment_method: formData.payment_method,
      transaction_items: formData.transaction_items,
      transaction_date: formData.transaction_date || undefined,
      remarks: formData.remarks || undefined,
      collected_by: formData.collected_by || undefined,
      upi_reference: formData.upi_reference || undefined,
      cheque_number: formData.cheque_number || undefined,
      bank_reference: formData.bank_reference || undefined,
    };

    console.log('Data to send:', data);

    if (editingTransaction) {
      console.log('Calling updateMutation');
      updateMutation.mutate({
        id: editingTransaction.id,
        data,
      });
    } else {
      console.log('Calling createMutation');
      createMutation.mutate(data);
    }
  };

  const handleGenerateReceipt = (transactionId: string) => {
    generateReceiptMutation.mutate(transactionId);
  };

  const handleViewOutstandingFees = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setOutstandingFeesModal({
      visible: true,
      studentId,
      studentName: student?.display_name || studentId,
    });
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filters.student_id && transaction.student_id !== filters.student_id) return false;
    return true;
  });

  const renderTransactionItem = ({ item }: { item: FeeTransactionResponse }) => {
    const student = students.find(s => s.id === item.student_id);
    const staffMember = staff.find(s => s.id === item.collected_by);

    return (
      <ThemedView style={[styles.transactionCard, { backgroundColor: colors.card }]}>
        <View style={styles.transactionInfo}>
          <ThemedText type="subtitle" style={styles.transactionId}>
            Transaction #{item.id}
          </ThemedText>
          <ThemedText style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
            Student: {student?.display_name || item.student_id}
          </ThemedText>
          <ThemedText style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
            Total Amount: ₹{item.total_amount ?? 0}
          </ThemedText>
          <ThemedText style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
            Items: {item.transaction_items?.length || 0}
          </ThemedText>
          <ThemedText style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
            Payment Method: {item.payment_method}
          </ThemedText>
          <ThemedText style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
            Date: {item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : 'N/A'}
          </ThemedText>
          {staffMember && (
            <ThemedText style={[styles.transactionDetails, { color: colors['muted-foreground'] }]}>
              Collected By: {staffMember.first_name} {staffMember.last_name}
            </ThemedText>
          )}
        </View>

        <View style={styles.actionButtons}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TRANSACTIONS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => handleViewOutstandingFees(item.student_id)}
          >
            <Ionicons name="cash-outline" size={16} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accent }]}
            onPress={() => handleGenerateReceipt(item.id)}
          >
            <Ionicons name="document" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <AppLayout title="Fee Transactions">
        <View style={styles.centerContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <AppLayout title="Fee Transactions">
        <View style={styles.centerContainer}>
          <ThemedText>Loading fee transactions...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Transactions">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading fee transactions
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['feeTransactions'] })}
          >
            <ThemedText style={{ color: 'white' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_TRANSACTIONS}>
      <AppLayout title="Fee Transactions">
        <View style={styles.container}>
        {/* Filters */}
        <View style={styles.filtersContainer}>
          <CustomDropdown
            data={[{ value: '', label: 'All Students' }, ...students.map(s => ({ value: s.id, label: s.display_name }))]}
            value={filters.student_id}
            onChange={(value) => setFilters(prev => ({ ...prev, student_id: String(value || '') }))}
            placeholder="Filter by Student"
          />
        </View>

        <View style={styles.header}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_TRANSACTIONS}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
            >
              <Ionicons name="add" size={20} color="white" />
              <ThemedText style={styles.addButtonText}>Add Transaction</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransactionItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No fee transactions found
              </ThemedText>
            </ThemedView>
          }
        />

        {/* Multi-Step Modal for Create/Edit */}
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
                  {editingTransaction ? 'Edit Fee Transaction' : 'Add Fee Transaction'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              {/* Step Indicator */}
              <View style={styles.stepIndicator}>
                {[1, 2, 3].map((step) => (
                  <View key={step} style={styles.stepContainer}>
                    <View style={[
                      styles.stepCircle,
                      currentStep >= step && { backgroundColor: colors.primary }
                    ]}>
                      <ThemedText style={[
                        styles.stepText,
                        currentStep >= step && { color: 'white' }
                      ]}>
                        {step}
                      </ThemedText>
                    </View>
                    <ThemedText style={[
                      styles.stepLabel,
                      currentStep >= step && { color: colors.primary }
                    ]}>
                      {step === 1 ? 'Student' : step === 2 ? 'Payment' : 'Items'}
                    </ThemedText>
                  </View>
                ))}
              </View>

              <ScrollView style={styles.form}>
                {currentStep === 1 && (
                  // Step 1: Student Selection
                  <>
                    <ThemedText style={styles.label}>Student *</ThemedText>
                    <CustomDropdown
                      data={students.map(s => ({ value: s.id, label: s.display_name }))}
                      value={formData.student_id}
                      onChange={(value) => {
                        const studentId = String(value || '');
                        const student = students.find(s => s.id === studentId);
                        setFormData(prev => ({
                          ...prev,
                          student_id: studentId,
                          student_admission_num: student?.admission_number || '',
                          academic_year_id: activeAcademicYearId || '',
                          transaction_items: [],
                          total_amount: 0
                        }));
                      }}
                      placeholder="Select Student"
                      disabled={isSubmitting}
                    />

                    <ThemedText style={styles.label}>Admission Number</ThemedText>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.border,
                      }]}
                      value={formData.student_admission_num}
                      editable={false}
                      placeholder="Auto-filled"
                      placeholderTextColor={colors['muted-foreground']}
                    />
                  </>
                )}

                {currentStep === 2 && (
                  // Step 2: Payment Method
                  <>
                    <ThemedText style={styles.label}>Payment Method *</ThemedText>
                    <CustomDropdown
                      data={[
                        { value: 'cash', label: 'Cash' },
                        { value: 'bank_transfer', label: 'Bank Transfer' },
                        { value: 'cheque', label: 'Cheque' },
                        { value: 'online', label: 'Online' },
                      ]}
                      value={formData.payment_method}
                      onChange={(value) => setFormData(prev => ({
                        ...prev,
                        payment_method: (value as 'cash' | 'bank_transfer' | 'cheque' | 'online') || 'cash',
                        // Clear dynamic fields when payment method changes
                        upi_reference: '',
                        cheque_number: '',
                        bank_reference: '',
                      }))}
                      placeholder="Select Payment Method"
                      disabled={isSubmitting}
                    />

                    {formData.payment_method === 'online' && (
                      <>
                        <ThemedText style={styles.label}>UPI Reference</ThemedText>
                        <TextInput
                          style={[styles.input, {
                            backgroundColor: colors.background,
                            color: colors.foreground,
                            borderColor: colors.border,
                          }]}
                          value={formData.upi_reference}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, upi_reference: text }))}
                          placeholder="Enter UPI reference"
                          placeholderTextColor={colors['muted-foreground']}
                          editable={!isSubmitting}
                        />
                      </>
                    )}

                    {formData.payment_method === 'cheque' && (
                      <>
                        <ThemedText style={styles.label}>Cheque Number</ThemedText>
                        <TextInput
                          style={[styles.input, {
                            backgroundColor: colors.background,
                            color: colors.foreground,
                            borderColor: colors.border,
                          }]}
                          value={formData.cheque_number}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, cheque_number: text }))}
                          placeholder="Enter cheque number"
                          placeholderTextColor={colors['muted-foreground']}
                          editable={!isSubmitting}
                        />
                      </>
                    )}

                    {formData.payment_method === 'bank_transfer' && (
                      <>
                        <ThemedText style={styles.label}>Bank Reference</ThemedText>
                        <TextInput
                          style={[styles.input, {
                            backgroundColor: colors.background,
                            color: colors.foreground,
                            borderColor: colors.border,
                          }]}
                          value={formData.bank_reference}
                          onChangeText={(text) => setFormData(prev => ({ ...prev, bank_reference: text }))}
                          placeholder="Enter bank reference"
                          placeholderTextColor={colors['muted-foreground']}
                          editable={!isSubmitting}
                        />
                      </>
                    )}

                    <ThemedText style={styles.label}>Transaction Date *</ThemedText>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.border,
                      }]}
                      value={formData.transaction_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, transaction_date: text }))}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors['muted-foreground']}
                      editable={!isSubmitting}
                    />

                    <ThemedText style={styles.label}>Collected By</ThemedText>
                    <CustomDropdown
                      data={[{ value: '', label: 'Select Staff' }, ...staff.map(s => ({
                        value: s.id,
                        label: `${s.first_name} ${s.last_name || ''}`.trim()
                      }))]}
                      value={formData.collected_by}
                      onChange={(value) => setFormData(prev => ({ ...prev, collected_by: String(value || '') }))}
                      placeholder="Select Staff"
                      disabled={isSubmitting}
                    />
                  </>
                )}

                {currentStep === 3 && (
                  // Step 3: Transaction Items
                  <>
                    <View style={styles.itemsHeader}>
                      <ThemedText style={styles.label}>Transaction Items</ThemedText>
                      <TouchableOpacity
                        style={[styles.addItemButton, { backgroundColor: isSubmitting ? colors['muted-foreground'] : colors.primary }]}
                        onPress={() => {
                          const newItem: FeeTransactionItemRequest = {
                            fee_type_id: '',
                            fee_term_id: '',
                            amount_due: 0,
                            amount_paid: 0,
                            description: '',
                          };
                          setFormData(prev => ({
                            ...prev,
                            transaction_items: [...prev.transaction_items, newItem],
                            total_amount: prev.transaction_items.reduce((sum, item) => sum + (item.amount_paid || 0), 0)
                          }));
                        }}
                        disabled={isSubmitting}
                      >
                        <Ionicons name="add" size={16} color="white" />
                        <ThemedText style={styles.addItemText}>Add Item</ThemedText>
                      </TouchableOpacity>
                    </View>

                    {formData.transaction_items.map((item, index) => (
                      <ThemedView key={index} style={[styles.itemCard, { backgroundColor: colors.background }]}>
                        <View style={styles.itemHeader}>
                          <ThemedText style={styles.itemTitle}>Item {index + 1}</ThemedText>
                          <TouchableOpacity
                            onPress={() => {
                              setFormData(prev => ({
                                ...prev,
                                transaction_items: prev.transaction_items.filter((_, i) => i !== index)
                              }));
                            }}
                            disabled={isSubmitting}
                          >
                            <Ionicons name="trash" size={20} color={isSubmitting ? colors['muted-foreground'] : colors.destructive} />
                          </TouchableOpacity>
                        </View>

                        <CustomDropdown
                          data={feeTypes.map(type => ({ value: type.id, label: type.type_name }))}
                          value={item.fee_type_id}
                          onChange={(value) => {
                            const newItems = [...formData.transaction_items];
                            newItems[index].fee_type_id = String(value || '');
                            newItems[index].fee_term_id = ''; // Reset term when type changes
                            newItems[index].amount_due = 0; // Reset amount due when type changes
                            setFormData(prev => ({
                              ...prev,
                              transaction_items: newItems,
                              total_amount: newItems.reduce((sum, item) => sum + (item.amount_paid || 0), 0)
                            }));
                          }}
                          placeholder="Select Fee Type"
                          disabled={isSubmitting}
                        />

                        <CustomDropdown
                          data={(() => {
                            const selectedFeeType = feeTypes.find(type => type.id === item.fee_type_id);
                            if (!selectedFeeType) return [];
                            const filteredTerms = feeTerms.filter(term => term.id === selectedFeeType.fee_term_id);
                            return filteredTerms.flatMap(term =>
                              term.fee_term_dates?.map(date => ({
                                value: date.id,
                                label: `${term.term_name} - ${new Date(date.fee_term_date).toLocaleDateString()} (₹${date.amount})`
                              })) || []
                            );
                          })()}
                          value={item.fee_term_id}
                          onChange={(value) => {
                            const newItems = [...formData.transaction_items];
                            newItems[index].fee_term_id = String(value || '');
                            // Auto-fill amount_due from selected term date
                            console.log('feeTerms:', feeTerms);
                            const selectedTerm = feeTerms
                              .flatMap(term => term.fee_term_dates || [])
                              .find(date => date.id === String(value || ''));
                            console.log('selectedTerm for value', value, ':', selectedTerm);
                            if (selectedTerm) {
                              newItems[index].amount_due = selectedTerm.amount;
                            } else {
                              console.log('selectedTerm not found, setting amount_due to 0');
                              newItems[index].amount_due = 0;
                            }
                            setFormData(prev => ({
                              ...prev,
                              transaction_items: newItems,
                              total_amount: newItems.reduce((sum, item) => sum + (item.amount_paid || 0), 0)
                            }));
                          }}
                          placeholder="Select Fee Term Date"
                          disabled={isSubmitting}
                        />

                        <View style={styles.amountRow}>
                          <View style={styles.amountField}>
                            <ThemedText style={styles.amountLabel}>Amount Due *</ThemedText>
                            <TextInput
                              style={[styles.input, {
                                backgroundColor: colors.card,
                                color: colors.foreground,
                                borderColor: colors.border,
                              }]}
                              value={(item.amount_due || 0).toString()}
                              onChangeText={(text) => {
                                const newItems = [...formData.transaction_items];
                                newItems[index].amount_due = parseFloat(text) || 0;
                                setFormData(prev => ({ ...prev, transaction_items: newItems }));
                              }}
                              placeholder="0.00"
                              placeholderTextColor={colors['muted-foreground']}
                              keyboardType="numeric"
                              editable={!isSubmitting}
                            />
                          </View>

                          <View style={styles.amountField}>
                            <ThemedText style={styles.amountLabel}>Amount Paid *</ThemedText>
                            <TextInput
                              style={[styles.input, {
                                backgroundColor: colors.card,
                                color: colors.foreground,
                                borderColor: colors.border,
                              }]}
                              value={(item.amount_paid || 0).toString()}
                              onChangeText={(text) => {
                                const newItems = [...formData.transaction_items];
                                newItems[index].amount_paid = parseFloat(text) || 0;
                                setFormData(prev => ({
                                  ...prev,
                                  transaction_items: newItems,
                                  total_amount: newItems.reduce((sum, item) => sum + (item.amount_paid || 0), 0)
                                }));
                              }}
                              placeholder="0.00"
                              placeholderTextColor={colors['muted-foreground']}
                              keyboardType="numeric"
                              editable={!isSubmitting}
                            />
                          </View>
                        </View>

                        <TextInput
                          style={[styles.input, {
                            backgroundColor: colors.card,
                            color: colors.foreground,
                            borderColor: colors.border,
                          }]}
                          value={item.description}
                          onChangeText={(text) => {
                            const newItems = [...formData.transaction_items];
                            newItems[index].description = text;
                            setFormData(prev => ({ ...prev, transaction_items: newItems }));
                          }}
                          placeholder="Description (optional)"
                          placeholderTextColor={colors['muted-foreground']}
                          editable={!isSubmitting}
                        />
                      </ThemedView>
                    ))}

                    {formData.transaction_items.length > 0 && (
                      <View style={styles.totalContainer}>
                        <ThemedText style={styles.totalText}>
                          Total Amount: ₹{formData.transaction_items.reduce((sum, item) => sum + (item.amount_paid || 0), 0).toFixed(2)}
                        </ThemedText>
                      </View>
                    )}

                    <ThemedText style={styles.label}>Remarks</ThemedText>
                    <TextInput
                      style={[styles.input, {
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.border,
                      }]}
                      value={formData.remarks}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, remarks: text }))}
                      placeholder="Enter remarks"
                      placeholderTextColor={colors['muted-foreground']}
                      multiline
                      editable={!isSubmitting}
                    />
                  </>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                </TouchableOpacity>

                {currentStep > 1 && (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => setCurrentStep(prev => prev - 1)}
                    disabled={isSubmitting}
                  >
                    <ThemedText style={{ color: isSubmitting ? colors['muted-foreground'] : colors.foreground }}>Previous</ThemedText>
                  </TouchableOpacity>
                )}

                {currentStep < 3 ? (
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: isSubmitting ? colors['muted-foreground'] : colors.primary }]}
                    onPress={() => {
                      // Basic validation for current step
                      if (currentStep === 1 && !formData.student_id) {
                        Alert.alert('Error', 'Please select a student');
                        return;
                      }
                      if (currentStep === 2 && !formData.transaction_date) {
                        Alert.alert('Error', 'Please enter transaction date');
                        return;
                      }
                      setCurrentStep(prev => prev + 1);
                    }}
                    disabled={isSubmitting}
                  >
                    <ThemedText style={styles.submitButtonText}>Next</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <ThemedText style={styles.submitButtonText}>
                      {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
                        editingTransaction ? 'Update' : 'Create'}
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            </ThemedView>
          </View>
        </Modal>

        {/* Outstanding Fees Modal */}
        <Modal
          visible={outstandingFeesModal.visible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setOutstandingFeesModal(prev => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">
                  Outstanding Fees - {outstandingFeesModal.studentName}
                </ThemedText>
                <TouchableOpacity onPress={() => setOutstandingFeesModal(prev => ({ ...prev, visible: false }))}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.form}>
                {outstandingFees.length > 0 ? (
                  outstandingFees.map((fee, index) => (
                    <ThemedView key={index} style={[styles.outstandingFeeItem, { backgroundColor: colors.background }]}>
                      <ThemedText style={styles.outstandingFeeText}>
                        Total Amount: ₹{fee.total_amount ?? 0}
                      </ThemedText>
                      <ThemedText style={[styles.outstandingFeeText, { color: colors['muted-foreground'] }]}>
                        Date: {fee.transaction_date ? new Date(fee.transaction_date).toLocaleDateString() : 'N/A'}
                      </ThemedText>
                      <ThemedText style={[styles.outstandingFeeText, { color: colors['muted-foreground'] }]}>
                        Items: {fee.transaction_items?.length || 0}
                      </ThemedText>
                      <ThemedText style={[styles.outstandingFeeText, { color: colors['muted-foreground'] }]}>
                        Remarks: {fee.remarks || 'N/A'}
                      </ThemedText>
                    </ThemedView>
                  ))
                ) : (
                  <ThemedText style={[styles.outstandingFeeText, { textAlign: 'center' }]}>
                    No outstanding fees found
                  </ThemedText>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setOutstandingFeesModal(prev => ({ ...prev, visible: false }))}
                >
                  <ThemedText style={{ color: colors.foreground }}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
        </View>
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
  filtersContainer: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  transactionCard: {
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
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    marginBottom: 4,
  },
  transactionDetails: {
    fontSize: 14,
    marginBottom: 2,
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
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
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  itemCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  amountField: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalContainer: {
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0369a1',
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
  secondaryButton: {
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  outstandingFeeItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  outstandingFeeText: {
    fontSize: 14,
    marginBottom: 4,
  },
});