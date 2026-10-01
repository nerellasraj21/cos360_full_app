import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Share,
  Platform,
  Modal,
} from 'react-native';
import { TimePickerModal, formatTime12h } from '@/components/ui';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomDropdown, DropdownOption } from '@/components/ui/dropdown';
import { CreatableDropdown, CreatableOption } from '@/components/ui/creatable-dropdown';
import { useTheme } from '@/contexts';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { timetableApi, classSectionsApi, subjectsApi, classSubjectMappingsApi } from '@/src/api';
import type { FrontendTimetableCreate, TimetableDataItem } from '@/src/api';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

const DEFAULT_SPECIAL_LABELS: CreatableOption[] = [
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
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [rows, setRows] = useState<RowData[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState<'from' | 'to' | null>(null);
  const [currentRowId, setCurrentRowId] = useState<string | null>(null);
  const [repeatModalVisible, setRepeatModalVisible] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'all' | 'one' | null>(null);
  const [repeatSelectedRow, setRepeatSelectedRow] = useState<string | null>(null);
  const [customEvents, setCustomEvents] = useState<CreatableOption[]>([]);

  const allSpecialLabels = useMemo(
    () => [...DEFAULT_SPECIAL_LABELS, ...customEvents],
    [customEvents]
  );

  const addCustomEvent = useCallback((inputValue: string): CreatableOption | null => {
    const trimmed = inputValue.trim();
    if (!trimmed || !/^[a-zA-Z0-9 ]+$/.test(trimmed) || trimmed.length > 50) return null;
    const value = trimmed.toUpperCase().replace(/\s+/g, '_');
    const label = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    const newOption: CreatableOption = { value, label };
    setCustomEvents(prev => {
      if (prev.some(e => e.value === value)) return prev;
      return [...prev, newOption];
    });
    return newOption;
  }, []);

  const rowCounter = useRef(0);

  const router = useRouter();
  const { colors } = useTheme();
  const themeColors = colors;
  const { showSuccess, showError, showInfo } = useToastContext();
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

  // Fetch all subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', activeAcademicYearId],
    queryFn: () => subjectsApi.getSubjects({ active_only: true, limit: 1000 }),
    enabled: !!activeAcademicYearId,
  });

  // Fetch class-subject mappings for the selected class (same as web app)
  const { data: classMappings } = useQuery({
    queryKey: ['classSubjectMappings', 'byClass', selectedClass?.id, activeAcademicYearId],
    queryFn: () => classSubjectMappingsApi.getMappingsByClass(selectedClass!.id, activeAcademicYearId || undefined),
    enabled: !!selectedClass,
  });

  // Build set of subject IDs mapped to this class/section — mirrors web app logic
  const classSubjectIds = useMemo(() => {
    if (!classMappings || !selectedClass) return null;
    const filtered = classMappings.filter(
      (m: any) => !m.section_id || !selectedSection || m.section_id === selectedSection.id
    );
    return new Set(filtered.map((m: any) => m.subject_id));
  }, [classMappings, selectedClass, selectedSection]);

  // Only show subjects mapped to the selected class/section (like web app)
  const subjectOptions: DropdownOption[] = useMemo(() => {
    if (!subjectsData) return [];
    const all = subjectsData.map(subject => ({ label: subject.name || '', value: subject.id }));
    const filtered = classSubjectIds ? all.filter(s => classSubjectIds.has(s.value)) : all;
    return [{ label: 'Select Subject', value: '' }, ...filtered];
  }, [subjectsData, classSubjectIds]);

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
        label: item.label || ''
      }));
      setRows(rows);
      const hasSaturday = timetableData.timetable_data.some(
        item => item.type === 'subject' && item.subjects && 'Saturday' in item.subjects
      );
      setIncludeSaturday(hasSaturday);
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
      id: `row-${++rowCounter.current}`,
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

  const confirmTime = (timeString: string) => {
    if (currentRowId && currentTimeField) {
      updateRow(currentRowId, {
        time: {
          ...rows.find(r => r.id === currentRowId)?.time || { from: '09:00', to: '09:45' },
          [currentTimeField]: timeString,
        },
      });
    }
    setShowTimePicker(false);
    setCurrentRowId(null);
    setCurrentTimeField(null);
  };

  const getSubjectNameById = (id: string): string => {
    const subject = subjectsData?.find(s => s.id === id);
    return subject ? subject.name : '';
  };

  const closeRepeatModal = () => {
    setRepeatModalVisible(false);
    setRepeatMode(null);
    setRepeatSelectedRow(null);
  };

  const handleRepeatAllForWeek = (sourceDay: string) => {
    setRows(prev => prev.map(row => {
      if (row.type !== 'subject') return row;
      const srcSubject = row.subjects?.[sourceDay] ?? '';
      const newSubjects: Record<string, string> = { ...row.subjects };
      days.forEach(d => { if (d !== sourceDay) newSubjects[d] = srcSubject; });
      return { ...row, subjects: newSubjects };
    }));
    closeRepeatModal();
  };

  const handleRepeatOneSubject = (sourceDay: string) => {
    if (!repeatSelectedRow) return;
    setRows(prev => prev.map(row => {
      if (row.id !== repeatSelectedRow || row.type !== 'subject') return row;
      const srcSubject = row.subjects?.[sourceDay] ?? '';
      const newSubjects: Record<string, string> = { ...row.subjects };
      days.forEach(d => { if (d !== sourceDay) newSubjects[d] = srcSubject; });
      return { ...row, subjects: newSubjects };
    }));
    closeRepeatModal();
  };

  const handleExport = async (format: 'png' | 'csv' | 'excel' = 'csv') => {
    if (format === 'csv') {
      await exportToCSV();
    } else if (format === 'excel') {
      exportToExcel();
    } else if (format === 'png') {
      exportToPNG();
    }
  };

  const exportToCSV = async () => {
    try {
      const csvData = generateCSVData();
      const csvContent = csvData.map(row => row.join(',')).join('\n');

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Timetable - ${selectedClass?.name} - ${selectedSection?.name}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      } else {
        await Share.share({
          message: csvContent,
          title: `Timetable - ${selectedClass?.name} ${selectedSection?.name}`,
        });
      }
    } catch {
      showError('Error', 'Failed to export CSV');
    }
  };

  const exportToExcel = () => {
    if (Platform.OS !== 'web') {
      showInfo('Excel Export', 'Excel export is only available on web.');
      return;
    }
    try {
      const data = generateCSVData();
      const htmlTable = `<table>${data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
      const blob = new Blob([htmlTable], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Timetable - ${selectedClass?.name} - ${selectedSection?.name}.xls`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      showError('Error', 'Failed to export Excel');
    }
  };

  const exportToPNG = () => {
    if (Platform.OS !== 'web') {
      showInfo('PNG Export', 'PNG export is only available on web.');
      return;
    }
    try {
      const SCALE = 2;
      const PAD = 28;
      const ROW_H = 44;
      const TIME_W = 110;
      const DAY_W = 130;
      const HEADER_H = 44;
      const TITLE_H = 48;

      const cols = days.length;
      const totalW = (TIME_W + DAY_W * cols + PAD * 2) * SCALE;
      const totalH = (TITLE_H + HEADER_H + ROW_H * rows.length + PAD * 2) * SCALE;

      const canvas = document.createElement('canvas');
      canvas.width = totalW;
      canvas.height = totalH;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(SCALE, SCALE);

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, totalW, totalH);

      // Title
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`${selectedClass?.name} – ${selectedSection?.name}  Timetable`, PAD, PAD + 20);

      const tableTop = PAD + TITLE_H;

      // Header row background
      ctx.fillStyle = '#e0e7ff';
      ctx.fillRect(PAD, tableTop, TIME_W + DAY_W * cols, HEADER_H);

      // Header text
      ctx.fillStyle = '#3730a3';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('Time', PAD + 8, tableTop + HEADER_H / 2);
      days.forEach((day, i) => {
        ctx.fillText(day.slice(0, 3), PAD + TIME_W + DAY_W * i + 8, tableTop + HEADER_H / 2);
      });

      // Data rows
      rows.forEach((row, rowIdx) => {
        const y = tableTop + HEADER_H + ROW_H * rowIdx;
        const bg = rowIdx % 2 === 0 ? '#ffffff' : '#f9fafb';
        ctx.fillStyle = bg;
        ctx.fillRect(PAD, y, TIME_W + DAY_W * cols, ROW_H);

        // Time cell
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.fillText(`${row.time.from}–${row.time.to}`, PAD + 8, y + ROW_H / 2);

        if (row.type === 'special') {
          const label = row.label || '';
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(PAD + TIME_W, y, DAY_W * cols, ROW_H);
          ctx.fillStyle = '#92400e';
          ctx.font = 'bold 11px system-ui, sans-serif';
          const labelX = PAD + TIME_W + (DAY_W * cols) / 2;
          ctx.textAlign = 'center';
          ctx.fillText(label, labelX, y + ROW_H / 2);
          ctx.textAlign = 'left';
        } else {
          days.forEach((day, i) => {
            const subjectId = row.subjects?.[day];
            const name = subjectId ? getSubjectNameById(subjectId) : '';
            ctx.fillStyle = '#374151';
            ctx.font = '11px system-ui, sans-serif';
            // Truncate long names
            const maxW = DAY_W - 16;
            let text = name;
            while (text.length > 0 && ctx.measureText(text).width > maxW) {
              text = text.slice(0, -1);
            }
            if (text !== name) text += '…';
            ctx.fillText(text, PAD + TIME_W + DAY_W * i + 8, y + ROW_H / 2);
          });
        }
      });

      // Grid lines
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 1;
      const tableBottom = tableTop + HEADER_H + ROW_H * rows.length;
      const tableRight = PAD + TIME_W + DAY_W * cols;

      // Outer border
      ctx.strokeRect(PAD, tableTop, TIME_W + DAY_W * cols, HEADER_H + ROW_H * rows.length);

      // Horizontal lines
      for (let r = 0; r <= rows.length; r++) {
        const y = tableTop + HEADER_H + ROW_H * r;
        ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(tableRight, y); ctx.stroke();
      }
      // Vertical lines
      ctx.beginPath(); ctx.moveTo(PAD + TIME_W, tableTop); ctx.lineTo(PAD + TIME_W, tableBottom); ctx.stroke();
      for (let c = 1; c < cols; c++) {
        const x = PAD + TIME_W + DAY_W * c;
        ctx.beginPath(); ctx.moveTo(x, tableTop); ctx.lineTo(x, tableBottom); ctx.stroke();
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Timetable - ${selectedClass?.name} - ${selectedSection?.name}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('PNG export error:', err);
      showError('Error', 'Failed to export PNG');
    }
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
    const baseDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return includeSaturday ? [...baseDays, 'Saturday'] : baseDays;
  }, [includeSaturday]);
  const viewDay = activeDay && days.includes(activeDay) ? activeDay : days[0];

  const renderTimetableRow = useCallback(({ item, index }: { item: RowData; index: number }) => (
    <View style={[styles.rowCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
      {/* Time */}
      <View style={styles.timeSection}>
        <TouchableOpacity
          style={[styles.timeInputContainer, { opacity: isEditing ? 1 : 0.6 }]}
          onPress={() => isEditing && openTimePicker(item.id, 'from')}
          disabled={!isEditing}
        >
          <Ionicons name="time-outline" size={16} color={themeColors['muted-foreground']} />
          <TextInput
            style={[styles.timeInput, {
              color: themeColors['card-foreground'],
              borderColor: isEditing ? themeColors.primary : themeColors.border,
              backgroundColor: isEditing ? themeColors.primary + '10' : themeColors.background,
              borderWidth: isEditing ? 2 : 1
            }]}
            value={formatTime12h(item.time.from)}
            editable={false}
            placeholder="9:00 AM"
            placeholderTextColor={themeColors['muted-foreground']}
          />
        </TouchableOpacity>
        <ThemedText style={[styles.timeSeparator, { color: themeColors['muted-foreground'] }]}>to</ThemedText>
        <TouchableOpacity
          style={[styles.timeInputContainer, { opacity: isEditing ? 1 : 0.6 }]}
          onPress={() => isEditing && openTimePicker(item.id, 'to')}
          disabled={!isEditing}
        >
          <TextInput
            style={[styles.timeInput, {
              color: themeColors['card-foreground'],
              borderColor: isEditing ? themeColors.primary : themeColors.border,
              backgroundColor: isEditing ? themeColors.primary + '10' : themeColors.background,
              borderWidth: isEditing ? 2 : 1
            }]}
            value={formatTime12h(item.time.to)}
            editable={false}
            placeholder="9:45 AM"
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
          <CreatableDropdown
            options={allSpecialLabels}
            value={item.label || null}
            onChange={(val) => updateRow(item.id, { label: val })}
            onCreateOption={addCustomEvent}
            placeholder="Select Special Activity"
            formatCreateLabel={(v) => `Create "${v}"`}
            disabled={!isEditing}
            style={{
              height: 36,
              paddingHorizontal: 8,
            }}
          />
        </View>
      )}

      {/* Actions */}
      {isEditing && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: themeColors.destructive }]}
          onPress={() => deleteRow(item.id)}
              accessibilityLabel="Delete"
        >
          <Ionicons name="trash" size={16} color="white" />
        </TouchableOpacity>
      )}
    </View>
  ), [themeColors, isEditing, days, subjectOptions, allSpecialLabels, addCustomEvent]);

  if (!selectedClass) {
    return (
      <ReadOrListPermissionGuard
        resource={PERMISSION_RESOURCES.TIMETABLES}
        fallback={
          <ThemedView style={styles.container}>
            <View style={styles.centerContainer}>
              <ThemedText type="title">Access Denied</ThemedText>
              <ThemedText>You don&apos;t have permission to view timetables</ThemedText>
            </View>
          </ThemedView>
        }
      >
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}
              accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <ThemedText type="title" style={styles.headerTitle}>Timetable</ThemedText>
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
                  <ThemedText type="subtitle" style={styles.cardTitle}>{item.name}</ThemedText>
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
          <TouchableOpacity onPress={() => setSelectedClass(null)} style={styles.backButton}
              accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title" style={styles.headerTitle}>{selectedClass.name}</ThemedText>
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
                <ThemedText type="subtitle" style={styles.cardTitle}>{item.name}</ThemedText>
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
    <>
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedSection(null)} style={styles.backButton}
              accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitleCombined}>
            {selectedClass.name} - {selectedSection.name}
          </ThemedText>
          <ThemedText style={styles.subtitle}>Timetable</ThemedText>
        </View>
        <View style={styles.headerActions}>
          {!isEditing && rows.length > 0 && (
            <TouchableOpacity
              style={[styles.exportButton, { borderColor: themeColors.primary, backgroundColor: themeColors.card }]}
              onPress={() => setShowExportOptions(!showExportOptions)}
              accessibilityLabel="Export"
            >
              <Ionicons name="download-outline" size={16} color={themeColors.primary} />
              <ThemedText style={[styles.exportButtonText, { color: themeColors.primary }]}>Export</ThemedText>
              <Ionicons name="chevron-down" size={14} color={themeColors.primary} />
            </TouchableOpacity>
          )}
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
              <ThemedText style={styles.editButtonText}>{isEditing ? "Save" : "Edit"}</ThemedText>
            </TouchableOpacity>
          </PermissionGuard>
        </View>

      </View>

      {/* Export Options Modal */}
      <Modal
        visible={showExportOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportOptions(false)}
      >
        <TouchableOpacity
          style={styles.exportOverlay}
          onPress={() => setShowExportOptions(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.exportOptions, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <ThemedText style={[styles.exportOptionTitle, { color: themeColors['muted-foreground'] }]}>Export As</ThemedText>
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => {
                handleExport('csv');
                setShowExportOptions(false);
              }}
            >
              <Ionicons name="document-text" size={18} color={themeColors['card-foreground']} />
              <ThemedText style={styles.exportOptionText}>Export CSV</ThemedText>
            </TouchableOpacity>
            {Platform.OS === 'web' && (
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => {
                handleExport('excel');
                setShowExportOptions(false);
              }}
            >
              <Ionicons name="grid" size={18} color={themeColors['card-foreground']} />
              <ThemedText style={styles.exportOptionText}>Export Excel</ThemedText>
            </TouchableOpacity>
            )}
            {Platform.OS === 'web' && (
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => {
                handleExport('png');
                setShowExportOptions(false);
              }}
            >
              <Ionicons name="image" size={18} color={themeColors['card-foreground']} />
              <ThemedText style={styles.exportOptionText}>Export PNG</ThemedText>
            </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

      {/* Timetable content — read-only table grid or edit cards */}
      {!isEditing ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.dayTabsScroll}
            contentContainerStyle={styles.dayTabsContent}
          >
            {days.map(day => {
              const active = day === viewDay;
              return (
                <TouchableOpacity
                  key={day}
                  onPress={() => setActiveDay(day)}
                  style={[
                    styles.dayTab,
                    {
                      backgroundColor: active ? themeColors.primary : themeColors.card,
                      borderColor: active ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  accessibilityLabel={day}
                >
                  <ThemedText style={[styles.dayTabText, { color: active ? '#fff' : themeColors['card-foreground'] }]}>
                    {day.slice(0, 3)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.dayList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={themeColors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyTableRow}>
                <ThemedText style={{ color: themeColors['muted-foreground'] }}>No timetable data</ThemedText>
              </View>
            }
            renderItem={({ item: row }) => {
              const timeLabel = `${formatTime12h(row.time.from)} - ${formatTime12h(row.time.to)}`;
              if (row.type === 'special') {
                return (
                  <View style={[styles.periodCard, { backgroundColor: '#F59E0B20', borderColor: themeColors.border }]}>
                    <ThemedText style={[styles.periodTime, { color: themeColors['muted-foreground'] }]}>{timeLabel}</ThemedText>
                    <ThemedText style={styles.tableSpecialText}>{row.label || ''}</ThemedText>
                  </View>
                );
              }
              const subjectId = viewDay ? row.subjects?.[viewDay] : undefined;
              const subjectName = subjectId ? getSubjectNameById(subjectId) : '';
              return (
                <View style={[styles.periodCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                  <ThemedText style={[styles.periodTime, { color: themeColors['muted-foreground'] }]}>{timeLabel}</ThemedText>
                  <ThemedText style={[styles.periodSubject, { color: subjectName ? themeColors.primary : themeColors['muted-foreground'] }]}>
                    {subjectName || 'Free period'}
                  </ThemedText>
                </View>
              );
            }}
          />
        </View>
      ) : (
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
      )}

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

      {/* Repeat Buttons */}
      {isEditing && rows.some(r => r.type === 'subject') && (
        <View style={styles.repeatButtons}>
          <TouchableOpacity
            style={[styles.repeatButton, { borderColor: themeColors.primary }]}
            onPress={() => { setRepeatMode('all'); setRepeatModalVisible(true); }}
          >
            <Ionicons name="copy-outline" size={16} color={themeColors.primary} />
            <ThemedText style={[styles.repeatButtonText, { color: themeColors.primary }]}>Repeat All for Week</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.repeatButton, { borderColor: themeColors['muted-foreground'] }]}
            onPress={() => { setRepeatMode('one'); setRepeatSelectedRow(null); setRepeatModalVisible(true); }}
          >
            <Ionicons name="copy-outline" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={[styles.repeatButtonText, { color: themeColors['muted-foreground'] }]}>Repeat One Subject</ThemedText>
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

    </ThemedView>

    {/* Time Picker */}
    <TimePickerModal
      visible={showTimePicker}
      initialTime={rows.find(r => r.id === currentRowId)?.time?.[currentTimeField || 'from'] || '09:00'}
      onConfirm={confirmTime}
      onCancel={() => {
        setShowTimePicker(false);
        setCurrentRowId(null);
        setCurrentTimeField(null);
      }}
    />

    {/* Repeat Day / Row Picker Modal */}
    <Modal
      visible={repeatModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeRepeatModal}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeRepeatModal}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalContainer, { backgroundColor: themeColors.card }]}>
          <ThemedText style={styles.modalTitle}>
            {repeatMode === 'all'
              ? 'Repeat All for Week'
              : repeatSelectedRow
              ? 'Select Source Day'
              : 'Select Period to Repeat'}
          </ThemedText>
          <ThemedText style={[styles.modalSubtitle, { color: themeColors['muted-foreground'] }]}>
            {repeatMode === 'all'
              ? 'Copy this day\'s subjects to all other days'
              : repeatSelectedRow
              ? 'Copy this day\'s subject to all other days in that period'
              : 'Pick which period\'s assignments to repeat'}
          </ThemedText>

          {/* Row list — only for 'one' mode before a row is chosen */}
          {repeatMode === 'one' && !repeatSelectedRow && (
            <FlatList
              data={rows.filter(r => r.type === 'subject')}
              keyExtractor={item => item.id}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, { borderBottomColor: themeColors.border }]}
                  onPress={() => setRepeatSelectedRow(item.id)}
                >
                  <Ionicons name="time-outline" size={16} color={themeColors['muted-foreground']} />
                  <ThemedText style={[styles.modalOptionText, { marginLeft: 8 }]}>
                    {formatTime12h(item.time.from)} – {formatTime12h(item.time.to)}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={themeColors['muted-foreground']} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
            />
          )}

          {/* Day list — for 'all' mode, or 'one' mode after row is chosen */}
          {(repeatMode === 'all' || (repeatMode === 'one' && repeatSelectedRow)) && (
            <FlatList
              data={days}
              keyExtractor={d => d}
              style={{ maxHeight: 280 }}
              renderItem={({ item: day }) => (
                <TouchableOpacity
                  style={[styles.modalOption, { borderBottomColor: themeColors.border }]}
                  onPress={() => repeatMode === 'all' ? handleRepeatAllForWeek(day) : handleRepeatOneSubject(day)}
                >
                  <ThemedText style={styles.modalOptionText}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity
            style={[styles.modalCancel, { backgroundColor: themeColors.muted ?? themeColors.border }]}
            onPress={closeRepeatModal}
          >
            <ThemedText style={[styles.modalCancelText, { color: themeColors['muted-foreground'] }]}>Cancel</ThemedText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  </>
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
  headerTitle: {
    fontSize: 20,
    lineHeight: 24,
  },
  headerTitleCombined: {
    fontSize: 18,
    lineHeight: 22,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  exportOptions: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  exportOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderRadius: 8,
  },
  exportOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionContainer: {
    flex: 1,
  },
  selectionTitle: {
    fontSize: 15,
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
  cardTitle: {
    fontSize: 15,
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
  repeatButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  repeatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  repeatButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dayTabsScroll: { flexGrow: 0 },
  dayTabsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  dayTab: {
    minHeight: 44,
    minWidth: 60,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTabText: { fontSize: 14, fontWeight: '600' },
  dayList: { padding: 16, gap: 10 },
  periodCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  periodTime: { fontSize: 12, fontWeight: '600' },
  periodSubject: { fontSize: 16, fontWeight: '600' },
  // Read-only table grid styles
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableTimeCell: {
    width: 90,
    padding: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableDayCell: {
    width: 100,
    padding: 8,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableTimeCellText: {
    fontSize: 11,
    textAlign: 'center',
  },
  tableSpecialCell: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  tableSpecialText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  subjectPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  subjectPillText: {
    fontSize: 11,
    textAlign: 'center',
  },
  emptyTableRow: {
    padding: 24,
    alignItems: 'center',
  },
});