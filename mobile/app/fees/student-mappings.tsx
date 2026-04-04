import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import CustomDropdown from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { FeeStudentMappingResponse, FeeStudentMappingRequest, FeeStudentMappingBulkRequest, FeeStudentMappingBulkResponse } from '@/src/types/fees';
import { feeStudentMappingsApi, feeTypesApi } from '@/src/api/fees';
import { academicYearsApi, classSectionsApi } from '@/src/api/masters';
import { studentAdmissionsApi } from '@/src/api/students';
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
import React, { useState, useEffect } from 'react';
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';


export default function FeeStudentMappingsScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FeeStudentMappingResponse | null>(null);
  const [selectedMappings, setSelectedMappings] = useState<string[]>([]);
  const [detailMapping, setDetailMapping] = useState<FeeStudentMappingResponse | null>(null);
  const { activeAcademicYearId } = useAcademicYear();
  const [formData, setFormData] = useState({
    student_id: '',
    student_admission_num: '',
    class_id: '',
    section_id: '',
    fee_type_id: '',
    total_fee: 0,
    academic_year_id: activeAcademicYearId || '',
  });

  const [bulkFormData, setBulkFormData] = useState({
    student_ids: [] as string[],
    class_id: '',
    section_id: '',
    fee_type_id: '',
    total_fee: 0,
    academic_year_id: activeAcademicYearId || '',
  });

  const [filters, setFilters] = useState({
    student_id: '',
    class_id: '',
    section_id: '',
    fee_type_id: '',
    academic_year_id: '',
  });

  // Update form data when active academic year changes
  useEffect(() => {
    if (activeAcademicYearId) {
      setFormData(prev => ({ ...prev, academic_year_id: activeAcademicYearId }));
      setBulkFormData(prev => ({ ...prev, academic_year_id: activeAcademicYearId }));
    }
  }, [activeAcademicYearId]);

  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[theme];
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm: confirmModal, modalProps } = useConfirmModal();

  const { data: mappings = [], isLoading, error } = useQuery({
    queryKey: ['feeStudentMappings', filters],
    queryFn: () => feeStudentMappingsApi.getFeeStudentMappings(filters),
  });

  const { data: types = [] } = useQuery({
    queryKey: ['feeTypes'],
    queryFn: () => feeTypesApi.getFeeTypes(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-dropdown'],
    queryFn: () => studentAdmissionsApi.studentsDropdown({ active_only: true }),
  });

  const { data: classSections = [] } = useQuery({
    queryKey: ['class-sections'],
    queryFn: () => classSectionsApi.getClassSections(),
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years-dropdown'],
    queryFn: () => academicYearsApi.getAcademicYearsDropdown(),
  });

  const { data: detailData } = useQuery({
    queryKey: ['feeStudentMapping', detailMapping?.id],
    queryFn: () => detailMapping ? feeStudentMappingsApi.getFeeStudentMapping(detailMapping.id) : null,
    enabled: !!detailMapping,
  });

  const createMutation = useMutation({
    mutationFn: (data: FeeStudentMappingRequest) => feeStudentMappingsApi.createFeeStudentMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeStudentMappings'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Mapping Created', 'Fee student mapping created successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to create fee student mapping');
      console.error('Create error:', error);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (data: FeeStudentMappingBulkRequest) => feeStudentMappingsApi.bulkCreateFeeStudentMappings(data),
    onSuccess: (result: FeeStudentMappingBulkResponse) => {
      queryClient.invalidateQueries({ queryKey: ['feeStudentMappings'] });
      setIsBulkModalVisible(false);
      resetBulkForm();

      const message = `Bulk mappings created successfully. ${result.success_count}/${result.total_count} mappings created.`;
      if (result.errors && result.errors.length > 0) {
        showError('Partial Success', `${message} Errors: ${result.errors.join(', ')}`);
      } else {
        showSuccess('Bulk Mappings Created', message);
      }
    },
    onError: (error) => {
      showError('Error', 'Failed to create bulk mappings');
      console.error('Bulk create error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FeeStudentMappingRequest> }) =>
      feeStudentMappingsApi.updateFeeStudentMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeStudentMappings'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Mapping Updated', 'Fee student mapping updated successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to update fee student mapping');
      console.error('Update error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feeStudentMappingsApi.deleteFeeStudentMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeStudentMappings'] });
      showSuccess('Mapping Deleted', 'Fee student mapping deleted successfully');
    },
    onError: (error) => {
      showError('Error', 'Failed to delete fee student mapping');
      console.error('Delete error:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: '',
      student_admission_num: '',
      class_id: '',
      section_id: '',
      fee_type_id: '',
      total_fee: 0,
      academic_year_id: activeAcademicYearId || '',
    });
    setEditingMapping(null);
  };

  const resetBulkForm = () => {
    setBulkFormData({
      student_ids: [],
      class_id: '',
      section_id: '',
      fee_type_id: '',
      total_fee: 0,
      academic_year_id: activeAcademicYearId || '',
    });
  };

  const handleCreate = () => {
    setEditingMapping(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleBulkCreate = () => {
    resetBulkForm();
    setIsBulkModalVisible(true);
  };

  const handleEdit = (mapping: FeeStudentMappingResponse) => {
    // Calculate total fee from terms
    const parsedTotalFee = mapping.total_fee ? parseFloat(mapping.total_fee) : NaN;
    const totalFee = !isNaN(parsedTotalFee) ? parsedTotalFee : mapping.student_fee_mapping_terms.reduce((sum, term) => sum + term.amount, 0);

    let studentId = '';
    let studentAdmissionNum = '';
    let classId = '';
    let sectionId = '';

    if (mapping.student_details) {
      // Use student_details as before
      studentId = mapping.student_details.id;
      studentAdmissionNum = mapping.student_details.admission_num;

      // Find class and section IDs from names
      const classItem = classSections.find(cls => cls.name === mapping.student_details.class_name);
      classId = classItem?.id || '';
      const sectionItem = classItem ? classItem.sections.find(sec => sec.name === mapping.student_details.section_name) : null;
      sectionId = sectionItem?.id || '';
    } else {
      // Perform lookups using mapping IDs
      studentId = (mapping as any).student_id;
      const studentLookup = students.find(s => s.id === (mapping as any).student_id);
      studentAdmissionNum = studentLookup?.admission_number || '';

      classId = (mapping as any).class_id;
      sectionId = (mapping as any).section_id;
    }

    // Find fee type ID from name
    const feeType = types.find(t => t.type_name === mapping.fee_type_name);

    setEditingMapping(mapping);
    setFormData({
      student_id: studentId,
      student_admission_num: studentAdmissionNum,
      class_id: classId,
      section_id: sectionId,
      fee_type_id: feeType?.id || '',
      total_fee: totalFee,
      academic_year_id: activeAcademicYearId || '',
    });
    setIsModalVisible(true);
  };

  const handleDelete = (mapping: FeeStudentMappingResponse) => {
    console.log('Delete button pressed for mapping:', mapping.id);
    const studentName = mapping.student_details?.name || `Student ${mapping.student_details?.admission_num || 'Unknown'}`;

    confirmModal({
      title: 'Delete Fee Student Mapping',
      message: `Are you sure you want to delete the mapping for ${studentName}?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        console.log('Delete confirmed for mapping:', mapping.id);
        deleteMutation.mutate(mapping.id);
      },
    });
  };

  const handleSubmit = () => {
    if (!formData.student_id) {
      showError('Error', 'Student is required');
      return;
    }
    if (!formData.student_admission_num) {
      showError('Error', 'Student admission number is required');
      return;
    }
    if (!formData.class_id) {
      showError('Error', 'Class is required');
      return;
    }
    if (!formData.section_id) {
      showError('Error', 'Section is required');
      return;
    }
    if (!formData.fee_type_id) {
      showError('Error', 'Fee type is required');
      return;
    }
    if (!formData.total_fee || formData.total_fee <= 0) {
      showError('Error', 'Total fee must be greater than 0');
      return;
    }

    const submitData: FeeStudentMappingRequest = {
      student_id: formData.student_id,
      student_admission_num: formData.student_admission_num,
      class_id: formData.class_id,
      section_id: formData.section_id,
      fee_type_id: formData.fee_type_id,
      total_fee: formData.total_fee,
      academic_year_id: formData.academic_year_id,
    };

    if (editingMapping) {
      updateMutation.mutate({
        id: editingMapping.id,
        data: submitData,
      });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleBulkSubmit = () => {
    if (bulkFormData.student_ids.length === 0) {
      showError('Error', 'At least one student must be selected');
      return;
    }
    if (!bulkFormData.class_id) {
      showError('Error', 'Class is required');
      return;
    }
    if (!bulkFormData.section_id) {
      showError('Error', 'Section is required');
      return;
    }
    if (!bulkFormData.fee_type_id) {
      showError('Error', 'Fee type is required');
      return;
    }
    if (!bulkFormData.total_fee || bulkFormData.total_fee <= 0) {
      showError('Error', 'Total fee must be greater than 0');
      return;
    }

    const submitData: FeeStudentMappingBulkRequest = {
      student_ids: bulkFormData.student_ids,
      class_id: bulkFormData.class_id,
      section_id: bulkFormData.section_id,
      fee_type_id: bulkFormData.fee_type_id,
      total_fee: bulkFormData.total_fee,
      academic_year_id: bulkFormData.academic_year_id,
    };

    bulkCreateMutation.mutate(submitData);
  };

  const toggleSelection = (id: string) => {
    setSelectedMappings(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const renderMappingItem = ({ item }: { item: FeeStudentMappingResponse }) => {
    const parsedTotalFee = item.total_fee ? parseFloat(item.total_fee) : NaN;
    const totalFee = !isNaN(parsedTotalFee) ? parsedTotalFee : item.student_fee_mapping_terms.reduce((sum, term) => sum + term.amount, 0);

    // Primary admission number from item
    const admissionNum = (item as any).student_admission_num || item.student_details?.admission_num || 'Unknown';

    // Look up student details from fetched data
    const studentLookup = students.find(s => s.id === (item as any).student_id);
    const studentName = studentLookup?.display_name || item.student_details?.name || `Student ${admissionNum}`;

    // Look up class and section details
    const classLookup = classSections.find(c => c.id === (item as any).class_id);
    const sectionLookup = classLookup?.sections.find(s => s.id === (item as any).section_id);
    const className = classLookup?.name || item.student_details?.class_name || 'Unknown Class';
    const sectionName = sectionLookup?.name || item.student_details?.section_name || 'Unknown Section';

    // Look up fee type name with fallback to item field
    const feeTypeLookup = types.find(t => t.id === (item as any).fee_type_id);
    const feeTypeName = feeTypeLookup?.type_name || item.fee_type_name || 'Unknown Fee Type';

    // Look up academic year name with fallback to item field
    const academicYearLookup = academicYears.find(y => y.id === (item as any).academic_year_id);
    const academicYearName = academicYearLookup?.title || item.academic_year_name || 'Unknown Academic Year';

    return (
      <TouchableOpacity
        style={[styles.mappingCard, { backgroundColor: colors.card }]}
        onPress={() => toggleSelection(item.id)}
      >
        <View style={styles.selectionIndicator}>
          <Ionicons
            name={selectedMappings.includes(item.id) ? "checkbox" : "square-outline"}
            size={20}
            color={selectedMappings.includes(item.id) ? colors.primary : colors['muted-foreground']}
          />
        </View>

        <View style={styles.mappingInfo}>
          <ThemedText type="subtitle" style={styles.mappingTitle}>
            {studentName}
          </ThemedText>
          <ThemedText style={[styles.mappingDetails, { color: colors['muted-foreground'] }]}>
            Admission: {admissionNum}
          </ThemedText>
          <ThemedText style={[styles.mappingDetails, { color: colors['muted-foreground'] }]}>
            Class: {className} - {sectionName}
          </ThemedText>
          <ThemedText style={[styles.mappingDetails, { color: colors['muted-foreground'] }]}>
            Fee: {feeTypeName}
          </ThemedText>
          <ThemedText style={[styles.mappingDetails, { color: colors['muted-foreground'] }]}>
            Academic Year: {academicYearName}
          </ThemedText>
          <ThemedText style={[styles.mappingDetails, { color: colors['muted-foreground'] }]}>
            Total Fee: ₹{totalFee}
          </ThemedText>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.secondary }]}
            onPress={() => {
              setDetailMapping(item);
              setIsDetailModalVisible(true);
            }}
          >
            <Ionicons name="eye" size={16} color={colors.primary} />
          </TouchableOpacity>

          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>

          <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.destructive }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </TouchableOpacity>
    );
  };

  const studentOptions = students.map(student => ({
    label: `${student.display_name} (${student.admission_number})`,
    value: student.id,
  }));

  const classOptions = classSections.map(cls => ({
    label: cls.name,
    value: cls.id,
  }));

  // Get sections for the selected class only
  const getFilteredSectionOptions = (classId: string) => {
    const selectedClass = classSections.find(cls => cls.id === classId);
    return selectedClass ? selectedClass.sections.map(section => ({
      label: section.name,
      value: section.id,
    })) : [];
  };

  const sectionOptions = formData.class_id ? getFilteredSectionOptions(formData.class_id) : [];
  const bulkSectionOptions = bulkFormData.class_id ? getFilteredSectionOptions(bulkFormData.class_id) : [];

  // For filters, show all sections with class names for clarity
  const allSectionOptions = classSections.flatMap(cls =>
    cls.sections.map(section => ({
      label: `${cls.name} - ${section.name}`,
      value: section.id,
    }))
  );

  const typeOptions = types.map(type => ({
    label: type.type_name,
    value: type.id,
  }));


  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Loading fee student mappings...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={{ color: colors.destructive }}>
          Error loading fee student mappings
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS}>
      <AppLayout title="Student Mappings">
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerButtons}>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS}>
              <TouchableOpacity
                style={[styles.bulkButton, { backgroundColor: colors.secondary }]}
                onPress={handleBulkCreate}
              >
                <Ionicons name="add-circle" size={16} color={colors.primary} />
                <ThemedText style={[styles.bulkButtonText, { color: colors.primary }]}>
                  Bulk Add
                </ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>

            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>
        </View>

        {/* Filters */}
        <View style={[styles.filtersContainer, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.filtersTitle}>Filters</ThemedText>
          <View style={styles.filtersRow}>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Student</ThemedText>
              <CustomDropdown
                data={[{ label: 'All Students', value: '' }, ...studentOptions]}
                value={filters.student_id}
                onChange={(value) => setFilters(prev => ({ ...prev, student_id: value as string }))}
                placeholder="All students"
              />
            </View>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Class</ThemedText>
              <CustomDropdown
                data={[{ label: 'All Classes', value: '' }, ...classOptions]}
                value={filters.class_id}
                onChange={(value) => setFilters(prev => ({ ...prev, class_id: value as string }))}
                placeholder="All classes"
              />
            </View>
          </View>
          <View style={styles.filtersRow}>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Fee Type</ThemedText>
              <CustomDropdown
                data={[{ label: 'All Fee Types', value: '' }, ...typeOptions]}
                value={filters.fee_type_id}
                onChange={(value) => setFilters(prev => ({ ...prev, fee_type_id: value as string }))}
                placeholder="All fee types"
              />
            </View>
            <View style={styles.filterItem}>
              <TouchableOpacity
                style={[styles.clearFiltersButton, { backgroundColor: colors.secondary }]}
                onPress={() => setFilters({
                  student_id: '',
                  class_id: '',
                  section_id: '',
                  fee_type_id: '',
                  academic_year_id: '',
                })}
              >
                <ThemedText style={[styles.clearFiltersText, { color: colors.primary }]}>Clear Filters</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {selectedMappings.length > 0 && (
          <View style={[styles.selectionBar, { backgroundColor: colors.accent }]}>
            <ThemedText style={styles.selectionText}>
              {selectedMappings.length} selected
            </ThemedText>
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.destructive }]}
              onPress={() => setSelectedMappings([])}
            >
              <ThemedText style={styles.clearButtonText}>Clear</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={mappings}
          keyExtractor={(item) => item.id}
          renderItem={renderMappingItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No fee student mappings found
              </ThemedText>
            </ThemedView>
          }
        />

        {/* Single Mapping Modal */}
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
                  {editingMapping ? 'Edit Student Mapping' : 'Add Student Mapping'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll}>
                <View style={styles.form}>
                  <ThemedText style={styles.label}>Student *</ThemedText>
                  <CustomDropdown
                    data={studentOptions}
                    value={formData.student_id}
                    onChange={(value) => {
                      const selectedStudent = students.find(s => s.id === value);
                      setFormData(prev => ({
                        ...prev,
                        student_id: value as string,
                        student_admission_num: selectedStudent?.admission_number || '',
                      }));
                    }}
                    placeholder="Select student"
                  />

                  <ThemedText style={styles.label}>Class *</ThemedText>
                  <CustomDropdown
                    data={classOptions}
                    value={formData.class_id}
                    onChange={(value) => setFormData(prev => ({
                      ...prev,
                      class_id: value as string,
                      section_id: '' // Reset section when class changes
                    }))}
                    placeholder="Select class"
                  />

                  <ThemedText style={styles.label}>Section *</ThemedText>
                  <CustomDropdown
                    data={sectionOptions}
                    value={formData.section_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, section_id: value as string }))}
                    placeholder={formData.class_id ? "Select section" : "Select class first"}
                    disabled={!formData.class_id}
                  />

                  <ThemedText style={styles.label}>Fee Type *</ThemedText>
                  <CustomDropdown
                    data={typeOptions}
                    value={formData.fee_type_id}
                    onChange={(value) => setFormData(prev => ({ ...prev, fee_type_id: value as string }))}
                    placeholder="Select fee type"
                  />

                  <ThemedText style={styles.label}>Total Fee *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    value={formData.total_fee.toString()}
                    onChangeText={(value) => setFormData(prev => ({ ...prev, total_fee: parseFloat(value) || 0 }))}
                    placeholder="Enter total fee"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="numeric"
                  />
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
                      editingMapping ? 'Update' : 'Create'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>

        {/* Bulk Mapping Modal */}
        <Modal
          visible={isBulkModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsBulkModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Bulk Add Student Mappings</ThemedText>
                <TouchableOpacity onPress={() => setIsBulkModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll}>
                <View style={styles.form}>
                  <ThemedText style={styles.label}>Students *</ThemedText>
                  <CustomDropdown
                    data={studentOptions}
                    value={null}
                    onChange={(value) => {
                      if (value && !bulkFormData.student_ids.includes(value as string)) {
                        setBulkFormData(prev => ({
                          ...prev,
                          student_ids: [...prev.student_ids, value as string]
                        }));
                      }
                    }}
                    placeholder="Select students"
                    multiSelect={true}
                  />

                  {bulkFormData.student_ids.length > 0 && (
                    <View style={styles.selectedStudents}>
                      <ThemedText style={styles.selectedLabel}>Selected Students ({bulkFormData.student_ids.length}):</ThemedText>
                      {bulkFormData.student_ids.map(id => {
                        const studentOption = studentOptions.find(s => s.value === id);
                        return (
                          <View key={id} style={styles.selectedStudentChip}>
                            <ThemedText style={styles.chipText}>{studentOption?.label}</ThemedText>
                            <TouchableOpacity
                              onPress={() => setBulkFormData(prev => ({
                                ...prev,
                                student_ids: prev.student_ids.filter(sid => sid !== id)
                              }))}
                            >
                              <Ionicons name="close" size={16} color={colors.destructive} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <ThemedText style={styles.label}>Class *</ThemedText>
                  <CustomDropdown
                    data={classOptions}
                    value={bulkFormData.class_id}
                    onChange={(value) => setBulkFormData(prev => ({
                      ...prev,
                      class_id: value as string,
                      section_id: '' // Reset section when class changes
                    }))}
                    placeholder="Select class"
                  />

                  <ThemedText style={styles.label}>Section *</ThemedText>
                  <CustomDropdown
                    data={bulkSectionOptions}
                    value={bulkFormData.section_id}
                    onChange={(value) => setBulkFormData(prev => ({ ...prev, section_id: value as string }))}
                    placeholder={bulkFormData.class_id ? "Select section" : "Select class first"}
                    disabled={!bulkFormData.class_id}
                  />

                  <ThemedText style={styles.label}>Fee Type *</ThemedText>
                  <CustomDropdown
                    data={typeOptions}
                    value={bulkFormData.fee_type_id}
                    onChange={(value) => setBulkFormData(prev => ({ ...prev, fee_type_id: value as string }))}
                    placeholder="Select fee type"
                  />

                  <ThemedText style={styles.label}>Total Fee *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                    value={bulkFormData.total_fee.toString()}
                    onChangeText={(value) => setBulkFormData(prev => ({ ...prev, total_fee: parseFloat(value) || 0 }))}
                    placeholder="Enter total fee"
                    placeholderTextColor={colors['muted-foreground']}
                    keyboardType="numeric"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsBulkModalVisible(false)}
                >
                  <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleBulkSubmit}
                  disabled={bulkCreateMutation.isPending}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {bulkCreateMutation.isPending ? 'Creating...' : 'Create Bulk Mappings'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>

        {/* Detail Modal */}
        <Modal
          visible={isDetailModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsDetailModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Student Mapping Details</ThemedText>
                <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll}>
                {detailData && (
                  <View style={styles.form}>
                    <ThemedText style={styles.detailLabel}>Student Name:</ThemedText>
                    <ThemedText style={styles.detailValue}>{detailData.student_details?.name || 'Unknown Student'}</ThemedText>

                    <ThemedText style={styles.detailLabel}>Admission Number:</ThemedText>
                    <ThemedText style={styles.detailValue}>{detailData.student_details?.admission_num || 'N/A'}</ThemedText>

                    <ThemedText style={styles.detailLabel}>Class:</ThemedText>
                    <ThemedText style={styles.detailValue}>{detailData.student_details?.class_name || 'Unknown Class'} - {detailData.student_details?.section_name || 'Unknown Section'}</ThemedText>

                    <ThemedText style={styles.detailLabel}>Fee Type:</ThemedText>
                    <ThemedText style={styles.detailValue}>{detailData.fee_type_name || 'Unknown Fee Type'}</ThemedText>

                    <ThemedText style={styles.detailLabel}>Academic Year:</ThemedText>
                    <ThemedText style={styles.detailValue}>{detailData.academic_year_name || 'Unknown Academic Year'}</ThemedText>

                    {(() => {
                      const detailTotalFee = detailData.total_fee && !isNaN(parseFloat(detailData.total_fee)) ? parseFloat(detailData.total_fee) : detailData.student_fee_mapping_terms.reduce((sum, term) => sum + term.amount, 0);
                      return (
                        <>
                          <ThemedText style={styles.detailLabel}>Total Fee:</ThemedText>
                          <ThemedText style={styles.detailValue}>₹{detailTotalFee}</ThemedText>
                        </>
                      );
                    })()}

                    <ThemedText style={styles.detailLabel}>Fee Terms:</ThemedText>
                    {detailData.student_fee_mapping_terms.map((term, index) => (
                      <View key={index} style={styles.termItem}>
                        <ThemedText style={styles.termText}>
                          Term {index + 1}: ₹{term.amount}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => setIsDetailModalVisible(false)}
                >
                  <ThemedText style={{ color: colors.foreground }}>Close</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </Modal>
      </ThemedView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectionText: {
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  mappingCard: {
    flexDirection: 'row',
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
  selectionIndicator: {
    marginRight: 12,
  },
  mappingInfo: {
    flex: 1,
  },
  mappingTitle: {
    marginBottom: 4,
  },
  mappingDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  mappingDate: {
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
  formScroll: {
    maxHeight: 400,
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
  selectedStudents: {
    marginBottom: 16,
  },
  selectedLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  selectedStudentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  chipText: {
    marginRight: 8,
    fontSize: 14,
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
  filtersContainer: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
    minWidth: 120,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 12,
  },
  detailValue: {
    fontSize: 16,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  termItem: {
    marginBottom: 4,
    paddingLeft: 16,
  },
  termText: {
    fontSize: 14,
  },
});