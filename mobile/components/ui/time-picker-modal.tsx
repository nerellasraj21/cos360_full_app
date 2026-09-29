import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts';

const DEFAULT_PRESETS = ['06:00', '07:00', '08:00', '09:00', '12:00', '17:00'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Formats a 24h time string (HH:MM or HH:MM:SS) to 12h display with AM/PM.
 * Returns empty string if input is empty/invalid.
 * e.g. "07:30" → "7:30 AM", "17:00" → "5:00 PM", "00:00" → "12:00 AM"
 */
export function formatTime12h(time: string): string {
  if (!time) return '';
  const parts = time.split(':').map(Number);
  const h24 = parts[0];
  const m = parts[1];
  if (isNaN(h24) || isNaN(m)) return time;
  const ampm = h24 < 12 ? 'AM' : 'PM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

/** Convert 24h hour → { displayHour (1–12), ampm } */
function to12h(h24: number): { displayHour: number; ampm: 'AM' | 'PM' } {
  const ampm: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  let displayHour = h24 % 12;
  if (displayHour === 0) displayHour = 12;
  return { displayHour, ampm };
}

/** Convert 12h displayHour + ampm → 24h hour */
function to24h(displayHour: number, ampm: 'AM' | 'PM'): number {
  if (ampm === 'AM') return displayHour === 12 ? 0 : displayHour;
  return displayHour === 12 ? 12 : displayHour + 12;
}

interface TimePickerModalProps {
  visible: boolean;
  /** Current value — accepts HH:MM or HH:MM:SS (24h); defaults to 07:00 */
  initialTime: string;
  /** Called with HH:MM (24h) when withSeconds=false (default), HH:MM:SS when true */
  onConfirm: (time: string) => void;
  onCancel: () => void;
  /** Optional preset quick-select times (HH:MM 24h strings). Defaults to common school times. */
  presets?: string[];
  /** When true, output includes seconds (:00). Default: false */
  withSeconds?: boolean;
}

export function TimePickerModal({
  visible,
  initialTime,
  onConfirm,
  onCancel,
  presets = DEFAULT_PRESETS,
  withSeconds = false,
}: TimePickerModalProps) {
  const { colors } = useTheme();
  const [displayHour, setDisplayHour] = useState(7); // 1–12
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  useEffect(() => {
    if (visible) {
      const parts = (initialTime || '07:00').split(':').map(Number);
      const h24 = isNaN(parts[0]) ? 7 : parts[0];
      const m = isNaN(parts[1]) ? 0 : parts[1];
      const { displayHour: dh, ampm: ap } = to12h(h24);
      setDisplayHour(dh);
      setMinute(m);
      setAmpm(ap);
    }
  }, [visible]);

  const handleDone = () => {
    const h24 = to24h(displayHour, ampm);
    const base = `${pad(h24)}:${pad(minute)}`;
    onConfirm(withSeconds ? `${base}:00` : base);
  };

  const incrementHour = () => setDisplayHour(h => (h % 12) + 1);
  const decrementHour = () => setDisplayHour(h => h === 1 ? 12 : h - 1);

  const primaryColor = colors.primary as string;
  const foregroundColor = colors.foreground as string;
  const mutedColor = colors['muted-foreground'] as string;
  const cardColor = colors.card as string;
  const borderColor = colors.border as string;
  const bgColor = colors.background as string;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: bgColor }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
            <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
              <ThemedText style={{ color: mutedColor, fontSize: 16 }}>Cancel</ThemedText>
            </TouchableOpacity>
            <ThemedText style={{ fontWeight: '700', fontSize: 16, color: foregroundColor }}>
              Select Time
            </ThemedText>
            <TouchableOpacity onPress={handleDone} style={styles.headerBtn}>
              <ThemedText style={{ color: primaryColor, fontWeight: '700', fontSize: 16 }}>Done</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Hour : Minute : AM/PM */}
          <View style={styles.pickerRow}>
            {/* Hour column */}
            <View style={styles.column}>
              <TouchableOpacity style={styles.arrowBtn} onPress={incrementHour}>
                <Ionicons name="chevron-up" size={32} color={primaryColor} />
              </TouchableOpacity>
              <View style={[styles.digitBox, { backgroundColor: cardColor, borderColor }]}>
                <ThemedText style={styles.timeDigit}>{pad(displayHour)}</ThemedText>
              </View>
              <TouchableOpacity style={styles.arrowBtn} onPress={decrementHour}>
                <Ionicons name="chevron-down" size={32} color={primaryColor} />
              </TouchableOpacity>
              <ThemedText style={[styles.columnLabel, { color: mutedColor }]}>Hour</ThemedText>
            </View>

            <ThemedText style={[styles.colon, { color: foregroundColor }]}>:</ThemedText>

            {/* Minute column */}
            <View style={styles.column}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setMinute(m => (m + 1) % 60)}>
                <Ionicons name="chevron-up" size={32} color={primaryColor} />
              </TouchableOpacity>
              <View style={[styles.digitBox, { backgroundColor: cardColor, borderColor }]}>
                <ThemedText style={styles.timeDigit}>{pad(minute)}</ThemedText>
              </View>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => setMinute(m => (m - 1 + 60) % 60)}>
                <Ionicons name="chevron-down" size={32} color={primaryColor} />
              </TouchableOpacity>
              <ThemedText style={[styles.columnLabel, { color: mutedColor }]}>Minute</ThemedText>
            </View>

            {/* AM / PM toggle */}
            <View style={styles.ampmColumn}>
              <TouchableOpacity
                style={[
                  styles.ampmBtn,
                  { borderColor, backgroundColor: ampm === 'AM' ? primaryColor : cardColor },
                ]}
                onPress={() => setAmpm('AM')}
              >
                <ThemedText style={[styles.ampmText, { color: ampm === 'AM' ? '#fff' : foregroundColor }]}>
                  AM
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ampmBtn,
                  { borderColor, backgroundColor: ampm === 'PM' ? primaryColor : cardColor },
                ]}
                onPress={() => setAmpm('PM')}
              >
                <ThemedText style={[styles.ampmText, { color: ampm === 'PM' ? '#fff' : foregroundColor }]}>
                  PM
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick preset buttons */}
          <View style={styles.presets}>
            {presets.map(t => {
              const [ph, pm] = t.split(':').map(Number);
              const { displayHour: pdh, ampm: pap } = to12h(ph);
              const isActive = pdh === displayHour && pm === minute && pap === ampm;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.presetBtn,
                    { borderColor, backgroundColor: isActive ? primaryColor : cardColor },
                  ]}
                  onPress={() => {
                    const { displayHour: dh, ampm: ap } = to12h(ph);
                    setDisplayHour(dh);
                    setMinute(pm);
                    setAmpm(ap);
                  }}
                >
                  <ThemedText style={[styles.presetText, { color: isActive ? '#fff' : foregroundColor }]}>
                    {t}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerBtn:   { minWidth: 60 },
  pickerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 28, gap: 16 },
  column:      { alignItems: 'center', gap: 8 },
  arrowBtn:    { padding: 6 },
  digitBox:    { width: 80, height: 72, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  timeDigit:   { fontSize: 40, fontWeight: '700', textAlign: 'center' },
  columnLabel: { fontSize: 12, marginTop: 2 },
  colon:       { fontSize: 40, fontWeight: '700', marginBottom: 28 },
  ampmColumn:  { alignItems: 'center', gap: 8, marginBottom: 20 },
  ampmBtn:     { width: 56, height: 40, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  ampmText:    { fontSize: 15, fontWeight: '700' },
  presets:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  presetBtn:   { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  presetText:  { fontSize: 13, fontWeight: '600' },
});
