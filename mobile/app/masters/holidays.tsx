import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { holidaysApi } from '@/src/api';
import type { HolidayRead, HolidayCreate, HolidayUpdate } from '@/src/api';
import { useAuth, useAcademicYear, useTheme } from '@/contexts';
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { QuickSendButton } from '@/components/communication/QuickSendButton';

// ─── View types ─────────────────────────────────────────────────────────────
// Mirrors the web app's src/components/calendar/Calendar.tsx — only the two
// enabled views (Month / All Events) are exposed there, so that's all mobile
// exposes too.
type ViewType = 'month' | 'all';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = [
  '#2563eb', '#1d4ed8', '#dc2626', '#16a34a',
  '#d97706', '#9333ea', '#0891b2', '#db2777',
  '#ea580c', '#65a30d', '#0f766e', '#7c3aed',
];

// ─── Date helpers (no date-fns dependency in the mobile app) ───────────────
// Parse "YYYY-MM-DD" as local midnight to avoid UTC-vs-local mismatch (e.g. IST +5:30).
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
function endOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function isWithinInterval(date: Date, interval: { start: Date; end: Date }): boolean {
  const t = date.getTime();
  return t >= interval.start.getTime() && t <= interval.end.getTime();
}
function getMonthDays(current: Date): Date[] {
  const start = startOfWeek(startOfMonth(current));
  const end = endOfWeek(endOfMonth(current));
  const days: Date[] = [];
  let day = start;
  while (day.getTime() <= end.getTime()) {
    days.push(day);
    day = addDays(day, 1);
  }
  return days;
}
function chunkWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

