import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import CustomDropdown from '@/components/ui/dropdown';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import type {
  FeeStudentMappingResponse,
  FeeStudentMappingCreateRequest as FeeStudentMappingRequest,
  FeeStudentMappingBulkRequest,
  FeeStudentMappingBulkResponse,
} from '@/src/types/fee';
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
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useTheme } from '@/contexts';
import { roleBlocksFees } from '@/src/lib/menuUtils';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';


export function StudentMappingsContent() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
  const [editingMapping, setEditingMapping] = useState<FeeStudentMappingResponse | null>(null);
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

  const [searchQuery, setSearchQuery] = useState('');

  const [filters, setFilters] = useState({
    student_id: '',
    class_id: '',
    section_id: '',
    fee_type_id: '',
    academic_year_id: activeAcademicYearId || '',
  });

  const [sortKey, setSortKey] = useState<'student' | 'class' | 'feeType' | 'totalFee' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  // Update form data when active academic year changes
  useEffect(() => {
    if (activeAcademicYearId) {
      setFormData(prev => ({ ...prev, academic_year_id: activeAcademicYearId }));
      setBulkFormData(prev => ({ ...prev, academic_year_id: activeAcademicYearId }));
      setFilters(prev => ({ ...prev, academic_year_id: activeAcademicYearId }));
    }
  }, [activeAcademicYearId]);

  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm: confirmModal, modalProps } = useConfirmModal();

  const { data: mappingsRaw = [], isLoading, error, refetch, isRefetching } = useQuery({
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


  // ── Shared lookups (used by search, sorting and the card renderer) ───────
  const getAdmissionNum = (item: FeeStudentMappingResponse) =>
    (item as any).student_admission_num || item.student_details?.admission_num || 'Unknown';

  const getStudentName = (item: FeeStudentMappingResponse) => {
    const lookup = students.find(s => s.id === (item as any).student_id);
    return lookup?.display_name || item.student_details?.name || `Student ${getAdmissionNum(item)}`;
  };

  const getClassName = (item: FeeStudentMappingResponse) =>
    classSections.find(c => c.id === (item as any).class_id)?.name
    || item.student_details?.class_name
    || 'Unknown Class';

  const getSectionName = (item: FeeStudentMappingResponse) => {
    const cls = classSections.find(c => c.id === (item as any).class_id);
    return cls?.sections.find(sec => sec.id === (item as any).section_id)?.name
      || item.student_details?.section_name
      || 'Unknown Section';
  };

  const getFeeTypeName = (item: FeeStudentMappingResponse) =>
    types.find(t => t.id === (item as any).fee_type_id)?.type_name
    || item.fee_type_name
    || 'Unknown Fee Type';

  const getAcademicYearName = (item: FeeStudentMappingResponse) =>
    academicYears.find(y => y.id === (item as any).academic_year_id)?.title
    || item.academic_year_name
    || 'Unknown Academic Year';

  const getTotalFee = (item: FeeStudentMappingResponse) => {
    const parsed = item.total_fee ? parseFloat(item.total_fee) : NaN;
    return !isNaN(parsed)
      ? parsed
      : item.student_fee_mapping_terms.reduce((sum, term) => sum + Number(term.amount), 0);
  };

  // ── Search → sort → paginate ─────────────────────────────────────────────
  const mappings = useMemo(() => {
    const list = mappingsRaw as FeeStudentMappingResponse[];
    const searched = !searchQuery.trim() ? list : list.filter((item) => {
      const q = searchQuery.toLowerCase();
      return getAdmissionNum(item).toLowerCase().includes(q)
        || getStudentName(item).toLowerCase().includes(q)
        || getClassName(item).toLowerCase().includes(q)
        || getFeeTypeName(item).toLowerCase().includes(q);
    });

    if (!sortKey) return searched;

    return [...searched].sort((a, b) => {
      if (sortKey === 'totalFee') {
        const diff = getTotalFee(a) - getTotalFee(b);
        return sortDir === 'asc' ? diff : -diff;
      }
      let av = '', bv = '';
      if (sortKey === 'student') { av = getStudentName(a); bv = getStudentName(b); }
      else if (sortKey === 'class') { av = getClassName(a); bv = getClassName(b); }
      else { av = getFeeTypeName(a); bv = getFeeTypeName(b); }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappingsRaw, searchQuery, sortKey, sortDir, students, classSections, types]);

  const totalPages = Math.max(1, Math.ceil(mappings.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMappings = useMemo(
    () => mappings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [mappings, currentPage]
  );

  // Back to page 1 whenever the result set changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters, sortKey, sortDir]);

  const handleSort = (key: 'student' | 'class' | 'feeType' | 'totalFee') => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

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
    const totalFee = !isNaN(parsedTotalFee) ? parsedTotalFee : mapping.student_fee_mapping_terms.reduce((sum, term) => sum + Number(term.amount), 0);

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
    const studentName = mapping.student_details?.name || `Student ${mapping.student_details?.admission_num || 'Unknown'}`;

    confirmModal({
      title: 'Delete Fee Student Mapping',
      message: `Are you sure you want to delete the mapping for ${studentName}?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
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

  const renderMappingItem = ({ item, index }: { item: FeeStudentMappingResponse; index: number }) => {
    const totalFee = getTotalFee(item);
    const studentName = getStudentName(item);
    const className = getClassName(item);
    const sectionName = getSectionName(item);
    const feeTypeName = getFeeTypeName(item);
    const academicYearName = getAcademicYearName(item);
    const serialNo = (currentPage - 1) * PAGE_SIZE + index + 1;

    return (
      <View style={[styles.mappingCard, { backgroundColor: colors.card }]}>
        <View style={[styles.serialBadge, { backgroundColor: colors.secondary }]}>
          <ThemedText style={[styles.serialText, { color: colors.primary }]}>{serialNo}</ThemedText>
        </View>

        <View style={styles.mappingInfo}>
          <ThemedText type="subtitle" style={styles.mappingTitle}>
            {studentName}
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
            Total Fee: ₹{Number(totalFee).toLocaleString('en-IN')}
          </ThemedText>
        </View>

        <View style={styles.actionButtons}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="pencil" size={16} color="white" />
            </TouchableOpacity>
          </UpdatePermissionGuard>

          <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.destructive }]}
              onPress={() => handleDelete(item)}
              accessibilityLabel="Delete"
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </View>
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

  // For filters: sections of the chosen class, else every section labelled with its class
  const allSectionOptions = classSections.flatMap(cls =>
    cls.sections.map(section => ({
      label: `${cls.name} - ${section.name}`,
      value: section.id,
    }))
  );

  const filterSectionOptions = filters.class_id
    ? getFilteredSectionOptions(filters.class_id)
    : allSectionOptions;

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

  // Filters scroll with the list so the rows are never pushed off screen
  const listHeader = (
    <View>
        <View style={styles.header}>
          <View style={styles.headerButtons}>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS} fallback={null} loadingFallback={null}>
              <TouchableOpacity
                style={[styles.bulkButton, { backgroundColor: colors.secondary }]}
                onPress={handleBulkCreate}
              >
                <Ionicons name="add-circle" size={16} color={colors.primary} />
                <ThemedText style={[styles.bulkButtonText, { color: colors.primary }]}>
                  Bulk Create
                </ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>

            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS} fallback={null} loadingFallback={null}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
                accessibilityLabel="Create Mapping"
              >
                <Ionicons name="add" size={16} color="white" />
                <ThemedText style={styles.addButtonText}>
                  Create Mapping
                </ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>
        </View>

        {/* Filters */}
        <View style={[styles.filtersContainer, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.filtersTitle}>Filters</ThemedText>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={15} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search by student, class or fee type..."
              placeholderTextColor={colors['muted-foreground']}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
                <Ionicons name="close-circle" size={15} color={colors['muted-foreground']} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.filtersRow}>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Student</ThemedText>
              <CustomDropdown
                data={[{ label: 'All Students', value: '' }, ...studentOptions]}
                value={filters.student_id}
                onChange={(value) => setFilters(prev => ({ ...prev, student_id: value as string }))}
                placeholder="All students"
                containerStyle={styles.compactDropdownContainer}
                style={styles.compactDropdown}
                placeholderStyle={styles.compactDropdownText}
                selectedTextStyle={styles.compactDropdownText}
              />
            </View>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Class</ThemedText>
              <CustomDropdown
                data={[{ label: 'All Classes', value: '' }, ...classOptions]}
                value={filters.class_id}
                onChange={(value) => setFilters(prev => ({
                  ...prev,
                  class_id: value as string,
                  section_id: '', // the section list depends on the class
                }))}
                placeholder="All classes"
                containerStyle={styles.compactDropdownContainer}
                style={styles.compactDropdown}
                placeholderStyle={styles.compactDropdownText}
                selectedTextStyle={styles.compactDropdownText}
              />
            </View>
          </View>
          <View style={styles.filtersRow}>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Section</ThemedText>
              <CustomDropdown
                data={[{ label: 'All Sections', value: '' }, ...filterSectionOptions]}
                value={filters.section_id}
                onChange={(value) => setFilters(prev => ({ ...prev, section_id: value as string }))}
                placeholder="All sections"
                containerStyle={styles.compactDropdownContainer}
                style={styles.compactDropdown}
                placeholderStyle={styles.compactDropdownText}
                selectedTextStyle={styles.compactDropdownText}
              />
            </View>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Fee Type</ThemedText>
              <CustomDropdown
                data={[{ label: 'All Fee Types', value: '' }, ...typeOptions]}
                value={filters.fee_type_id}
                onChange={(value) => setFilters(prev => ({ ...prev, fee_type_id: value as string }))}
                placeholder="All fee types"
                containerStyle={styles.compactDropdownContainer}
                style={styles.compactDropdown}
                placeholderStyle={styles.compactDropdownText}
                selectedTextStyle={styles.compactDropdownText}
              />
            </View>
          </View>

          {/* Sort */}
          <ThemedText style={[styles.filterLabel, { marginTop: 4 }]}>Sort by</ThemedText>
          <View style={styles.sortRow}>
            {([
              { key: 'student', label: 'Student' },
              { key: 'class', label: 'Class' },
              { key: 'feeType', label: 'Fee Type' },
              { key: 'totalFee', label: 'Total Fee' },
            ] as const).map(opt => {
              const active = sortKey === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.sortChip,
                    { borderColor: colors.border },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => handleSort(opt.key)}
                >
                  <ThemedText
                    style={[styles.sortChipText, { color: active ? 'white' : colors['muted-foreground'] }]}
                  >
                    {opt.label}
                  </ThemedText>
                  {active && (
                    <Ionicons
                      name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      color="white"
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.clearFiltersButton, { backgroundColor: colors.secondary }]}
            onPress={() => {
              setSearchQuery('');
              setSortKey(null);
              setSortDir('asc');
              setFilters({
                student_id: '',
                class_id: '',
                section_id: '',
                fee_type_id: '',
                academic_year_id: activeAcademicYearId || '',
              });
            }}
          >
            <ThemedText style={[styles.clearFiltersText, { color: colors.primary }]}>Clear Filters</ThemedText>
          </TouchableOpacity>
        </View>

    </View>
  );

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS}>
      <ThemedView style={styles.container}>
        <FlatList
          data={paginatedMappings}
          keyExtractor={(item) => item.id}
          renderItem={renderMappingItem}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
          ListEmptyComponent={
            <ThemedView style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No fee student mappings found
              </ThemedText>
            </ThemedView>
          }
        />

        {/* Pagination */}
        {mappings.length > 0 && (
          <View style={[styles.paginationBar, { borderTopColor: colors.border }]}>
            <View style={styles.paginationButtons}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  { borderColor: colors.border },
                  currentPage <= 1 && styles.pageButtonDisabled,
                ]}
                onPress={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                <Ionicons name="chevron-back" size={14} color={colors.foreground} />
                <ThemedText style={styles.pageButtonText}>Previous</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  { borderColor: colors.border },
                  currentPage >= totalPages && styles.pageButtonDisabled,
                ]}
                onPress={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                <ThemedText style={styles.pageButtonText}>Next</ThemedText>
                <Ionicons name="chevron-forward" size={14} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.paginationText, { color: colors['muted-foreground'] }]}>
              Page {currentPage} of {totalPages} ({mappings.length} {mappings.length === 1 ? 'mapping' : 'mappings'})
            </ThemedText>
          </View>
        )}

        {/* Single Mapping Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">
                  {editingMapping ? 'Edit Student Mapping' : 'Add Student Mapping'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
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
          </KeyboardAvoidingView>
        </Modal>

        {/* Bulk Mapping Modal */}
        <Modal
          visible={isBulkModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsBulkModalVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Bulk Add Student Mappings</ThemedText>
                <TouchableOpacity onPress={() => setIsBulkModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
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
                          <View key={id} style={[styles.selectedStudentChip, { backgroundColor: colors.secondary }]}>
                            <ThemedText style={styles.chipText}>{studentOption?.label ?? ''}</ThemedText>
                            <TouchableOpacity
                              onPress={() => setBulkFormData(prev => ({
                                ...prev,
                                student_ids: prev.student_ids.filter(sid => sid !== id)
                              }))}
              accessibilityLabel="Close"
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
          </KeyboardAvoidingView>
        </Modal>

      </ThemedView>
      <ConfirmModal {...modalProps} />
    </ReadOrListPermissionGuard>
  );
}

// Web parity (_app/fee.tsx beforeLoad): teachers cannot access the Fee
// module, even via a deep link into a specific fee sub-screen.
export default function FeeStudentMappingsScreen() {
  const router = useRouter();
  const { role } = useAuth();
  const isFeeBlocked = roleBlocksFees(role?.name);

  useEffect(() => {
    if (isFeeBlocked) router.replace('/(tabs)');
  }, [isFeeBlocked, router]);

  if (isFeeBlocked) return null;

  return (
    <AppLayout title="Student Mappings">
      <StudentMappingsContent />
    </AppLayout>
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
    paddingVertical: 12,
    borderRadius: 6,
  },
  bulkButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  serialBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  serialText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paginationBar: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paginationText: {
    fontSize: 11,
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
    minWidth: 40,
    minHeight: 40,
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
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 14,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
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
  compactDropdownContainer: {
    marginBottom: 0,
  },
  compactDropdown: {
    height: 44,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  compactDropdownText: {
    fontSize: 13,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
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