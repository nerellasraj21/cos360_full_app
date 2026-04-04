import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
// Custom Date Picker Modal Component
function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
  title,
  themeColors
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  initialDate?: Date;
  title: string;
  themeColors: any;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());

  const handleConfirm = () => {
    const formattedDate = selectedDate.toISOString().split('T')[0];
    onSelect(formattedDate);
    onClose();
  };

  const adjustDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const adjustMonth = (months: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + months);
    setSelectedDate(newDate);
  };

  const adjustYear = (years: number) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(newDate.getFullYear() + years);
    setSelectedDate(newDate);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.datePickerOverlay}>
        <View style={[styles.datePickerContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.datePickerHeader}>
            <ThemedText type="subtitle" style={styles.datePickerTitle}>{title}</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateDisplay}>
            <ThemedText style={styles.selectedDateText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </ThemedText>
          </View>

          <View style={styles.dateControls}>
            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlButton} onPress={() => adjustYear(-1)}>
                <Ionicons name="chevron-back" size={20} color={themeColors.primary} />
                <ThemedText style={styles.controlText}>Year</ThemedText>
              </TouchableOpacity>

              <View style={styles.dateValue}>
                <ThemedText style={styles.dateValueText}>{selectedDate.getFullYear()}</ThemedText>
              </View>

              <TouchableOpacity style={styles.controlButton} onPress={() => adjustYear(1)}>
                <ThemedText style={styles.controlText}>Year</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlButton} onPress={() => adjustMonth(-1)}>
                <Ionicons name="chevron-back" size={20} color={themeColors.primary} />
                <ThemedText style={styles.controlText}>Month</ThemedText>
              </TouchableOpacity>

              <View style={styles.dateValue}>
                <ThemedText style={styles.dateValueText}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long' })}
                </ThemedText>
              </View>

              <TouchableOpacity style={styles.controlButton} onPress={() => adjustMonth(1)}>
                <ThemedText style={styles.controlText}>Month</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.controlRow}>
              <TouchableOpacity style={styles.controlButton} onPress={() => adjustDate(-1)}>
                <Ionicons name="chevron-back" size={20} color={themeColors.primary} />
                <ThemedText style={styles.controlText}>Day</ThemedText>
              </TouchableOpacity>

              <View style={styles.dateValue}>
                <ThemedText style={styles.dateValueText}>{selectedDate.getDate()}</ThemedText>
              </View>

              <TouchableOpacity style={styles.controlButton} onPress={() => adjustDate(1)}>
                <ThemedText style={styles.controlText}>Day</ThemedText>
                <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.datePickerFooter}>
            <TouchableOpacity style={[styles.datePickerButton, styles.cancelButton]} onPress={onClose}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.datePickerButton, styles.confirmButton]} onPress={handleConfirm}>
              <ThemedText style={styles.confirmButtonText}>Select</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
// import { useColorScheme } from '@/hooks/use-color-scheme';
import { holidaysApi, academicYearsApi } from '@/src/api';
import type { HolidayRead, HolidayCreate, HolidayUpdate, AcademicYear, AcademicYearDropdown } from '@/src/api';
import { useTheme } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

