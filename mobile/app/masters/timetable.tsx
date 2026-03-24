import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomDropdown, DropdownOption } from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { timetableApi, classSectionsApi, subjectsApi } from '@/src/api';
import type { FrontendTimetableCreate, TimetableDataItem } from '@/src/api';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

const SPECIAL_LABELS: DropdownOption[] = [
  { value: 'SNACKS', label: 'Snacks' },
  { value: 'LUNCH', label: 'Lunch' },
  { value: 'DISPERSAL', label: 'Dispersal' },
];

interface RowData {
  id: string;
  time: {
    from: string;
    to: string;
  };
  type: 'subject' | 'special';
  subjects?: Record<string, string>; // day -> subject_id
  label?: string;
}

export default function TimeTableEditor() {
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<{ id: string; name: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [includeSaturday, setIncludeSaturday] = useState(false);
  const [rows, setRows] = useState<RowData[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState<'from' | 'to' | null>(null);
  const [currentRowId, setCurrentRowId] = useState<string | null>(null);

  const router = useRouter();
  const { colors } = useTheme();
  const themeColors = colors;
  const { showSuccess, showError } = useToastContext();
  const queryClient = useQueryClient();
  const { activeAcademicYearId } = useAcademicYear();

  // Fetch classes
  const { data: classesData } = useQuery({
    queryKey: ['classes', activeAcademicYearId],
    queryFn: () => classSectionsApi.getClassList(),
    enabled: !!activeAcademicYearId,
  });

  // Fetch sections for selected class
  const { data: sectionsData } = useQuery({
    queryKey: ['sections', selectedClass?.id],
    queryFn: () => selectedClass ? classSectionsApi.getSectionsByClass(selectedClass.id) : [],
    enabled: !!selectedClass,
  });

  // Fetch subjects for dropdown
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', activeAcademicYearId],
    queryFn: () => subjectsApi.getSubjects({
      academic_year_id: activeAcademicYearId || '',
      active_only: true,
      limit: 1000
    }),
    enabled: !!activeAcademicYearId,
  });

  // Format subjects for dropdown
  const subjectOptions: DropdownOption[] = useMemo(() => {
    if (!subjectsData) return [];
    return [
      { label: 'Select Subject', value: '' },
      ...subjectsData.map(subject => ({
        label: subject.name,
        value: subject.id
      }))
    ];
  }, [subjectsData]);

  // Fetch existing timetable
  const { data: timetableData, isLoading, refetch } = useQuery({
    queryKey: ['timetable', selectedSection?.id],
    queryFn: () => {
      if (!selectedSection) return null;
      return timetableApi.getFrontendTimetable(selectedSection.id);
    },
    enabled: !!selectedSection,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: FrontendTimetableCreate) => timetableApi.createFrontendTimetable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      setIsEditing(false);
      showSuccess('Timetable Created', 'Timetable created successfully.');
    },
    onError: (error: any) => {
      showError('Create Failed', error.message || 'Failed to create timetable');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: FrontendTimetableCreate }) =>
      timetableApi.updateFrontendTimetable(sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      setIsEditing(false);
      showSuccess('Timetable Updated', 'Timetable updated successfully.');
    },
    onError: (error: any) => {
      showError('Update Failed', error.message || 'Failed to update timetable');
    },
  });

  // Initialize data when timetable is loaded
  useEffect(() => {
    if (timetableData) {
      // Convert frontend timetable to rows
      const rows: RowData[] = timetableData.timetable_data.map((item, index) => ({
        id: `row-${index}`,
        time: item.time,
        type: item.type,
        subjects: item.subjects || {},
        label: item.label
      }));
      setRows(rows);
      setIncludeSaturday(false); // TODO: determine from data
      setIsEditing(false);
    } else if (selectedSection) {
      // Create default timetable
      setRows([
        {
          id: `row-${Date.now()}-1`,
          time: { from: '09:00', to: '09:45' },
          type: 'subject',
          subjects: {}
        }
      ]);
      setIncludeSaturday(false);
      setIsEditing(true);
    }
  }, [timetableData, selectedSection]);

  const handleClassSelect = (classItem: { id: string; name: string }) => {
    setSelectedClass(classItem);
    setSelectedSection(null); // Reset section when class changes
  };

  const handleSectionSelect = (sectionItem: { id: string; name: string }) => {
    setSelectedSection(sectionItem);
  };

  const handleSave = () => {
    if (!selectedSection) return;

    // Convert rows to frontend timetable format
    const timetableItems: TimetableDataItem[] = rows.map(row => ({
      time: row.time,
      type: row.type,
      ...(row.type === 'subject' ? { subjects: row.subjects } : { label: row.label })
    }));

    const data: FrontendTimetableCreate = {
      section_id: selectedSection.id,
      timetable_data: timetableItems
    };

    if (timetableData) {
      // Update existing timetable
      updateMutation.mutate({ sectionId: selectedSection.id, data });
    } else {
      // Create new timetable
      createMutation.mutate(data);
    }
  };

  const addRow = (type: 'subject' | 'special') => {
    const newRow: RowData = {
      id: `row-${Date.now()}`,
      time: { from: '09:00', to: '09:45' },
      type,
      ...(type === 'subject' ? { subjects: {} } : { label: 'SNACKS' })
    };
    setRows(prev => [...prev, newRow]);
  };

  const deleteRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id: string, updates: Partial<RowData>) => {
    setRows(prev => prev.map(row =>
      row.id === id ? { ...row, ...updates } : row
    ));
  };

  const handleSubjectChange = (rowIdx: number, day: string, subjectId: string) => {
    setRows(prev => {
      const updated = [...prev];
      if (updated[rowIdx] && updated[rowIdx].type === 'subject') {
        updated[rowIdx] = {
          ...updated[rowIdx],
          subjects: {
            ...updated[rowIdx].subjects,
            [day]: subjectId
          }
        };
      }
      return updated;
    });
  };

  const openTimePicker = (rowId: string, field: 'from' | 'to') => {
    setCurrentRowId(rowId);
    setCurrentTimeField(field);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (selectedDate && currentRowId && currentTimeField) {
      const timeString = selectedDate.toTimeString().slice(0, 5); // HH:MM
      updateRow(currentRowId, {
        time: {
          ...rows.find(r => r.id === currentRowId)?.time || { from: '09:00', to: '09:45' },
          [currentTimeField]: timeString
        }
      });
    }
    setCurrentRowId(null);
    setCurrentTimeField(null);
  };

  const getSubjectNameById = (id: string): string => {
    const subject = subjectsData?.find(s => s.id === id);
    return subject ? subject.name : '';
  };

  const handleExport = async (format: 'png' | 'csv' | 'excel' = 'csv') => {
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'excel') {
      exportToExcel();
    } else {
      // PNG export for React Native would require a different library
      Alert.alert('PNG Export', 'PNG export not implemented for mobile. Use CSV or Excel.');
    }
  };

  const exportToCSV = async () => {
    try {
      const csvData = generateCSVData();
      const csvContent = csvData.map(row => row.join(',')).join('\n');

      // Share the CSV content directly
      await Share.share({
        message: csvContent,
        title: `Timetable - ${selectedClass?.name} ${selectedSection?.name}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const exportToExcel = () => {
    Alert.alert('Excel Export', 'Excel export would be implemented with xlsx library');
  };

  const generateCSVData = (): string[][] => {
    const headers = ['Time', ...days.map(day => day.charAt(0).toUpperCase() + day.slice(1))];
    const data: string[][] = [headers];

    rows.forEach(row => {
      const timeStr = `${row.time.from}-${row.time.to}`;
      if (row.type === 'subject') {
        const rowData = [timeStr];
        days.forEach(day => {
          const subjectId = row.subjects?.[day];
          const subjectName = subjectId ? getSubjectNameById(subjectId) : '';
          // Escape commas and quotes in subject names
          const escapedName = subjectName.replace(/"/g, '""');
          const csvValue = escapedName.includes(',') || escapedName.includes('"') ? `"${escapedName}"` : escapedName;
          rowData.push(csvValue);
        });
        data.push(rowData);
      } else {
        const label = row.label || '';
        const escapedLabel = label.replace(/"/g, '""');
        const csvLabel = escapedLabel.includes(',') || escapedLabel.includes('"') ? `"${escapedLabel}"` : escapedLabel;
        const rowData = [timeStr, csvLabel];
        // Add empty strings for remaining days to maintain consistent column count
        for (let i = 1; i < days.length; i++) {
          rowData.push('');
        }
        data.push(rowData);
      }
    });

    return data;
  };

  const days = useMemo(() => {
    const baseDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    return includeSaturday ? [...baseDays, 'saturday'] : baseDays;
  }, [includeSaturday]);

  const renderTimetableRow = useCallback(({ item, index }: { item: RowData; index: number }) => (
    <View style={[styles.rowCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      {/* Time */}
      <View style={styles.timeSection}>
        <TouchableOpacity
          style={styles.timeInputContainer}
          onPress={() => isEditing && openTimePicker(item.id, 'from')}
          disabled={!isEditing}
        >
          <Ionicons name="time-outline" size={16} color={themeColors['muted-foreground']} />
          <TextInput
            style={[styles.timeInput, {
              color: themeColors['card-foreground'],
              borderColor: themeColors.border,
              backgroundColor: themeColors.background
            }]}
            value={item.time.from}
            editable={false}
            placeholder="09:00"
            placeholderTextColor={themeColors['muted-foreground']}
          />
        </TouchableOpacity>
        <ThemedText style={[styles.timeSeparator, { color: themeColors['muted-foreground'] }]}>to</ThemedText>
        <TouchableOpacity
          style={styles.timeInputContainer}
          onPress={() => isEditing && openTimePicker(item.id, 'to')}
          disabled={!isEditing}
        >
          <TextInput
            style={[styles.timeInput, {
              color: themeColors['card-foreground'],
              borderColor: themeColors.border,
              backgroundColor: themeColors.background
            }]}
            value={item.time.to}
            editable={false}
            placeholder="09:45"
            placeholderTextColor={themeColors['muted-foreground']}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {item.type === 'subject' ? (
        <View style={styles.subjectsGrid}>
          {days.map(day => (
            <View key={day} style={styles.subjectDayContainer}>
              <ThemedText style={[styles.dayLabel, { color: themeColors['muted-foreground'] }]}>
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </ThemedText>
              <CustomDropdown
                data={subjectOptions}
                value={item.subjects?.[day] || ''}
                onChange={(value: string | number | null) => handleSubjectChange(index, day, String(value || ''))}
                placeholder="Select Subject"
                disabled={!isEditing}
                style={{
                  height: 36,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
                containerStyle={{
                  marginBottom: 0,
                }}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.specialContainer}>
          <CustomDropdown
            data={SPECIAL_LABELS}
            value={item.label || ''}
            onChange={(value: string | number | null) => updateRow(item.id, { label: String(value || '') })}
            placeholder="Select Special Activity"
            disabled={!isEditing}
            style={{
              height: 36,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
            containerStyle={{
              marginBottom: 0,
            }}
          />
        </View>
      )}

      {/* Actions */}
      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: themeColors.destructive }]}
          onPress={() => deleteRow(item.id)}
        >
          <Ionicons name="trash" size={16} color="white" />
        </TouchableOpacity>
      )}
    </View>
  ), [themeColors, isEditing, days, subjectOptions]);

  if (!selectedClass) {
    return (
      <ReadOrListPermissionGuard
        resource={PERMISSION_RESOURCES.TIMETABLES}
        fallback={
          <ThemedView style={styles.container}>
            <View style={styles.centerContainer}>
              <ThemedText type="title">Access Denied</ThemedText>
              <ThemedText>You don't have permission to view timetables</ThemedText>
            </View>
          </ThemedView>
        }
      >
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <ThemedText type="title">Timetable</ThemedText>
            </View>
          </View>

          <View style={styles.selectionContainer}>
            <ThemedText type="subtitle" style={styles.selectionTitle}>
              Select Class
            </ThemedText>
            <FlatList
              data={classesData}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.classSectionCard, { backgroundColor: themeColors.card }]}
                  onPress={() => handleClassSelect(item)}
                >
                  <ThemedText type="subtitle">{item.name}</ThemedText>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.classSectionList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </ThemedView>
      </ReadOrListPermissionGuard>
    );
  }

  if (!selectedSection) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedClass(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title">{selectedClass.name}</ThemedText>
            <ThemedText style={styles.subtitle}>Select Section</ThemedText>
          </View>
        </View>

        <View style={styles.selectionContainer}>
          <ThemedText type="subtitle" style={styles.selectionTitle}>
            Select Section
          </ThemedText>
          <FlatList
            data={sectionsData}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.classSectionCard, { backgroundColor: themeColors.card }]}
                onPress={() => handleSectionSelect(item)}
              >
                <ThemedText type="subtitle">{item.name}</ThemedText>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.classSectionList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedSection(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText type="title">
            {selectedClass.name} - {selectedSection.name}
          </ThemedText>
          <ThemedText style={styles.subtitle}>Timetable</ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: themeColors.secondary }]}
            onPress={() => setShowExportOptions(!showExportOptions)}
          >
            <Ionicons name="download" size={16} color="white" />
          </TouchableOpacity>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.TIMETABLES} actionConstant={isEditing ? "update" : "read"}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
            >
              <Ionicons name={isEditing ? "checkmark" : "create"} size={20} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>

        {/* Export Options */}
        {showExportOptions && (
          <>
            <TouchableOpacity
              style={styles.exportOverlay}
              onPress={() => setShowExportOptions(false)}
              activeOpacity={1}
            />
            <View style={[styles.exportOptions, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => {
                  handleExport('csv');
                  setShowExportOptions(false);
                }}
              >
                <Ionicons name="document-text" size={16} color={themeColors['card-foreground']} />
                <ThemedText style={styles.exportOptionText}>Export CSV</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => {
                  handleExport('excel');
                  setShowExportOptions(false);
                }}
              >
                <Ionicons name="grid" size={16} color={themeColors['card-foreground']} />
                <ThemedText style={styles.exportOptionText}>Export Excel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.exportOption}
                onPress={() => {
                  handleExport('png');
                  setShowExportOptions(false);
                }}
              >
                <Ionicons name="image" size={16} color={themeColors['card-foreground']} />
                <ThemedText style={styles.exportOptionText}>Export PNG</ThemedText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Saturday Toggle */}
      {isEditing && (
        <View style={[styles.saturdayToggle, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setIncludeSaturday(!includeSaturday)}
          >
            <Ionicons
              name={includeSaturday ? "checkbox" : "square-outline"}
              size={24}
              color={includeSaturday ? themeColors.primary : themeColors['muted-foreground']}
            />
          </TouchableOpacity>
          <ThemedText style={styles.checkboxLabel}>Include Saturday</ThemedText>
        </View>
      )}

      {/* Timetable Rows */}
      <FlatList
        data={rows}
        renderItem={renderTimetableRow}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.timetableList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
      />

      {/* Action Buttons */}
      {isEditing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
            onPress={() => addRow('subject')}
          >
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.actionButtonText}>Add Subject</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => addRow('special')}
          >
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.actionButtonText}>Add Special</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Save Button */}
      {isEditing && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
            onPress={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <ThemedText style={styles.saveButtonText}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Timetable'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date(`1970-01-01T${rows.find(r => r.id === currentRowId)?.time?.[currentTimeField || 'from'] || '09:00'}:00`)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </ThemedView>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  exportOptions: {
    position: 'absolute',
    top: 50,
    right: 8,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    minWidth: 150,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  exportOptionText: {
    marginLeft: 8,
    fontSize: 14,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionContainer: {
    flex: 1,
  },
  selectionTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  classSectionList: {
    paddingBottom: 20,
  },
  classSectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saturdayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  timetableList: {
    paddingBottom: 100,
  },
  rowCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 80,
  },
  timeInput: {
    flex: 1,
    fontSize: 14,
    textAlign: 'center',
    marginLeft: 4,
  },
  timeSeparator: {
    marginHorizontal: 8,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectDayContainer: {
    flex: 1,
    minWidth: '30%',
    marginBottom: 8,
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  specialContainer: {
    marginTop: 8,
  },
  specialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  specialInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  saveContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});