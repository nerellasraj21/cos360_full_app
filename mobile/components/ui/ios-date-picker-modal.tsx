import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/contexts';

interface IOSDatePickerModalProps {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  is24Hour?: boolean;
  onChange: (date: Date) => void;
  onDismiss: () => void;
}

export function IOSDatePickerModal({
  visible,
  value,
  mode = 'date',
  minimumDate,
  maximumDate,
  is24Hour = true,
  onChange,
  onDismiss,
}: IOSDatePickerModalProps) {
  const { colors } = useTheme();
  const [pendingDate, setPendingDate] = useState<Date>(value);

  // Sync pendingDate when value changes (e.g. opening with a new initial value)
  useEffect(() => {
    if (visible) {
      setPendingDate(value);
    }
  }, [visible, value]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ThemedText style={{ color: colors['muted-foreground'], fontSize: 16 }}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onChange(pendingDate);
                onDismiss();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ThemedText style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>Done</ThemedText>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pendingDate}
            mode={mode}
            display="spinner"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            is24Hour={is24Hour}
            onChange={(_, date) => date && setPendingDate(date)}
            style={styles.picker}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  picker: {
    height: 200,
  },
});