// Custom Date Picker Modal Component (unchanged native picker for the Add/Edit forms)
function DatePickerModal({
  visible,
  onClose,
  onSelect,
  initialDate,
  title,
  themeColors,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  initialDate?: Date;
  title: string;
  themeColors: any;
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());

  useEffect(() => {
    if (visible) setSelectedDate(initialDate || new Date());
  }, [visible, initialDate]);

  const handleConfirm = () => {
    onSelect(formatLocalDate(selectedDate));
    onClose();
  };

  const adjustDate = (days: number) => setSelectedDate(addDays(selectedDate, days));
  const adjustMonth = (months: number) => {
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + months);
    setSelectedDate(d);
  };
  const adjustYear = (years: number) => {
    const d = new Date(selectedDate);
    d.setFullYear(d.getFullYear() + years);
    setSelectedDate(d);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.datePickerOverlay}>
        <View style={[styles.datePickerContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.datePickerHeader}>
            <ThemedText type="subtitle" style={styles.datePickerTitle}>{title}</ThemedText>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
          </View>

          <View style={styles.dateDisplay}>
            <ThemedText style={styles.selectedDateText}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
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

// Month/Year picker modal — native equivalent of the web app's inline
// month/year <select> overlays on the "Month YYYY" label.
function MonthYearPickerModal({
  visible,
  onClose,
  current,
  onSelect,
  themeColors,
}: {
  visible: boolean;
  onClose: () => void;
  current: Date;
  onSelect: (date: Date) => void;
  themeColors: any;
}) {
  const [pickerYear, setPickerYear] = useState(current.getFullYear());

  useEffect(() => {
    if (visible) setPickerYear(current.getFullYear());
  }, [visible, current]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.monthPickerOverlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.monthPickerContainer, { backgroundColor: themeColors.background }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.monthPickerYearRow}>
            <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)} style={styles.monthPickerYearBtn} accessibilityLabel="Previous year">
              <Ionicons name="chevron-back" size={22} color={themeColors.primary} />
            </TouchableOpacity>
            <ThemedText type="subtitle" style={{ color: themeColors['card-foreground'] }}>{pickerYear}</ThemedText>
            <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)} style={styles.monthPickerYearBtn} accessibilityLabel="Next year">
              <Ionicons name="chevron-forward" size={22} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.monthPickerGrid}>
            {MONTH_SHORT.map((name, idx) => {
              const isSelected = idx === current.getMonth() && pickerYear === current.getFullYear();
              return (
                <TouchableOpacity
                  key={name}
                  style={[styles.monthPickerCell, isSelected && { backgroundColor: themeColors.primary, borderRadius: 8 }]}
                  onPress={() => { onSelect(new Date(pickerYear, idx, 1)); onClose(); }}
                >
                  <ThemedText style={[styles.monthPickerCellText, isSelected && { color: 'white', fontWeight: '700' }]}>
                    {name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function HolidaysScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { activeAcademicYearId } = useAcademicYear();

  const hasCreatePermission = hasPermission('holidays', 'create');
  const hasUpdatePermission = hasPermission('holidays', 'update');
  const hasDeletePermission = hasPermission('holidays', 'delete');

  // ── View / navigation state ────────────────────────────────────────────
  const [view, setView] = useState<ViewType>('month');
  const [current, setCurrent] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // ── Add/Edit dialog state ──────────────────────────────────────────────
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventColor, setNewEventColor] = useState('#2563eb');
  const [selectedEvent, setSelectedEvent] = useState<HolidayRead | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [editStartDatePicker, setEditStartDatePicker] = useState(false);
  const [editEndDatePicker, setEditEndDatePicker] = useState(false);

  // ── Pagination + search/sort state for All Events view ────────────────
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [allEventsSearch, setAllEventsSearch] = useState('');
  const [allEventsSortKey, setAllEventsSortKey] = useState<'name' | 'start_date' | 'end_date' | null>(null);
  const [allEventsSortDir, setAllEventsSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (view === 'all') setPage(0);
  }, [view]);

  // ── Data ────────────────────────────────────────────────────────────────
  const holidaysQueryParams = view === 'all'
    ? { academic_year_id: activeAcademicYearId || undefined, limit: pageSize, skip: page * pageSize }
    : { academic_year_id: activeAcademicYearId || undefined };

  const { data: holidaysList = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['holidays', activeAcademicYearId, view, page],
    queryFn: () => holidaysApi.getHolidays(holidaysQueryParams),
  });

  const events = holidaysList;

  const createMutation = useMutation({
    mutationFn: (data: HolidayCreate) => holidaysApi.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      resetAddForm();
      setShowAddDialog(false);
      showSuccess('Holiday Created', 'Holiday created successfully.');
    },
    onError: (error: any) => {
      showError('Create Failed', error?.response?.data?.detail || error?.message || 'Failed to create holiday');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HolidayUpdate }) => holidaysApi.updateHoliday(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowEditDialog(false);
      setSelectedEvent(null);
      showSuccess('Holiday Updated', 'Holiday updated successfully.');
    },
    onError: (error: any) => {
      showError('Update Failed', error?.response?.data?.detail || error?.message || 'Failed to update holiday');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => holidaysApi.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowEditDialog(false);
      setSelectedEvent(null);
      showSuccess('Holiday Deleted', 'Holiday deleted successfully.');
    },
    onError: (error: any) => {
      showError('Delete Failed', error?.response?.data?.detail || error?.message || 'Failed to delete holiday');
    },
  });

  // Filtered + sorted events for the All Events table (client-side, matches web).
  const filteredAndSortedEvents = useMemo(() => {
    let items = events;
    if (allEventsSearch.trim()) {
      const q = allEventsSearch.toLowerCase();
      items = items.filter((ev) =>
        ev.name.toLowerCase().includes(q) || (ev.description || '').toLowerCase().includes(q));
    }
    if (allEventsSortKey) {
      items = [...items].sort((a, b) => {
        const aVal = a[allEventsSortKey] || '';
        const bVal = b[allEventsSortKey] || '';
        const cmp = aVal.localeCompare(bVal);
        return allEventsSortDir === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [events, allEventsSearch, allEventsSortKey, allEventsSortDir]);

  const resetAddForm = () => {
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventStart('');
    setNewEventEnd('');
    setNewEventColor('#2563eb');
  };

  const openAddDialogForDate = (day: Date) => {
    const iso = formatLocalDate(day);
    setNewEventStart(iso);
    setNewEventEnd(iso);
    setShowAddDialog(true);
  };

  const openEditDialog = (ev: HolidayRead) => {
    setSelectedEvent(ev);
    setShowEditDialog(true);
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !newEventStart || !newEventEnd) return;
    createMutation.mutate({
      name: newEventTitle,
      description: newEventDescription || undefined,
      start_date: newEventStart,
      end_date: newEventEnd,
      is_active: true,
      academic_year_id: activeAcademicYearId || '',
      color: newEventColor,
    });
  };

  const handleEditEvent = () => {
    if (!selectedEvent || !selectedEvent.name.trim() || !selectedEvent.start_date || !selectedEvent.end_date) return;
    updateMutation.mutate({
      id: selectedEvent.id,
      data: {
        name: selectedEvent.name,
        description: selectedEvent.description,
        start_date: selectedEvent.start_date,
        end_date: selectedEvent.end_date,
        is_active: selectedEvent.is_active ?? true,
        color: selectedEvent.color,
      },
    });
  };

  const confirmDeleteEvent = (ev: HolidayRead) => {
    confirm({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${ev.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(ev.id),
    });
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    confirmDeleteEvent(selectedEvent);
  };

  const handleSort = (key: 'name' | 'start_date' | 'end_date') => {
    if (allEventsSortKey === key) {
      setAllEventsSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setAllEventsSortKey(key);
      setAllEventsSortDir('asc');
    }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (allEventsSortKey !== colKey) return <Ionicons name="swap-vertical" size={12} color={themeColors['muted-foreground']} style={{ marginLeft: 4 }} />;
    return (
      <Ionicons
        name={allEventsSortDir === 'asc' ? 'chevron-up' : 'chevron-down'}
        size={12}
        color={themeColors['card-foreground']}
        style={{ marginLeft: 4 }}
      />
    );
  };

  // ── Month view rendering ────────────────────────────────────────────────
  const renderMonth = () => {
    const days = getMonthDays(current);
    const weeks = chunkWeeks(days);
    return (
      <View>
        <View style={styles.weekHeaderRow}>
          {DAY_HEADERS.map((d) => (
            <ThemedText key={d} style={[styles.weekHeaderText, { color: themeColors['muted-foreground'] }]}>{d}</ThemedText>
          ))}
        </View>
        {weeks.map((week, weekIdx) => {
          const weekStart = week[0];
          const weekEnd = week[6];
          const multiDayEvents = events.filter((ev) => {
            const evStart = parseLocalDate(ev.start_date);
            const evEnd = parseLocalDate(ev.end_date);
            return (
              (isWithinInterval(weekStart, { start: evStart, end: evEnd }) ||
                isWithinInterval(weekEnd, { start: evStart, end: evEnd }) ||
                (evStart <= weekStart && evEnd >= weekEnd) ||
                isWithinInterval(evStart, { start: weekStart, end: weekEnd }) ||
                isWithinInterval(evEnd, { start: weekStart, end: weekEnd })) &&
              evStart.getTime() !== evEnd.getTime()
            );
          });
          return (
            <View key={weekIdx} style={styles.weekBlock}>
              {multiDayEvents.map((ev) => {
                const evStart = parseLocalDate(ev.start_date);
                const evEnd = parseLocalDate(ev.end_date);
                const startIdx = Math.max(0, Math.floor((evStart.getTime() - weekStart.getTime()) / 86400000));
                const endIdx = Math.min(6, Math.floor((evEnd.getTime() - weekStart.getTime()) / 86400000));
                const leftPct = (startIdx / 7) * 100;
                const widthPct = ((endIdx - startIdx + 1) / 7) * 100;
                return (
                  <TouchableOpacity
                    key={ev.id}
                    style={[
                      styles.multiDayBar,
                      { left: `${leftPct}%` as any, width: `${widthPct}%` as any, backgroundColor: ev.color || '#2563eb' },
                    ]}
                    onPress={() => openEditDialog(ev)}
                  >
                    <ThemedText numberOfLines={1} style={styles.multiDayBarText}>{ev.name}</ThemedText>
                  </TouchableOpacity>
                );
              })}
              <View style={[styles.weekRow, multiDayEvents.length > 0 && { marginTop: multiDayEvents.length * 22 + 4 }]}>
                {week.map((day) => {
                  const singleDayEvents = events.filter((ev) => {
                    const evStart = parseLocalDate(ev.start_date);
                    const evEnd = parseLocalDate(ev.end_date);
                    return isWithinInterval(day, { start: evStart, end: evEnd }) && evStart.getTime() === evEnd.getTime();
                  });
                  const isToday = isSameDay(day, new Date());
                  const inMonth = isSameMonth(day, current);
                  return (
                    <TouchableOpacity
                      key={day.toISOString()}
                      style={[
                        styles.dayCell,
                        { borderColor: themeColors.border },
                        isToday && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary },
                        !inMonth && { backgroundColor: themeColors.muted },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => openAddDialogForDate(day)}
                    >
                      <ThemedText style={[styles.dayNumberSmall, !inMonth && { color: themeColors['muted-foreground'] }]}>
                        {day.getDate()}
                      </ThemedText>
                      <View style={{ gap: 2, marginTop: 2 }}>
                        {singleDayEvents.map((ev) => (
                          <TouchableOpacity
                            key={ev.id}
                            style={[styles.eventChip, { backgroundColor: ev.color || '#2563eb' }]}
                            onPress={() => openEditDialog(ev)}
                          >
                            <ThemedText numberOfLines={1} style={styles.eventChipText}>{ev.name}</ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ── All Events (table) rendering ───────────────────────────────────────
  const renderAllEvents = () => {
    if (isLoading) {
      return (
        <View style={styles.centerPad}>
          <ActivityIndicator color={themeColors.primary} />
        </View>
      );
    }
    if (isError) {
      return (
        <View style={styles.centerPad}>
          <ThemedText style={{ color: themeColors.destructive }}>Failed to load events</ThemedText>
        </View>
      );
    }

    return (
      <View style={{ gap: 12 }}>
        <View style={styles.filtersLabelRow}>
          <Ionicons name="filter-outline" size={14} color={themeColors['muted-foreground']} />
          <ThemedText style={[styles.filtersLabelText, { color: themeColors['muted-foreground'] }]}>Filters</ThemedText>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
          <Ionicons name="search" size={18} color={themeColors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
            placeholder="Search events..."
            placeholderTextColor={themeColors['muted-foreground']}
            value={allEventsSearch}
            onChangeText={setAllEventsSearch}
          />
          {allEventsSearch ? (
            <TouchableOpacity onPress={() => setAllEventsSearch('')} accessibilityLabel="Clear search">
              <Ionicons name="close" size={18} color={themeColors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sortRow}>
          {([['name', 'Title'], ['start_date', 'Start'], ['end_date', 'End']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.sortChip,
                { borderColor: allEventsSortKey === key ? themeColors.primary : themeColors.border },
              ]}
              onPress={() => handleSort(key)}
              accessibilityLabel={`Sort by ${label}`}
            >
              <ThemedText style={styles.th}>{label}</ThemedText>
              <SortIcon colKey={key} />
            </TouchableOpacity>
          ))}
        </View>

        {filteredAndSortedEvents.length === 0 ? (
          <View style={styles.centerPad}>
            <ThemedText style={{ color: themeColors['muted-foreground'] }}>
              {allEventsSearch ? 'No events match your search' : 'No events'}
            </ThemedText>
          </View>
        ) : (
          filteredAndSortedEvents.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              activeOpacity={0.8}
              onPress={() => openEditDialog(ev)}
              style={[styles.eventCard, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: ev.color || '#2563eb' }]}
            >
              <View style={styles.eventCardBody}>
                <ThemedText style={styles.eventCardTitle} numberOfLines={2}>{ev.name}</ThemedText>
                <View style={styles.eventCardMeta}>
                  <Ionicons name="calendar-outline" size={14} color={themeColors['muted-foreground']} />
                  <ThemedText style={{ fontSize: 13, color: themeColors['muted-foreground'] }}>
                    {ev.start_date === ev.end_date ? ev.start_date : `${ev.start_date} to ${ev.end_date}`}
                  </ThemedText>
                </View>
                {!!ev.description && (
                  <ThemedText style={{ fontSize: 12, color: themeColors['muted-foreground'] }} numberOfLines={2}>
                    {ev.description}
                  </ThemedText>
                )}
              </View>
              <View style={styles.eventCardActions}>
                <QuickSendButton
                  templateName="Holiday"
                  targetType="all_parents"
                  targetRef={{}}
                  recipientLabel="All parents"
                  variables={{
                    date: ev.start_date === ev.end_date ? ev.start_date : `${ev.start_date} to ${ev.end_date}`,
                    reason: ev.name ? ` (${ev.name})` : '',
                  }}
                  title="Send Holiday Message to all parents"
                />
                {hasUpdatePermission && (
                  <TouchableOpacity
                    style={[styles.rowActionBtn, { backgroundColor: themeColors.primary }]}
                    onPress={() => openEditDialog(ev)}
                    accessibilityLabel="Edit Event"
                  >
                    <Ionicons name="create" size={18} color="white" />
                  </TouchableOpacity>
                )}
                {hasDeletePermission && (
                  <TouchableOpacity
                    style={[styles.rowActionBtn, { backgroundColor: themeColors.destructive }]}
                    onPress={() => confirmDeleteEvent(ev)}
                    accessibilityLabel="Delete Event"
                  >
                    <Ionicons name="trash" size={18} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={[styles.pageBtn, { backgroundColor: themeColors.primary }, page === 0 && { opacity: 0.5 }]}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Prev</ThemedText>
          </TouchableOpacity>
          <ThemedText>Page {page + 1}</ThemedText>
          <TouchableOpacity
            style={[styles.pageBtn, { backgroundColor: themeColors.primary }, holidaysList.length < pageSize && { opacity: 0.5 }]}
            onPress={() => setPage((p) => p + 1)}
            disabled={holidaysList.length < pageSize}
          >
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>Next</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const monthYearLabel = `${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}`;
  const addFormInvalid = !newEventTitle.trim() || !newEventStart || !newEventEnd;
  const editFormInvalid = !selectedEvent || !selectedEvent.name.trim() || !selectedEvent.start_date || !selectedEvent.end_date;

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.HOLIDAYS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don&apos;t have permission to view holidays</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <ThemedText type="title">Holidays</ThemedText>
        </View>

        <View style={styles.tabsRow}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.tabBtn, { borderColor: themeColors.border }, view === 'month' && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}
              onPress={() => setView('month')}
            >
              <ThemedText style={view === 'month' ? { color: 'white', fontWeight: '600' } : undefined}>Month</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, { borderColor: themeColors.border }, view === 'all' && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}
              onPress={() => setView('all')}
            >
              <ThemedText style={view === 'all' ? { color: 'white', fontWeight: '600' } : undefined}>All Events</ThemedText>
            </TouchableOpacity>
          </View>
          {hasCreatePermission && (
            <TouchableOpacity
              style={[styles.addEventBtn, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                const today = formatLocalDate(new Date());
                setNewEventStart(today);
                setNewEventEnd(today);
                setShowAddDialog(true);
              }}
            >
              <Ionicons name="add" size={16} color="white" />
              <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>Add Event</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {view === 'month' && (
          <View style={styles.monthNavRow}>
            <TouchableOpacity onPress={() => setCurrent((c) => { const d = new Date(c); d.setMonth(d.getMonth() - 1); return d; })} accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={22} color={themeColors['card-foreground']} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMonthPicker(true)} style={styles.monthLabelBtn} accessibilityLabel="Select month and year">
              <ThemedText type="subtitle" style={{ fontSize: 17 }}>{monthYearLabel}</ThemedText>
              <Ionicons name="chevron-down" size={16} color={themeColors['muted-foreground']} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCurrent((c) => { const d = new Date(c); d.setMonth(d.getMonth() + 1); return d; })} accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={22} color={themeColors['card-foreground']} />
            </TouchableOpacity>
          </View>
        )}

        <MonthYearPickerModal
          visible={showMonthPicker}
          onClose={() => setShowMonthPicker(false)}
          current={current}
          onSelect={setCurrent}
          themeColors={themeColors}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={themeColors.primary} />}
        >
          {view === 'month' ? (
            isLoading ? (
              <View style={styles.centerPad}><ActivityIndicator color={themeColors.primary} /></View>
            ) : renderMonth()
          ) : renderAllEvents()}
        </ScrollView>

        {/* Add Event Modal */}
        <Modal visible={showAddDialog} animationType="slide" transparent onRequestClose={() => setShowAddDialog(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <ThemedText type="title" style={styles.modalTitle}>Add Event</ThemedText>
                <TouchableOpacity onPress={() => setShowAddDialog(false)} accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Title *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Event title"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={newEventTitle}
                    onChangeText={setNewEventTitle}
                  />
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Date Range *</ThemedText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1, borderColor: themeColors.border }]}
                      onPress={() => setShowStartDatePicker(true)}
                      accessibilityLabel="Select start date"
                    >
                      <ThemedText style={styles.dateInputText}>
                        {newEventStart ? new Date(newEventStart).toLocaleDateString() : 'Start date'}
                      </ThemedText>
                      <Ionicons name="calendar" size={18} color={themeColors['muted-foreground']} />
                    </TouchableOpacity>
                    <ThemedText>to</ThemedText>
                    <TouchableOpacity
                      style={[styles.dateInput, { flex: 1, borderColor: themeColors.border }]}
                      onPress={() => setShowEndDatePicker(true)}
                      accessibilityLabel="Select end date"
                    >
                      <ThemedText style={styles.dateInputText}>
                        {newEventEnd ? new Date(newEventEnd).toLocaleDateString() : 'End date'}
                      </ThemedText>
                      <Ionicons name="calendar" size={18} color={themeColors['muted-foreground']} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Event Color</ThemedText>
                  <View style={{
                    height: 36, borderRadius: 8, backgroundColor: newEventColor,
                    marginBottom: 10, justifyContent: 'center', paddingHorizontal: 12,
                  }}>
                    <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>{newEventColor}</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {EVENT_COLORS.map((color) => (
                      <TouchableOpacity
                        key={color}
                        onPress={() => setNewEventColor(color)}
                        style={{
                          width: 36, height: 36, borderRadius: 18, backgroundColor: color,
                          borderWidth: newEventColor === color ? 3 : 1,
                          borderColor: newEventColor === color ? themeColors['card-foreground'] : 'transparent',
                          justifyContent: 'center', alignItems: 'center',
                        }}
                      >
                        {newEventColor === color && <Ionicons name="checkmark" size={16} color="white" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Description</ThemedText>
                  <TextInput
                    style={[styles.textarea, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                    placeholder="Event description"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={newEventDescription}
                    onChangeText={setNewEventDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {addFormInvalid && (
                  <ThemedText style={{ color: themeColors.destructive, fontSize: 12 }}>
                    Please fill in all required fields.
                  </ThemedText>
                )}
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }, (addFormInvalid || createMutation.isPending) && { opacity: 0.6 }]}
                  onPress={handleAddEvent}
                  disabled={addFormInvalid || createMutation.isPending}
                >
                  {createMutation.isPending
                    ? <ActivityIndicator size="small" color="white" />
                    : <ThemedText style={styles.submitButtonText}>Add</ThemedText>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setShowAddDialog(false)}>
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Edit Event Modal */}
        <Modal visible={showEditDialog} animationType="slide" transparent onRequestClose={() => setShowEditDialog(false)}>
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <ThemedText type="title" style={styles.modalTitle}>Edit Event</ThemedText>
                <TouchableOpacity onPress={() => setShowEditDialog(false)} accessibilityLabel="Close">
                  <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
                </TouchableOpacity>
              </View>
              {selectedEvent && (
                <>
                  <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                    <View style={styles.formGroup}>
                      <ThemedText style={styles.label}>Title *</ThemedText>
                      <TextInput
                        style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                        placeholder="Event title"
                        placeholderTextColor={themeColors['muted-foreground']}
                        value={selectedEvent.name}
                        onChangeText={(text) => setSelectedEvent({ ...selectedEvent, name: text })}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <ThemedText style={styles.label}>Date Range *</ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.dateInput, { flex: 1, borderColor: themeColors.border }]}
                          onPress={() => setEditStartDatePicker(true)}
                          accessibilityLabel="Select start date"
                        >
                          <ThemedText style={styles.dateInputText}>
                            {new Date(selectedEvent.start_date).toLocaleDateString()}
                          </ThemedText>
                          <Ionicons name="calendar" size={18} color={themeColors['muted-foreground']} />
                        </TouchableOpacity>
                        <ThemedText>to</ThemedText>
                        <TouchableOpacity
                          style={[styles.dateInput, { flex: 1, borderColor: themeColors.border }]}
                          onPress={() => setEditEndDatePicker(true)}
                          accessibilityLabel="Select end date"
                        >
                          <ThemedText style={styles.dateInputText}>
                            {new Date(selectedEvent.end_date).toLocaleDateString()}
                          </ThemedText>
                          <Ionicons name="calendar" size={18} color={themeColors['muted-foreground']} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <ThemedText style={styles.label}>Event Color</ThemedText>
                      <View style={{
                        height: 36, borderRadius: 8, backgroundColor: selectedEvent.color || '#2563eb',
                        marginBottom: 10, justifyContent: 'center', paddingHorizontal: 12,
                      }}>
                        <ThemedText style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                          {selectedEvent.color || '#2563eb'}
                        </ThemedText>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {EVENT_COLORS.map((color) => (
                          <TouchableOpacity
                            key={color}
                            onPress={() => setSelectedEvent({ ...selectedEvent, color })}
                            style={{
                              width: 36, height: 36, borderRadius: 18, backgroundColor: color,
                              borderWidth: selectedEvent.color === color ? 3 : 1,
                              borderColor: selectedEvent.color === color ? themeColors['card-foreground'] : 'transparent',
                              justifyContent: 'center', alignItems: 'center',
                            }}
                          >
                            {selectedEvent.color === color && <Ionicons name="checkmark" size={16} color="white" />}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <ThemedText style={styles.label}>Description</ThemedText>
                      <TextInput
                        style={[styles.textarea, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                        placeholder="Event description"
                        placeholderTextColor={themeColors['muted-foreground']}
                        value={selectedEvent.description || ''}
                        onChangeText={(text) => setSelectedEvent({ ...selectedEvent, description: text })}
                        multiline
                        numberOfLines={3}
                      />
                    </View>

                    {editFormInvalid && (
                      <ThemedText style={{ color: themeColors.destructive, fontSize: 12 }}>
                        Please fill in all required fields.
                      </ThemedText>
                    )}
                  </ScrollView>

                  <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
                    {hasUpdatePermission && (
                      <TouchableOpacity
                        style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }, (editFormInvalid || updateMutation.isPending) && { opacity: 0.6 }]}
                        onPress={handleEditEvent}
                        disabled={editFormInvalid || updateMutation.isPending}
                      >
                        {updateMutation.isPending
                          ? <ActivityIndicator size="small" color="white" />
                          : <ThemedText style={styles.submitButtonText}>Save</ThemedText>}
                      </TouchableOpacity>
                    )}
                    {hasDeletePermission && (
                      <TouchableOpacity
                        style={[styles.button, { backgroundColor: themeColors.destructive }, deleteMutation.isPending && { opacity: 0.6 }]}
                        onPress={handleDeleteEvent}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending
                          ? <ActivityIndicator size="small" color="white" />
                          : <ThemedText style={{ color: 'white', fontWeight: '600' }}>Delete</ThemedText>}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setShowEditDialog(false)}>
                      <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Date pickers */}
        <DatePickerModal
          visible={showStartDatePicker}
          onClose={() => setShowStartDatePicker(false)}
          onSelect={setNewEventStart}
          initialDate={newEventStart ? parseLocalDate(newEventStart) : undefined}
          title="Select Start Date"
          themeColors={themeColors}
        />
        <DatePickerModal
          visible={showEndDatePicker}
          onClose={() => setShowEndDatePicker(false)}
          onSelect={setNewEventEnd}
          initialDate={newEventEnd ? parseLocalDate(newEventEnd) : undefined}
          title="Select End Date"
          themeColors={themeColors}
        />
        <DatePickerModal
          visible={editStartDatePicker}
          onClose={() => setEditStartDatePicker(false)}
          onSelect={(d) => selectedEvent && setSelectedEvent({ ...selectedEvent, start_date: d })}
          initialDate={selectedEvent ? parseLocalDate(selectedEvent.start_date) : undefined}
          title="Select Start Date"
          themeColors={themeColors}
        />
        <DatePickerModal
          visible={editEndDatePicker}
          onClose={() => setEditEndDatePicker(false)}
          onSelect={(d) => selectedEvent && setSelectedEvent({ ...selectedEvent, end_date: d })}
          initialDate={selectedEvent ? parseLocalDate(selectedEvent.end_date) : undefined}
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
    marginBottom: 12,
  },
  backButton: {
    marginRight: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  tabBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  monthLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekHeaderRow: {
    flexDirection: 'row',
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 6,
  },
  weekBlock: {
    position: 'relative',
    marginBottom: 4,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dayCell: {
    flex: 1,
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
  },
  dayNumberSmall: {
    fontSize: 11,
    textAlign: 'right',
  },
  eventChip: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  eventChipText: {
    color: 'white',
    fontSize: 9,
  },
  multiDayBar: {
    position: 'absolute',
    top: 2,
    height: 18,
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 5,
  },
  multiDayBarText: {
    color: 'white',
    fontSize: 9,
  },
  centerPad: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  filtersLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filtersLabelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    gap: 4,
  },
  tableHeaderRow: {
    borderBottomWidth: 1,
  },
  th: {
    fontSize: 12,
    fontWeight: '600',
  },
  thTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortChip: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderRadius: 22 },
  eventCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderLeftWidth: 4, borderRadius: 12, padding: 12, gap: 10 },
  eventCardBody: { flex: 1, gap: 4 },
  eventCardTitle: { fontSize: 15, fontWeight: '600' },
  eventCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventCardActions: { gap: 8, alignItems: 'center' },
  rowActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
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
  monthPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPickerContainer: {
    width: 280,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  monthPickerYearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthPickerYearBtn: {
    padding: 4,
  },
  monthPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthPickerCell: {
    width: '22%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPickerCellText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
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
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 14,
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
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