// Calendar View Component
function CalendarView({ holidays, themeColors, onHolidayPress }: { holidays: HolidayRead[], themeColors: any, onHolidayPress: (h: HolidayRead) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isHoliday = (date: Date) => {
    return holidays.some(holiday => {
      const startDate = new Date(holiday.start_date);
      const endDate = new Date(holiday.end_date);
      return date >= startDate && date <= endDate && holiday.is_active;
    });
  };

  const getHolidayForDate = (date: Date) => {
    return holidays.find(holiday => {
      const startDate = new Date(holiday.start_date);
      const endDate = new Date(holiday.end_date);
      return date >= startDate && date <= endDate && holiday.is_active;
    });
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <View key={`empty-${i}`} style={styles.calendarDay} />
      );
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const holiday = getHolidayForDate(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const holidayBg = holiday?.color || '#FEF3C7';
      days.push(
        <TouchableOpacity
          key={day}
          activeOpacity={holiday ? 0.7 : 1}
          onPress={() => holiday && onHolidayPress(holiday)}
          style={[
            styles.calendarDay,
            holiday && [styles.holidayDay, { backgroundColor: holidayBg + '40' }],
            isWeekend && !holiday && styles.weekendDay
          ]}
        >
          <ThemedText style={[
            styles.dayNumber,
            holiday && [styles.holidayDayNumber, { color: holidayBg === '#FEF3C7' ? '#D97706' : holiday.color }],
            isWeekend && !holiday && styles.weekendDayNumber
          ]}>
            {day}
          </ThemedText>
          {holiday && (
            <View style={[styles.holidayIndicator, { backgroundColor: holiday.color || '#D97706' }]}>
              <ThemedText style={styles.calendarHolidayName} numberOfLines={1}>
                {holiday.name}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  return (
    <View style={[styles.calendarContainer, { backgroundColor: themeColors.card }]}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => navigateMonth('prev')}>
          <Ionicons name="chevron-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <ThemedText type="subtitle" style={styles.calendarTitle}>
          {monthNames[currentMonth]} {currentYear}
        </ThemedText>
        <TouchableOpacity onPress={() => navigateMonth('next')}>
          <Ionicons name="chevron-forward" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.dayHeaders}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <ThemedText key={day} style={styles.dayHeader}>
            {day}
          </ThemedText>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {renderCalendarDays()}
      </View>
    </View>
  );
}

export default function HolidaysScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<HolidayRead | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    description: '',
    academic_year_id: '',
    is_active: true,
    color: '#2563eb',
  });
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const queryClient = useQueryClient();
  // Permission checking will be handled by PermissionGuard components

  // Fetch holidays data
  const { data: holidaysData, isLoading, error, refetch } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidaysApi.getHolidays(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: HolidayCreate) => holidaysApi.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Holiday Created', 'Holiday created successfully.');
    },
    onError: (error: any) => {
      showError('Create Failed', error.message || 'Failed to create holiday');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HolidayUpdate }) => holidaysApi.updateHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Holiday Updated', 'Holiday updated successfully.');
    },
    onError: (error: any) => {
      showError('Update Failed', error.message || 'Failed to update holiday');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: holidaysApi.deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      showSuccess('Holiday Deleted', 'Holiday deleted successfully.');
    },
    onError: (error: any) => {
      showError('Delete Failed', error.message || 'Failed to delete holiday');
    },
  });


  // Fetch academic years for dropdown
  const { data: academicYearsData } = useQuery({
    queryKey: ['academicYearsDropdown'],
    queryFn: () => academicYearsApi.getAcademicYearsDropdown(),
  });

  const effectiveAcademicYearsData = academicYearsData || [];

  // Filter holidays based on search and academic year
  const filteredHolidays = useMemo(() => {
    if (!holidaysData || !Array.isArray(holidaysData)) return [];

    return holidaysData.filter((holiday: HolidayRead) => {
      const matchesSearch = holiday.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAcademicYear = !selectedAcademicYear || holiday.academic_year_id === selectedAcademicYear;
      return matchesSearch && matchesAcademicYear;
    });
  }, [holidaysData, searchQuery, selectedAcademicYear]);

  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      description: '',
      academic_year_id: '',
      is_active: true,
      color: '#2563eb',
    });
    setEditingHoliday(null);
  };

  const handleEdit = (holiday: HolidayRead) => {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      description: holiday.description || '',
      academic_year_id: holiday.academic_year_id,
      is_active: holiday.is_active,
      color: holiday.color || '#2563eb',
    });
    setIsModalVisible(true);
  };

  const handleDelete = (holiday: HolidayRead) => {
    confirm({
      title: 'Delete Holiday',
      message: `Are you sure you want to delete "${holiday.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(holiday.id),
    });
  };

  const handleStartDateSelect = (dateString: string) => {
    setFormData(prev => ({ ...prev, start_date: dateString }));
  };

  const handleEndDateSelect = (dateString: string) => {
    setFormData(prev => ({ ...prev, end_date: dateString }));
  };

  const showStartDatePickerModal = () => {
    setShowStartDatePicker(true);
  };

  const showEndDatePickerModal = () => {
    setShowEndDatePicker(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.academic_year_id) {
      showError('Error', 'Please fill in all required fields');
      return;
    }

    const apiData = {
      name: formData.name,
      description: formData.description || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date,
      academic_year_id: formData.academic_year_id,
      is_active: formData.is_active,
      color: formData.color || '#2563eb',
    };

    if (editingHoliday) {
      updateMutation.mutate({ id: editingHoliday.id, data: apiData });
    } else {
      createMutation.mutate(apiData);
    }
  };


  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const renderHolidayItem = useCallback(({ item }: { item: HolidayRead }) => (
    <View style={[styles.holidayCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.holidayHeader}>
        <View style={styles.holidayInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {item.color && (
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: item.color }} />
            )}
            <ThemedText type="subtitle" style={styles.holidayName}>
              {item.name}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <ThemedText style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.HOLIDAYS} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.HOLIDAYS} actionConstant="delete">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      <View style={styles.holidayDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
            {' '}({getDuration(item.start_date, item.end_date)})
          </ThemedText>
        </View>
        {item.description && (
          <View style={styles.detailRow}>
            <Ionicons name="document" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              {item.description}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  ), [themeColors]);

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Failed to load holidays data</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.HOLIDAYS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don't have permission to view holidays</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText type="title">Holidays</ThemedText>
          <ThemedText style={styles.subtitle}>
            {filteredHolidays.length} holiday{filteredHolidays.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'list' && { backgroundColor: themeColors.primary }]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={20} color={viewMode === 'list' ? "white" : themeColors['muted-foreground']} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleButton, viewMode === 'calendar' && { backgroundColor: themeColors.primary }]}
          onPress={() => setViewMode('calendar')}
        >
          <Ionicons name="calendar" size={20} color={viewMode === 'calendar' ? "white" : themeColors['muted-foreground']} />
        </TouchableOpacity>
        <PermissionGuard resourceConstant={PERMISSION_RESOURCES.HOLIDAYS} actionConstant="create">
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: themeColors.primary }]}
            onPress={() => {
              resetForm();
              setIsModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </PermissionGuard>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search holidays..."
          placeholderTextColor={themeColors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={20} color={themeColors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Academic Year Filter */}
      <View style={[styles.filterContainer, { backgroundColor: themeColors.card }]}>
        <ThemedText style={styles.filterLabel}>Filter by Academic Year:</ThemedText>
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[
              styles.filterOption,
              { borderColor: themeColors.border },
              !selectedAcademicYear && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
            ]}
            onPress={() => setSelectedAcademicYear('')}
          >
            <ThemedText style={[
              styles.filterText,
              !selectedAcademicYear && { color: themeColors.primary, fontWeight: '600' }
            ]}>
              All Years
            </ThemedText>
          </TouchableOpacity>
          {effectiveAcademicYearsData?.map((year: any) => (
            <TouchableOpacity
              key={year.id}
              style={[
                styles.filterOption,
                { borderColor: themeColors.border },
                selectedAcademicYear === year.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
              ]}
              onPress={() => setSelectedAcademicYear(year.id)}
            >
              <ThemedText style={[
                styles.filterText,
                selectedAcademicYear === year.id && { color: themeColors.primary, fontWeight: '600' }
              ]}>
                {year.title}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Holidays List or Calendar View */}
      {viewMode === 'list' ? (
        <FlatList
          data={filteredHolidays}
          renderItem={renderHolidayItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={themeColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar" size={64} color={themeColors['muted-foreground']} />
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No Holidays Found
              </ThemedText>
              <ThemedText style={styles.emptyText}>
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Add your first holiday to get started'}
              </ThemedText>
            </View>
          }
        />
      ) : (
        <CalendarView holidays={filteredHolidays} themeColors={themeColors} onHolidayPress={handleEdit} />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Holiday Name *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter holiday name"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Academic Year *</ThemedText>
                <View style={styles.pickerContainer}>
                  {effectiveAcademicYearsData?.map((year: any) => (
                    <TouchableOpacity
                      key={year.id}
                      style={[
                        styles.pickerOption,
                        { borderColor: themeColors.border },
                        formData.academic_year_id === year.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, academic_year_id: year.id }))}
                    >
                      <ThemedText style={[
                        styles.pickerText,
                        formData.academic_year_id === year.id && { color: themeColors.primary, fontWeight: '600' }
                      ]}>
                        {year.title}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Start Date *</ThemedText>
                <TouchableOpacity
                  style={[styles.dateInput, { borderColor: themeColors.border }]}
                  onPress={showStartDatePickerModal}
                >
                  <ThemedText style={[
                    styles.dateInputText,
                    { color: formData.start_date ? themeColors['card-foreground'] : themeColors['muted-foreground'] }
                  ]}>
                    {formData.start_date ? new Date(formData.start_date).toLocaleDateString() : 'Select start date'}
                  </ThemedText>
                  <Ionicons name="calendar" size={20} color={themeColors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>End Date *</ThemedText>
                <TouchableOpacity
                  style={[styles.dateInput, { borderColor: themeColors.border }]}
                  onPress={showEndDatePickerModal}
                >
                  <ThemedText style={[
                    styles.dateInputText,
                    { color: formData.end_date ? themeColors['card-foreground'] : themeColors['muted-foreground'] }
                  ]}>
                    {formData.end_date ? new Date(formData.end_date).toLocaleDateString() : 'Select end date'}
                  </ThemedText>
                  <Ionicons name="calendar" size={20} color={themeColors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.textarea, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter holiday description (optional)"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Event Color</ThemedText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  {['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#db2777', '#ea580c'].map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setFormData(prev => ({ ...prev, color }))}
                      style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: color,
                        borderWidth: formData.color === color ? 3 : 0,
                        borderColor: themeColors['card-foreground'],
                      }}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                >
                  <Ionicons
                    name={formData.is_active ? "checkbox" : "square-outline"}
                    size={24}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
                <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingHoliday ? 'Update' : 'Create')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      <DatePickerModal
        visible={showStartDatePicker}
        onClose={() => setShowStartDatePicker(false)}
        onSelect={handleStartDateSelect}
        initialDate={formData.start_date ? new Date(formData.start_date) : undefined}
        title="Select Start Date"
        themeColors={themeColors}
      />

      <DatePickerModal
        visible={showEndDatePicker}
        onClose={() => setShowEndDatePicker(false)}
        onSelect={handleEndDateSelect}
        initialDate={formData.end_date ? new Date(formData.end_date) : (formData.start_date ? new Date(formData.start_date) : undefined)}
        title="Select End Date"
        themeColors={themeColors}
      />
      <ConfirmModal {...modalProps} />
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 14,
  },
  calendarContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  holidayDay: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  holidayDayNumber: {
    color: '#D97706',
    fontWeight: '600',
  },
  weekendDay: {
    backgroundColor: '#F9FAFB',
  },
  weekendDayNumber: {
    color: '#6B7280',
  },
  holidayIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  calendarHolidayName: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
  },
  dateDisplay: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
  },
  dateControls: {
    gap: 20,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    flex: 1,
  },
  controlText: {
    fontSize: 14,
    marginHorizontal: 5,
  },
  dateValue: {
    flex: 2,
    alignItems: 'center',
    padding: 10,
  },
  dateValueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  holidayCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  holidayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  holidayInfo: {
    flex: 1,
  },
  holidayName: {
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holidayDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    flex: 1,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});