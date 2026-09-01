import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

/** Format a JS Date → "YYYY-MM-DD" */
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parse "YYYY-MM-DD" string → Date (defaults to today if invalid) */
function parseDate(str: string): Date {
  if (str) {
    const parts = str.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return new Date();
}

interface DatePickerModalProps {
  visible: boolean;
  /** Current value as "YYYY-MM-DD". Defaults to today. */
  initialDate: string;
  /** Called with "YYYY-MM-DD" on confirm. */
  onConfirm: (date: string) => void;
  onCancel: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  /**
   * Which quick-select chips to show below the picker. Defaults to
   * Today/Tomorrow/+1 Week. Screens where only past/current dates make sense
   * (e.g. attendance) should pass `['today']` — the web app's date input only
   * offers "Today" there, so "Tomorrow"/"+1 Week" would be a mobile-only extra.
   */
  presets?: Array<'today' | 'tomorrow' | 'nextWeek'>;
}

export function DatePickerModal({
  visible,
  initialDate,
  onConfirm,
  onCancel,
  minimumDate,
  maximumDate,
  presets: presetKeys = ['today', 'tomorrow', 'nextWeek'],
}: DatePickerModalProps) {
  const { colors } = useTheme();

  const [day,   setDay]   = useState(1);
  const [month, setMonth] = useState(1);   // 1–12
  const [year,  setYear]  = useState(new Date().getFullYear());

  useEffect(() => {
    if (visible) {
      const d = parseDate(initialDate);
      setDay(d.getDate());
      setMonth(d.getMonth() + 1);
      setYear(d.getFullYear());
    }
  }, [visible]);

  // Clamp day when month/year change
  const maxDay = daysInMonth(month, year);
  const safeDay = Math.min(day, maxDay);

  const handleDone = () => {
    const result = `${year}-${pad(month)}-${pad(safeDay)}`;
    onConfirm(result);
  };

  const changeDay   = (delta: number) => setDay(d => { const next = ((d - 1 + delta + maxDay) % maxDay) + 1; return next; });
  const changeMonth = (delta: number) => setMonth(m => ((m - 1 + delta + 12) % 12) + 1);
  const changeYear  = (delta: number) => setYear(y => y + delta);

  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const presetDefs: Record<'today' | 'tomorrow' | 'nextWeek', { label: string; date: Date }> = {
    today:    { label: 'Today',    date: today },
    tomorrow: { label: 'Tomorrow', date: tomorrow },
    nextWeek: { label: '+1 Week',  date: nextWeek },
  };
  const presets = presetKeys.map(k => presetDefs[k]);

  const primary    = colors.primary    as string;
  const foreground = colors.foreground as string;
  const muted      = colors['muted-foreground'] as string;
  const card       = colors.card       as string;
  const border     = colors.border     as string;
  const bg         = colors.background as string;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: border }]}>
            <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
              <ThemedText style={{ color: muted, fontSize: 16 }}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={{ fontWeight: '700', fontSize: 16, color: foreground }}>
              Select Date
            </ThemedText>
            <TouchableOpacity onPress={handleDone} style={styles.headerBtn}>
              <ThemedText style={{ color: primary, fontWeight: '700', fontSize: 16 }}>Done</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Day / Month / Year columns */}
          <View style={styles.pickerRow}>
            {/* Day */}
            <View style={styles.column}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDay(1)}>
                <Ionicons name="chevron-up" size={28} color={primary} />
              </TouchableOpacity>
              <View style={[styles.digitBox, { backgroundColor: card, borderColor: border }]}>
                <ThemedText style={styles.timeDigit}>{pad(safeDay)}</ThemedText>
              </View>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDay(-1)}>
                <Ionicons name="chevron-down" size={28} color={primary} />
              </TouchableOpacity>
              <ThemedText style={[styles.columnLabel, { color: muted }]}>Day</ThemedText>
            </View>

            <ThemedText style={[styles.sep, { color: muted }]}>/</ThemedText>

            {/* Month */}
            <View style={styles.column}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(1)}>
                <Ionicons name="chevron-up" size={28} color={primary} />
              </TouchableOpacity>
              <View style={[styles.monthBox, { backgroundColor: card, borderColor: border }]}>
                <ThemedText style={styles.monthText}>{MONTHS[month - 1]}</ThemedText>
              </View>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeMonth(-1)}>
                <Ionicons name="chevron-down" size={28} color={primary} />
              </TouchableOpacity>
              <ThemedText style={[styles.columnLabel, { color: muted }]}>Month</ThemedText>
            </View>

            <ThemedText style={[styles.sep, { color: muted }]}>/</ThemedText>

            {/* Year */}
            <View style={styles.column}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeYear(1)}>
                <Ionicons name="chevron-up" size={28} color={primary} />
              </TouchableOpacity>
              <View style={[styles.yearBox, { backgroundColor: card, borderColor: border }]}>
                <ThemedText style={styles.yearText}>{year}</ThemedText>
              </View>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeYear(-1)}>
                <Ionicons name="chevron-down" size={28} color={primary} />
              </TouchableOpacity>
              <ThemedText style={[styles.columnLabel, { color: muted }]}>Year</ThemedText>
            </View>
          </View>

          {/* Quick presets */}
          <View style={styles.presets}>
            {presets.map(p => {
              const isActive = formatDate(p.date) === `${year}-${pad(month)}-${pad(safeDay)}`;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.presetBtn, { borderColor: border, backgroundColor: isActive ? primary : card }]}
                  onPress={() => {
                    setDay(p.date.getDate());
                    setMonth(p.date.getMonth() + 1);
                    setYear(p.date.getFullYear());
                  }}
                >
                  <ThemedText style={[styles.presetText, { color: isActive ? '#fff' : foreground }]}>
                    {p.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Selected date display */}
          <ThemedText style={[styles.selectedDisplay, { color: muted }]}>
            {`${year}-${pad(month)}-${pad(safeDay)}`}
          </ThemedText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:           { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 36 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerBtn:       { minWidth: 60 },
  pickerRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 8 },
  column:          { alignItems: 'center', gap: 6 },
  arrowBtn:        { padding: 6 },
  digitBox:        { width: 60, height: 60, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  monthBox:        { width: 72, height: 60, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  yearBox:         { width: 84, height: 60, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  timeDigit:       { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  monthText:       { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  yearText:        { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  columnLabel:     { fontSize: 11, marginTop: 2 },
  sep:             { fontSize: 28, fontWeight: '300', marginBottom: 26 },
  presets:         { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 8 },
  presetBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText:      { fontSize: 13, fontWeight: '600' },
  selectedDisplay: { textAlign: 'center', fontSize: 13, paddingTop: 6, paddingBottom: 2 },
});
